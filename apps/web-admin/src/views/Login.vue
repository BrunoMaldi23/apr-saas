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
    await auth.login(email.value.trim(), password.value);
    await router.push('/dashboard');
  } catch (e) {
    error.value = mensajeError(e);
  } finally {
    cargando.value = false;
  }
}
</script>

<template>
  <div class="admin-login">
    <section class="admin-login__panel" aria-label="Presentación de APR SaaS">
      <div>
        <div class="admin-login__marca">
          <span class="admin-login__simbolo"><AppIcon name="droplet" :size="26" /></span>
          <span>APR <strong>SaaS</strong></span>
        </div>
        <h2 class="admin-login__claim">Administración de servicios sanitarios rurales</h2>
        <p class="admin-login__texto">
          Padrón de socios, ciclos tarifarios, cobros con Subsidio SAP y lecturas en terreno en una sola herramienta.
        </p>
      </div>
      <ul class="admin-login__lista">
        <li>Ley 20.998 · Registro SANEAR</li>
        <li>Rendición Subsidio SAP · Moneda CLP</li>
        <li>América/Santiago</li>
      </ul>
    </section>

    <section class="admin-login__formulario">
      <div class="admin-login__tarjeta">
        <h1>Ingreso al backoffice</h1>
        <p class="apr-page-subtitle">Acceso para administradores y operadores del comité.</p>

        <form class="admin-login__campos" novalidate @submit.prevent="ingresar">
          <div>
            <label class="label" for="email">Correo electrónico</label>
            <input
              id="email"
              v-model="email"
              class="input"
              type="email"
              autocomplete="username"
              aria-describedby="login-error"
              required
            />
          </div>
          <div>
            <label class="label" for="password">Contraseña</label>
            <div class="admin-login__password">
              <input
                id="password"
                v-model="password"
                class="input"
                :type="verPassword ? 'text' : 'password'"
                autocomplete="current-password"
                aria-describedby="login-error"
                required
              />
              <button
                class="btn-ghost admin-login__ver"
                type="button"
                :aria-label="verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                @click="verPassword = !verPassword"
              >
                <AppIcon :name="verPassword ? 'x' : 'info'" :size="18" />
              </button>
            </div>
          </div>

          <p v-if="error" id="login-error" class="apr-alert apr-alert--danger" role="alert">{{ error }}</p>

          <button class="btn-primary w-full" type="submit" :disabled="cargando" :aria-busy="cargando">
            {{ cargando ? 'Ingresando…' : 'Iniciar sesión' }}
          </button>
        </form>

        <div class="admin-login__apariencia">
          <p class="apr-label">Apariencia</p>
          <ThemeSwitcher />
        </div>

        <p class="admin-login__pie">
          <span>Uso interno del comité</span>
          <span>Versión 0.1.0</span>
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.admin-login {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-height: 100dvh;
  background: var(--background);
}

.admin-login__panel {
  display: none;
  flex-direction: column;
  justify-content: space-between;
  padding: var(--space-9);
  background: var(--text-primary);
  color: var(--surface);
}

.admin-login__marca {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: 22px;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.admin-login__marca strong {
  color: var(--accent);
  font-weight: 650;
}

.admin-login__simbolo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent) 22%, transparent);
  color: var(--accent);
}

.admin-login__claim {
  max-width: 18ch;
  margin: var(--space-6) 0 var(--space-3);
  font-size: clamp(28px, 3vw, 40px);
  font-weight: 620;
  line-height: 1.15;
  letter-spacing: -0.03em;
}

.admin-login__texto {
  max-width: 52ch;
  margin: 0;
  color: color-mix(in srgb, var(--surface) 78%, transparent);
  font-size: 15px;
  line-height: 1.6;
}

.admin-login__lista {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
  color: color-mix(in srgb, var(--surface) 72%, transparent);
  font-size: 13px;
}

.admin-login__formulario {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(var(--space-6) + env(safe-area-inset-top)) max(var(--space-4), env(safe-area-inset-left))
    calc(var(--space-6) + env(safe-area-inset-bottom)) max(var(--space-4), env(safe-area-inset-right));
}

.admin-login__tarjeta {
  width: min(100%, 420px);
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.admin-login__tarjeta h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.admin-login__campos {
  display: grid;
  gap: var(--space-3);
}

.admin-login__password {
  position: relative;
}

.admin-login__ver {
  position: absolute;
  right: 4px;
  top: 4px;
  min-width: 40px;
}

.admin-login__apariencia .apr-label {
  margin-bottom: var(--space-2);
}

.admin-login__pie {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
}

@media (min-width: 1024px) {
  .admin-login {
    grid-template-columns: minmax(360px, 44%) minmax(0, 1fr);
  }

  .admin-login__panel {
    display: flex;
  }
}
</style>
