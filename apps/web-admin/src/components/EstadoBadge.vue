<script setup lang="ts">
import type { EstadoCobro, EstadoCiclo } from '@/types';
import { etiquetaEstado } from '@/utils/formato';

defineProps<{ estado: EstadoCobro | EstadoCiclo }>();

const estilos: Record<string, string> = {
  PENDIENTE: 'bg-warning-soft text-warning',
  PARCIAL: 'bg-primary-soft text-primary-on-soft',
  PAGADO: 'bg-success-soft text-success',
  VENCIDO: 'bg-danger-soft text-danger',
  ABIERTO: 'bg-primary-soft text-primary-on-soft',
  CERRADO: 'bg-surface-secondary text-text-secondary',
};
</script>

<template>
  <span
    class="chip apr-num text-xs font-semibold"
    :class="estilos[estado] ?? 'bg-surface-secondary text-text-secondary'"
  >
    {{ etiquetaEstado(estado) }}
  </span>
</template>
