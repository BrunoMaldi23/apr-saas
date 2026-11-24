import axios, { AxiosError } from 'axios';

export const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
const TOKEN_KEY = 'apr_token';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  // Evita respuestas 304 sin cuerpo en consultas de estado del backoffice.
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('apr_user');
      window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);

export function mensajeError(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string | string[] }>;
  const data = axiosError.response?.data;
  if (data?.message) {
    return Array.isArray(data.message) ? data.message.join(', ') : data.message;
  }
  return axiosError.message || 'Error inesperado';
}

export function guardarToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function urlConBase(ruta: string): string {
  return ruta.startsWith('http') ? ruta : `${BASE_URL}${ruta.startsWith('/') ? '' : '/'}${ruta}`;
}

async function respuestaAutenticada(ruta: string): Promise<Response> {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(urlConBase(ruta), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error(`No se pudo descargar (${response.status})`);
  return response;
}

export async function obtenerBlob(ruta: string): Promise<Blob> {
  const response = await respuestaAutenticada(ruta);
  return response.blob();
}

export async function descargarArchivo(ruta: string, nombreArchivo: string): Promise<void> {
  const blob = await obtenerBlob(ruta);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = nombreArchivo;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
