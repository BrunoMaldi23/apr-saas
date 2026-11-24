import { Injectable, NotFoundException } from '@nestjs/common';
import { EstadoCobro } from '@prisma/client';
import { TenantStorage } from '../common/tenant/tenant-storage';
import { ahoraSantiago } from '../common/utils/tiempo';
import { AvisoPdfData, PdfCobrosService } from './pdf-cobros.service';
import { ListarCobrosDto } from './dto/cobros.dto';

type CobroConRelaciones = {
  id: string;
  comiteId: string;
  cicloId: string;
  socioId: string;
  medidorId: string | null;
  lecturaAnterior: number;
  lecturaActual: number;
  consumoM3: number;
  cargoFijoClp: number;
  consumoVariableClp: number;
  subtotalClp: number;
  m3Subsidiados: number;
  baseSubsidiableClp: number;
  porcentajeSubsidio: number;
  descuentoSapClp: number;
  saldoAnteriorClp: number;
  totalAPagarClp: number;
  saldoPendienteClp: number;
  estado: EstadoCobro;
  decretoSap: string | null;
  fechaEmision: Date;
  fechaVencimiento: Date;
  socio: { rut: string; nombre: string; direccion: string; sector: string; decretoSap: string | null };
  ciclo: { periodo: string };
  medidor: { numero: string; ordenRuta: number } | null;
};

@Injectable()
export class CobrosService {
  constructor(
    private readonly tenant: TenantStorage,
    private readonly pdf: PdfCobrosService,
  ) {}

  private get tx() {
    return this.tenant.tx;
  }

  async marcarVencidos(): Promise<void> {
    const hoy = ahoraSantiago().startOf('day').toJSDate();
    await this.tx.cobro.updateMany({
      where: {
        comiteId: this.tenant.comiteId,
        estado: { in: ['PENDIENTE', 'PARCIAL'] },
        fechaVencimiento: { lt: hoy },
      },
      data: { estado: 'VENCIDO' },
    });
  }

  async listar(filtro: ListarCobrosDto = {}) {
    await this.marcarVencidos();

    const cobros = (await this.tx.cobro.findMany({
      where: {
        comiteId: this.tenant.comiteId,
        ...(filtro.estado ? { estado: filtro.estado } : {}),
        ...(filtro.cicloId ? { cicloId: filtro.cicloId } : {}),
      },
      include: {
        socio: { select: { rut: true, nombre: true, direccion: true, sector: true, decretoSap: true } },
        ciclo: { select: { periodo: true } },
        medidor: { select: { numero: true, ordenRuta: true } },
      },
    })) as CobroConRelaciones[];

    return cobros.sort(
      (a, b) =>
        b.ciclo.periodo.localeCompare(a.ciclo.periodo) ||
        (a.medidor?.ordenRuta ?? 0) - (b.medidor?.ordenRuta ?? 0),
    );
  }

  async obtener(id: string) {
    await this.marcarVencidos();
    const cobro = await this.tx.cobro.findFirst({
      where: { id, comiteId: this.tenant.comiteId },
      include: {
        socio: { select: { rut: true, nombre: true, direccion: true, sector: true, decretoSap: true } },
        ciclo: { select: { periodo: true } },
        medidor: { select: { numero: true, ordenRuta: true } },
        pagos: { orderBy: { fechaPago: 'desc' } },
      },
    });
    if (!cobro) throw new NotFoundException('Cobro no encontrado');
    return cobro;
  }

  private async construirAviso(cobro: CobroConRelaciones): Promise<AvisoPdfData> {
    const comite = await this.tx.comite.findUniqueOrThrow({
      where: { id: this.tenant.comiteId },
      select: { nombre: true, comuna: true },
    });

    const todosLosCobros = await this.tx.cobro.findMany({
      where: { comiteId: this.tenant.comiteId, socioId: cobro.socioId },
      include: { ciclo: { select: { periodo: true } } },
    });
    const historial = todosLosCobros
      .sort((a, b) => b.ciclo.periodo.localeCompare(a.ciclo.periodo))
      .slice(0, 6)
      .map((item) => ({
        periodo: item.ciclo.periodo,
        consumoM3: item.consumoM3,
        totalAPagarClp: item.totalAPagarClp,
      }));

    return {
      socioNombre: cobro.socio.nombre,
      rut: cobro.socio.rut,
      direccion: cobro.socio.direccion,
      sector: cobro.socio.sector,
      periodo: cobro.ciclo.periodo,
      ordenRuta: cobro.medidor?.ordenRuta ?? 0,
      medidorNumero: cobro.medidor?.numero ?? 'N/A',
      lecturaAnterior: cobro.lecturaAnterior,
      lecturaActual: cobro.lecturaActual,
      consumoM3: cobro.consumoM3,
      cargoFijoClp: cobro.cargoFijoClp,
      consumoVariableClp: cobro.consumoVariableClp,
      subtotalClp: cobro.subtotalClp,
      m3Subsidiados: cobro.m3Subsidiados,
      porcentajeSubsidio: cobro.porcentajeSubsidio,
      descuentoSapClp: cobro.descuentoSapClp,
      saldoAnteriorClp: cobro.saldoAnteriorClp,
      totalAPagarClp: cobro.totalAPagarClp,
      decretoSap: cobro.decretoSap,
      fechaEmision: cobro.fechaEmision,
      fechaVencimiento: cobro.fechaVencimiento,
      comiteNombre: comite.nombre,
      comuna: comite.comuna,
      historial,
    };
  }

  async pdfIndividual(id: string): Promise<Buffer> {
    const cobro = await this.obtener(id);
    return this.pdf.generarIndividual(await this.construirAviso(cobro as CobroConRelaciones));
  }

  async pdfConsolidado(cicloId: string): Promise<Buffer> {
    const cobros = await this.listar({ cicloId });
    const avisos: AvisoPdfData[] = [];
    for (const cobro of cobros) avisos.push(await this.construirAviso(cobro));
    return this.pdf.generarConsolidado(avisos);
  }

  async nominaSapCsv(cicloId: string): Promise<string> {
    const cobros = await this.listar({ cicloId });
    const filas = [
      ['RUT', 'Nombre', 'N° Decreto SAP', '% Subsidio', 'M3 consumidos', 'Monto subsidiado CLP'],
      ...cobros.map((cobro) => [
        cobro.socio.rut,
        cobro.socio.nombre,
        cobro.decretoSap ?? cobro.socio.decretoSap ?? '',
        String(cobro.porcentajeSubsidio),
        String(cobro.consumoM3),
        String(cobro.descuentoSapClp),
      ]),
    ];

    const csv = filas
      .map((fila) => fila.map((valor) => `"${String(valor ?? '').replaceAll('"', '""')}"`).join(';'))
      .join('\r\n');

    return `\uFEFF${csv}\r\n`;
  }
}
