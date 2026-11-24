import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { api, guardarToken } from '@/api/client';
import type { RespuestaLogin, UsuarioAuth } from '@/types';

function leerUsuario(): UsuarioAuth | null {
  const raw = localStorage.getItem('apr_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UsuarioAuth;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem('apr_token') ?? '');
  const user = ref<UsuarioAuth | null>(leerUsuario());
  const estaAutenticado = computed(() => token.value.length > 0 && user.value !== null);
  const esAdmin = computed(() => user.value?.rol === 'ADMIN');

  async function login(email: string, password: string): Promise<void> {
    const { data } = await api.post<RespuestaLogin>('/auth/login', { email, password });
    token.value = data.access_token;
    user.value = data.user;
    guardarToken(data.access_token);
    localStorage.setItem('apr_user', JSON.stringify(data.user));
  }

  function logout(): void {
    token.value = '';
    user.value = null;
    localStorage.removeItem('apr_token');
    localStorage.removeItem('apr_user');
  }

  return { token, user, estaAutenticado, esAdmin, login, logout };
});
