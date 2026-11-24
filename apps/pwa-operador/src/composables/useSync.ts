import { ref } from 'vue';
import { mensajeError, sincronizarLecturas } from '@/api/client';
import { contarPendientes, marcarSincronizados, obtenerMeta, obtenerPendientes } from '@/db/dexie';
import type { SyncResponse } from '@/types';

const CLAVE_ULTIMA_SYNC = 'apr_ultima_sync';
let enCurso = false;

export const sincronizando = ref(false);
export const ultimaSincronizacion = ref<string>(localStorage.getItem(CLAVE_ULTIMA_SYNC) ?? '');
export const ultimoResultado = ref<SyncResponse | null>(null);

export interface ResultadoSincronizacion {
  ok: boolean;
  mensaje: string;
  datos?: SyncResponse;
}

/** Único punto de envío: evita lotes concurrentes y conserva la idempotencia del servidor. */
export async function sincronizarPendientes(): Promise<ResultadoSincronizacion> {
  if (enCurso) return { ok: false, mensaje: 'Ya hay un envío en curso.' };

  if (!navigator.onLine) {
    return { ok: false, mensaje: 'Sin conexión. Las lecturas siguen guardadas en el equipo.' };
  }

  const lote = await obtenerPendientes();
  if (lote.length === 0) {
    return { ok: true, mensaje: 'Todo actualizado.' };
  }

  const meta = await obtenerMeta();
  if (!meta?.cicloId) {
    return { ok: false, mensaje: 'No hay una ruta descargada asociada a estas lecturas.' };
  }

  enCurso = true;
  sincronizando.value = true;
  try {
    const datos = await sincronizarLecturas(meta.cicloId, lote);
    const fallidos = new Set(datos.errores.map((error) => error.client_uuid));
    const enviados = lote
      .filter((lectura) => !fallidos.has(lectura.clientUuid))
      .map((lectura) => lectura.clientUuid);
    await marcarSincronizados(enviados);

    ultimoResultado.value = datos;
    const ahora = new Date().toISOString();
    ultimaSincronizacion.value = ahora;
    try {
      localStorage.setItem(CLAVE_ULTIMA_SYNC, ahora);
    } catch {
      // La fecha en memoria sigue siendo válida para esta sesión.
    }

    const pendientesRestantes = await contarPendientes();
    if (datos.errores.length > 0) {
      return {
        ok: false,
        mensaje: `${datos.errores.length} lectura(s) necesitan revisión. Quedan ${pendientesRestantes} pendiente(s).`,
        datos,
      };
    }
    return {
      ok: true,
      mensaje: pendientesRestantes === 0 ? 'Todo actualizado.' : `Quedan ${pendientesRestantes} lectura(s) por enviar.`,
      datos,
    };
  } catch (error) {
    return { ok: false, mensaje: mensajeError(error) };
  } finally {
    enCurso = false;
    sincronizando.value = false;
  }
}

export function formatearUltimaSincronizacion(valor: string): string {
  if (!valor) return 'nunca';
  return new Date(valor).toLocaleString('es-CL', {
    timeZone: 'America/Santiago',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}
