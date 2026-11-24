<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppIcon from '../../../packages/design-system/src/components/AppIcon.vue';
import ThemeSwitcher from '../../../packages/design-system/src/components/ThemeSwitcher.vue';
import { useAuthStore } from '@/stores/auth';
import { useOnline } from '@/composables/useOnline';
import { sincronizarPendientes } from '@/composables/useSync';
import { contarPendientes, obtenerMeta, solicitarPersistencia } from '@/db/dexie';
import type { MetaRuta } from '@/types';

const route = useRoute();
const auth = useAuthStore();
const { online } = useOnline();

const pendientes = ref(0);
const meta = ref<MetaRuta | undefined>();
const persistente = ref(false);
const avisoConexion = ref('');

const nav = [
  { name: 'inicio', to: '/inicio', label: 'Inicio', icon: 'home' },
  { name: 'ruta', to: '/ruta', label: 'Ruta', icon: 'route' },
  { name: 'envios', to: '/sincronizar', label: 'Envíos', icon: 'inbox' },
  { name: 'mas', to: '/mas', label: 'Más', icon: 'more' },
] as const;

const contexto = computed(() => `${auth.user?.comiteNombre ?? 'APR'} · ${meta.value?.periodo ?? 'Sin ruta descargada'}`);

const avisoOffline = computed(() => {
  if (!online.value) {
    return meta.value
      ? 'No tienes conexión. Puedes continuar tomando lecturas.'
      : 'Necesitas descargar una ruta antes de trabajar sin conexión.';
  }
  return avisoConexion.value;
});

async function actualizar(): Promise<void> {
  pendientes.value = await contarPendientes();
  meta.value = await obtenerMeta();
}

watch(() => route.name, actualizar);

watch(online, async (ahora, antes) => {
  await actualizar();
  if (ahora && !antes) {
    avisoConexion.value = 'Conexión recuperada';
    await nextTick();
    if (pendientes.value > 0) {
      const resultado = await sincronizarPendientes();
      avisoConexion.value = `Conexión recuperada. ${resultado.mensaje}`;
    }
    await actualizar();
  } else if (!ahora) {
    avisoConexion.value = '';
  }
});

onMounted(async () => {
  persistente.value = await solicitarPersistencia();
  await actualizar();
});
</script>

<template>
  <div v-if="!auth.autenticado" class="pwa-shell pwa-shell--login">
    <RouterView />
  </div>

  <div v-else class="pwa-shell">
    <header class="pwa-header">
      <div class="pwa-brand">
        <span class="pwa-brand__mark"><AppIcon name="droplet" :size="19" /></span>
        <div class="pwa-brand__texto">
          <p class="pwa-brand__nombre">APR · Operador</p>
          <p class="pwa-brand__contexto">{{ contexto }}</p>
        </div>
      </div>
      <div class="pwa-header__acciones">
        <span class="apr-chip" :class="!online ? 'apr-chip--warning' : 'apr-chip--success'">
          <AppIcon :name="online ? 'wifi' : 'wifiOff'" :size="14" />
          {{ online ? 'En línea' : 'Sin conexión' }}
        </span>
        <ThemeSwitcher compact />
      </div>
    </header>

    <aside class="pwa-sidebar" aria-label="Navegación principal">
      <p class="pwa-sidebar__titulo">Terreno</p>
      <RouterLink
        v-for="item in nav"
        :key="item.name"
        :to="item.to"
        class="pwa-sidebar__link"
        :aria-current="route.name === item.name ? 'page' : undefined"
      >
        <AppIcon :name="item.icon" :size="19" />
        <span>{{ item.label }}</span>
        <span v-if="item.name === 'mas'" class="apr-sr-only"> opciones</span>
        <span v-if="item.name === 'envios' && pendientes > 0" class="pwa-sidebar__badge apr-num">{{ pendientes }}</span>
      </RouterLink>
      <div class="apr-divider"></div>
      <p class="apr-meta">{{ persistente ? 'Datos protegidos en este equipo' : 'Almacenamiento del navegador' }}</p>
    </aside>

    <main class="pwa-main" id="contenido-principal">
      <div class="pwa-page">
        <div v-if="avisoOffline" class="pwa-offline" :class="{ 'pwa-offline--ok': online }" role="status">
          <AppIcon :name="online ? 'check' : 'wifiOff'" :size="17" />
          <span>{{ avisoOffline }}</span>
        </div>
        <RouterView />
      </div>
    </main>

    <nav class="pwa-nav" aria-label="Navegación inferior">
      <RouterLink
        v-for="item in nav"
        :key="item.name"
        :to="item.to"
        class="pwa-nav__item"
        :class="{ 'pwa-nav__item--activo': route.name === item.name }"
        :aria-current="route.name === item.name ? 'page' : undefined"
      >
        <AppIcon :name="item.icon" :size="20" />
        <span>{{ item.label }}</span>
        <span v-if="item.name === 'mas'" class="apr-sr-only"> opciones</span>
        <span v-if="item.name === 'envios' && pendientes > 0" class="pwa-nav__badge apr-num">{{ pendientes }}</span>
      </RouterLink>
    </nav>
  </div>
</template>
