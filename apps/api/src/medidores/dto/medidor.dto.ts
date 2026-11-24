import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class ActualizarMedidorDto {
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
  @Type(() => Boolean)
  @IsBoolean()
  activo?: boolean;
}

export class ReordenarMedidorDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ordenRuta!: number;
}
