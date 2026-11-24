import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { Roles } from '../common/auth/roles.decorator';
import { LecturasService } from './lecturas.service';
import { SyncLecturasDto } from './dto/sync-lecturas.dto';

@Controller('lecturas')
export class LecturasController {
  constructor(private readonly lecturasService: LecturasService) {}

  @Post('sync')
  @Roles(Rol.ADMIN, Rol.OPERADOR)
  sync(@Body() dto: SyncLecturasDto) {
    return this.lecturasService.sincronizar(dto);
  }

  @Get('ciclo/:cicloId')
  porCiclo(@Param('cicloId') cicloId: string) {
    return this.lecturasService.porCiclo(cicloId);
  }
}
