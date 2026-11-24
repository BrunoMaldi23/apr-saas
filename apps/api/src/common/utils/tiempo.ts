import { DateTime } from 'luxon';

export const ZONA_HORARIA = 'America/Santiago';

export function ahoraSantiago(): DateTime {
  return DateTime.now().setZone(ZONA_HORARIA);
}

/** Periodo contable chileno en formato YYYY-MM, calculado en America/Santiago. */
export function periodoActual(): string {
  return ahoraSantiago().toFormat('yyyy-MM');
}

export function periodoDesde(date: Date | DateTime): string {
  const dt = date instanceof DateTime ? date.setZone(ZONA_HORARIA) : DateTime.fromJSDate(date).setZone(ZONA_HORARIA);
  return dt.toFormat('yyyy-MM');
}

export function periodoAnterior(periodo: string, meses = 1): string {
  const dt = DateTime.fromFormat(periodo, 'yyyy-MM', { zone: ZONA_HORARIA });
  if (!dt.isValid) throw new Error(`Periodo inválido: ${periodo}`);
  return dt.minus({ months: meses }).toFormat('yyyy-MM');
}

export function periodoValido(periodo: string): boolean {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) return false;
  return DateTime.fromFormat(periodo, 'yyyy-MM', { zone: ZONA_HORARIA }).isValid;
}

export function inicioDelDiaSantiago(): DateTime {
  return ahoraSantiago().startOf('day');
}

export function fechaVencimientoSantiago(dias = 15): Date {
  return ahoraSantiago().plus({ days: dias }).endOf('day').toJSDate();
}

export function formatoChilenoFecha(date: Date | DateTime): string {
  const dt = date instanceof DateTime ? date : DateTime.fromJSDate(date);
  return dt.setZone(ZONA_HORARIA).toLocaleString(DateTime.DATE_SHORT, { locale: 'es-CL' });
}

export function formatoChilenoHora(date: Date | DateTime): string {
  const dt = date instanceof DateTime ? date : DateTime.fromJSDate(date);
  return dt.setZone(ZONA_HORARIA).toLocaleString(DateTime.DATETIME_SHORT, { locale: 'es-CL' });
}

export function formatoCLP(monto: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(monto);
}
