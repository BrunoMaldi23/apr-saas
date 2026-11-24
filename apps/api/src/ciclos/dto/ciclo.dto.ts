import { IsOptional, Matches } from 'class-validator';

export class CrearCicloDto {
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'El periodo debe tener formato YYYY-MM' })
  periodo?: string;
}
