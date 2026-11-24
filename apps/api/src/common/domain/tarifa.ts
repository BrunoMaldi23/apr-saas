export interface CalcularCobroParams {
  cargoFijoClp: number;
  tarifaM3Clp: number;
  topeSubsidioM3: number;
  porcentajeSubsidio: number;
  consumoM3: number;
  saldoAnteriorClp: number;
}

export interface DetalleCobro {
  consumoVariableClp: number;
  subtotalClp: number;
  m3Subsidiados: number;
  baseSubsidiableClp: number;
  descuentoSapClp: number;
  totalAPagarClp: number;
}

/**
 * Motor tarifario exacto (Ley 20.998 / Subsidio SAP).
 * Todos los montos son CLP enteros; se aplica Math.round en cada ítem.
 */
export function calcularCobro(params: CalcularCobroParams): DetalleCobro {
  const cargoFijoClp = Math.round(params.cargoFijoClp);
  const tarifaM3Clp = Math.round(params.tarifaM3Clp);
  const topeSubsidioM3 = Math.round(params.topeSubsidioM3);
  const porcentajeSubsidio = Math.round(params.porcentajeSubsidio);
  const consumoM3 = Math.max(0, Math.round(params.consumoM3));
  const saldoAnteriorClp = Math.round(params.saldoAnteriorClp);

  const consumoVariableClp = Math.round(consumoM3 * tarifaM3Clp);
  const subtotalClp = cargoFijoClp + consumoVariableClp;
  const m3Subsidiados = Math.min(consumoM3, topeSubsidioM3);
  const baseSubsidiableClp = cargoFijoClp + Math.round(m3Subsidiados * tarifaM3Clp);
  const descuentoSapClp = Math.round(baseSubsidiableClp * (porcentajeSubsidio / 100));
  const totalAPagarClp = Math.round(subtotalClp - descuentoSapClp + saldoAnteriorClp);

  return {
    consumoVariableClp,
    subtotalClp,
    m3Subsidiados,
    baseSubsidiableClp,
    descuentoSapClp,
    totalAPagarClp,
  };
}
