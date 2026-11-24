import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { Roles } from '../common/auth/roles.decorator';
import { CiclosService } from './ciclos.service';
import { CrearCicloDto } from './dto/ciclo.dto';

@Controller('ciclos')
export class CiclosController {
  constructor(private readonly ciclosService: CiclosService) {}

  @Get()
  listar() {
    return this.ciclosService.listar();
  }

  @Get('activo')
  activo() {
    return this.ciclosService.activo();
  }

  @Get(':id/ruta-offline')
  rutaOffline(@Param('id') id: string) {
    return this.ciclosService.rutaOffline(id);
  }

  @Post(':id/cerrar-y-facturar')
  @Roles(Rol.ADMIN)
  cerrarYFaturar(@Param('id') id: string) {
    return this.ciclosService.cerrarYFaturar(id);
  }

  @Post()
  @Roles(Rol.ADMIN)
  crear(@Body() dto: CrearCicloDto) {
    return this.ciclosService.crear(dto);
  }
}
