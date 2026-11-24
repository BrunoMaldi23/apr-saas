<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppIcon from '../../../../packages/design-system/src/components/AppIcon.vue';
import ConfirmDialog from '../../../../packages/design-system/src/components/ConfirmDialog.vue';
import StatusBadge from '../../../../packages/design-system/src/components/StatusBadge.vue';
import ThemeSwitcher from '../../../../packages/design-system/src/components/ThemeSwitcher.vue';
import { useAuthStore } from '@/stores/auth';
import { useOnline } from '@/composables/useOnline';
import { formatearUltimaSincronizacion, ultimaSincronizacion } from '@/composables/useSync';
import { contarPendientes, obtenerMeta } from '@/db/dexie';
import type { MetaRuta } from '@/types';

const router = useRouter();
const auth = useAuthStore();
const { online } = useOnline();

const pendientes = ref(0);
const meta = ref<MetaRuta | undefined>();
const confirmandoSalida = ref(false);
const seccion = ref('');

type Seccion = 'cuenta' | 'comite' | 'conexion' | 'ruta' | 'sincronizacion' | 'app';
function alternar(valor: Seccion): void {
  seccion.value = seccion.value === valor ? '' : valor;
}

const opciones = computed(() => [
  { id: 'cuenta' as const, etiqueta: 'Mi cuenta', detalle: 'Usuario y rol', icono: 'user' },
  { id: 'comite' as const, etiqueta: 'Información del comité', detalle: auth.user?.comiteNombre ?? '—', icono: 'shield' },
  { id: 'conexion' as const, etiqueta: 'Estado de conexión', detalle: online.value ? 'En línea' : 'Sin conexión', icono: 'wifi' },
  { id: 'ruta' as const, etiqueta: 'Información de la ruta', detalle: meta.value?.periodo ?? 'Sin ruta descargada', icono: 'route' },
  { id: 'sincronizacion' as const, etiqueta: 'Última sincronización', detalle: formatearUltimaSincronizacion(ultimaSincronizacion.value), icono: 'refresh' },
  { id: 'app' as const, etiqueta: 'Información de la aplicación', detalle: 'Versión 0.1.0', icono: 'info' },
]);

async function salir(): Promise<void> {
  confirmandoSalida.value = false;
  auth.salir();
  await router.push('/login');
}

function cerrarSesion(): void {
  if (pendientes.value > 0) confirmandoSalida.value = true;
  else void salir();
}

onMounted(async () => {
  pendientes.value = await contarPendientes();
  meta.value = await obtenerMeta();
});
</script>

<template>
  <div class="pwa-page">
    <div class="apr-page-header">
      <div>
        <h1>Más</h1>
        <p class="apr-page-subtitle">Configuración, información del equipo y cierre de sesión.</p>
      </div>
    </div>

    <div class="apr-card">
      <h2 class="apr-section-title">Apariencia</h2>
      <p class="apr-meta" style="margin: -8px 0 var(--space-3)">Puedes cambiarla incluso sin conexión.</p>
      <ThemeSwitcher />
    </div>

    <div class="apr-card pwa-seccion">
      <h2 class="apr-section-title">Opciones</h2>
      <div class="pwa-lista-menu">
        <button
          v-for="opcion in opciones"
          :key="opcion.id"
          type="button"
          class="pwa-menu-item"
          :aria-expanded="seccion === opcion.id"
          @click="alternar(opcion.id)"
        >
          <AppIcon :name="opcion.icono" :size="19" />
          <span class="pwa-menu-item__texto">
            <strong>{{ opcion.etiqueta }}</strong>
            <small>{{ opcion.detalle }}</small>
          </span>
          <AppIcon :name="seccion === opcion.id ? 'chevronLeft' : 'chevronRight'" :size="17" />
        </button>
      </div>

      <div v-if="seccion === 'cuenta'" class="apr-card apr-card--soft" style="margin-top: var(--space-3)">
        <dl class="pwa-detalle">
          <dt>Nombre</dt><dd>{{ auth.user?.nombre ?? '—' }}</dd>
          <dt>Rol</dt><dd>{{ auth.user?.rol ?? '—' }}</dd>
        </dl>
      </div>
      <div v-else-if="seccion === 'comite'" class="apr-card apr-card--soft" style="margin-top: var(--space-3)">
        <dl class="pwa-detalle">
          <dt>Comité</dt><dd>{{ auth.user?.comiteNombre ?? '—' }}</dd>
          <dt>Identificador</dt><dd class="apr-num">{{ auth.user?.comiteId ?? '—' }}</dd>
        </dl>
      </div>
      <div v-else-if="seccion === 'conexion'" class="apr-card apr-card--soft" style="margin-top: var(--space-3)">
        <dl class="pwa-detalle">
          <dt>Estado</dt><dd>{{ online ? 'En línea' : 'Sin conexión' }}</dd>
          <dt>Lecturas pendientes</dt><dd class="apr-num">{{ pendientes }}</dd>
        </dl>
      </div>
      <div v-else-if="seccion === 'ruta'" class="apr-card apr-card--soft" style="margin-top: var(--space-3)">
        <dl class="pwa-detalle">
          <dt>Ciclo</dt><dd>{{ meta?.periodo ?? 'Sin ruta descargada' }}</dd>
          <dt>Descargada</dt><dd>{{ meta ? new Date(meta.descargadaEn).toLocaleString('es-CL', { timeZone: 'America/Santiago' }) : '—' }}</dd>
        </dl>
        <div style="display: flex; gap: var(--space-2); margin-top: var(--space-3)">
          <button class="apr-btn apr-btn--small" @click="router.push('/descargar')">Descargar/actualizar</button>
          <button class="apr-btn apr-btn--small" @click="router.push('/resumen')">Ver resumen</button>
        </div>
      </div>
      <div v-else-if="seccion === 'sincronizacion'" class="apr-card apr-card--soft" style="margin-top: var(--space-3)">
        <p class="apr-meta" style="margin: 0">Último envío: {{ formatearUltimaSincronizacion(ultimaSincronizacion) }}</p>
        <button class="apr-btn apr-btn--small" style="margin-top: var(--space-3)" @click="router.push('/sincronizar')">Ir a Envíos</button>
      </div>
      <div v-else-if="seccion === 'app'" class="apr-card apr-card--soft" style="margin-top: var(--space-3)">
        <dl class="pwa-detalle">
          <dt>Aplicación</dt><dd>APR Operador</dd>
          <dt>Versión</dt><dd>0.1.0</dd>
          <dt>Almacenamiento</dt><dd>{{ meta ? 'Ruta guardada en este equipo' : 'Sin ruta guardada' }}</dd>
        </dl>
      </div>
    </div>

    <div class="pwa-seccion pwa-seccion--secundaria">
      <StatusBadge :label="pendientes > 0 ? `${pendientes} lectura(s) por enviar` : 'Todo actualizado'" :tone="pendientes > 0 ? 'warning' : 'success'" />
      <button class="apr-btn apr-btn--danger apr-btn--wide" style="margin-top: var(--space-3)" @click="cerrarSesion">
        <AppIcon name="logout" :size="18" />
        Cerrar sesión
      </button>
      <p class="apr-meta" style="margin: var(--space-2) 0 0">Cerrar la sesión no elimina lecturas guardadas.</p>
    </div>

    <ConfirmDialog
      :open="confirmandoSalida"
      title="Cerrar sesión con lecturas pendientes"
      :message="`Tienes ${pendientes} lectura(s) guardadas sin enviar. Puedes cerrar sesión; las lecturas se conservarán en este equipo.`"
      confirm-label="Cerrar sesión"
      tone="danger"
      @confirm="salir"
      @cancel="confirmandoSalida = false"
    />
  </div>
</template>
