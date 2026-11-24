import { Module } from '@nestjs/common';
import { CiclosDocumentosController, CobrosController } from './cobros.controller';
import { CobrosService } from './cobros.service';
import { PdfCobrosService } from './pdf-cobros.service';

@Module({
  controllers: [CobrosController, CiclosDocumentosController],
  providers: [CobrosService, PdfCobrosService],
  exports: [CobrosService, PdfCobrosService],
})
export class CobrosModule {}
