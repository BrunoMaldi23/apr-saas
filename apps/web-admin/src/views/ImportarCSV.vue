<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import ImportarSocios from '@/components/ImportarSocios.vue';

const router = useRouter();
const guardados = ref(0);

function limpiarMensaje(): void {
  guardados.value = 0;
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-lg font-semibold text-text-primary">Importación masiva de socios</h1>
        <p class="text-xs text-text-secondary">
          Cada fila crea un socio con su medidor inicial. El orden de ruta se asigna automáticamente si se omite.
        </p>
      </div>
      <button class="btn-secondary" @click="router.push('/socios')">Volver al padrón</button>
    </div>

    <p v-if="guardados" class="apr-alert apr-alert--success" role="status">
      Se importaron {{ guardados }} socios correctamente.
    </p>

    <div class="card p-4" @click.capture="limpiarMensaje" @input.capture="limpiarMensaje">
      <ImportarSocios @guardado="guardados = $event" />
    </div>

    <div class="card p-4 text-xs leading-relaxed text-text-secondary">
      <p class="font-semibold text-text-primary">Columnas aceptadas</p>
      <p class="mt-1 break-words font-mono">
        <code>rut</code>; <code>nombre</code>; <code>direccion</code>; <code>sector</code>; <code>telefono</code>;
        <code>decreto_sap</code>; <code>porcentaje_subsidio</code>; <code>numero_medidor</code>;
        <code>digitos</code>; <code>lectura_inicial</code>; <code>orden_ruta</code>
      </p>
      <p class="mt-1">Separador ; o , · campos entre comillas dobles si contienen el separador · codificación UTF-8.</p>
    </div>
  </div>
</template>
