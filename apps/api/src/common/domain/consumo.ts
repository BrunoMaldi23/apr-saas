export type TipoIncidencia =
  | 'NINGUNA'
  | 'VUELTA_MEDIDOR'
  | 'MEDIDOR_TRABADO'
  | 'CASA_CERRADA'
  | 'MEDIDOR_DANADO';

export const INCIDENCIAS_ESTIMADAS: TipoIncidencia[] = [
  'MEDIDOR_TRABADO',
  'CASA_CERRADA',
  'MEDIDOR_DANADO',
];

export interface CalcularConsumoParams {
  lecturaAnterior: number;
  lecturaActual: number;
  digitos: number;
  incidencia: TipoIncidencia;
  promedio3m: number;
}

export interface ResultadoConsumo {
  consumoM3: number;
  incidenciaEfectiva: TipoIncidencia;
  esEstimada: boolean;
  alertaOperativa: string | null;
}

export function baseMedidor(digitos: number): number {
  return digitos === 5 ? 100_000 : 10_000;
}

/**
 * Calcula consumo considerando vuelta de medidor e incidencias.
 * Regla: promedio de los últimos 3 ciclos válidos para estimar incidencias.
 */
export function calcularConsumo(params: CalcularConsumoParams): ResultadoConsumo {
  const { lecturaAnterior, lecturaActual, digitos, incidencia, promedio3m } = params;

  if (INCIDENCIAS_ESTIMADAS.includes(incidencia)) {
    const estimado = Math.max(0, Math.round(promedio3m));
    return {
      consumoM3: estimado,
      incidenciaEfectiva: incidencia,
      esEstimada: true,
      alertaOperativa: `Consumo estimado por ${incidencia.replaceAll('_', ' ').toLowerCase()} (promedio 3 ciclos: ${estimado} m3).`,
    };
  }

  if (incidencia === 'VUELTA_MEDIDOR' || lecturaActual < lecturaAnterior) {
    const base = baseMedidor(digitos);
    const consumo = Math.max(0, base - lecturaAnterior + lecturaActual);
    return {
      consumoM3: consumo,
      incidenciaEfectiva: 'VUELTA_MEDIDOR',
      esEstimada: false,
      alertaOperativa: `Vuelta de medidor detectada (base ${base}).`,
    };
  }

  const consumo = Math.max(0, lecturaActual - lecturaAnterior);
  const limiteFuga = promedio3m * 2.5;
  const alerta =
    promedio3m > 0 && consumo > limiteFuga
      ? `Posible fuga: ${consumo} m3 supera 2.5x el promedio histórico (${promedio3m} m3).`
      : null;

  return {
    consumoM3: consumo,
    incidenciaEfectiva: incidencia,
    esEstimada: false,
    alertaOperativa: alerta,
  };
}

/** Promedio de consumo de los últimos 3 ciclos válidos (no estimados). */
export function promedioConsumo(consumosValidos: number[]): number {
  if (consumosValidos.length === 0) return 0;
  const ultimos = consumosValidos.slice(-3);
  return ultimos.reduce((total, valor) => total + valor, 0) / ultimos.length;
}

/**
 * Promedio de los últimos 3 ciclos válidos de un medidor.
 * Excluye lecturas estimadas e incidencias que ya fueron estimadas.
 */
export function promedio3mDesdeLecturas(
  lecturas: Array<{ consumoM3: number; esEstimada: boolean; incidencia: TipoIncidencia }>,
): number {
  const validas = lecturas
    .filter((lectura) => !lectura.esEstimada && !INCIDENCIAS_ESTIMADAS.includes(lectura.incidencia))
    .map((lectura) => lectura.consumoM3);
  return promedioConsumo(validas);
}
