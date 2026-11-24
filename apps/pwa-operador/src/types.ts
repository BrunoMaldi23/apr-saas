export type Incidencia = 'NINGUNA' | 'VUELTA_MEDIDOR' | 'MEDIDOR_TRABADO' | 'CASA_CERRADA' | 'MEDIDOR_DANADO';
export type Rol = 'ADMIN' | 'OPERADOR';

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

export interface Ciclo {
  id: string;
  periodo: string;
  estado: 'ABIERTO' | 'CERRADO';
  esAbierto?: boolean;
}

export interface RutaMedidor {
  medidorId: string;
  numero: string;
  digitos: number;
  ordenRuta: number;
  socioId: string;
  nombreSocio: string;
  rutSocio: string;
  sector: string;
  direccion: string;
  lecturaAnterior: number;
  promedio3m: number;
}

export interface RutaOfflineResponse {
  comiteId: string;
  cicloId: string;
  periodo: string;
  descargadaEn: string;
  medidores: RutaMedidor[];
}

export interface MetaRuta {
  key: string;
  comiteId: string;
  cicloId: string;
  periodo: string;
  descargadaEn: string;
}

export interface LecturaPendiente {
  clientUuid: string;
  cicloId: string;
  medidorId: string;
  lecturaActual: number;
  incidencia: Incidencia;
  observacion: string;
  tomadaEn: string;
  sincronizado: 0 | 1;
  creadaEn: string;
  numeroMedidor?: string;
  nombreSocio?: string;
  ordenRuta?: number;
}

export interface SyncResponse {
  cicloId: string;
  periodo: string;
  recibidas: number;
  creadas: number;
  duplicados: number;
  errores: Array<{ client_uuid: string; mensaje: string }>;
}
