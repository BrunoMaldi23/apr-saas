import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ActualizarComiteDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cargoFijoClp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tarifaM3Clp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  topeSubsidioM3?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  porcentajeSubsidioDefault?: number;
}
