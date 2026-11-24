import Dexie, { type Table } from 'dexie';
import type { LecturaPendiente, MetaRuta, RutaMedidor } from '@/types';

class BaseDatosOperador extends Dexie {
  ruta!: Table<RutaMedidor, string>;
  syncQueue!: Table<LecturaPendiente, string>;
  meta!: Table<MetaRuta, string>;

  constructor() {
    super('apr-operador-db');
    this.version(1).stores({
      ruta: 'medidorId, ordenRuta, numero, sector, nombreSocio',
      syncQueue: 'clientUuid, medidorId, cicloId, sincronizado, tomadaEn',
      meta: 'key',
    });
  }
}

export const db = new BaseDatosOperador();

export interface DatosRutaDescargada {
  meta: MetaRuta;
  medidores: RutaMedidor[];
}

/** Guarda la ruta reemplazando solo los medidores; conserva lecturas pendientes de sincronizar. */
export async function guardarRuta(datos: DatosRutaDescargada): Promise<void> {
  await db.transaction('rw', db.ruta, db.meta, async () => {
    await db.ruta.clear();
    await db.ruta.bulkPut(datos.medidores);
    await db.meta.put(datos.meta);
  });
}

export async function obtenerRuta(): Promise<RutaMedidor[]> {
  const medidores = await db.ruta.toArray();
  return medidores.sort((a, b) => a.ordenRuta - b.ordenRuta);
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export async function buscarRuta(termino: string): Promise<RutaMedidor[]> {
  const texto = normalizar(termino);
  const medidores = await obtenerRuta();
  if (!texto) return medidores;
  return medidores.filter((medidor) =>
    [medidor.numero, medidor.nombreSocio, medidor.sector, medidor.rutSocio].some((campo) =>
      normalizar(campo).includes(texto),
    ),
  );
}

export async function obtenerMedidor(medidorId: string): Promise<RutaMedidor | undefined> {
  return db.ruta.get(medidorId);
}

export async function obtenerMeta(): Promise<MetaRuta | undefined> {
  return db.meta.get('ruta-actual');
}

export async function guardarLectura(lectura: LecturaPendiente): Promise<void> {
  await db.syncQueue.put(lectura);
}

export async function obtenerPendientes(): Promise<LecturaPendiente[]> {
  const pendientes = await db.syncQueue.where('sincronizado').equals(0).toArray();
  return pendientes.sort((a, b) => (a.ordenRuta ?? 0) - (b.ordenRuta ?? 0) || a.clientUuid.localeCompare(b.clientUuid));
}

/** Todas las lecturas guardadas en el equipo, ordenadas de la más reciente a la más antigua. */
export async function obtenerLecturasLocales(): Promise<LecturaPendiente[]> {
  const lecturas = await db.syncQueue.toArray();
  return lecturas.sort((a, b) => b.tomadaEn.localeCompare(a.tomadaEn));
}

export async function obtenerUltimaLectura(): Promise<LecturaPendiente | undefined> {
  return (await obtenerLecturasLocales())[0];
}

export interface EstadoMedidorLocal {
  /** Existe alguna lectura guardada para el medidor. */
  registrado: boolean;
  /** Tiene lecturas guardadas esperando envío. */
  pendiente: boolean;
  sincronizado: boolean;
  incidencia: boolean;
}

export async function estadosPorMedidor(): Promise<Map<string, EstadoMedidorLocal>> {
  const lecturas = await db.syncQueue.toArray();
  const estados = new Map<string, EstadoMedidorLocal>();
  for (const lectura of lecturas) {
    const actual = estados.get(lectura.medidorId) ?? {
      registrado: false,
      pendiente: false,
      sincronizado: false,
      incidencia: false,
    };
    actual.registrado = true;
    if (lectura.sincronizado === 0) actual.pendiente = true;
    else actual.sincronizado = true;
    if (lectura.incidencia !== 'NINGUNA') actual.incidencia = true;
    estados.set(lectura.medidorId, actual);
  }
  return estados;
}

export async function contarPendientes(): Promise<number> {
  return db.syncQueue.where('sincronizado').equals(0).count();
}

export async function contarSincronizados(): Promise<number> {
  return db.syncQueue.where('sincronizado').equals(1).count();
}

export async function marcarSincronizados(clientUuids: string[]): Promise<void> {
  if (clientUuids.length === 0) return;
  await db.syncQueue.where('clientUuid').anyOf(clientUuids).modify({ sincronizado: 1 });
}

export async function eliminarSincronizados(): Promise<void> {
  await db.syncQueue.where('sincronizado').equals(1).delete();
}

export async function pendientesPorMedidor(): Promise<Set<string>> {
  const pendientes = await obtenerPendientes();
  return new Set(pendientes.map((lectura) => lectura.medidorId));
}

export async function limpiarBase(): Promise<void> {
  await db.transaction('rw', db.ruta, db.syncQueue, db.meta, async () => {
    await db.ruta.clear();
    await db.syncQueue.clear();
    await db.meta.clear();
  });
}

export async function solicitarPersistencia(): Promise<boolean> {
  if (!('storage' in navigator) || typeof navigator.storage.persist !== 'function') return false;
  try {
    await navigator.storage.persist();
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}
