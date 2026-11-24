export type Rol = 'ADMIN' | 'OPERADOR';
export type EstadoCiclo = 'ABIERTO' | 'CERRADO';
export type EstadoCobro = 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'VENCIDO';
export type MedioPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'OTRO';
export type Incidencia = 'NINGUNA' | 'VUELTA_MEDIDOR' | 'MEDIDOR_TRABADO' | 'CASA_CERRADA' | 'MEDIDOR_DANADO';

export interface UsuarioAuth {
  id: string;
  nombre: string;
  rol: Rol;
  comiteId: string;
  comiteNombre: string;
}

export interface RespuestaLogin {
  access_token: string;
  user: UsuarioAuth;
}

export interface MedidorResumen {
  id: string;
  numero: string;
  digitos: number;
  lecturaInicial: number;
  ordenRuta: number;
}

export interface Socio {
  id: string;
  comiteId: string;
  rut: string;
  nombre: string;
  direccion: string;
  sector: string;
  telefono: string | null;
  decretoSap: string | null;
  porcentajeSubsidio: number;
  activo: boolean;
  fechaIngreso: string;
  medidor: MedidorResumen | null;
}

export interface Comite {
  id: string;
  nombre: string;
  rut: string | null;
  comuna: string;
  region: string;
  direccion: string | null;
  cargoFijoClp: number;
  tarifaM3Clp: number;
  topeSubsidioM3: number;
  porcentajeSubsidioDefault: number;
}

export interface Ciclo {
  id: string;
  periodo: string;
  estado: EstadoCiclo;
  fechaApertura: string;
  fechaCierre: string | null;
  _count?: { lecturas: number; cobros: number };
  esAbierto?: boolean;
}

export interface ResumenDashboard {
  comite: { id: string; nombre: string };
  ciclo: { id: string; periodo: string; estado: EstadoCiclo; esAbierto: boolean } | null;
  kpis: {
    totalSocios: number;
    totalMedidores: number;
    lecturasTomadas: number;
    lecturasPendientes: number;
    avanceLecturasPct: number;
    recaudacionMesClp: number;
    morosidadTotalClp: number;
    cobrosCiclo: number;
  };
}

export interface Cobro {
  id: string;
  comiteId: string;
  cicloId: string;
  socioId: string;
  medidorId: string | null;
  lecturaAnterior: number;
  lecturaActual: number;
  consumoM3: number;
  cargoFijoClp: number;
  consumoVariableClp: number;
  subtotalClp: number;
  m3Subsidiados: number;
  baseSubsidiableClp: number;
  porcentajeSubsidio: number;
  descuentoSapClp: number;
  saldoAnteriorClp: number;
  totalAPagarClp: number;
  saldoPendienteClp: number;
  estado: EstadoCobro;
  decretoSap: string | null;
  fechaEmision: string;
  fechaVencimiento: string;
  socio: { rut: string; nombre: string; direccion: string; sector: string; decretoSap: string | null };
  ciclo: { periodo: string };
  medidor: { numero: string; ordenRuta: number } | null;
  pagos?: Pago[];
}

export interface Pago {
  id: string;
  montoClp: number;
  medioPago: MedioPago;
  fechaPago: string;
  referencia: string | null;
  comprobanteNumero: string;
  socio: { rut: string; nombre: string };
}

export interface ComprobantePago {
  numero: string;
  fecha: string;
  montoClp: number;
  medioPago: MedioPago;
  referencia: string | null;
  socioNombre: string;
  rut: string;
  periodo: string;
  saldoRestanteClp: number;
}

export interface ResultadoImportacion {
  creados: number;
  errores: Array<{ fila: number; campo: string; mensaje: string }>;
}

export interface FilaSocioImportacion {
  fila: number;
  rut: string;
  nombre: string;
  direccion: string;
  sector: string;
  telefono?: string;
  decretoSap?: string;
  porcentajeSubsidio?: number;
  numeroMedidor: string;
  digitos?: number;
  lecturaInicial?: number;
  ordenRuta?: number;
}
