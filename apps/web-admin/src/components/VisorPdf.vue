<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { descargarArchivo, obtenerBlob } from '@/api/client';

const props = defineProps<{
  ruta: string;
  nombreArchivo?: string;
  alto?: string;
}>();

const urlPdf = ref('');
const error = ref('');
const cargando = ref(false);

async function cargar(): Promise<void> {
  if (!props.ruta) return;
  if (urlPdf.value) URL.revokeObjectURL(urlPdf.value);
  urlPdf.value = '';
  error.value = '';
  cargando.value = true;
  try {
    urlPdf.value = URL.createObjectURL(await obtenerBlob(props.ruta));
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo cargar el PDF';
  } finally {
    cargando.value = false;
  }
}

function abrir(): void {
  if (urlPdf.value) window.open(urlPdf.value, '_blank', 'noopener,noreferrer');
}

async function descargar(): Promise<void> {
  error.value = '';
  try {
    await descargarArchivo(props.ruta, props.nombreArchivo ?? 'aviso.pdf');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo descargar el PDF';
  }
}

watch(() => props.ruta, cargar, { immediate: true });
onBeforeUnmount(() => {
  if (urlPdf.value) URL.revokeObjectURL(urlPdf.value);
});
</script>

<template>
  <div :aria-busy="cargando">
    <div class="mb-2 flex flex-wrap items-center gap-2">
      <button
        class="btn-secondary"
        type="button"
        :disabled="!urlPdf"
        :aria-label="`Abrir ${nombreArchivo ?? 'PDF'} en una pestaña nueva`"
        @click="abrir"
      >
        Abrir en pestaña
      </button>
      <button
        class="btn-primary"
        type="button"
        :disabled="!urlPdf"
        :aria-label="`Descargar ${nombreArchivo ?? 'aviso.pdf'}`"
        @click="descargar"
      >
        Descargar PDF
      </button>
      <span v-if="cargando" class="text-[11px] text-text-secondary" aria-live="polite">
        Generando documento…
      </span>
      <span v-if="error" class="text-[11px] text-danger" role="alert">{{ error }}</span>
    </div>
    <div
      class="overflow-hidden rounded border border-line bg-surface-secondary"
      :style="{ height: alto ?? 'min(60vh, 520px)' }"
    >
      <iframe v-if="urlPdf" :src="urlPdf" class="h-full w-full" title="Vista previa de PDF" />
      <div v-else class="flex h-full items-center justify-center text-xs text-text-secondary">
        {{ error || 'Preparando vista previa…' }}
      </div>
    </div>
  </div>
</template>
