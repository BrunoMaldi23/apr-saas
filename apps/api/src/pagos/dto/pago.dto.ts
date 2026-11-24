import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { MedioPago } from '@prisma/client';

export class RegistrarPagoDto {
  @IsUUID('4', { message: 'cobroId debe ser UUID' })
  cobroId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'El monto debe ser al menos $1 CLP' })
  montoClp!: number;

  @IsEnum(MedioPago)
  medioPago!: MedioPago;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  referencia?: string;

  @IsOptional()
  @IsISO8601()
  fechaPago?: string;
}
