<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import EstadoBadge from '@/components/EstadoBadge.vue';
import ModalShell from '@/components/ModalShell.vue';
import { api, descargarArchivo, mensajeError } from '@/api/client';
import { useCicloActivoStore } from '@/stores/cicloActivo';
import { clp, fechaCorta, periodoActualSantiago } from '@/utils/formato';
import type { Ciclo, Comite } from '@/types';

const router = useRouter();
const cicloStore = useCicloActivoStore();
const ciclos = ref<Ciclo[]>([]);
const comite = ref<Comite | null>(null);
const periodoNuevo = ref(periodoActualSantiago());
const procesando = ref(false);
const error = ref('');
const mensaje = ref('');
const soloAbiertos = ref(false);
const parametrosCargados = ref(false);
const cicloParaCerrar = ref<Ciclo | null>(null);

const parametros = reactive({ cargoFijoClp: 0, tarifaM3Clp: 0, topeSubsidioM3: 0, porcentajeSubsidioDefault: 0 });

const PERIODO_VALIDO = /^\d{4}-(0[1-9]|1[0-2])$/;

const ciclosVisibles = computed<Ciclo[]>(() => {
  const lista = soloAbiertos.value ? ciclos.value.filter((ciclo) => ciclo.estado === 'ABIERTO') : [...ciclos.value];
  return lista.sort((a, b) => b.periodo.localeCompare(a.periodo));
});

async function cargar(): Promise<void> {
  error.value = '';
  parametrosCargados.value = false;
  try {
    const [lista, config] = await Promise.all([
      api.get<Ciclo[]>('/ciclos'),
      api.get<Comite>('/comites/actual'),
    ]);
    ciclos.value = lista.data;
    comite.value = config.data;
    Object.assign(parametros, {
      cargoFijoClp: config.data.cargoFijoClp,
      tarifaM3Clp: config.data.tarifaM3Clp,
      topeSubsidioM3: config.data.topeSubsidioM3,
      porcentajeSubsidioDefault: config.data.porcentajeSubsidioDefault,
    });
    parametrosCargados.value = true;
  } catch (e) {
    parametrosCargados.value = false;
    Object.assign(parametros, {
      cargoFijoClp: 0,
      tarifaM3Clp: 0,
      topeSubsidioM3: 0,
      porcentajeSubsidioDefault: 0,
    });
    error.value = mensajeError(e);
  }
}

async function abrirCiclo(): Promise<void> {
  procesando.value = true;
  error.value = '';
  mensaje.value = '';
  if (!PERIODO_VALIDO.test(periodoNuevo.value)) {
    error.value = 'Ingrese un periodo válido en formato YYYY-MM (por ejemplo, 2026-11).';
    procesando.value = false;
    return;
  }
  try {
    await cicloStore.abrir(periodoNuevo.value);
    mensaje.value = `Ciclo ${periodoNuevo.value} abierto correctamente`;
    await cargar();
  } catch (e) {
    error.value = mensajeError(e);
  } finally {
    procesando.value = false;
  }
}

function pedirCierre(ciclo: Ciclo): void {
  error.value = '';
  mensaje.value = '';
  cicloParaCerrar.value = ciclo;
}

async function confirmarCierre(): Promise<void> {
  const ciclo = cicloParaCerrar.value;
  if (!ciclo) return;
  cicloParaCerrar.value = null;
  procesando.value = true;
  error.value = '';
  mensaje.value = '';
  try {
    const resultado = await cicloStore.cerrar(ciclo.id);
    mensaje.value = `${resultado.sociosFacturados} cobros generados · Total ${clp(resultado.totalFacturadoClp)} · Subsidio ${clp(resultado.totalSubsidioSapClp)}`;
    await cargar();
  } catch (e) {
    error.value = mensajeError(e);
  } finally {
    procesando.value = false;
  }
}

async function guardarParametros(): Promise<void> {
  procesando.value = true;
  error.value = '';
  mensaje.value = '';
  if (!parametrosCargados.value) {
    error.value = 'No se pueden guardar parámetros tarifarios sin datos cargados. Recargue la página e intente nuevamente.';
    procesando.value = false;
    return;
  }
  try {
    await api.patch('/comites/actual', parametros);
    mensaje.value = 'Parámetros tarifarios actualizados';
    await cargar();
  } catch (e) {
    error.value = mensajeError(e);
  } finally {
    procesando.value = false;
  }
}

function descargarNomina(ciclo: Ciclo): void {
  void descargarArchivo(`/ciclos/${ciclo.id}/nomina-sap.csv`, `nomina-sap-${ciclo.periodo}.csv`);
}

onMounted(cargar);
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-lg font-bold text-text-primary">Ciclos y facturación</h1>
      <p class="text-xs text-text-secondary">
        Apertura de períodos y cierre y liquidación SAP · {{ comite?.comuna }}, {{ comite?.region }}
      </p>
    </div>

    <p v-if="error" class="apr-alert apr-alert--danger" role="alert">{{ error }}</p>
    <p v-if="mensaje" class="apr-alert apr-alert--success" role="status">{{ mensaje }}</p>

    <div class="grid gap-3 lg:grid-cols-[1fr_1.4fr]">
      <div class="card space-y-3 p-4">
        <h2 class="text-sm font-bold text-text-primary">Abrir nuevo período</h2>
        <div>
          <label class="label" for="ciclo-periodo">Periodo (YYYY-MM)</label>
          <input
            id="ciclo-periodo"
            v-model="periodoNuevo"
            type="text"
            class="input apr-num font-mono"
            placeholder="2026-11"
            pattern="[0-9]{4}-(0[1-9]|1[0-2])"
            maxlength="7"
            inputmode="numeric"
            aria-describedby="ciclo-periodo-ayuda"
            required
          />
          <p id="ciclo-periodo-ayuda" class="mt-1 text-xs text-text-secondary">
            Formato AAAA-MM (por ejemplo, 2026-11). Solo puede existir un ciclo ABIERTO a la vez. La zona horaria es América/Santiago.
          </p>
        </div>
        <button type="button" class="btn-primary w-full" :disabled="procesando" @click="abrirCiclo">Abrir ciclo</button>
      </div>

      <div class="card space-y-3 p-4">
        <h2 class="text-sm font-bold text-text-primary">Parámetros del comité</h2>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="label" for="par-cargo-fijo">Cargo fijo (CLP)</label>
            <input
              id="par-cargo-fijo"
              v-model.number="parametros.cargoFijoClp"
              type="number"
              min="0"
              class="input apr-num"
              placeholder="—"
              :disabled="!parametrosCargados || procesando"
            />
          </div>
          <div>
            <label class="label" for="par-tarifa">Tarifa por m³ (CLP)</label>
            <input
              id="par-tarifa"
              v-model.number="parametros.tarifaM3Clp"
              type="number"
              min="0"
              class="input apr-num"
              placeholder="—"
              :disabled="!parametrosCargados || procesando"
            />
          </div>
          <div>
            <label class="label" for="par-tope">Tope de subsidio (m³)</label>
            <input
              id="par-tope"
              v-model.number="parametros.topeSubsidioM3"
              type="number"
              min="0"
              class="input apr-num"
              placeholder="—"
              :disabled="!parametrosCargados || procesando"
            />
          </div>
          <div>
            <label class="label" for="par-subsidio">Subsidio predeterminado (%)</label>
            <input
              id="par-subsidio"
              v-model.number="parametros.porcentajeSubsidioDefault"
              type="number"
              min="0"
              max="100"
              class="input apr-num"
              placeholder="—"
              :disabled="!parametrosCargados || procesando"
            />
          </div>
        </div>
        <p v-if="!parametrosCargados" class="apr-alert apr-alert--warning text-xs" role="status">
          Los valores tarifarios no están disponibles: se muestran en 0 y no se pueden guardar hasta recargar.
        </p>
        <button
          type="button"
          class="btn-secondary w-full"
          :disabled="procesando || !parametrosCargados"
          @click="guardarParametros"
        >
          Guardar parámetros
        </button>
      </div>
    </div>

    <div class="card p-3">
      <label class="inline-flex items-center gap-2 text-xs text-text-secondary" for="ciclos-solo-abiertos">
        <input id="ciclos-solo-abiertos" v-model="soloAbiertos" type="checkbox" class="h-4 w-4 rounded border-line" />
        Solo abiertos
      </label>
    </div>

    <div class="card scroll-slim overflow-x-auto">
      <table class="tabla min-w-[720px]">
        <caption class="sr-only">Ciclos de facturación ordenados por periodo, de más reciente a más antiguo</caption>
        <thead>
          <tr>
            <th scope="col">Periodo</th>
            <th scope="col">Estado</th>
            <th scope="col">Apertura</th>
            <th scope="col">Cierre</th>
            <th scope="col">Lecturas</th>
            <th scope="col">Cobros</th>
            <th scope="col" class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ciclo in ciclosVisibles" :key="ciclo.id">
            <td class="apr-num font-bold">{{ ciclo.periodo }}</td>
            <td><EstadoBadge :estado="ciclo.estado" /></td>
            <td class="apr-num">{{ fechaCorta(ciclo.fechaApertura) }}</td>
            <td class="apr-num">{{ fechaCorta(ciclo.fechaCierre) }}</td>
            <td class="apr-num">{{ ciclo._count?.lecturas ?? 0 }}</td>
            <td class="apr-num">{{ ciclo._count?.cobros ?? 0 }}</td>
            <td>
              <div class="flex flex-wrap justify-end gap-1.5">
                <button
                  type="button"
                  class="btn-secondary"
                  :aria-label="`Ver cobros del periodo ${ciclo.periodo}`"
                  @click="router.push({ path: '/cobros', query: { ciclo: ciclo.id } })"
                >
                  Ver cobros
                </button>
                <button
                  type="button"
                  class="btn-secondary"
                  :aria-label="`Descargar nómina SAP del periodo ${ciclo.periodo}`"
                  :disabled="!ciclo._count?.cobros"
                  @click="descargarNomina(ciclo)"
                >
                  Nómina SAP
                </button>
                <button
                  type="button"
                  class="btn-primary"
                  :aria-label="`Cerrar y facturar el periodo ${ciclo.periodo}`"
                  :disabled="ciclo.estado === 'CERRADO' || procesando"
                  @click="pedirCierre(ciclo)"
                >
                  Cerrar y facturar
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="ciclosVisibles.length === 0">
            <td colspan="7" class="py-8 text-center text-text-secondary">
              {{ soloAbiertos ? 'No hay ciclos abiertos' : 'No hay ciclos registrados' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ModalShell v-if="cicloParaCerrar" titulo="Cierre y liquidación SAP" @cerrar="cicloParaCerrar = null">
      <p id="ciclo-cierre-confirmacion" class="text-sm text-text-primary">
        ¿Cerrar el periodo <span class="apr-num font-semibold">{{ cicloParaCerrar.periodo }}</span> y generar todos los cobros?
        Esta acción es definitiva.
      </p>
      <div class="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" class="btn-secondary" @click="cicloParaCerrar = null">Cancelar</button>
        <button
          type="button"
          class="btn-danger"
          :disabled="procesando"
          aria-describedby="ciclo-cierre-confirmacion"
          @click="confirmarCierre"
        >
          Cerrar y liquidar {{ cicloParaCerrar.periodo }}
        </button>
      </div>
    </ModalShell>
  </div>
</template>
