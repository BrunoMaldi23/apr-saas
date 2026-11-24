<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppIcon from '../../../packages/design-system/src/components/AppIcon.vue';
import ConfirmDialog from '../../../packages/design-system/src/components/ConfirmDialog.vue';
import ThemeSwitcher from '../../../packages/design-system/src/components/ThemeSwitcher.vue';
import { useAuthStore } from '@/stores/auth';
import { useCicloActivoStore } from '@/stores/cicloActivo';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  admin?: boolean;
}

const route = useRoute();
const auth = useAuthStore();
const cicloStore = useCicloActivoStore();

const nav: NavItem[] = [
  { to: '/dashboard', label: 'Resumen', icon: 'chart' },
  { to: '/socios', label: 'Padrón de socios', icon: 'user' },
  { to: '/importar', label: 'Importación CSV', icon: 'file', admin: true },
  { to: '/ciclos', label: 'Ciclos y facturación', icon: 'calendar', admin: true },
  { to: '/cobros', label: 'Cobros y avisos', icon: 'calculator' },
  { to: '/caja', label: 'Caja y pagos', icon: 'database', admin: true },
];

const navVisible = computed(() => nav.filter((item) => !item.admin || auth.esAdmin));
const titulo = computed(() => (route.meta.title as string | undefined) ?? 'Backoffice');
const menuAbierto = ref(false);
const drawerAbierto = ref(false);
const colapsado = ref(false);
const confirmandoSalida = ref(false);

watch(() => route.fullPath, () => {
  drawerAbierto.value = false;
  menuAbierto.value = false;
});

onMounted(() => {
  if (auth.estaAutenticado) void cicloStore.cargar().catch(() => undefined);
});

function salir(): void {
  confirmandoSalida.value = false;
  auth.logout();
}
</script>

<template>
  <RouterView v-if="!auth.estaAutenticado" />

  <div v-else class="admin-shell" :class="{ 'admin-shell--colapsado': colapsado }">
    <div v-if="drawerAbierto" class="admin-scrim" @click="drawerAbierto = false"></div>

    <aside class="admin-sidebar" :class="{ 'admin-sidebar--abierto': drawerAbierto }" aria-label="Navegación principal">
      <div class="admin-sidebar__marca">
        <span class="admin-sidebar__simbolo"><AppIcon name="droplet" :size="20" /></span>
        <span v-if="!colapsado" class="admin-sidebar__nombre">APR <strong>SaaS</strong></span>
        <button
          class="admin-sidebar__colapsar"
          type="button"
          :aria-label="colapsado ? 'Expandir menú lateral' : 'Contraer menú lateral'"
          @click="colapsado = !colapsado"
        >
          <AppIcon :name="colapsado ? 'chevronRight' : 'chevronLeft'" :size="17" />
        </button>
      </div>

      <nav class="admin-sidebar__nav">
        <RouterLink
          v-for="item in navVisible"
          :key="item.to"
          :to="item.to"
          class="admin-sidebar__link"
          :class="{ 'admin-sidebar__link--activo': route.path === item.to }"
          :aria-current="route.path === item.to ? 'page' : undefined"
          :title="colapsado ? item.label : undefined"
        >
          <AppIcon :name="item.icon" :size="19" />
          <span v-if="!colapsado">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div v-if="!colapsado" class="admin-sidebar__pie">
        <p class="apr-meta">Gestión SSR · Ley 20.998</p>
        <p class="apr-meta">Moneda CLP · América/Santiago</p>
      </div>
    </aside>

    <div class="admin-content">
      <header class="admin-header">
        <div class="admin-header__izquierda">
          <button
            class="btn-ghost admin-header__menu"
            type="button"
            aria-label="Abrir menú de navegación"
            :aria-expanded="drawerAbierto"
            @click="drawerAbierto = true"
          >
            <AppIcon name="menu" :size="20" />
          </button>
          <div class="admin-breadcrumb" aria-label="Ruta de navegación">
            <span>Backoffice</span>
            <AppIcon name="chevronRight" :size="14" />
            <strong aria-current="page">{{ titulo }}</strong>
          </div>
        </div>

        <div class="admin-header__derecha">
          <span v-if="cicloStore.ciclo" class="apr-chip apr-chip--success admin-header__ciclo">
            Ciclo {{ cicloStore.ciclo.periodo }} · {{ cicloStore.ciclo.estado === 'ABIERTO' ? 'Abierto' : 'Cerrado' }}
          </span>
          <span class="apr-chip admin-header__comite" :title="auth.user?.comiteNombre ?? ''">
            {{ auth.user?.comiteNombre ?? 'Comité' }}
          </span>
          <ThemeSwitcher compact />

          <div class="admin-user">
            <button
              class="admin-user__boton"
              type="button"
              :aria-expanded="menuAbierto"
              aria-haspopup="true"
              @click="menuAbierto = !menuAbierto"
            >
              <span class="admin-user__avatar">{{ (auth.user?.nombre ?? 'U').charAt(0) }}</span>
              <span class="admin-user__nombre">{{ auth.user?.nombre ?? 'Usuario' }}</span>
              <AppIcon name="chevronRight" :size="15" />
            </button>
            <div v-if="menuAbierto" class="admin-user__menu" role="menu">
              <div class="admin-user__datos">
                <strong>{{ auth.user?.nombre ?? '—' }}</strong>
                <span>{{ auth.user?.rol ?? '—' }} · {{ auth.user?.comiteNombre ?? '—' }}</span>
              </div>
              <div class="admin-user__apariencia">
                <p class="apr-label">Apariencia</p>
                <ThemeSwitcher />
              </div>
              <button class="btn btn-danger w-full" type="button" role="menuitem" @click="menuAbierto = false; confirmandoSalida = true">
                <AppIcon name="logout" :size="17" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <main class="admin-main scroll-slim" id="contenido-principal">
        <RouterView />
      </main>
    </div>

    <ConfirmDialog
      :open="confirmandoSalida"
      title="Cerrar sesión"
      message="Se cerrará la sesión del backoffice. No se eliminarán lecturas ni datos del comité."
      confirm-label="Cerrar sesión"
      tone="danger"
      @confirm="salir"
      @cancel="confirmandoSalida = false"
    />
  </div>
</template>

<style scoped>
.admin-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-height: 100dvh;
  background: var(--background);
}

.admin-sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 40;
  display: flex;
  width: 248px;
  flex-direction: column;
  border-right: 1px solid var(--border);
  background: var(--surface);
  transform: translateX(-100%);
  transition: transform var(--duration);
}

.admin-sidebar--abierto {
  transform: translateX(0);
}

.admin-sidebar__marca {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 60px;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
}

.admin-sidebar__simbolo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--primary-soft);
  color: var(--primary-on-soft);
}

.admin-sidebar__nombre {
  font-size: 16px;
  font-weight: 620;
  letter-spacing: -0.02em;
}

.admin-sidebar__nombre strong {
  color: var(--primary-on-soft);
  font-weight: 650;
}

.admin-sidebar__colapsar {
  display: none;
  margin-left: auto;
  min-width: 32px;
  min-height: 32px;
  border-radius: var(--radius-input);
  color: var(--text-muted);
}

.admin-sidebar__colapsar:hover {
  background: var(--surface-hover);
}

.admin-sidebar__nav {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3) var(--space-2);
}

.admin-sidebar__link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 44px;
  margin-bottom: 2px;
  padding: 8px 12px;
  border-radius: var(--radius-input);
  color: var(--text-secondary);
  font-size: 14px;
  text-decoration: none;
  transition: background-color var(--duration), color var(--duration);
}

.admin-sidebar__link:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}

.admin-sidebar__link--activo {
  background: var(--primary-soft);
  color: var(--primary-on-soft);
  font-weight: 620;
}

.admin-sidebar__pie {
  display: grid;
  gap: 2px;
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--border);
}

.admin-scrim {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: var(--scrim);
}

.admin-content {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.admin-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 60px;
  padding: calc(var(--space-2) + env(safe-area-inset-top)) max(var(--space-4), env(safe-area-inset-left)) var(--space-2)
    max(var(--space-4), env(safe-area-inset-right));
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.admin-header__izquierda,
.admin-header__derecha {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.admin-header__menu {
  display: inline-flex;
  min-width: 40px;
  padding: 6px;
}

.admin-breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  min-width: 0;
  color: var(--text-muted);
  font-size: 13px;
}

.admin-breadcrumb strong {
  overflow: hidden;
  color: var(--text-primary);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-header__comite {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.admin-user {
  position: relative;
}

.admin-user__boton {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 40px;
  padding: 4px 8px;
  border-radius: var(--radius-input);
  color: var(--text-secondary);
  font-size: 13px;
}

.admin-user__boton:hover {
  background: var(--surface-hover);
}

.admin-user__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary-on-soft);
  font-weight: 650;
}

.admin-user__menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 50;
  display: grid;
  gap: var(--space-3);
  width: min(320px, calc(100vw - 32px));
  padding: var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--surface);
  box-shadow: var(--shadow-md);
}

.admin-user__datos {
  display: grid;
  gap: 2px;
  font-size: 13px;
}

.admin-user__datos span {
  color: var(--text-secondary);
  font-size: 12px;
}

.admin-user__apariencia .apr-label {
  margin-bottom: var(--space-2);
}

.admin-main {
  flex: 1;
  min-width: 0;
  padding: var(--space-4) max(var(--space-4), env(safe-area-inset-left)) calc(var(--space-6) + env(safe-area-inset-bottom))
    max(var(--space-4), env(safe-area-inset-right));
}

@media (max-width: 639px) {
  .admin-header__ciclo,
  .admin-user__nombre {
    display: none;
  }

  .admin-header__comite {
    max-width: 110px;
  }
}

@media (max-width: 359px) {
  .admin-header {
    gap: var(--space-2);
  }

  .admin-header__derecha {
    gap: 4px;
  }

  .admin-breadcrumb,
  .admin-user__boton > svg {
    display: none;
  }

  .admin-header__comite {
    max-width: 96px;
  }

  .admin-user__boton {
    padding: 4px;
  }
}

@media (min-width: 1024px) {
  .admin-shell {
    grid-template-columns: 248px minmax(0, 1fr);
  }

  .admin-shell--colapsado {
    grid-template-columns: 72px minmax(0, 1fr);
  }

  .admin-sidebar {
    position: sticky;
    top: 0;
    width: auto;
    height: 100dvh;
    transform: none;
  }

  .admin-shell--colapsado .admin-sidebar {
    width: 72px;
  }

  .admin-sidebar__marca {
    padding-inline: var(--space-3);
  }

  .admin-sidebar__colapsar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .admin-shell--colapsado .admin-sidebar__nombre,
  .admin-shell--colapsado .admin-sidebar__pie {
    display: none;
  }

  .admin-shell--colapsado .admin-sidebar__link {
    justify-content: center;
    padding-inline: 0;
  }

  .admin-shell--colapsado .admin-sidebar__colapsar {
    margin-left: 0;
  }

  .admin-header__menu {
    display: none;
  }

  .admin-main {
    padding: var(--space-5) var(--space-6);
  }
}
</style>
