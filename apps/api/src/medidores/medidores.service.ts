import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantStorage } from '../common/tenant/tenant-storage';
import { ActualizarMedidorDto, ReordenarMedidorDto } from './dto/medidor.dto';

@Injectable()
export class MedidoresService {
  constructor(private readonly tenant: TenantStorage) {}

  async listar(busqueda?: string) {
    const termino = busqueda?.trim();
    return this.tenant.tx.medidor.findMany({
      where: {
        comiteId: this.tenant.comiteId,
        ...(termino
          ? {
              OR: [
                { numero: { contains: termino, mode: 'insensitive' } },
                { socio: { nombre: { contains: termino, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        socio: { select: { id: true, rut: true, nombre: true, sector: true } },
      },
      orderBy: { ordenRuta: 'asc' },
    });
  }

  async actualizar(id: string, dto: ActualizarMedidorDto) {
    const medidor = await this.tenant.tx.medidor.findFirst({
      where: { id, comiteId: this.tenant.comiteId },
    });
    if (!medidor) throw new NotFoundException('Medidor no encontrado');

    return this.tenant.tx.medidor.update({
      where: { id },
      data: {
        ...(dto.digitos !== undefined ? { digitos: dto.digitos } : {}),
        ...(dto.lecturaInicial !== undefined ? { lecturaInicial: dto.lecturaInicial } : {}),
        ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
      },
    });
  }

  /** Intercambia la posición de ruta con el medidor que ocupa el destino. */
  async reordenar(id: string, dto: ReordenarMedidorDto) {
    const tx = this.tenant.tx;
    const comiteId = this.tenant.comiteId;
    const medidor = await tx.medidor.findFirst({ where: { id, comiteId } });
    if (!medidor) throw new NotFoundException('Medidor no encontrado');
    if (medidor.ordenRuta === dto.ordenRuta) return medidor;

    const destino = await tx.medidor.findUnique({
      where: { comiteId_ordenRuta: { comiteId, ordenRuta: dto.ordenRuta } },
    });
    if (!destino) throw new ConflictException(`No existe medidor en la posición ${dto.ordenRuta}`);

    await tx.medidor.update({ where: { id: destino.id }, data: { ordenRuta: -1 } });
    await tx.medidor.update({ where: { id: medidor.id }, data: { ordenRuta: dto.ordenRuta } });
    await tx.medidor.update({ where: { id: destino.id }, data: { ordenRuta: medidor.ordenRuta } });

    return tx.medidor.findUniqueOrThrow({ where: { id } });
  }
}
