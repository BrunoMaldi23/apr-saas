import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Incidencia } from '@prisma/client';

export class LecturaSyncDto {
  @IsString()
  @MinLength(8)
  client_uuid!: string;

  @IsUUID('4', { message: 'medidor_id debe ser UUID' })
  medidor_id!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  lectura_actual!: number;

  @IsOptional()
  @IsEnum(Incidencia)
  incidencia?: Incidencia;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;

  @IsISO8601()
  tomada_en!: string;
}

export class SyncLecturasDto {
  @IsUUID('4', { message: 'ciclo_id debe ser UUID' })
  ciclo_id!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Debe enviar al menos una lectura' })
  @ValidateNested({ each: true })
  @Type(() => LecturaSyncDto)
  lecturas!: LecturaSyncDto[];
}
