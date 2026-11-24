<script setup lang="ts">
import AppIcon from './AppIcon.vue';

withDefaults(
  defineProps<{
    title: string;
    description?: string;
    icon?: string;
  }>(),
  { description: '', icon: 'inbox' },
);
</script>

<template>
  <div class="apr-empty">
    <span class="apr-empty__icon"><AppIcon :name="icon" :size="26" /></span>
    <div>
      <h3 class="apr-section-title">{{ title }}</h3>
      <p v-if="description" class="apr-meta">{{ description }}</p>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.apr-empty {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-5);
  border: 1px dashed var(--border);
  border-radius: var(--radius-card);
  background: var(--surface);
}

.apr-empty__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-input);
  background: var(--surface-secondary);
  color: var(--primary-on-soft);
}

.apr-empty h3 {
  margin-bottom: var(--space-1);
}
</style>
