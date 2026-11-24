<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppIcon from '../../../../packages/design-system/src/components/AppIcon.vue';
import EmptyState from '../../../../packages/design-system/src/components/EmptyState.vue';
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
const sincronizados = ref(0);
const cicloServidor = ref<Ciclo | null>(null);
const consultando = ref(false);
const errorCiclo = ref(false);

const cicloAbierto = computed(() => {
  if (!online.value) return true;
  if (consultando.value) return true;
  if (!cicloServidor.value) return true;
  return cicloServidor.value.estado === 'ABIERTO' || cicloServidor.value.esAbierto === true;
});

const total = computed(() => ruta.value.length);
const registrados = computed(
  () =>
    new Set(
      lecturas.value
        .filter((lectura) => lectura.cicloId === meta.value?.cicloId)
        .map((lectura) => lectura.medidorId),
    ).size,
);
const avance = computed(() => (total.value === 0 ? 0 : Math.round((registrados.value / total.value) * 100)));
const incidencias = computed(
  () =>
    new Set(
      lecturas.value
        .filter((lectura) => lectura.cicloId === meta.value?.cicloId && lectura.incidencia !== 'NINGUNA')
        .map((lectura) => lectura.medidorId),
    ).size,
);
const ultimaLectura = computed(() => lecturas.value[0]);

const cta = computed(() => {
  if (!meta.value || total.value === 0) {
    return { etiqueta: 'Descargar ruta', destino: '/descargar', icono: 'download' };
  }
  if (pendientes.value > 0) {
    return { etiqueta: 'Continuar ruta', destino: '/ruta', icono: 'arrowRight' };
  }
  return { etiqueta: 'Ver resumen', destino: '/resumen', icono: 'clipboard' };
});

function formatear(iso: string): string {
  return new Date(iso).toLocaleString('es-CL', {
    timeZone: 'America/Santiago',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

async function cargar(): Promise<void> {
  meta.value = await obtenerMeta();
  ruta.value = await obtenerRuta();
  lecturas.value = await obtenerLecturasLocales();
  pendientes.value = await contarPendientes();
  sincronizados.value = await contarSincronizados();

  if (online.value) {
    consultando.value = true;
    errorCiclo.value = false;
    try {
      const { data } = await api.get<Ciclo | null>('/ciclos/activo');
      cicloServidor.value = data;
    } catch {
      cicloServidor.value = null;
      errorCiclo.value = true;
    } finally {
      consultando.value = false;
    }
  }
}

onMounted(cargar);
</script>

<template>
  <div class="pwa-page">
    <div class="apr-page-header">
      <div>
        <h1>Inicio</h1>
        <p class="apr-page-subtitle">
          {{ meta ? `Ruta del ciclo ${meta.periodo}` : 'Tu trabajo en terreno, en un solo lugar.' }}
        </p>
      </div>
      <button class="apr-btn apr-btn--primary" @click="router.push(cta.destino)">
        <AppIcon :name="cta.icono" :size="18" />
        {{ cta.etiqueta }}
      </button>
    </div>

    <div v-if="errorCiclo" class="apr-alert apr-alert--warning" role="status">
      No pudimos consultar el ciclo activo. Puedes seguir trabajando con la ruta guardada en este equipo.
    </div>

    <div v-if="!cicloAbierto" class="apr-card">
      <EmptyState
        icon="calendar"
        title="No hay un ciclo abierto"
        description="Cuando el administrador abra un ciclo podrás descargar la ruta y comenzar a tomar lecturas."
      />
    </div>

    <template v-else>
      <div class="apr-card">
        <div class="pwa-seccion__titulo">
          <h2>Avance de la ruta</h2>
          <StatusBadge
            :label="meta ? 'Ruta descargada' : 'Sin ruta descargada'"
            :tone="meta ? 'success' : 'warning'"
          />
        </div>

        <div class="apr-progress" role="progressbar" :aria-valuenow="avance" aria-valuemin="0" aria-valuemax="100" :aria-label="`Avance ${avance}%`">
          <span :style="{ width: `${avance}%` }"></span>
        </div>
        <p class="apr-meta apr-num" style="margin: 8px 0 0">{{ registrados }} de {{ total }} medidores · {{ avance }}%</p>

        <dl class="apr-stat-grid" style="margin-top: var(--space-4)">
          <div class="apr-stat">
            <dt>Medidores en ruta</dt>
            <dd class="apr-num">{{ total }}</dd>
          </div>
          <div class="apr-stat">
            <dt>Registrados</dt>
            <dd class="apr-num">{{ registrados }}</dd>
          </div>
          <div class="apr-stat">
            <dt>Por sincronizar</dt>
            <dd class="apr-num">{{ pendientes }}</dd>
          </div>
          <div class="apr-stat">
            <dt>Incidencias</dt>
            <dd class="apr-num">{{ incidencias }}</dd>
          </div>
        </dl>
      </div>

      <div class="apr-card pwa-seccion">
        <h2 class="apr-section-title">Estado de este equipo</h2>
        <dl class="pwa-detalle">
          <dt>Conexión</dt>
          <dd>{{ online ? 'En línea' : 'Sin conexión' }}</dd>
          <dt>Descarga</dt>
          <dd>{{ meta ? `Ciclo ${meta.periodo} · ${formatear(meta.descargadaEn)}` : 'Sin ruta descargada' }}</dd>
          <dt>Última lectura</dt>
          <dd>
            <template v-if="ultimaLectura">
              {{ ultimaLectura.numeroMedidor ?? 'Medidor' }} · {{ ultimaLectura.lecturaActual }} m³ ·
              {{ formatear(ultimaLectura.tomadaEn) }}
            </template>
            <template v-else>—</template>
          </dd>
          <dt>Envíos confirmados</dt>
          <dd class="apr-num">{{ sincronizados }}</dd>
        </dl>
      </div>
    </template>
  </div>
</template>
