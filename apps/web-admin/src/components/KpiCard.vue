<script setup lang="ts">
withDefaults(
  defineProps<{
    titulo: string;
    valor: string;
    detalle?: string;
    tono?: 'normal' | 'alerta' | 'bueno';
  }>(),
  { detalle: '', tono: 'normal' },
);
</script>

<template>
  <div class="card flex flex-col justify-between px-3 py-3">
    <span class="text-xs font-semibold uppercase tracking-wide text-text-secondary">{{ titulo }}</span>
    <span
      class="apr-num mt-1 text-xl font-semibold leading-tight"
      :class="{
        'text-text-primary': tono === 'normal',
        'text-warning': tono === 'alerta',
        'text-success': tono === 'bueno',
      }"
    >
      {{ valor }}
    </span>
    <span v-if="detalle" class="mt-1 text-xs text-text-secondary">{{ detalle }}</span>
  </div>
</template>
