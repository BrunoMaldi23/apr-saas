import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class SocioImportacionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  fila?: number;

  @IsString()
  rut!: string;

  @IsString()
  nombre!: string;

  @IsString()
  direccion!: string;

  @IsString()
  sector!: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  decretoSap?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  porcentajeSubsidio?: number;

  @IsString()
  numeroMedidor!: string;

  @IsOptional()
  @Type(() => Number)
  @IsIn([4, 5])
  digitos?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lecturaInicial?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ordenRuta?: number;
}

export class CrearSocioDto extends SocioImportacionDto {}

export class ImportarSociosDto {
  @ArrayMinSize(1, { message: 'Debe enviar al menos un socio' })
  @ValidateNested({ each: true })
  @Type(() => SocioImportacionDto)
  socios!: SocioImportacionDto[];
}

export interface ErrorImportacion {
  fila: number;
  campo: string;
  mensaje: string;
}
