import { computed, onMounted, onUnmounted, readonly, ref } from 'vue';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'apr-theme';
const THEMES: Theme[] = ['light', 'dark', 'system'];

const theme = ref<Theme>('system');
const systemDark = ref(false);
let initialized = false;
let consumers = 0;
let mediaQuery: MediaQueryList | null = null;

function leerPreferencia(): Theme {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return guardado && THEMES.includes(guardado) ? guardado : 'system';
  } catch {
    return 'system';
  }
}

function colorDelTema(tema: 'light' | 'dark'): string {
  return tema === 'dark' ? '#0b1523' : '#f4f8fc';
}

function aplicar(tema: Theme = theme.value): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', tema);
  const efectivo = tema === 'system' ? (systemDark.value ? 'dark' : 'light') : tema;
  const meta = root.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = colorDelTema(efectivo);
}

function inicializar(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  systemDark.value = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  theme.value = leerPreferencia();
  aplicar();
}

function alCambiarSistema(evento: MediaQueryListEvent): void {
  systemDark.value = evento.matches;
  if (theme.value === 'system') aplicar();
}

function adjuntarListener(): void {
  if (mediaQuery || typeof window === 'undefined' || !window.matchMedia) return;
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', alCambiarSistema);
}

function soltarListener(): void {
  if (!mediaQuery) return;
  mediaQuery.removeEventListener('change', alCambiarSistema);
  mediaQuery = null;
}

/** Preferencia de tema compartida por ambas aplicaciones. Persiste offline en localStorage. */
export function useTheme() {
  inicializar();

  onMounted(() => {
    consumers += 1;
    adjuntarListener();
    aplicar();
  });

  onUnmounted(() => {
    consumers = Math.max(0, consumers - 1);
    if (consumers === 0) soltarListener();
  });

  function establecerTema(siguiente: Theme): void {
    theme.value = THEMES.includes(siguiente) ? siguiente : 'system';
    try {
      localStorage.setItem(STORAGE_KEY, theme.value);
    } catch {
      // La preferencia sigue aplicada en memoria aunque el almacenamiento no esté disponible.
    }
    aplicar();
  }

  function alternar(): void {
    establecerTema(theme.value === 'dark' ? 'light' : 'dark');
  }

  const efectivo = computed<'light' | 'dark'>(() =>
    theme.value === 'system' ? (systemDark.value ? 'dark' : 'light') : theme.value,
  );

  return {
    theme: readonly(theme),
    efectivo,
    establecerTema,
    alternar,
  };
}
