import { Controller, Get, Param, Query, Res, StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { CobrosService } from './cobros.service';
import { ListarCobrosDto } from './dto/cobros.dto';

@Controller('cobros')
export class CobrosController {
  constructor(private readonly cobrosService: CobrosService) {}

  @Get()
  listar(@Query() filtro: ListarCobrosDto) {
    return this.cobrosService.listar(filtro);
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.cobrosService.obtener(id);
  }

  @Get(':id/pdf')
  async pdf(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const buffer = await this.cobrosService.pdfIndividual(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="aviso-${id.slice(0, 8)}.pdf"`);
    return new StreamableFile(buffer);
  }
}

@Controller('ciclos')
export class CiclosDocumentosController {
  constructor(private readonly cobrosService: CobrosService) {}

  @Get(':id/avisos-consolidados.pdf')
  async avisosConsolidados(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const buffer = await this.cobrosService.pdfConsolidado(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="avisos-ciclo-${id.slice(0, 8)}.pdf"`);
    return new StreamableFile(buffer);
  }

  @Get(':id/nomina-sap.csv')
  async nominaSap(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const csv = await this.cobrosService.nominaSapCsv(id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="nomina-sap-${id.slice(0, 8)}.csv"`);
    return csv;
  }
}
