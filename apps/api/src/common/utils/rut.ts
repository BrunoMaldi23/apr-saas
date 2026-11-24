import { BadRequestException } from '@nestjs/common';

const RUT_LIMPIO = /[^0-9kK]/g;

/**
 * Utilidades para RUT chileno (módulo 11).
 * Formato canónico: 12345678-9 (sin puntos, con guion, dígito verificador en mayúscula).
 */
export class RutUtils {
  static calcularDigitoVerificador(cuerpo: string): string {
    const cuerpoLimpio = cuerpo.replace(RUT_LIMPIO, '');
    if (!/^\d{7,8}$/.test(cuerpoLimpio)) {
      throw new BadRequestException(`Cuerpo de RUT inválido: ${cuerpo}`);
    }

    const factores = [2, 3, 4, 5, 6, 7, 2, 3];
    let suma = 0;
    let indice = cuerpoLimpio.length - 1;
    let factorIndex = 0;

    while (indice >= 0) {
      suma += Number(cuerpoLimpio[indice]) * factores[factorIndex];
      indice -= 1;
      factorIndex += 1;
    }

    const resto = 11 - (suma % 11);
    if (resto === 11) return '0';
    if (resto === 10) return 'K';
    return String(resto);
  }

  static normalizar(rut: string): string {
    if (typeof rut !== 'string') {
      throw new BadRequestException('RUT inválido');
    }

    const limpio = rut.replace(RUT_LIMPIO, '').toUpperCase();
    if (limpio.length < 8 || limpio.length > 9) {
      throw new BadRequestException(`RUT inválido: ${rut}`);
    }

    const cuerpo = limpio.slice(0, -1).replace(/^0+(?=\d)/, '');
    const digito = limpio.slice(-1);
    const esperado = this.calcularDigitoVerificador(cuerpo);

    if (digito !== esperado) {
      throw new BadRequestException(`RUT inválido (dígito verificador incorrecto): ${rut}`);
    }

    return `${cuerpo}-${digito}`;
  }

  static esValido(rut: string): boolean {
    try {
      this.normalizar(rut);
      return true;
    } catch {
      return false;
    }
  }

  static cuerpo(rut: string): string {
    return this.normalizar(rut).split('-')[0];
  }

  static conPuntos(rut: string): string {
    const normalizado = this.normalizar(rut);
    const [cuerpo, digito] = normalizado.split('-');
    return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${digito}`;
  }
}
