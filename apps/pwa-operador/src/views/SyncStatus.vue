<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppIcon from '../../../../packages/design-system/src/components/AppIcon.vue';
import ConfirmDialog from '../../../../packages/design-system/src/components/ConfirmDialog.vue';
import EmptyState from '../../../../packages/design-system/src/components/EmptyState.vue';
import StatusBadge from '../../../../packages/design-system/src/components/StatusBadge.vue';
import { useOnline } from '@/composables/useOnline';
import {
  formatearUltimaSincronizacion,
  sincronizarPendientes,
  sincronizando,
  ultimaSincronizacion,
  ultimoResultado,
} from '@/composables/useSync';
import {
  contarSincronizados,
  eliminarSincronizados,
  obtenerMeta,
  obtenerPendientes,
} from '@/db/dexie';
import type { LecturaPendiente } from '@/types';

const router = useRouter();
const { online } = useOnline();

const pendientes = ref<LecturaPendiente[]>([]);
const guardadas = ref(0);
const periodo = ref('');
const mensaje = ref('');
const confirmando = ref(false);

const total = computed(() => pendientes.value.length);
const rechazadas = computed(() => ultimoResultado.value?.errores.length ?? 0);
const yaRegistradas = computed(() => ultimoResultado.value?.duplicados ?? 0);
const estado = computed(() => {
  if (sincronizando.value) return { etiqueta: 'En proceso', tono: 'info' as const };
  if (!online.value) return { etiqueta: 'Sin conexión', tono: 'warning' as const };
  if (total.value === 0) return { etiqueta: 'Todo actualizado', tono: 'success' as const };
  return { etiqueta: 'Pendiente de envío', tono: 'warning' as const };
});

const etiquetasIncidencia: Record<string, string> = {
  NINGUNA: 'Sin incidencia',
  VUELTA_MEDIDOR: 'Vuelta del medidor',
  MEDIDOR_TRABADO: 'Medidor trabajado',
  CASA_CERRADA: 'Casa cerrada',
  MEDIDOR_DANADO: 'Medidor dañado',
};

async function cargar(): Promise<void> {
  pendientes.value = await obtenerPendientes();
  guardadas.value = await contarSincronizados();
  periodo.value = (await obtenerMeta())?.periodo ?? '';
}

async function enviar(): Promise<void> {
  const resultado = await sincronizarPendientes();
  mensaje.value = resultado.mensaje;
  await cargar();
}

async function limpiar(): Promise<void> {
  confirmando.value = false;
  await eliminarSincronizados();
  mensaje.value = 'Registros enviados eliminados del equipo.';
  await cargar();
}

onMounted(cargar);
</script>

<template>
  <div class="pwa-page">
    <div class="apr-page-header">
      <div>
        <h1>Envíos</h1>
        <p class="apr-page-subtitle">
          Las lecturas quedan guardadas en el equipo y se envían al servidor cuando hay conexión.
        </p>
      </div>
      <StatusBadge :label="estado.etiqueta" :tone="estado.tono" />
    </div>

    <div v-if="mensaje" class="apr-alert" :class="mensaje.startsWith('Sin conexión') ? 'apr-alert--warning' : 'apr-alert--info'" role="status">
      {{ mensaje }}
    </div>

    <div class="apr-card">
      <dl class="apr-stat-grid">
        <div class="apr-stat">
          <dt>Pendientes</dt>
          <dd class="apr-num">{{ total }}</dd>
        </div>
        <div class="apr-stat">
          <dt>En proceso</dt>
          <dd class="apr-num">{{ sincronizando ? 1 : 0 }}</dd>
        </div>
        <div class="apr-stat">
          <dt>Enviadas</dt>
          <dd class="apr-num">{{ guardadas }}</dd>
        </div>
        <div class="apr-stat">
          <dt>Rechazadas</dt>
          <dd class="apr-num">{{ rechazadas }}</dd>
        </div>
      </dl>
      <p class="apr-meta" style="margin: var(--space-4) 0 0">
        Ciclo local: {{ periodo || 'sin ruta descargada' }} · Último envío:
        {{ formatearUltimaSincronizacion(ultimaSincronizacion) }}
      </p>
      <p v-if="yaRegistradas > 0" class="apr-meta" style="margin: 4px 0 0">
        {{ yaRegistradas }} lectura(s) ya estaban registradas y no se duplicaron.
      </p>
    </div>

    <div v-if="ultimoResultado?.errores.length" class="apr-card pwa-seccion">
      <h2 class="apr-section-title">Lecturas que necesitan revisión</h2>
      <ul class="apr-list">
        <li v-for="error in ultimoResultado.errores" :key="error.mensaje" class="apr-alert apr-alert--danger">
          {{ error.mensaje }}
        </li>
      </ul>
    </div>

    <button
      class="apr-btn apr-btn--primary apr-btn--wide"
      style="margin-top: var(--space-5)"
      :disabled="!online || sincronizando || total === 0"
      :aria-busy="sincronizando"
      @click="enviar"
    >
      <AppIcon name="refresh" :size="18" />
      {{ sincronizando ? 'Sincronizando lecturas…' : `Enviar lecturas (${total})` }}
    </button>

    <div class="pwa-seccion">
      <h2 class="apr-section-title">Lecturas pendientes</h2>
      <div v-if="total === 0" class="apr-card">
        <EmptyState icon="check" title="Todo actualizado" description="No hay lecturas esperando envío.">
          <button class="apr-btn apr-btn--small" style="margin-top: var(--space-3)" @click="router.push('/ruta')">Ir a la ruta</button>
        </EmptyState>
      </div>
      <div v-else class="pwa-lista">
        <div v-for="lectura in pendientes" :key="lectura.numeroMedidor + lectura.tomadaEn" class="pwa-fila">
          <span class="pwa-fila__orden"><AppIcon name="clock" :size="16" /></span>
          <span class="pwa-fila__cuerpo">
            <span class="pwa-fila__numero apr-num">{{ lectura.numeroMedidor ?? 'Medidor' }}</span>
            <span class="pwa-fila__socio">{{ lectura.nombreSocio ?? 'Socio' }} · {{ lectura.lecturaActual }} m³</span>
            <span class="pwa-fila__meta">{{ etiquetasIncidencia[lectura.incidencia] ?? lectura.incidencia }}</span>
          </span>
          <StatusBadge label="Guardada" tone="warning" />
        </div>
      </div>
    </div>

    <section class="pwa-seccion pwa-seccion--secundaria">
      <h2 class="apr-section-title">Mantenimiento del equipo</h2>
      <p class="apr-meta">Elimina solo los registros ya enviados. Las lecturas pendientes nunca se borran.</p>
      <button class="apr-btn apr-btn--small" style="margin-top: var(--space-3)" :disabled="guardadas === 0" @click="confirmando = true">
        Limpiar registros enviados
      </button>
    </section>

    <ConfirmDialog
      :open="confirmando"
      title="Limpiar registros enviados"
      message="Se eliminarán del equipo únicamente las lecturas confirmadas por el servidor. Las pendientes se conservarán."
      confirm-label="Eliminar enviados"
      tone="danger"
      @confirm="limpiar"
      @cancel="confirmando = false"
    />
  </div>
</template>
