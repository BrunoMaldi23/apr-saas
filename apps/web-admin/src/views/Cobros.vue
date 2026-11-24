<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import EstadoBadge from '@/components/EstadoBadge.vue';
import VisorPdf from '@/components/VisorPdf.vue';
import ModalShell from '@/components/ModalShell.vue';
import PagoModal from '@/components/PagoModal.vue';
import { useCobrosStore } from '@/stores/cobros';
import { useCicloActivoStore } from '@/stores/cicloActivo';
import { api, descargarArchivo, mensajeError } from '@/api/client';
import { clp, fechaCorta } from '@/utils/formato';
import type { Ciclo, Cobro, EstadoCobro } from '@/types';

type ClaveOrden = 'periodo' | 'orden' | 'rut' | 'socio' | 'medidor' | 'total' | 'pendiente' | 'estado';

const route = useRoute();
const store = useCobrosStore();
const cicloStore = useCicloActivoStore();
const ciclos = ref<Ciclo[]>([]);
const busqueda = ref('');
const error = ref('');
const pdfCobro = ref<Cobro | null>(null);
const pdfConsolidado = ref('');
const pagando = ref<Cobro | null>(null);
const estados: Array<EstadoCobro | ''> = ['', 'PENDIENTE', 'PARCIAL', 'PAGADO', 'VENCIDO'];
const ordenColumna = ref<ClaveOrden | null>(null);
const ordenAscendente = ref(true);
let inicializado = false;

/** El store puede exponer `error`; se lee sin alterar su contrato. */
const storeConError = store as typeof store & { error?: string };
const errorCarga = computed(() => error.value || storeConError.error || '');

const ciclosDisponibles = computed(() => {
  const activo = cicloStore.ciclo;
  if (!activo || ciclos.value.some((ciclo) => ciclo.id === activo.id)) return ciclos.value;
  return [activo, ...ciclos.value];
});

function valorOrden(cobro: Cobro, clave: ClaveOrden): string | number {
  switch (clave) {
    case 'periodo':
      return cobro.ciclo.periodo;
    case 'orden':
      return cobro.medidor?.ordenRuta ?? Number.MAX_SAFE_INTEGER;
    case 'rut':
      return cobro.socio.rut;
    case 'socio':
      return cobro.socio.nombre;
    case 'medidor':
      return cobro.medidor?.numero ?? '';
    case 'total':
      return cobro.totalAPagarClp;
    case 'pendiente':
      return cobro.saldoPendienteClp;
    case 'estado':
      return cobro.estado;
  }
}

const cobrosVisibles = computed(() => {
  const termino = busqueda.value.trim().toLocaleLowerCase('es-CL');
  const filtrados = store.cobros.filter((cobro) => {
    if (!termino) return true;
    return [cobro.socio.nombre, cobro.socio.rut, cobro.medidor?.numero ?? ''].some((valor) =>
      valor.toLocaleLowerCase('es-CL').includes(termino),
    );
  });
  const clave = ordenColumna.value;
  if (!clave) return filtrados;
  const factor = ordenAscendente.value ? 1 : -1;
  return [...filtrados].sort((a, b) => {
    const izquierdo = valorOrden(a, clave);
    const derecho = valorOrden(b, clave);
    const comparacion =
      typeof izquierdo === 'number' && typeof derecho === 'number'
        ? izquierdo - derecho
        : String(izquierdo).localeCompare(String(derecho), 'es-CL', { numeric: true, sensitivity: 'base' });
    return comparacion * factor;
  });
});

function ordenarPor(clave: ClaveOrden): void {
  if (ordenColumna.value === clave) {
    ordenAscendente.value = !ordenAscendente.value;
    return;
  }
  ordenColumna.value = clave;
  ordenAscendente.value = true;
}

function ariaOrden(clave: ClaveOrden): 'none' | 'ascending' | 'descending' {
  if (ordenColumna.value !== clave) return 'none';
  return ordenAscendente.value ? 'ascending' : 'descending';
}

function indicadorOrden(clave: ClaveOrden): string {
  if (ordenColumna.value !== clave) return '↕';
  return ordenAscendente.value ? '↑' : '↓';
}

async function recargar(): Promise<void> {
  error.value = '';
  try {
    await store.cargar();
  } catch (e) {
    error.value = mensajeError(e);
  }
}

async function cargarCiclos(): Promise<void> {
  try {
    const { data } = await api.get<Ciclo[]>('/ciclos');
    ciclos.value = data;
  } catch (e) {
    error.value = mensajeError(e);
  }
}

async function cargarCicloActivo(): Promise<void> {
  try {
    await cicloStore.cargar();
  } catch (e) {
    error.value = mensajeError(e);
  }
}

onMounted(() => {
  if (typeof route.query.ciclo === 'string') store.cicloId = route.query.ciclo;
  void Promise.all([recargar(), cargarCiclos(), cargarCicloActivo()]).finally(() => {
    inicializado = true;
  });
});

watch(
  () => [store.estado, store.cicloId],
  () => {
    if (inicializado) void recargar();
  },
);

async function descargarNomina(): Promise<void> {
  if (!store.cicloId) return;
  error.value = '';
  try {
    await descargarArchivo(`/ciclos/${store.cicloId}/nomina-sap.csv`, 'nomina-sap.csv');
  } catch (e) {
    error.value = mensajeError(e);
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h1 class="text-lg font-bold">Cobros, avisos y nómina SAP</h1>
        <p class="text-xs text-text-secondary" role="status">
          {{ store.cobros.length }} cobros en la selección actual
        </p>
      </div>
      <div class="flex flex-col items-end gap-1">
        <div class="flex gap-2">
          <button
            class="btn-secondary"
            type="button"
            :disabled="!store.cicloId"
            :aria-describedby="!store.cicloId ? 'ciclo-requerido' : undefined"
            @click="descargarNomina"
          >
            Descargar nómina SAP
          </button>
          <button
            class="btn-secondary"
            type="button"
            :disabled="!store.cicloId"
            :aria-describedby="!store.cicloId ? 'ciclo-requerido' : undefined"
            @click="pdfConsolidado = `/ciclos/${store.cicloId}/avisos-consolidados.pdf`"
          >
            Avisos consolidados
          </button>
        </div>
        <p v-if="!store.cicloId" id="ciclo-requerido" class="max-w-md text-right text-[11px] text-text-secondary">
          Selecciona un ciclo: con “Todos los ciclos” no hay un período único para generar la nómina ni los avisos.
        </p>
      </div>
    </div>

    <div class="card flex flex-wrap items-end gap-3 p-3">
      <div class="w-48">
        <label class="label" for="cobros-estado">Estado</label>
        <select id="cobros-estado" v-model="store.estado" class="input">
          <option v-for="estado in estados" :key="estado" :value="estado">
            {{ estado || 'Todos' }}
          </option>
        </select>
      </div>
      <div class="w-64">
        <label class="label" for="cobros-ciclo">Ciclo</label>
        <select id="cobros-ciclo" v-model="store.cicloId" class="input">
          <option value="">Todos los ciclos</option>
          <option v-for="ciclo in ciclosDisponibles" :key="ciclo.id" :value="ciclo.id">
            {{ ciclo.periodo }} ({{ ciclo.estado }}){{ ciclo.id === cicloStore.ciclo?.id ? ' · activo' : '' }}
          </option>
        </select>
      </div>
      <div class="min-w-[220px] flex-1">
        <label class="label" for="cobros-busqueda">Buscar socio, RUT o medidor</label>
        <input
          id="cobros-busqueda"
          v-model="busqueda"
          type="search"
          class="input"
          placeholder="Nombre, RUT o N° de medidor"
        />
      </div>
      <button
        class="btn-secondary"
        type="button"
        :disabled="store.cargando"
        :aria-busy="store.cargando"
        @click="recargar"
      >
        Actualizar
      </button>
    </div>

    <p v-if="errorCarga" class="apr-alert apr-alert--danger" role="alert">{{ errorCarga }}</p>

    <div class="card scroll-slim max-h-[calc(100vh-290px)] overflow-y-auto">
      <div class="overflow-x-auto">
        <table class="tabla min-w-[700px]" aria-label="Cobros por periodo, socio y estado">
          <thead>
            <tr>
              <th scope="col" :aria-sort="ariaOrden('periodo')">
                <button type="button" class="font-semibold hover:text-text-primary" @click="ordenarPor('periodo')">
                  Periodo <span aria-hidden="true">{{ indicadorOrden('periodo') }}</span>
                </button>
              </th>
              <th scope="col" :aria-sort="ariaOrden('orden')">
                <button type="button" class="font-semibold hover:text-text-primary" @click="ordenarPor('orden')">
                  Orden <span aria-hidden="true">{{ indicadorOrden('orden') }}</span>
                </button>
              </th>
              <th scope="col" :aria-sort="ariaOrden('rut')">
                <button type="button" class="font-semibold hover:text-text-primary" @click="ordenarPor('rut')">
                  RUT <span aria-hidden="true">{{ indicadorOrden('rut') }}</span>
                </button>
              </th>
              <th scope="col" :aria-sort="ariaOrden('socio')">
                <button type="button" class="font-semibold hover:text-text-primary" @click="ordenarPor('socio')">
                  Socio <span aria-hidden="true">{{ indicadorOrden('socio') }}</span>
                </button>
              </th>
              <th scope="col" :aria-sort="ariaOrden('medidor')">
                <button type="button" class="font-semibold hover:text-text-primary" @click="ordenarPor('medidor')">
                  Medidor <span aria-hidden="true">{{ indicadorOrden('medidor') }}</span>
                </button>
              </th>
              <th scope="col">Consumo</th>
              <th scope="col">Subtotal</th>
              <th scope="col">Descuento SAP</th>
              <th scope="col">Saldo anterior</th>
              <th scope="col" :aria-sort="ariaOrden('total')">
                <button type="button" class="font-semibold hover:text-text-primary" @click="ordenarPor('total')">
                  Total <span aria-hidden="true">{{ indicadorOrden('total') }}</span>
                </button>
              </th>
              <th scope="col" :aria-sort="ariaOrden('pendiente')">
                <button type="button" class="font-semibold hover:text-text-primary" @click="ordenarPor('pendiente')">
                  Pendiente <span aria-hidden="true">{{ indicadorOrden('pendiente') }}</span>
                </button>
              </th>
              <th scope="col" :aria-sort="ariaOrden('estado')">
                <button type="button" class="font-semibold hover:text-text-primary" @click="ordenarPor('estado')">
                  Estado <span aria-hidden="true">{{ indicadorOrden('estado') }}</span>
                </button>
              </th>
              <th scope="col" class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cobro in cobrosVisibles" :key="cobro.id">
              <td class="font-mono">{{ cobro.ciclo.periodo }}</td>
              <td class="apr-num text-text-secondary">{{ cobro.medidor?.ordenRuta ?? '—' }}</td>
              <td class="font-mono">{{ cobro.socio.rut }}</td>
              <td class="font-semibold">{{ cobro.socio.nombre }}</td>
              <td class="font-mono">{{ cobro.medidor?.numero ?? '—' }}</td>
              <td class="apr-num">{{ cobro.consumoM3 }} m3</td>
              <td class="apr-num">{{ clp(cobro.subtotalClp) }}</td>
              <td class="apr-num text-teal-700">{{ clp(-cobro.descuentoSapClp) }}</td>
              <td class="apr-num">{{ clp(cobro.saldoAnteriorClp) }}</td>
              <td class="apr-num font-bold">{{ clp(cobro.totalAPagarClp) }}</td>
              <td class="apr-num">{{ clp(cobro.saldoPendienteClp) }}</td>
              <td><EstadoBadge :estado="cobro.estado" /></td>
              <td>
                <div class="flex justify-end gap-1">
                  <button
                    class="btn-secondary"
                    type="button"
                    :aria-label="`Ver PDF del cobro de ${cobro.socio.nombre}, periodo ${cobro.ciclo.periodo}`"
                    @click="pdfCobro = cobro"
                  >
                    PDF
                  </button>
                  <button
                    class="btn-primary"
                    type="button"
                    :disabled="cobro.estado === 'PAGADO'"
                    :aria-label="`Pagar cobro de ${cobro.socio.nombre} por ${clp(cobro.saldoPendienteClp)}`"
                    @click="pagando = cobro"
                  >
                    Pagar
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="cobrosVisibles.length === 0">
              <td colspan="13" class="py-8 text-center text-text-secondary">
                No hay cobros para los filtros seleccionados
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <p class="text-xs text-text-secondary">Montos en CLP · fechas en América/Santiago</p>

    <ModalShell v-if="pdfCobro" titulo="Aviso de cobro individual" ancho="max-w-4xl" @cerrar="pdfCobro = null">
      <p class="mb-2 text-xs text-text-secondary">
        {{ pdfCobro.socio.nombre }} · {{ pdfCobro.ciclo.periodo }} · vence {{ fechaCorta(pdfCobro.fechaVencimiento) }}
      </p>
      <VisorPdf :ruta="`/cobros/${pdfCobro.id}/pdf`" :nombre-archivo="`aviso-${pdfCobro.socio.rut}.pdf`" />
    </ModalShell>

    <ModalShell v-if="pdfConsolidado" titulo="Avisos consolidados del ciclo" ancho="max-w-4xl" @cerrar="pdfConsolidado = ''">
      <p class="mb-2 text-xs text-text-secondary">Dos avisos por página carta, ordenados por orden de ruta.</p>
      <VisorPdf :ruta="pdfConsolidado" nombre-archivo="avisos-consolidados.pdf" />
    </ModalShell>

    <!-- Se mantiene abierto tras @pagado para mostrar el comprobante y su botón de impresión. -->
    <PagoModal v-if="pagando" :cobro="pagando" @cerrar="pagando = null" />
  </div>
</template>
