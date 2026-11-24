<script setup lang="ts">
import { nextTick, onMounted, ref, useId } from 'vue';
import ModalShell from '@/components/ModalShell.vue';
import { useCobrosStore } from '@/stores/cobros';
import { mensajeError } from '@/api/client';
import { clp, fechaHora } from '@/utils/formato';
import type { Cobro, ComprobantePago, MedioPago } from '@/types';

const props = defineProps<{ cobro: Cobro }>();
const emit = defineEmits<{ (e: 'cerrar'): void; (e: 'pagado', comprobante: ComprobantePago): void }>();

const store = useCobrosStore();
const uid = useId();
const ids = {
  saldo: `pago-saldo-${uid}`,
  monto: `pago-monto-${uid}`,
  ayuda: `pago-ayuda-${uid}`,
  medio: `pago-medio-${uid}`,
  referencia: `pago-referencia-${uid}`,
};
const campoMonto = ref<HTMLInputElement | null>(null);
const monto = ref<number>(props.cobro.saldoPendienteClp);
const medioPago = ref<MedioPago>('EFECTIVO');
const referencia = ref('');
const procesando = ref(false);
const error = ref('');
const comprobante = ref<ComprobantePago | null>(null);

onMounted(() => {
  void nextTick(() => campoMonto.value?.focus());
});

async function registrar(): Promise<void> {
  procesando.value = true;
  error.value = '';
  try {
    const resultado = await store.pagar({
      cobroId: props.cobro.id,
      montoClp: Math.round(monto.value),
      medioPago: medioPago.value,
      referencia: referencia.value || undefined,
    });
    comprobante.value = resultado;
    emit('pagado', resultado);
  } catch (e) {
    error.value = mensajeError(e);
  } finally {
    procesando.value = false;
  }
}

function imprimir(): void {
  window.print();
}
</script>

<template>
  <ModalShell :titulo="comprobante ? 'Comprobante de pago' : 'Registrar pago / abono'" @cerrar="emit('cerrar')">
    <div v-if="comprobante" class="space-y-3" role="status">
      <div class="comprobante rounded border border-success bg-success-soft p-3 text-center">
        <p class="text-[11px] font-bold uppercase tracking-wide text-success">Pago registrado</p>
        <p class="apr-num mt-1 text-2xl font-bold text-text-primary">{{ clp(comprobante.montoClp) }}</p>
        <p class="apr-num text-xs text-success">N° {{ comprobante.numero }}</p>
      </div>
      <dl class="grid grid-cols-2 gap-2 text-xs">
        <div><dt class="label">Fecha</dt><dd>{{ fechaHora(comprobante.fecha) }}</dd></div>
        <div><dt class="label">Medio</dt><dd>{{ comprobante.medioPago }}</dd></div>
        <div><dt class="label">Socio</dt><dd>{{ comprobante.socioNombre }}</dd></div>
        <div><dt class="label">RUT</dt><dd class="font-mono">{{ comprobante.rut }}</dd></div>
        <div><dt class="label">Periodo</dt><dd class="font-mono">{{ comprobante.periodo }}</dd></div>
        <div><dt class="label">Saldo restante</dt><dd class="apr-num">{{ clp(comprobante.saldoRestanteClp) }}</dd></div>
      </dl>
      <div class="no-print flex justify-end gap-2">
        <button
          class="btn-secondary"
          type="button"
          :aria-label="`Imprimir comprobante N° ${comprobante.numero}`"
          @click="imprimir"
        >
          Imprimir comprobante
        </button>
        <button class="btn-primary" type="button" aria-label="Cerrar comprobante" @click="emit('cerrar')">Cerrar</button>
      </div>
    </div>

    <form v-else class="space-y-3" :aria-busy="procesando" @submit.prevent="registrar">
      <div class="rounded border border-line bg-surface-secondary p-3 text-xs">
        <p class="font-bold">{{ cobro.socio.nombre }} · {{ cobro.socio.rut }}</p>
        <p class="text-text-secondary">Periodo {{ cobro.ciclo.periodo }} · Medidor {{ cobro.medidor?.numero ?? 'N/A' }}</p>
        <p :id="ids.saldo" class="mt-1 font-bold text-text-primary">
          Saldo pendiente: <span class="apr-num">{{ clp(cobro.saldoPendienteClp) }}</span>
        </p>
      </div>
      <div>
        <label class="label" :for="ids.monto">Monto a pagar (CLP)</label>
        <input
          :id="ids.monto"
          ref="campoMonto"
          v-model.number="monto"
          type="number"
          min="1"
          :max="cobro.saldoPendienteClp"
          step="1"
          inputmode="numeric"
          class="input apr-num"
          :aria-describedby="`${ids.saldo} ${ids.ayuda}`"
          required
        />
        <p :id="ids.ayuda" class="mt-1 text-[11px] text-text-secondary">
          Ingresa un monto entero en pesos chilenos; si incluye decimales se redondea al peso más cercano.
        </p>
        <div class="mt-1 flex gap-1">
          <button
            type="button"
            class="btn-secondary"
            :aria-label="`Pago total de ${clp(cobro.saldoPendienteClp)}`"
            @click="monto = cobro.saldoPendienteClp"
          >
            Pago total
          </button>
          <button
            type="button"
            class="btn-secondary"
            :aria-label="`Pagar la mitad, ${clp(Math.ceil(cobro.saldoPendienteClp / 2))}`"
            @click="monto = Math.ceil(cobro.saldoPendienteClp / 2)"
          >
            Mitad
          </button>
        </div>
      </div>
      <div>
        <label class="label" :for="ids.medio">Medio de pago</label>
        <select :id="ids.medio" v-model="medioPago" class="input">
          <option value="EFECTIVO">Efectivo</option>
          <option value="TRANSFERENCIA">Transferencia</option>
          <option value="OTRO">Otro</option>
        </select>
      </div>
      <div>
        <label class="label" :for="ids.referencia">Referencia / N° operación</label>
        <input :id="ids.referencia" v-model="referencia" class="input" placeholder="Opcional" />
      </div>
      <p v-if="error" class="apr-alert apr-alert--danger" role="alert">{{ error }}</p>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" aria-label="Cancelar registro de pago" @click="emit('cerrar')">
          Cancelar
        </button>
        <button
          type="submit"
          class="btn-primary"
          :disabled="procesando"
          :aria-label="procesando ? 'Registrando pago' : `Registrar pago de ${clp(monto)}`"
          :aria-busy="procesando"
        >
          {{ procesando ? 'Registrando...' : 'Registrar pago' }}
        </button>
      </div>
    </form>
  </ModalShell>
</template>

<style scoped>
@media print {
  :global(body > *:not(.apr-modal-scrim)) {
    display: none !important;
  }

  :global(.apr-modal-scrim) {
    position: static !important;
    display: block !important;
    padding: 0 !important;
    background: #fff !important;
  }

  :global(.apr-modal-panel) {
    max-height: none !important;
    width: 100% !important;
    border: 0 !important;
    box-shadow: none !important;
  }

  :global(.modal-header),
  :global(.modal-close),
  .no-print {
    display: none !important;
  }

  :global(.modal-body) {
    max-height: none !important;
    overflow: visible !important;
    padding: 0 !important;
  }

  .comprobante {
    break-inside: avoid;
  }
}
</style>
