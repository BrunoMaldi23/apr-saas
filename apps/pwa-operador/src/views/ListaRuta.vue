<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppIcon from '../../../../packages/design-system/src/components/AppIcon.vue';
import EmptyState from '../../../../packages/design-system/src/components/EmptyState.vue';
import StatusBadge from '../../../../packages/design-system/src/components/StatusBadge.vue';
import {
  buscarRuta,
  estadosPorMedidor,
  obtenerMeta,
  obtenerRuta,
  type EstadoMedidorLocal,
} from '@/db/dexie';
import type { RutaMedidor } from '@/types';

const router = useRouter();

type Filtro = 'todos' | 'pendientes' | 'leidos' | 'incidencias';
const filtros: Array<{ valor: Filtro; etiqueta: string }> = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'pendientes', etiqueta: 'Pendientes' },
  { valor: 'leidos', etiqueta: 'Leídos' },
  { valor: 'incidencias', etiqueta: 'Incidencias' },
];

const filtro = ref<Filtro>((sessionStorage.getItem('apr_ruta_filtro') as Filtro) || 'todos');
const termino = ref(sessionStorage.getItem('apr_ruta_busqueda') ?? '');
const medidores = ref<RutaMedidor[]>([]);
const estados = ref<Map<string, EstadoMedidorLocal>>(new Map());
const periodo = ref('');
const flash = ref('');
let temporizador: ReturnType<typeof setTimeout> | null = null;

const visibles = computed(() =>
  medidores.value.filter((medidor) => {
    const estado = estados.value.get(medidor.medidorId);
    if (filtro.value === 'pendientes') return !estado?.registrado;
    if (filtro.value === 'leidos') return !!estado?.registrado;
    if (filtro.value === 'incidencias') return !!estado?.incidencia;
    return true;
  }),
);

function estadoDe(id: string): EstadoMedidorLocal {
  return estados.value.get(id) ?? { registrado: false, pendiente: false, sincronizado: false, incidencia: false };
}

function estadoVisual(id: string): { etiqueta: string; tono: 'neutral' | 'warning' | 'danger' | 'success' } {
  const estado = estadoDe(id);
  if (!estado.registrado) return { etiqueta: 'Sin lectura', tono: 'neutral' };
  if (estado.incidencia) return { etiqueta: 'Incidencia', tono: 'danger' };
  if (estado.pendiente) return { etiqueta: 'Guardada', tono: 'warning' };
  return { etiqueta: 'Enviada', tono: 'success' };
}

async function cargar(): Promise<void> {
  medidores.value = termino.value ? await buscarRuta(termino.value) : await obtenerRuta();
  estados.value = await estadosPorMedidor();
  periodo.value = (await obtenerMeta())?.periodo ?? '';
}

function alBuscar(): void {
  sessionStorage.setItem('apr_ruta_busqueda', termino.value);
  if (temporizador) clearTimeout(temporizador);
  temporizador = setTimeout(() => void cargar(), 120);
}

function alFiltrar(valor: Filtro): void {
  filtro.value = valor;
  sessionStorage.setItem('apr_ruta_filtro', valor);
}

function tomarLectura(medidor: RutaMedidor): void {
  void router.push({ name: 'captura', query: { medidorId: medidor.medidorId } });
}

onMounted(async () => {
  flash.value = sessionStorage.getItem('apr_flash') ?? '';
  sessionStorage.removeItem('apr_flash');
  await cargar();
  await nextTick();
  const guardado = Number(sessionStorage.getItem('apr_ruta_scroll') ?? '0');
  if (guardado > 0) window.scrollTo({ top: guardado, behavior: 'instant' });
});

onBeforeUnmount(() => {
  sessionStorage.setItem('apr_ruta_scroll', String(window.scrollY));
  if (temporizador) clearTimeout(temporizador);
});
</script>

<template>
  <div class="pwa-page">
    <div class="apr-page-header">
      <div>
        <h1>Ruta{{ periodo ? ` · ${periodo}` : '' }}</h1>
        <p class="apr-page-subtitle">Selecciona un medidor para registrar su lectura. La búsqueda funciona sin conexión.</p>
      </div>
    </div>

    <div v-if="flash" class="pwa-toast" role="status">
      <AppIcon name="check" :size="17" />
      {{ flash }}
    </div>

    <div class="pwa-buscar">
      <span class="pwa-buscar__icono"><AppIcon name="search" :size="18" /></span>
      <label class="apr-sr-only" for="buscar">Buscar medidor, socio o sector</label>
      <input
        id="buscar"
        v-model="termino"
        class="apr-input"
        type="search"
        autocomplete="off"
        placeholder="Medidor, socio o sector"
        @input="alBuscar"
      />
    </div>

    <div class="pwa-filtros" role="group" aria-label="Filtrar ruta">
      <button
        v-for="opcion in filtros"
        :key="opcion.valor"
        type="button"
        class="pwa-filtro"
        :aria-pressed="filtro === opcion.valor"
        @click="alFiltrar(opcion.valor)"
      >
        {{ opcion.etiqueta }}
      </button>
    </div>

    <p class="apr-meta apr-num">{{ visibles.length }} de {{ medidores.length }} medidores</p>

    <div v-if="visibles.length === 0" class="pwa-seccion">
      <EmptyState
        :icon="medidores.length === 0 ? 'download' : 'search'"
        :title="medidores.length === 0 ? 'No hay ruta descargada' : 'Sin resultados'"
        :description="
          medidores.length === 0
            ? 'Descarga la ruta del ciclo abierto para comenzar a tomar lecturas.'
            : 'Prueba con otro medidor, socio o sector, o cambia el filtro.'
        "
      >
        <button v-if="medidores.length === 0" class="apr-btn apr-btn--primary" style="margin-top: var(--space-3)" @click="router.push('/descargar')">
          Descargar ruta
        </button>
      </EmptyState>
    </div>

    <div v-else class="pwa-lista pwa-seccion">
      <button
        v-for="medidor in visibles"
        :key="medidor.medidorId"
        type="button"
        class="pwa-fila"
        :aria-label="`Tomar lectura del medidor ${medidor.numero}, socio ${medidor.nombreSocio}`"
        @click="tomarLectura(medidor)"
      >
        <span class="pwa-fila__orden apr-num">{{ medidor.ordenRuta }}</span>
        <span class="pwa-fila__cuerpo">
          <span class="pwa-fila__numero apr-num">{{ medidor.numero }}</span>
          <span class="pwa-fila__socio">{{ medidor.nombreSocio }}</span>
          <span class="pwa-fila__meta">
            <span>{{ medidor.sector }}</span>
            <span>Anterior <span class="pwa-fila__num">{{ medidor.lecturaAnterior }}</span> m³</span>
            <span>Promedio <span class="pwa-fila__num">{{ medidor.promedio3m }}</span> m³</span>
          </span>
        </span>
        <StatusBadge
          :label="estadoVisual(medidor.medidorId).etiqueta"
          :tone="estadoVisual(medidor.medidorId).tono"
        />
        <AppIcon name="chevronRight" :size="18" />
      </button>
    </div>
  </div>
</template>
