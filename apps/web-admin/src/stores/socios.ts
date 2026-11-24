import { ref } from 'vue';
import { defineStore } from 'pinia';
import { api } from '@/api/client';
import type { FilaSocioImportacion, ResultadoImportacion, Socio } from '@/types';

export const useSociosStore = defineStore('socios', () => {
  const socios = ref<Socio[]>([]);
  const busqueda = ref('');
  const cargando = ref(false);
  const error = ref('');

  async function cargar(): Promise<void> {
    cargando.value = true;
    error.value = '';
    try {
      const { data } = await api.get<Socio[]>('/socios', {
        params: busqueda.value ? { busqueda: busqueda.value } : {},
      });
      socios.value = data;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No se pudo cargar el padrón';
    } finally {
      cargando.value = false;
    }
  }

  async function crear(payload: FilaSocioImportacion): Promise<void> {
    await api.post('/socios', payload);
    await cargar();
  }

  async function importar(filas: FilaSocioImportacion[]): Promise<ResultadoImportacion> {
    const { data } = await api.post<ResultadoImportacion>('/socios/importar-lote', { socios: filas });
    await cargar();
    return data;
  }

  return { socios, busqueda, cargando, error, cargar, crear, importar };
});
