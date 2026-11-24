import { ref } from 'vue';
import { defineStore } from 'pinia';
import { api } from '@/api/client';
import type { ComprobantePago, Cobro, EstadoCobro, MedioPago } from '@/types';

export const useCobrosStore = defineStore('cobros', () => {
  const cobros = ref<Cobro[]>([]);
  const estado = ref<EstadoCobro | ''>('');
  const cicloId = ref('');
  const cargando = ref(false);
  const comprobante = ref<ComprobantePago | null>(null);

  async function cargar(): Promise<void> {
    cargando.value = true;
    try {
      const { data } = await api.get<Cobro[]>('/cobros', {
        params: {
          ...(estado.value ? { estado: estado.value } : {}),
          ...(cicloId.value ? { cicloId: cicloId.value } : {}),
        },
      });
      cobros.value = data;
    } finally {
      cargando.value = false;
    }
  }

  async function pagar(payload: {
    cobroId: string;
    montoClp: number;
    medioPago: MedioPago;
    referencia?: string;
  }): Promise<ComprobantePago> {
    const { data } = await api.post<{ comprobante: ComprobantePago }>('/pagos', payload);
    comprobante.value = data.comprobante;
    await cargar();
    return data.comprobante;
  }

  function limpiarComprobante(): void {
    comprobante.value = null;
  }

  return { cobros, estado, cicloId, cargando, comprobante, cargar, pagar, limpiarComprobante };
});
