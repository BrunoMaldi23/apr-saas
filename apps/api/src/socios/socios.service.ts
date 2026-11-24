import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RutUtils } from '../common/utils/rut';
import { TenantStorage } from '../common/tenant/tenant-storage';
import {
  CrearSocioDto,
  ErrorImportacion,
  ImportarSociosDto,
  SocioImportacionDto,
} from './dto/socio.dto';

@Injectable()
export class SociosService {
  constructor(private readonly tenant: TenantStorage) {}

  async listar(busqueda?: string) {
    const tx = this.tenant.tx;
    const comiteId = this.tenant.comiteId;
    const termino = busqueda?.trim();

    const socios = await tx.socio.findMany({
      where: {
        comiteId,
        ...(termino
          ? {
              OR: [
                { rut: { contains: termino, mode: 'insensitive' } },
                { nombre: { contains: termino, mode: 'insensitive' } },
                { medidores: { some: { numero: { contains: termino, mode: 'insensitive' } } } },
              ],
            }
          : {}),
      },
      include: {
        medidores: {
          where: { activo: true },
          orderBy: { ordenRuta: 'asc' },
          take: 1,
        },
      },
      orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
    });

    return socios.map((socio) => ({
      id: socio.id,
      comiteId: socio.comiteId,
      rut: socio.rut,
      nombre: socio.nombre,
      direccion: socio.direccion,
      sector: socio.sector,
      telefono: socio.telefono,
      decretoSap: socio.decretoSap,
      porcentajeSubsidio: socio.porcentajeSubsidio,
      activo: socio.activo,
      fechaIngreso: socio.fechaIngreso,
      medidor: socio.medidores[0]
        ? {
            id: socio.medidores[0].id,
            numero: socio.medidores[0].numero,
            digitos: socio.medidores[0].digitos,
            lecturaInicial: socio.medidores[0].lecturaInicial,
            ordenRuta: socio.medidores[0].ordenRuta,
          }
        : null,
    }));
  }

  async crear(dto: CrearSocioDto) {
    const comiteId = this.tenant.comiteId;
    const rut = RutUtils.normalizar(dto.rut);
    const ordenRuta = dto.ordenRuta ?? (await this.siguienteOrdenRuta());

    try {
      return await this.tenant.tx.socio.create({
        data: {
          comiteId,
          rut,
          nombre: dto.nombre.trim(),
          direccion: dto.direccion.trim(),
          sector: dto.sector.trim(),
          telefono: dto.telefono?.trim() || null,
          decretoSap: dto.decretoSap?.trim() || null,
          porcentajeSubsidio: dto.porcentajeSubsidio ?? 0,
          medidores: {
            create: {
              comiteId,
              numero: dto.numeroMedidor.trim(),
              digitos: dto.digitos ?? 4,
              lecturaInicial: dto.lecturaInicial ?? 0,
              ordenRuta,
            },
          },
        },
        include: { medidores: true },
      });
    } catch (error) {
      this.lanzarConflictoSiCorresponde(error, 'RUT o número de medidor ya existe');
      throw error;
    }
  }

  async importar(dto: ImportarSociosDto) {
    const comiteId = this.tenant.comiteId;
    const tx = this.tenant.tx;
    const errores: ErrorImportacion[] = [];
    const rutsVistos = new Set<string>();
    const medidoresVistos = new Set<string>();
    const rutasVistas = new Set<number>();

    let ordenBase = await this.siguienteOrdenRuta();
    const filasNormalizadas: Array<SocioImportacionDto & { rutNormalizado: string; orden: number }> = [];

    for (let index = 0; index < dto.socios.length; index += 1) {
      const fila = dto.socios[index].fila ?? index + 2;
      const socio = dto.socios[index];

      let rutNormalizado = '';
      try {
        rutNormalizado = RutUtils.normalizar(socio.rut);
      } catch (error) {
        errores.push({ fila, campo: 'rut', mensaje: (error as Error).message });
      }

      if (rutNormalizado) {
        if (rutsVistos.has(rutNormalizado)) {
          errores.push({ fila, campo: 'rut', mensaje: 'RUT duplicado dentro del lote' });
        }
        rutsVistos.add(rutNormalizado);

        const existe = await tx.socio.findUnique({
          where: { comiteId_rut: { comiteId, rut: rutNormalizado } },
          select: { id: true },
        });
        if (existe) {
          errores.push({ fila, campo: 'rut', mensaje: 'RUT ya existe en el padrón' });
        }
      }

      const numero = socio.numeroMedidor?.trim();
      if (!numero) {
        errores.push({ fila, campo: 'numeroMedidor', mensaje: 'Número de medidor obligatorio' });
      } else {
        if (medidoresVistos.has(numero)) {
          errores.push({ fila, campo: 'numeroMedidor', mensaje: 'Medidor duplicado dentro del lote' });
        }
        medidoresVistos.add(numero);
        const existe = await tx.medidor.findUnique({
          where: { comiteId_numero: { comiteId, numero } },
          select: { id: true },
        });
        if (existe) {
          errores.push({ fila, campo: 'numeroMedidor', mensaje: 'Número de medidor ya existe' });
        }
      }

      if (!socio.nombre?.trim()) {
        errores.push({ fila, campo: 'nombre', mensaje: 'Nombre obligatorio' });
      }

      const orden = socio.ordenRuta ?? ordenBase;
      if (socio.ordenRuta === undefined) ordenBase += 1;
      if (rutasVistas.has(orden)) {
        errores.push({ fila, campo: 'ordenRuta', mensaje: `Orden de ruta ${orden} duplicado` });
      }
      rutasVistas.add(orden);

      const existeOrden = await tx.medidor.findUnique({
        where: { comiteId_ordenRuta: { comiteId, ordenRuta: orden } },
        select: { id: true },
      });
      if (existeOrden) {
        errores.push({ fila, campo: 'ordenRuta', mensaje: `Orden de ruta ${orden} ya está ocupado` });
      }

      filasNormalizadas.push({ ...socio, rutNormalizado, orden });
    }

    if (errores.length > 0) {
      throw new BadRequestException({ message: 'El lote contiene errores', errores });
    }

    for (const socio of filasNormalizadas) {
      await tx.socio.create({
        data: {
          comiteId,
          rut: socio.rutNormalizado,
          nombre: socio.nombre.trim(),
          direccion: socio.direccion.trim() || 'Sin dirección',
          sector: socio.sector.trim() || 'Sin sector',
          telefono: socio.telefono?.trim() || null,
          decretoSap: socio.decretoSap?.trim() || null,
          porcentajeSubsidio: socio.porcentajeSubsidio ?? 0,
          medidores: {
            create: {
              comiteId,
              numero: socio.numeroMedidor.trim(),
              digitos: socio.digitos ?? 4,
              lecturaInicial: socio.lecturaInicial ?? 0,
              ordenRuta: socio.orden,
            },
          },
        },
      });
    }

    return { creados: filasNormalizadas.length, errores: [] as ErrorImportacion[] };
  }

  private async siguienteOrdenRuta(): Promise<number> {
    const resultado = await this.tenant.tx.medidor.aggregate({
      where: { comiteId: this.tenant.comiteId },
      _max: { ordenRuta: true },
    });
    return (resultado._max.ordenRuta ?? 0) + 1;
  }

  private lanzarConflictoSiCorresponde(error: unknown, mensaje: string): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(mensaje);
    }
  }

  async obtener(id: string) {
    const socio = await this.tenant.tx.socio.findFirst({
      where: { id, comiteId: this.tenant.comiteId },
      include: { medidores: { orderBy: { ordenRuta: 'asc' } } },
    });
    if (!socio) throw new NotFoundException('Socio no encontrado');
    return socio;
  }
}
