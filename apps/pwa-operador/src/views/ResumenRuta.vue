<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppIcon from '../../../../packages/design-system/src/components/AppIcon.vue';
import ConfirmDialog from '../../../../packages/design-system/src/components/ConfirmDialog.vue';
import StatusBadge from '../../../../packages/design-system/src/components/StatusBadge.vue';
import { api } from '@/api/client';
import { useOnline } from '@/composables/useOnline';
import {
  contarPendientes,
  contarSincronizados,
  obtenerLecturasLocales,
  obtenerMeta,
  obtenerRuta,
} from '@/db/dexie';
import type { Ciclo, LecturaPendiente, MetaRuta, RutaMedidor } from '@/types';

const router = useRouter();
const { online } = useOnline();

const meta = ref<MetaRuta | undefined>();
const ruta = ref<RutaMedidor[]>([]);
const lecturas = ref<LecturaPendiente[]>([]);
const pendientes = ref(0);
const sincronizadas = ref(0);
const cicloServidor = ref<Ciclo | null>(null);
const completada = ref(false);
const confirmando = ref(false);

const lecturasCiclo = computed(() =>
  lecturas.value.filter((lectura) => lectura.cicloId === meta.value?.cicloId),
);
const registrados = computed(() => new Set(lecturasCiclo.value.map((lectura) => lectura.medidorId)).size);
const incidencias = computed(
  () => new Set(lecturasCiclo.value.filter((lectura) => lectura.incidencia !== 'NINGUNA').map((lectura) => lectura.medidorId)).size,
);
const normales = computed(() => Math.max(0, registrados.value - incidencias.value));
const sincronizacionCompleta = computed(() => pendientes.value === 0 && sincronizadas.value > 0);
const cicloCerrado = computed(() => cicloServidor.value?.estado === 'CERRADO');
const rutaCompleta = computed(() => completada.value || (ruta.value.length > 0 && registrados.value >= ruta.value.length));

function claveCompletada(cicloId: string): string {
  return `apr_ruta_completada_${cicloId}`;
}

async function cargar(): Promise<void> {
  meta.value = await obtenerMeta();
  ruta.value = await obtenerRuta();
  lecturas.value = await obtenerLecturasLocales();
  pendientes.value = await contarPendientes();
  sincronizadas.value = await contarSincronizados();
  if (meta.value) {
    try {
      completada.value = localStorage.getItem(claveCompletada(meta.value.cicloId)) === '1';
    } catch {
      completada.value = false;
    }
  }
  if (online.value) {
    try {
      const { data } = await api.get<Ciclo | null>('/ciclos/activo');
      cicloServidor.value = data;
    } catch {
      cicloServidor.value = null;
    }
  }
}

function marcarCompletada(): void {
  confirmando.value = false;
  if (!meta.value) return;
  completada.value = true;
  try {
    localStorage.setItem(claveCompletada(meta.value.cicloId), '1');
  } catch {
    // El estado en memoria sigue siendo válido para esta sesión.
  }
}

onMounted(cargar);
</script>

<template>
  <div class="pwa-page">
    <div class="apr-page-header">
      <div>
        <h1>Resumen de la ruta</h1>
        <p class="apr-page-subtitle">
          {{ meta ? `Ciclo ${meta.periodo}` : 'Sin ruta descargada' }} · estado de la lectura en terreno.
        </p>
      </div>
    </div>

    <div class="apr-card">
      <div class="pwa-lista-menu">
        <div class="pwa-menu-item">
          <AppIcon name="route" :size="19" />
          <span class="pwa-menu-item__texto"><strong>Ruta completada</strong><small>{{ rutaCompleta ? 'Todos los medidores tienen lectura' : 'Aún hay medidores por registrar' }}</small></span>
          <StatusBadge :label="rutaCompleta ? 'Sí' : 'No'" :tone="rutaCompleta ? 'success' : 'warning'" />
        </div>
        <div class="pwa-menu-item">
          <AppIcon name="refresh" :size="19" />
          <span class="pwa-menu-item__texto"><strong>Sincronización completa</strong><small>{{ pendientes }} lectura(s) por enviar</small></span>
          <StatusBadge :label="sincronizacionCompleta ? 'Sí' : 'No'" :tone="sincronizacionCompleta ? 'success' : 'warning'" />
        </div>
        <div class="pwa-menu-item">
          <AppIcon name="shield" :size="19" />
          <span class="pwa-menu-item__texto"><strong>Ciclo cerrado</strong><small>El cierre se realiza en el backoffice</small></span>
          <StatusBadge :label="cicloCerrado ? 'Sí' : 'No'" :tone="cicloCerrado ? 'info' : 'neutral'" />
        </div>
      </div>
    </div>

    <div class="apr-card pwa-seccion">
      <h2 class="apr-section-title">Lecturas</h2>
      <dl class="apr-stat-grid">
        <div class="apr-stat"><dt>Medidores registrados</dt><dd class="apr-num">{{ registrados }} / {{ ruta.length }}</dd></div>
        <div class="apr-stat"><dt>Lecturas normales</dt><dd class="apr-num">{{ normales }}</dd></div>
        <div class="apr-stat"><dt>Incidencias</dt><dd class="apr-num">{{ incidencias }}</dd></div>
        <div class="apr-stat"><dt>Por sincronizar</dt><dd class="apr-num">{{ pendientes }}</dd></div>
      </dl>
    </div>

    <div class="apr-alert apr-alert--info pwa-seccion" role="note">
      Marcar la ruta como completada no cierra el ciclo ni factura. El cierre se realiza desde el backoffice cuando corresponda.
    </div>

    <div class="pwa-lista-menu pwa-seccion">
      <button v-if="!rutaCompleta" class="apr-btn apr-btn--primary apr-btn--wide" :disabled="!meta" @click="confirmando = true">
        Marcar ruta como completada
      </button>
      <button class="apr-btn apr-btn--wide" @click="router.push('/sincronizar')">Ver estado de envíos</button>
      <button class="apr-btn apr-btn--wide" @click="router.push('/inicio')">Volver al inicio</button>
    </div>

    <ConfirmDialog
      :open="confirmando"
      title="Marcar ruta como completada"
      message="Esta acción solo registra el estado en este equipo. No cierra el ciclo ni envía información al servidor."
      confirm-label="Marcar completada"
      @confirm="marcarCompletada"
      @cancel="confirmando = false"
    />
  </div>
</template>
