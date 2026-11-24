import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantStorage } from '../common/tenant/tenant-storage';
import { ActualizarComiteDto } from './dto/actualizar-comite.dto';

@Injectable()
export class ComitesService {
  constructor(private readonly tenant: TenantStorage) {}

  async actual() {
    const comite = await this.tenant.tx.comite.findUnique({
      where: { id: this.tenant.comiteId },
      select: {
        id: true,
        nombre: true,
        rut: true,
        comuna: true,
        region: true,
        direccion: true,
        cargoFijoClp: true,
        tarifaM3Clp: true,
        topeSubsidioM3: true,
        porcentajeSubsidioDefault: true,
      },
    });

    if (!comite) throw new NotFoundException('Comité no encontrado');
    return comite;
  }

  async actualizar(dto: ActualizarComiteDto) {
    await this.actual();
    return this.tenant.tx.comite.update({
      where: { id: this.tenant.comiteId },
      data: dto,
      select: {
        id: true,
        nombre: true,
        cargoFijoClp: true,
        tarifaM3Clp: true,
        topeSubsidioM3: true,
        porcentajeSubsidioDefault: true,
      },
    });
  }
}
