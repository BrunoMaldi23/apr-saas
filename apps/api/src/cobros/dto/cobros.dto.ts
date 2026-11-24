import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { EstadoCobro } from '@prisma/client';

export class ListarCobrosDto {
  @IsOptional()
  @IsEnum(EstadoCobro)
  estado?: EstadoCobro;

  @IsOptional()
  @IsString()
  cicloId?: string;
}

export class HistorialPdfDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limite?: number;
}
