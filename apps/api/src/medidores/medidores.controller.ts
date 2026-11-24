import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { Roles } from '../common/auth/roles.decorator';
import { ActualizarMedidorDto, ReordenarMedidorDto } from './dto/medidor.dto';
import { MedidoresService } from './medidores.service';

@Controller('medidores')
export class MedidoresController {
  constructor(private readonly medidoresService: MedidoresService) {}

  @Get()
  listar(@Query('busqueda') busqueda?: string) {
    return this.medidoresService.listar(busqueda);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN)
  actualizar(@Param('id') id: string, @Body() dto: ActualizarMedidorDto) {
    return this.medidoresService.actualizar(id, dto);
  }

  @Patch(':id/reordenar')
  @Roles(Rol.ADMIN)
  reordenar(@Param('id') id: string, @Body() dto: ReordenarMedidorDto) {
    return this.medidoresService.reordenar(id, dto);
  }
}
