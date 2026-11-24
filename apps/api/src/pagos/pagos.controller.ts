import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { Roles } from '../common/auth/roles.decorator';
import { PagosService } from './pagos.service';
import { RegistrarPagoDto } from './dto/pago.dto';

@Controller('pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Get()
  listar(@Query('cobroId') cobroId?: string) {
    return this.pagosService.listar(cobroId);
  }

  @Post()
  @Roles(Rol.ADMIN)
  registrar(@Body() dto: RegistrarPagoDto) {
    return this.pagosService.registrar(dto);
  }
}
