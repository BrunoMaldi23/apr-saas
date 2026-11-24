import axios, { type AxiosError } from 'axios';
import type { LecturaPendiente, RespuestaLogin, SyncResponse } from '@/types';

export const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
const TOKEN_KEY = 'apr_pwa_token';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 25_000,
  // Evita respuestas 304 sin cuerpo en lecturas de estado (por ejemplo /ciclos/activo).
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function mensajeError(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string | string[] }>;
  const data = axiosError.response?.data;
  if (data?.message) return Array.isArray(data.message) ? data.message.join(', ') : data.message;
  if (!navigator.onLine) return 'Sin conexión. Las lecturas quedan guardadas en el equipo.';
  return axiosError.message || 'No se pudo completar la operación';
}

export async function login(email: string, password: string): Promise<RespuestaLogin> {
  const { data } = await api.post<RespuestaLogin>('/auth/login', { email, password });
  return data;
}

export async function sincronizarLecturas(
  cicloId: string,
  lecturas: LecturaPendiente[],
): Promise<SyncResponse> {
  const { data } = await api.post<SyncResponse>('/lecturas/sync', {
    ciclo_id: cicloId,
    lecturas: lecturas.map((lectura) => ({
      client_uuid: lectura.clientUuid,
      medidor_id: lectura.medidorId,
      lectura_actual: lectura.lecturaActual,
      incidencia: lectura.incidencia,
      observacion: lectura.observacion,
      tomada_en: lectura.tomadaEn,
    })),
  });
  return data;
}

export function guardarToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function limpiarToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('apr_pwa_user');
}

export function tokenGuardado(): string {
  return localStorage.getItem(TOKEN_KEY) ?? '';
}
