import type { Incidencia } from '@/types';

export const INCIDENCIAS_ESTIMADAS: Incidencia[] = ['MEDIDOR_TRABADO', 'CASA_CERRADA', 'MEDIDOR_DANADO'];

export function baseMedidor(digitos: number): number {
  return digitos === 5 ? 100_000 : 10_000;
}

export interface ResultadoConsumoLocal {
  consumoM3: number;
  incidenciaEfectiva: Incidencia;
  esEstimada: boolean;
  alerta: string | null;
}

/** Misma regla que el backend: normal, vuelta y estimación por promedio de 3 ciclos. */
export function calcularConsumoLocal(input: {
  lecturaAnterior: number;
  lecturaActual: number;
  digitos: number;
  incidencia: Incidencia;
  promedio3m: number;
}): ResultadoConsumoLocal {
  const { lecturaAnterior, lecturaActual, digitos, incidencia, promedio3m } = input;

  if (INCIDENCIAS_ESTIMADAS.includes(incidencia)) {
    const estimado = Math.max(0, Math.round(promedio3m));
    return {
      consumoM3: estimado,
      incidenciaEfectiva: incidencia,
      esEstimada: true,
      alerta: `Consumo estimado por ${incidencia.replaceAll('_', ' ').toLowerCase()}.`,
    };
  }

  if (incidencia === 'VUELTA_MEDIDOR' || lecturaActual < lecturaAnterior) {
    const base = baseMedidor(digitos);
    return {
      consumoM3: Math.max(0, base - lecturaAnterior + lecturaActual),
      incidenciaEfectiva: 'VUELTA_MEDIDOR',
      esEstimada: false,
      alerta: `Vuelta de medidor (base ${base.toLocaleString('es-CL')}).`,
    };
  }

  const consumo = Math.max(0, lecturaActual - lecturaAnterior);
  const fuga = promedio3m > 0 && consumo > promedio3m * 2.5;
  return {
    consumoM3: consumo,
    incidenciaEfectiva: incidencia,
    esEstimada: false,
    alerta: fuga ? 'POSIBLE FUGA: supera 2.5x el promedio histórico' : null,
  };
}

export function nuevoClientUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `uuid-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
