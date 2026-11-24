import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { Roles } from '../common/auth/roles.decorator';
import { CrearSocioDto, ImportarSociosDto } from './dto/socio.dto';
import { SociosService } from './socios.service';

@Controller('socios')
export class SociosController {
  constructor(private readonly sociosService: SociosService) {}

  @Get()
  listar(@Query('busqueda') busqueda?: string) {
    return this.sociosService.listar(busqueda);
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.sociosService.obtener(id);
  }

  @Post()
  @Roles(Rol.ADMIN)
  crear(@Body() dto: CrearSocioDto) {
    return this.sociosService.crear(dto);
  }

  @Post('importar-lote')
  @Roles(Rol.ADMIN)
  importar(@Body() dto: ImportarSociosDto) {
    return this.sociosService.importar(dto);
  }
}
