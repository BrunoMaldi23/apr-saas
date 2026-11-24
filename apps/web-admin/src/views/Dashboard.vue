<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, mensajeError } from '@/api/client';
import KpiCard from '@/components/KpiCard.vue';
import { useAuthStore } from '@/stores/auth';
import { clpOpcional, numero } from '@/utils/formato';
import type { Comite, ResumenDashboard } from '@/types';

const router = useRouter();
const auth = useAuthStore();
const datos = ref<ResumenDashboard | null>(null);
const comite = ref<Comite | null>(null);
const error = ref('');
const cargando = ref(false);

const avance = computed(() => {
  const valor = datos.value?.kpis.avanceLecturasPct ?? 0;
  return Math.min(100, Math.max(0, valor));
});

function numeroOpcional(valor?: number | null): string {
  return valor == null ? '—' : numero(valor);
}

function m3Opcional(valor?: number | null): string {
  return valor == null ? '—' : `${valor} m³`;
}

async function cargar(): Promise<void> {
  cargando.value = true;
  error.value = '';
  try {
    const [resumen, configuracion] = await Promise.all([
      api.get<ResumenDashboard>('/dashboard/resumen'),
      api.get<Comite>('/comites/actual'),
    ]);
    datos.value = resumen.data;
    comite.value = configuracion.data;
  } catch (e) {
    error.value = mensajeError(e);
  } finally {
    cargando.value = false;
  }
}

onMounted(cargar);
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-lg font-semibold text-text-primary">Resumen del ciclo</h1>
        <p class="text-xs text-text-secondary">Hola, {{ auth.user?.nombre }} · {{ auth.user?.comiteNombre }}</p>
      </div>
      <button class="btn-secondary" :disabled="cargando" :aria-busy="cargando" @click="cargar">Actualizar</button>
    </div>

    <p v-if="error" class="apr-alert apr-alert--danger" role="alert">{{ error }}</p>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        titulo="Socios activos"
        :valor="numeroOpcional(datos?.kpis.totalSocios)"
        :detalle="`${numeroOpcional(datos?.kpis.totalMedidores)} medidores`"
      />
      <KpiCard
        titulo="Lecturas tomadas"
        :valor="numeroOpcional(datos?.kpis.lecturasTomadas)"
        :detalle="`${numeroOpcional(datos?.kpis.lecturasPendientes)} pendientes`"
        tono="bueno"
      />
      <KpiCard
        titulo="Recaudación del mes"
        :valor="clpOpcional(datos?.kpis.recaudacionMesClp)"
        detalle="Pagos del mes en América/Santiago"
      />
      <KpiCard
        titulo="Morosidad total"
        :valor="clpOpcional(datos?.kpis.morosidadTotalClp)"
        detalle="Saldos impagos acumulados"
        tono="alerta"
      />
    </div>

    <div class="card p-4">
      <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-sm font-semibold text-text-primary">Avance de toma de lecturas</h2>
          <p class="text-xs text-text-secondary">
            Ciclo {{ datos?.ciclo?.periodo ?? 'sin ciclo' }} ·
            {{ numeroOpcional(datos?.kpis.lecturasTomadas) }} de
            {{ numeroOpcional(datos?.kpis.totalMedidores) }} medidores
          </p>
        </div>
        <span class="apr-num text-2xl font-semibold text-primary">{{ avance }}%</span>
      </div>
      <div
        class="h-3 w-full max-w-2xl overflow-hidden rounded-full bg-surface-secondary"
        role="progressbar"
        aria-label="Avance de toma de lecturas"
        :aria-valuenow="avance"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div class="h-full rounded-full bg-primary transition-all" :style="{ width: `${avance}%` }" />
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        <button class="btn-secondary" @click="router.push('/socios')">Ver padrón</button>
        <button class="btn-secondary" @click="router.push('/ciclos')">Gestionar ciclos</button>
        <button class="btn-primary" @click="router.push('/cobros')">Ver cobros ({{ datos?.kpis.cobrosCiclo ?? '—' }})</button>
      </div>
    </div>

    <div class="card p-4">
      <h2 class="mb-3 text-sm font-semibold text-text-primary">Parámetros vigentes</h2>
      <div class="grid gap-3 text-xs sm:grid-cols-3">
        <div class="rounded border border-line p-2">
          <p class="label">Cargo fijo</p>
          <p class="apr-num font-semibold text-text-primary">{{ clpOpcional(comite?.cargoFijoClp) }}</p>
        </div>
        <div class="rounded border border-line p-2">
          <p class="label">Tarifa por m³</p>
          <p class="apr-num font-semibold text-text-primary">{{ clpOpcional(comite?.tarifaM3Clp) }}</p>
        </div>
        <div class="rounded border border-line p-2">
          <p class="label">Tope subsidiado (SAP)</p>
          <p class="apr-num font-semibold text-text-primary">{{ m3Opcional(comite?.topeSubsidioM3) }}</p>
        </div>
      </div>
      <p class="mt-2 text-xs text-text-secondary">Los valores se configuran por comité en la sección de ciclos.</p>
    </div>
  </div>
</template>
