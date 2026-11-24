import { ref } from 'vue';
import { defineStore } from 'pinia';
import { api } from '@/api/client';
import type { Ciclo } from '@/types';

export const useCicloActivoStore = defineStore('cicloActivo', () => {
  const ciclo = ref<Ciclo | null>(null);
  const cargando = ref(false);

  async function cargar(): Promise<Ciclo | null> {
    cargando.value = true;
    try {
      const { data } = await api.get<Ciclo | null>('/ciclos/activo');
      ciclo.value = data;
      return data;
    } finally {
      cargando.value = false;
    }
  }

  async function abrir(periodo?: string): Promise<Ciclo> {
    const { data } = await api.post<Ciclo>('/ciclos', periodo ? { periodo } : {});
    await cargar();
    return data;
  }

  async function cerrar(id: string) {
    const { data } = await api.post<{
      cicloId: string;
      periodo: string;
      sociosFacturados: number;
      lecturasEstimadas: number;
      totalFacturadoClp: number;
      totalSubsidioSapClp: number;
    }>(`/ciclos/${id}/cerrar-y-facturar`);
    await cargar();
    return data;
  }

  return { ciclo, cargando, cargar, abrir, cerrar };
});
