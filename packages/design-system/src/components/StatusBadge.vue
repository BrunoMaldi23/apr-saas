<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    label: string;
    tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
    icon?: string;
  }>(),
  { tone: 'neutral', icon: '' },
);

const clase = computed(() => (props.tone === 'neutral' ? 'apr-chip' : `apr-chip apr-chip--${props.tone}`));
</script>

<template>
  <span :class="clase">
    <span v-if="icon" class="apr-badge__icon" aria-hidden="true">{{ icon }}</span>
    {{ label }}
  </span>
</template>

<style scoped>
.apr-badge__icon {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
</style>
