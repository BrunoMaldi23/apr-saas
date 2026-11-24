import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  baseMedidor,
  calcularConsumo,
  promedio3mDesdeLecturas,
} from '../common/domain/consumo';
import { calcularCobro } from '../common/domain/tarifa';
import { TenantStorage } from '../common/tenant/tenant-storage';
import { ahoraSantiago, fechaVencimientoSantiago, periodoActual, periodoValido } from '../common/utils/tiempo';
import { CrearCicloDto } from './dto/ciclo.dto';

@Injectable()
export class CiclosService {
  constructor(private readonly tenant: TenantStorage) {}

  async listar() {
    return this.tenant.tx.cicloFacturacion.findMany({
      where: { comiteId: this.tenant.comiteId },
      include: { _count: { select: { lecturas: true, cobros: true } } },
      orderBy: { periodo: 'desc' },
    });
  }

  async crear(dto: CrearCicloDto) {
    const periodo = dto.periodo ?? periodoActual();
    if (!periodoValido(periodo)) {
      throw new BadRequestException('El periodo debe tener formato YYYY-MM válido');
    }

    const tx = this.tenant.tx;
    const comiteId = this.tenant.comiteId;

    const abierto = await tx.cicloFacturacion.findFirst({
      where: { comiteId, estado: 'ABIERTO' },
      select: { id: true, periodo: true },
    });
    if (abierto) {
      throw new ConflictException(`Ya existe un ciclo abierto (${abierto.periodo}). Ciérrelo antes de abrir otro.`);
    }

    const existente = await tx.cicloFacturacion.findUnique({
      where: { comiteId_periodo: { comiteId, periodo } },
      select: { id: true },
    });
    if (existente) throw new ConflictException(`El periodo ${periodo} ya existe`);

    return tx.cicloFacturacion.create({
      data: { comiteId, periodo, estado: 'ABIERTO' },
    });
  }

  async rutaOffline(cicloId: string) {
    const tx = this.tenant.tx;
    const comiteId = this.tenant.comiteId;

    const ciclo = await tx.cicloFacturacion.findFirst({ where: { id: cicloId, comiteId } });
    if (!ciclo) throw new NotFoundException('Ciclo no encontrado');

    const medidores = await tx.medidor.findMany({
      where: { comiteId, activo: true },
      include: { socio: { select: { nombre: true, rut: true, direccion: true, sector: true } } },
      orderBy: { ordenRuta: 'asc' },
    });

    const historial = await tx.lectura.findMany({
      where: { comiteId, medidorId: { in: medidores.map((m) => m.id) } },
      orderBy: { tomadaEn: 'desc' },
      select: { medidorId: true, lecturaActual: true, consumoM3: true, esEstimada: true, incidencia: true, tomadaEn: true },
    });

    const ruta = medidores.map((medidor) => {
      const lecturasMedidor = historial.filter((lectura) => lectura.medidorId === medidor.id);
      const ultima = lecturasMedidor[0];
      const promedio = Math.round(
        promedio3mDesdeLecturas(
          lecturasMedidor.slice(0, 10).map((l) => ({
            consumoM3: l.consumoM3,
            esEstimada: l.esEstimada,
            incidencia: l.incidencia,
          })),
        ),
      );

      return {
        medidorId: medidor.id,
        numero: medidor.numero,
        digitos: medidor.digitos,
        ordenRuta: medidor.ordenRuta,
        socioId: medidor.socioId,
        nombreSocio: `${medidor.socio.nombre}`,
        rutSocio: medidor.socio.rut,
        sector: medidor.socio.sector,
        direccion: medidor.socio.direccion,
        lecturaAnterior: ultima?.lecturaActual ?? medidor.lecturaInicial,
        promedio3m: promedio,
      };
    });

    return {
      comiteId,
      cicloId: ciclo.id,
      periodo: ciclo.periodo,
      descargadaEn: ahoraSantiago().toISO(),
      medidores: ruta,
    };
  }

  async cerrarYFaturar(cicloId: string) {
    const tx = this.tenant.tx;
    const comiteId = this.tenant.comiteId;

    const ciclo = await tx.cicloFacturacion.findFirst({ where: { id: cicloId, comiteId } });
    if (!ciclo) throw new NotFoundException('Ciclo no encontrado');
    if (ciclo.estado === 'CERRADO') throw new BadRequestException('El ciclo ya está cerrado');

    const comite = await tx.comite.findUniqueOrThrow({ where: { id: comiteId } });
    const medidores = await tx.medidor.findMany({
      where: { comiteId, activo: true },
      include: { socio: true },
      orderBy: { ordenRuta: 'asc' },
    });

    const lecturasExistentes = await tx.lectura.findMany({ where: { comiteId, cicloId } });
    const historial = await tx.lectura.findMany({
      where: { comiteId, medidorId: { in: medidores.map((m) => m.id) }, cicloId: { not: cicloId } },
      orderBy: { tomadaEn: 'desc' },
      select: { medidorId: true, lecturaActual: true, consumoM3: true, esEstimada: true, incidencia: true },
    });

    const ultimaLecturaPorMedidor = new Map<string, number>();
    for (const lectura of historial) {
      if (!ultimaLecturaPorMedidor.has(lectura.medidorId)) {
        ultimaLecturaPorMedidor.set(lectura.medidorId, lectura.lecturaActual);
      }
    }

    const promedioPorMedidor = new Map<string, number>();
    for (const medidor of medidores) {
      const lecturas = historial.filter((l) => l.medidorId === medidor.id).slice(0, 10);
      promedioPorMedidor.set(
        medidor.id,
        Math.round(
          promedio3mDesdeLecturas(
            lecturas.map((l) => ({
              consumoM3: l.consumoM3,
              esEstimada: l.esEstimada,
              incidencia: l.incidencia,
            })),
          ),
        ),
      );
    }

    let lecturasEstimadas = 0;
    const ahora = ahoraSantiago().toJSDate();

    for (const medidor of medidores) {
      if (lecturasExistentes.some((l) => l.medidorId === medidor.id)) continue;

      const anterior = ultimaLecturaPorMedidor.get(medidor.id) ?? medidor.lecturaInicial;
      const promedio = promedioPorMedidor.get(medidor.id) ?? 0;
      const base = baseMedidor(medidor.digitos);
      const actual = (anterior + promedio) % base;
      const calculo = calcularConsumo({
        lecturaAnterior: anterior,
        lecturaActual: actual,
        digitos: medidor.digitos,
        incidencia: 'CASA_CERRADA',
        promedio3m: promedio,
      });

      await tx.lectura.create({
        data: {
          comiteId,
          cicloId,
          medidorId: medidor.id,
          clientUuid: `auto-${cicloId.slice(0, 8)}-${medidor.id.slice(0, 12)}`,
          lecturaAnterior: anterior,
          lecturaActual: actual,
          consumoM3: calculo.consumoM3,
          incidencia: 'CASA_CERRADA',
          observacion: 'Lectura estimada automáticamente al cerrar el ciclo',
          esEstimada: true,
          alertaOperativa: calculo.alertaOperativa,
          tomadaEn: ahora,
        },
      });
      lecturasEstimadas += 1;
    }

    const lecturasDelCiclo = await tx.lectura.findMany({ where: { comiteId, cicloId } });
    const lecturaPorMedidor = new Map(lecturasDelCiclo.map((l) => [l.medidorId, l]));
    const fechaVencimiento = fechaVencimientoSantiago(15);
    let totalFacturado = 0;
    let totalSubsidio = 0;
    let cobrosGenerados = 0;

    for (const medidor of medidores) {
      const lectura = lecturaPorMedidor.get(medidor.id);
      if (!lectura) continue;

      const socio = medidor.socio;
      const cobrosPrevios = await tx.cobro.findMany({
        where: { comiteId, socioId: socio.id, cicloId: { not: cicloId } },
        include: { ciclo: { select: { periodo: true } } },
      });
      const cobroAnterior = cobrosPrevios.sort((a, b) =>
        b.ciclo.periodo.localeCompare(a.ciclo.periodo),
      )[0];
      const saldoAnteriorClp = cobroAnterior?.saldoPendienteClp ?? 0;

      const detalle = calcularCobro({
        cargoFijoClp: comite.cargoFijoClp,
        tarifaM3Clp: comite.tarifaM3Clp,
        topeSubsidioM3: comite.topeSubsidioM3,
        porcentajeSubsidio: socio.porcentajeSubsidio,
        consumoM3: lectura.consumoM3,
        saldoAnteriorClp,
      });

      const existente = await tx.cobro.findUnique({
        where: { comiteId_cicloId_socioId: { comiteId, cicloId, socioId: socio.id } },
        select: { id: true },
      });
      if (existente) continue;

      await tx.cobro.create({
        data: {
          comiteId,
          cicloId,
          socioId: socio.id,
          medidorId: medidor.id,
          lecturaAnterior: lectura.lecturaAnterior,
          lecturaActual: lectura.lecturaActual,
          consumoM3: lectura.consumoM3,
          cargoFijoClp: comite.cargoFijoClp,
          consumoVariableClp: detalle.consumoVariableClp,
          subtotalClp: detalle.subtotalClp,
          m3Subsidiados: detalle.m3Subsidiados,
          baseSubsidiableClp: detalle.baseSubsidiableClp,
          porcentajeSubsidio: socio.porcentajeSubsidio,
          descuentoSapClp: detalle.descuentoSapClp,
          saldoAnteriorClp,
          totalAPagarClp: detalle.totalAPagarClp,
          saldoPendienteClp: detalle.totalAPagarClp,
          estado: 'PENDIENTE',
          decretoSap: socio.decretoSap,
          fechaEmision: ahora,
          fechaVencimiento,
        },
      });

      cobrosGenerados += 1;
      totalFacturado += detalle.totalAPagarClp;
      totalSubsidio += detalle.descuentoSapClp;
    }

    await tx.cicloFacturacion.update({
      where: { id: cicloId },
      data: { estado: 'CERRADO', fechaCierre: ahora },
    });

    return {
      cicloId,
      periodo: ciclo.periodo,
      estado: 'CERRADO' as const,
      sociosFacturados: cobrosGenerados,
      lecturasEstimadas,
      totalFacturadoClp: Math.round(totalFacturado),
      totalSubsidioSapClp: Math.round(totalSubsidio),
    };
  }

  async activo() {
    const ciclo = await this.tenant.tx.cicloFacturacion.findFirst({
      where: { comiteId: this.tenant.comiteId, estado: 'ABIERTO' },
      orderBy: { periodo: 'desc' },
    });
    if (!ciclo) {
      const ultimo = await this.tenant.tx.cicloFacturacion.findFirst({
        where: { comiteId: this.tenant.comiteId },
        orderBy: { periodo: 'desc' },
      });
      return ultimo ?? null;
    }
    return ciclo;
  }

  async obtener(cicloId: string) {
    const ciclo = await this.tenant.tx.cicloFacturacion.findFirst({
      where: { id: cicloId, comiteId: this.tenant.comiteId },
    });
    if (!ciclo) throw new NotFoundException('Ciclo no encontrado');
    return ciclo;
  }
}
