<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AppIcon from '../../../../packages/design-system/src/components/AppIcon.vue';
import ThemeSwitcher from '../../../../packages/design-system/src/components/ThemeSwitcher.vue';
import { useAuthStore } from '@/stores/auth';
import { mensajeError } from '@/api/client';

const router = useRouter();
const auth = useAuthStore();
const email = ref('');
const password = ref('');
const verPassword = ref(false);
const error = ref('');
const cargando = ref(false);

async function ingresar(): Promise<void> {
  cargando.value = true;
  error.value = '';
  try {
    await auth.ingresar(email.value.trim(), password.value);
    await router.push('/inicio');
  } catch (e) {
    error.value = mensajeError(e);
  } finally {
    cargando.value = false;
  }
}
</script>

<template>
  <div class="pwa-login">
    <div class="pwa-login__panel">
      <div class="pwa-login__marca">
        <span class="pwa-brand__mark"><AppIcon name="droplet" :size="24" /></span>
        <div>
          <p class="apr-meta">APR SaaS · Terreno</p>
          <h1>Ingreso del operador</h1>
        </div>
      </div>

      <p class="apr-page-subtitle">
        Las lecturas se guardan en este equipo y se envían cuando vuelva la conexión.
      </p>

      <form class="apr-card pwa-login__formulario" novalidate @submit.prevent="ingresar">
        <div>
          <label class="apr-label" for="email">Correo</label>
          <input
            id="email"
            v-model="email"
            class="apr-input"
            type="email"
            autocomplete="username"
            aria-describedby="login-error"
            required
          />
        </div>

        <div>
          <label class="apr-label" for="password">Contraseña</label>
          <div class="pwa-password">
            <input
              id="password"
              v-model="password"
              class="apr-input"
              :type="verPassword ? 'text' : 'password'"
              autocomplete="current-password"
              aria-describedby="login-error"
              required
            />
            <button
              type="button"
              class="apr-btn apr-btn--ghost apr-btn--small pwa-password__boton"
              :aria-label="verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              @click="verPassword = !verPassword"
            >
              <AppIcon :name="verPassword ? 'x' : 'info'" :size="17" />
            </button>
          </div>
        </div>

        <p v-if="error" id="login-error" class="apr-alert apr-alert--danger" role="alert">{{ error }}</p>

        <button class="apr-btn apr-btn--primary apr-btn--wide" type="submit" :disabled="cargando" :aria-busy="cargando">
          {{ cargando ? 'Ingresando…' : 'Iniciar sesión' }}
        </button>
      </form>

      <div class="apr-card">
        <h2 class="apr-section-title">Apariencia</h2>
        <ThemeSwitcher />
      </div>

      <div class="pwa-login__pie">
        <span>Uso exclusivo del comité</span>
        <span>Versión 0.1.0</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pwa-password {
  position: relative;
}

.pwa-password input {
  padding-right: 56px;
}

.pwa-password__boton {
  position: absolute;
  right: 0;
  top: 0;
  min-width: 48px;
  min-height: 48px;
}
</style>
