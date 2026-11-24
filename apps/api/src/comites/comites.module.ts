import { Module } from '@nestjs/common';
import { ComitesController } from './comites.controller';
import { ComitesService } from './comites.service';

@Module({
  controllers: [ComitesController],
  providers: [ComitesService],
  exports: [ComitesService],
})
export class ComitesModule {}
