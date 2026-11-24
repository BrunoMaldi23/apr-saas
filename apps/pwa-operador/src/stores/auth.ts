import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { guardarToken, limpiarToken, login, tokenGuardado } from '@/api/client';
import type { UsuarioAuth } from '@/types';

function leerUsuario(): UsuarioAuth | null {
  const raw = localStorage.getItem('apr_pwa_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UsuarioAuth;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore('authPwa', () => {
  const token = ref(tokenGuardado());
  const user = ref<UsuarioAuth | null>(leerUsuario());
  const autenticado = computed(() => token.value.length > 0 && user.value !== null);

  async function ingresar(email: string, password: string): Promise<void> {
    const respuesta = await login(email, password);
    token.value = respuesta.access_token;
    user.value = respuesta.user;
    guardarToken(respuesta.access_token);
    localStorage.setItem('apr_pwa_user', JSON.stringify(respuesta.user));
  }

  function salir(): void {
    token.value = '';
    user.value = null;
    limpiarToken();
  }

  return { token, user, autenticado, ingresar, salir };
});
