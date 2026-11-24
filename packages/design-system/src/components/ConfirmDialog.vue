<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue';
import AppIcon from './AppIcon.vue';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: 'primary' | 'danger';
  }>(),
  { confirmLabel: 'Confirmar', cancelLabel: 'Cancelar', tone: 'primary' },
);

const emit = defineEmits<{ confirm: []; cancel: [] }>();
const botonConfirmar = ref<HTMLButtonElement | null>(null);

function alTeclado(evento: KeyboardEvent): void {
  if (evento.key === 'Escape' && props.open) emit('cancel');
}

watch(
  () => props.open,
  async (abierto) => {
    if (abierto) {
      document.addEventListener('keydown', alTeclado);
      await nextTick();
      botonConfirmar.value?.focus();
    } else {
      document.removeEventListener('keydown', alTeclado);
    }
  },
);

onUnmounted(() => document.removeEventListener('keydown', alTeclado));
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="apr-confirm" @click.self="emit('cancel')">
      <div class="apr-confirm__panel" role="dialog" aria-modal="true" aria-labelledby="apr-confirm-title" aria-describedby="apr-confirm-message">
        <div class="apr-confirm__heading">
          <span class="apr-confirm__icon" :class="`apr-confirm__icon--${tone}`">
            <AppIcon :name="tone === 'danger' ? 'alert' : 'info'" :size="20" />
          </span>
          <h2 id="apr-confirm-title">{{ title }}</h2>
        </div>
        <p id="apr-confirm-message" class="apr-confirm__message">{{ message }}</p>
        <div class="apr-confirm__actions">
          <button type="button" class="apr-btn" @click="emit('cancel')">{{ cancelLabel }}</button>
          <button
            ref="botonConfirmar"
            type="button"
            class="apr-btn"
            :class="tone === 'danger' ? 'apr-btn--danger' : 'apr-btn--primary'"
            @click="emit('confirm')"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.apr-confirm {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: var(--scrim);
}

.apr-confirm__panel {
  width: min(100%, 440px);
  padding: var(--space-5);
  border: 1px solid var(--border);
  border-radius: var(--radius-modal);
  background: var(--surface);
  box-shadow: var(--shadow-md);
}

.apr-confirm__heading {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.apr-confirm__heading h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 620;
}

.apr-confirm__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-input);
  background: var(--primary-soft);
  color: var(--primary-on-soft);
}

.apr-confirm__icon--danger {
  background: var(--danger-soft);
  color: var(--danger);
}

.apr-confirm__message {
  margin: var(--space-4) 0 var(--space-5);
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.55;
}

.apr-confirm__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-2);
}
</style>
