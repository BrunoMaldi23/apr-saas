<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import EstadoBadge from '@/components/EstadoBadge.vue';
import PagoModal from '@/components/PagoModal.vue';
import { api, mensajeError } from '@/api/client';
import { useCobrosStore } from '@/stores/cobros';
import { clp, etiquetaMedioPago, fechaHora } from '@/utils/formato';
import type { Cobro, Pago } from '@/types';

const store = useCobrosStore();
const pagos = ref<Pago[]>([]);
const pagando = ref<Cobro | null>(null);
const busqueda = ref('');
const error = ref('');

onMounted(async () => {
  store.estado = '';
  store.cicloId = '';
  error.value = '';
  try {
    await Promise.all([store.cargar(), cargarPagos()]);
  } catch (e) {
    error.value = mensajeError(e);
  }
});

async function cargarPagos(): Promise<void> {
  try {
    const { data } = await api.get<Pago[]>('/pagos');
    pagos.value = data;
  } catch (e) {
    pagos.value = [];
    error.value = mensajeError(e);
  }
}

const cobrosPendientes = computed(() =>
  store.cobros.filter((cobro) => {
    if (cobro.estado === 'PAGADO' || cobro.saldoPendienteClp <= 0) return false;
    if (!busqueda.value.trim()) return true;
    const termino = busqueda.value.trim().toLocaleLowerCase('es-CL');
    return (
      cobro.socio.nombre.toLocaleLowerCase('es-CL').includes(termino) ||
      cobro.socio.rut.toLocaleLowerCase('es-CL').includes(termino) ||
      (cobro.medidor?.numero.toLocaleLowerCase('es-CL').includes(termino) ?? false)
    );
  }),
);

const pagosRecientes = computed(() =>
  [...pagos.value]
    .sort((a, b) => (Date.parse(b.fechaPago) || 0) - (Date.parse(a.fechaPago) || 0))
    .slice(0, 10),
);

async function alPagar(): Promise<void> {
  pagando.value = null;
  await cargarPagos();
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-lg font-bold">Caja / Pagos</h1>
      <p class="text-xs text-text-secondary">Registro de pagos totales y abonos con comprobante inmediato</p>
    </div>

    <p v-if="error" class="apr-alert apr-alert--danger" role="alert">{{ error }}</p>

    <div class="card p-3">
      <label class="label" for="caja-busqueda">Buscar socio, RUT o medidor con saldo pendiente</label>
      <input
        id="caja-busqueda"
        v-model="busqueda"
        type="search"
        class="input max-w-md"
        placeholder="Nombre, RUT o N° de medidor"
      />
    </div>

    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="tabla min-w-[640px]" aria-label="Cobros con saldo pendiente">
          <thead>
            <tr>
              <th scope="col">Ciclo</th>
              <th scope="col">RUT</th>
              <th scope="col">Socio</th>
              <th scope="col">Total</th>
              <th scope="col">Saldo</th>
              <th scope="col">Estado</th>
              <th scope="col" class="text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cobro in cobrosPendientes" :key="cobro.id">
              <td class="font-mono">{{ cobro.ciclo.periodo }}</td>
              <td class="font-mono">{{ cobro.socio.rut }}</td>
              <td class="font-semibold">{{ cobro.socio.nombre }}</td>
              <td class="apr-num">{{ clp(cobro.totalAPagarClp) }}</td>
              <td class="apr-num font-bold text-amber-700">{{ clp(cobro.saldoPendienteClp) }}</td>
              <td><EstadoBadge :estado="cobro.estado" /></td>
              <td class="text-right">
                <button
                  class="btn-primary"
                  type="button"
                  :aria-label="`Registrar pago de ${cobro.socio.nombre} (${cobro.socio.rut}) por ${clp(cobro.saldoPendienteClp)}`"
                  @click="pagando = cobro"
                >
                  Registrar pago
                </button>
              </td>
            </tr>
            <tr v-if="cobrosPendientes.length === 0">
              <td colspan="7" class="py-8 text-center text-text-secondary">No hay cobros pendientes</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card overflow-hidden">
      <div class="border-b border-line px-3 py-2">
        <h2 class="text-sm font-bold">Últimos 10 pagos registrados</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="tabla min-w-[640px]" aria-label="Últimos diez pagos registrados">
          <thead>
            <tr>
              <th scope="col">Comprobante</th>
              <th scope="col">Fecha</th>
              <th scope="col">Socio</th>
              <th scope="col">Medio</th>
              <th scope="col">Referencia</th>
              <th scope="col" class="text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pago in pagosRecientes" :key="pago.id">
              <td class="apr-num text-teal-700">{{ pago.comprobanteNumero }}</td>
              <td class="apr-num">{{ fechaHora(pago.fechaPago) }}</td>
              <td>{{ pago.socio.nombre }}</td>
              <td>{{ etiquetaMedioPago(pago.medioPago) }}</td>
              <td class="text-text-secondary">{{ pago.referencia ?? '—' }}</td>
              <td class="apr-num text-right font-bold">{{ clp(pago.montoClp) }}</td>
            </tr>
            <tr v-if="pagosRecientes.length === 0">
              <td colspan="6" class="py-8 text-center text-text-secondary">Aún no hay pagos registrados</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <PagoModal v-if="pagando" :cobro="pagando" @cerrar="pagando = null" @pagado="alPagar" />
  </div>
</template>
