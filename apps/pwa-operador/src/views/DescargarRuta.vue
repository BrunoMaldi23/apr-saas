<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppIcon from '../../../../packages/design-system/src/components/AppIcon.vue';
import ConfirmDialog from '../../../../packages/design-system/src/components/ConfirmDialog.vue';
import StatusBadge from '../../../../packages/design-system/src/components/StatusBadge.vue';
import { api } from '@/api/client';
import { useOnline } from '@/composables/useOnline';
import { contarPendientes, guardarRuta, obtenerMeta, obtenerRuta } from '@/db/dexie';
import type { Ciclo, MetaRuta, RutaOfflineResponse } from '@/types';

const router = useRouter();
const { online } = useOnline();

const ciclo = ref<Ciclo | null>(null);
const meta = ref<MetaRuta | undefined>();
const local = ref(0);
const pendientes = ref(0);
const cargando = ref(false);
const error = ref('');
const confirmando = ref(false);

const cicloAbierto = computed(() => !!ciclo.value && (ciclo.value.estado === 'ABIERTO' || ciclo.value.esAbierto === true));
const mismoCiclo = computed(() => !!meta.value && !!ciclo.value && meta.value.cicloId === ciclo.value.id);
const etiquetaBoton = computed(() => {
  if (cargando.value) return 'Descargando ruta…';
  return mismoCiclo.value ? 'Actualizar ruta' : 'Descargar ruta';
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
  local.value = (await obtenerRuta()).length;
  pendientes.value = await contarPendientes();
  if (!online.value) return;
  try {
    const { data } = await api.get<Ciclo | null>('/ciclos/activo');
    ciclo.value = data;
  } catch {
    ciclo.value = null;
  }
}

async function ejecutarDescarga(): Promise<void> {
  if (!ciclo.value || !cicloAbierto.value) {
    error.value = 'No hay un ciclo abierto disponible para descargar.';
    return;
  }

  cargando.value = true;
  error.value = '';
  try {
    const { data } = await api.get<RutaOfflineResponse>(`/ciclos/${ciclo.value.id}/ruta-offline`);
    await guardarRuta({
      meta: {
        key: 'ruta-actual',
        comiteId: data.comiteId,
        cicloId: data.cicloId,
        periodo: data.periodo,
        descargadaEn: data.descargadaEn,
      },
      medidores: data.medidores,
    });
    meta.value = await obtenerMeta();
    local.value = data.medidores.length;
    await router.push('/ruta');
  } catch {
    error.value = 'No pudimos actualizar la ruta. Puedes continuar utilizando los datos guardados.';
  } finally {
    cargando.value = false;
  }
}

async function descargar(): Promise<void> {
  if (pendientes.value > 0 && meta.value) {
    confirmando.value = true;
    return;
  }
  await ejecutarDescarga();
}

onMounted(cargar);
</script>

<template>
  <div class="pwa-page">
    <div class="apr-page-header">
      <div>
        <h1>{{ mismoCiclo ? 'Actualizar ruta' : 'Descargar ruta' }}</h1>
        <p class="apr-page-subtitle">
          Guarda en este equipo los medidores, lecturas anteriores y promedios del ciclo abierto.
        </p>
      </div>
    </div>

    <div v-if="error" class="apr-alert apr-alert--danger" role="alert">{{ error }}</div>

    <div v-if="!online" class="apr-alert apr-alert--warning" role="status">
      Necesitas descargar una ruta antes de trabajar sin conexión. Si ya la descargaste, puedes seguir tomando lecturas.
    </div>

    <div class="apr-card">
      <div class="pwa-seccion__titulo">
        <h2>Ciclo en el servidor</h2>
        <StatusBadge
          :label="ciclo ? (cicloAbierto ? 'Abierto' : 'Cerrado') : 'No disponible'"
          :tone="cicloAbierto ? 'success' : 'warning'"
        />
      </div>
      <p class="apr-num" style="margin: 0; font-size: 24px; font-weight: 620">
        {{ ciclo ? ciclo.periodo : '—' }}
      </p>
      <p class="apr-meta" style="margin: 4px 0 0">
        {{ ciclo ? (cicloAbierto ? 'Listo para descargar' : 'Espera a que se abra un nuevo ciclo') : 'Sin conexión con el servidor' }}
      </p>
    </div>

    <div class="apr-card pwa-seccion">
      <h2 class="apr-section-title">Datos guardados en este equipo</h2>
      <dl class="apr-stat-grid">
        <div class="apr-stat">
          <dt>Medidores</dt>
          <dd class="apr-num">{{ local }}</dd>
        </div>
        <div class="apr-stat">
          <dt>Por sincronizar</dt>
          <dd class="apr-num">{{ pendientes }}</dd>
        </div>
      </dl>
      <p v-if="meta" class="apr-meta" style="margin: var(--space-4) 0 0">
        Última descarga: {{ meta.periodo }} · {{ formatear(meta.descargadaEn) }}
      </p>
      <p v-else class="apr-meta" style="margin: var(--space-4) 0 0">Aún no hay una ruta guardada.</p>
    </div>

    <button
      class="apr-btn apr-btn--primary apr-btn--wide"
      style="margin-top: var(--space-5)"
      :disabled="cargando || !online || !cicloAbierto"
      :aria-busy="cargando"
      @click="descargar"
    >
      <AppIcon :name="cargando ? 'refresh' : 'download'" :size="18" />
      {{ etiquetaBoton }}
    </button>

    <ConfirmDialog
      :open="confirmando"
      title="Actualizar la ruta"
      message="Tienes lecturas pendientes de envío. La ruta se actualizará sin borrar esas lecturas, pero puedes seguir trabajando con los datos guardados."
      confirm-label="Actualizar ruta"
      @confirm="confirmando = false; void ejecutarDescarga()"
      @cancel="confirmando = false"
    />
  </div>
</template>
