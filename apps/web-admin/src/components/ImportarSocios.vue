<script setup lang="ts">
import { computed, ref } from 'vue';
import ModalShell from '@/components/ModalShell.vue';
import { useSociosStore } from '@/stores/socios';
import { PLANTILLA_CSV, csvAFilas, validarFilas } from '@/utils/csv';
import { mensajeError } from '@/api/client';
import type { ResultadoImportacion } from '@/types';

const emit = defineEmits<{ (e: 'guardado', creados: number): void }>();

const store = useSociosStore();
const texto = ref(PLANTILLA_CSV);
const resultado = ref<ResultadoImportacion | null>(null);
const enviando = ref(false);
const errorGeneral = ref('');
const confirmarPlantilla = ref(false);
const inputArchivo = ref<HTMLInputElement | null>(null);

const ETIQUETAS_CAMPO: Record<string, string> = {
  rut: 'RUT',
  nombre: 'Nombre',
  direccion: 'Dirección',
  sector: 'Sector',
  telefono: 'Teléfono',
  decretoSap: 'Decreto SAP',
  porcentajeSubsidio: 'Subsidio (%)',
  numeroMedidor: 'N° de medidor',
  digitos: 'Dígitos',
  lecturaInicial: 'Lectura inicial (m³)',
  ordenRuta: 'Orden de ruta',
};

const filas = computed(() => csvAFilas(texto.value));
const errores = computed(() => validarFilas(filas.value));
const filasConErrores = computed(() => {
  const numeros = new Set<number>();
  for (const error of errores.value) numeros.add(error.fila);
  for (const error of resultado.value?.errores ?? []) numeros.add(error.fila);
  return numeros.size;
});
function textoError(campo: string, mensaje: string): string {
  const etiqueta = ETIQUETAS_CAMPO[campo] ?? campo;
  return mensaje.toLowerCase().startsWith(etiqueta.toLowerCase()) ? mensaje : `${etiqueta}: ${mensaje}`;
}
const erroresPorFila = computed(() => {
  const mapa = new Map<number, string[]>();
  const agregar = (fila: number, campo: string, mensaje: string): void => {
    const lista = mapa.get(fila) ?? [];
    lista.push(textoError(campo, mensaje));
    mapa.set(fila, lista);
  };
  for (const error of errores.value) agregar(error.fila, error.campo, error.mensaje);
  for (const error of resultado.value?.errores ?? []) agregar(error.fila, error.campo, error.mensaje);
  return mapa;
});
const puedeGuardar = computed(() => filas.value.length > 0 && errores.value.length === 0 && !enviando.value);

async function leerArchivo(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const archivo = input.files?.[0];
  if (!archivo) return;
  try {
    texto.value = await archivo.text();
    resultado.value = null;
    errorGeneral.value = '';
  } finally {
    input.value = '';
  }
}

function pedirPlantilla(): void {
  confirmarPlantilla.value = true;
}

function usarPlantillaVacia(): void {
  texto.value = PLANTILLA_CSV;
  resultado.value = null;
  errorGeneral.value = '';
  confirmarPlantilla.value = false;
  if (inputArchivo.value) inputArchivo.value.value = '';
}

async function guardar(): Promise<void> {
  if (!puedeGuardar.value) return;
  enviando.value = true;
  errorGeneral.value = '';
  resultado.value = null;
  try {
    const respuesta = await store.importar(filas.value);
    resultado.value = respuesta;
    // Con errores parciales se mantiene abierta la ventana para revisar el detalle.
    if (!respuesta.errores?.length) emit('guardado', respuesta.creados);
  } catch (error) {
    errorGeneral.value = mensajeError(error);
    const datos = (error as { response?: { data?: ResultadoImportacion } }).response?.data;
    if (datos?.errores) resultado.value = datos;
  } finally {
    enviando.value = false;
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="grid gap-3 md:grid-cols-[1fr_auto]">
      <div>
        <label class="label" for="importar-socios-csv">Contenido CSV (separador ; o ,)</label>
        <textarea
          id="importar-socios-csv"
          v-model="texto"
          rows="6"
          spellcheck="false"
          class="input font-mono text-xs leading-5"
          placeholder="rut;nombre;direccion;sector;..."
          aria-describedby="importar-socios-csv-ayuda"
        />
        <p id="importar-socios-csv-ayuda" class="mt-1 text-xs text-text-secondary">
          El separador se detecta automáticamente fuera de comillas.
        </p>
      </div>
      <div class="flex flex-col gap-2 md:w-52">
        <input
          id="importar-socios-archivo"
          ref="inputArchivo"
          type="file"
          accept=".csv,text/csv"
          class="peer sr-only"
          @change="leerArchivo"
        />
        <label
          for="importar-socios-archivo"
          class="btn-secondary peer-focus-visible:ring-2 peer-focus-visible:ring-primary cursor-pointer justify-center"
        >
          Seleccionar archivo .csv
        </label>
        <button type="button" class="btn-secondary justify-center" @click="pedirPlantilla">Usar plantilla vacía</button>
        <button type="button" class="btn-primary justify-center" :disabled="!puedeGuardar" @click="guardar">
          {{ enviando ? 'Guardando...' : `Guardar ${filas.length} socios` }}
        </button>
      </div>
    </div>

    <div class="flex flex-wrap gap-2 text-xs">
      <span class="chip bg-surface-secondary text-text-secondary">{{ filas.length }} filas detectadas</span>
      <span
        class="chip"
        :class="errores.length ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success'"
      >
        {{ errores.length ? `${errores.length} errores de validación` : 'Validación local OK' }}
      </span>
      <span v-if="resultado?.creados" class="chip bg-primary-soft text-primary-on-soft">{{ resultado.creados }} creados</span>
    </div>

    <p v-if="errorGeneral" class="apr-alert apr-alert--danger text-xs" role="alert">{{ errorGeneral }}</p>
    <p v-if="resultado" class="apr-alert apr-alert--info text-xs" role="status">
      {{ resultado.creados }} creados / {{ filasConErrores }} filas con errores
    </p>

    <div class="scroll-slim max-h-72 overflow-x-auto overflow-y-auto rounded border border-line">
      <table class="tabla min-w-[640px]">
        <caption class="sr-only">Vista previa de los socios del archivo CSV</caption>
        <thead>
          <tr>
            <th scope="col">Fila</th>
            <th scope="col">RUT</th>
            <th scope="col">Nombre</th>
            <th scope="col">Medidor</th>
            <th scope="col">Sector</th>
            <th scope="col">Subsidio</th>
            <th scope="col">Validación</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="fila in filas" :key="fila.fila" :class="erroresPorFila.get(fila.fila)?.length ? 'bg-danger-soft' : ''">
            <td class="apr-num text-text-secondary">{{ fila.fila }}</td>
            <td class="apr-num">{{ fila.rut || '—' }}</td>
            <td>{{ fila.nombre || '—' }}</td>
            <td class="apr-num">{{ fila.numeroMedidor || '—' }}</td>
            <td>{{ fila.sector || '—' }}</td>
            <td class="apr-num">{{ fila.porcentajeSubsidio ?? 0 }}%</td>
            <td class="max-w-xs whitespace-normal text-xs text-danger">
              <template v-if="erroresPorFila.get(fila.fila)?.length">
                <span class="font-semibold">Errores:</span>
                {{ erroresPorFila.get(fila.fila)?.join(' · ') }}
              </template>
              <span v-else class="text-success">OK</span>
            </td>
          </tr>
          <tr v-if="filas.length === 0">
            <td colspan="7" class="py-6 text-center text-text-secondary">No hay filas para previsualizar</td>
          </tr>
        </tbody>
      </table>
    </div>

    <ModalShell v-if="confirmarPlantilla" titulo="Usar plantilla vacía" @cerrar="confirmarPlantilla = false">
      <p class="text-sm text-text-secondary">
        ¿Reemplazar el contenido actual con la plantilla vacía? Se limpiarán los errores y los resultados de la importación anterior.
      </p>
      <div class="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" class="btn-secondary" @click="confirmarPlantilla = false">Cancelar</button>
        <button type="button" class="btn-danger" @click="usarPlantillaVacia">Usar plantilla vacía</button>
      </div>
    </ModalShell>
  </div>
</template>
