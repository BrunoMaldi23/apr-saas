import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { Roles } from '../common/auth/roles.decorator';
import { ComitesService } from './comites.service';
import { ActualizarComiteDto } from './dto/actualizar-comite.dto';

@Controller('comites')
export class ComitesController {
  constructor(private readonly comitesService: ComitesService) {}

  @Get('actual')
  actual() {
    return this.comitesService.actual();
  }

  @Patch('actual')
  @Roles(Rol.ADMIN)
  actualizar(@Body() dto: ActualizarComiteDto) {
    return this.comitesService.actualizar(dto);
  }
}
