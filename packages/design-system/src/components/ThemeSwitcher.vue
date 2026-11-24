<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from './AppIcon.vue';
import { useTheme, type Theme } from '../useTheme';

withDefaults(defineProps<{ compact?: boolean }>(), { compact: false });

const { theme, efectivo, establecerTema, alternar } = useTheme();

const opciones: Array<{ valor: Theme; etiqueta: string; icono: string }> = [
  { valor: 'light', etiqueta: 'Claro', icono: 'sun' },
  { valor: 'dark', etiqueta: 'Oscuro', icono: 'moon' },
  { valor: 'system', etiqueta: 'Sistema', icono: 'monitor' },
];

const etiquetaCompacta = computed(() => (efectivo.value === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'));
</script>

<template>
  <button
    v-if="compact"
    type="button"
    class="apr-btn apr-btn--ghost apr-tema-compact"
    :aria-label="etiquetaCompacta"
    :title="etiquetaCompacta"
    @click="alternar"
  >
    <AppIcon :name="efectivo === 'dark' ? 'sun' : 'moon'" :size="18" />
  </button>

  <div v-else class="apr-tema" role="group" aria-label="Apariencia de la aplicación">
    <button
      v-for="opcion in opciones"
      :key="opcion.valor"
      type="button"
      class="apr-tema__opcion"
      :class="{ 'apr-tema__opcion--activa': theme === opcion.valor }"
      :aria-pressed="theme === opcion.valor"
      @click="establecerTema(opcion.valor)"
    >
      <AppIcon :name="opcion.icono" :size="19" />
      <span>{{ opcion.etiqueta }}</span>
      <AppIcon v-if="theme === opcion.valor" name="check" :size="15" />
    </button>
  </div>
</template>

<style scoped>
.apr-tema-compact {
  min-width: 48px;
  min-height: 48px;
  padding: 8px;
  font-size: 14px;
}

.apr-tema {
  display: grid;
  gap: var(--space-2);
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
}

.apr-tema__opcion {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 48px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 14px;
  text-align: left;
  transition: border-color var(--duration), background-color var(--duration), color var(--duration);
}

.apr-tema__opcion:hover {
  background: var(--surface-hover);
}

.apr-tema__opcion--activa {
  border-color: var(--primary);
  background: var(--primary-soft);
  color: var(--primary-on-soft);
  font-weight: 600;
}

.apr-tema__opcion > :last-child {
  margin-left: auto;
}
</style>
