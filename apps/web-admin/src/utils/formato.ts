export function clp(monto: number | null | undefined): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(monto ?? 0);
}

/** Monto CLP para presentación: «—» cuando el dato aún no existe. */
export function clpOpcional(valor?: number | null): string {
  return valor == null ? '—' : clp(valor);
}

export function numero(valor: number | null | undefined): string {
  return new Intl.NumberFormat('es-CL').format(valor ?? 0);
}

export function fechaCorta(valor: string | null | undefined): string {
  if (!valor) return '—';
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(valor));
}

export function fechaHora(valor: string | null | undefined): string {
  if (!valor) return '—';
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(valor));
}

const etiquetasEstado: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  PARCIAL: 'Parcial',
  PAGADO: 'Pagado',
  VENCIDO: 'Vencido',
  ABIERTO: 'Abierto',
  CERRADO: 'Cerrado',
};

/** Etiqueta legible de un estado; no altera el valor enviado a la API. */
export function etiquetaEstado(estado: string): string {
  return etiquetasEstado[estado] ?? estado;
}

const etiquetasMedioPago: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  OTRO: 'Otro',
};

/** Etiqueta legible de un medio de pago; no altera el valor enviado a la API. */
export function etiquetaMedioPago(medio: string): string {
  return etiquetasMedioPago[medio] ?? medio;
}

export function periodoActualSantiago(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
  });
  const partes = formatter.format(new Date()).split('-');
  return `${partes[0]}-${partes[1]}`;
}
