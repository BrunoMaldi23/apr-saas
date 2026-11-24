<script setup lang="ts">
import { useRouter } from 'vue-router';
import EmptyState from '../../../../packages/design-system/src/components/EmptyState.vue';

const router = useRouter();
</script>

<template>
  <div class="card">
    <EmptyState
      icon="search"
      title="Página no encontrada"
      description="La sección que buscas no existe o no está disponible para tu rol."
    >
      <button class="btn-primary mt-3" @click="router.push('/dashboard')">
        Volver al resumen
      </button>
    </EmptyState>
  </div>
</template>
