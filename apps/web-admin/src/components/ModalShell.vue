<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import AppIcon from '../../../../packages/design-system/src/components/AppIcon.vue';

defineProps<{ titulo: string; ancho?: string }>();
const emit = defineEmits<{ cerrar: [] }>();

const panel = ref<HTMLElement | null>(null);
const botonCerrar = ref<HTMLButtonElement | null>(null);

function alTeclado(evento: KeyboardEvent): void {
  if (evento.key === 'Escape') emit('cerrar');
}

onMounted(() => {
  document.addEventListener('keydown', alTeclado);
  void nextTick(() => botonCerrar.value?.focus());
});

onUnmounted(() => document.removeEventListener('keydown', alTeclado));
</script>

<template>
  <Teleport to="body">
    <div class="apr-modal-scrim" @click.self="emit('cerrar')">
      <div
        ref="panel"
        class="apr-modal-panel"
        :class="ancho ?? 'max-w-lg'"
        role="dialog"
        aria-modal="true"
        :aria-label="titulo"
        tabindex="-1"
      >
        <div class="modal-header">
          <h2>{{ titulo }}</h2>
          <button ref="botonCerrar" class="btn-ghost modal-close" type="button" aria-label="Cerrar ventana" @click="emit('cerrar')">
            <AppIcon name="x" :size="18" />
          </button>
        </div>
        <div class="scroll-slim modal-body">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 620;
}

.modal-close {
  min-width: 36px;
  min-height: 36px;
  padding: 6px;
}

.modal-body {
  max-height: calc(min(92vh, 900px) - 60px);
  overflow: auto;
  padding: var(--space-4);
}
</style>
