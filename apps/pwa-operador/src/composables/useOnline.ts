import { onMounted, onUnmounted, ref } from 'vue';

export function useOnline() {
  const online = ref<boolean>(typeof navigator === 'undefined' ? true : navigator.onLine);

  function activar(): void {
    online.value = true;
  }

  function desactivar(): void {
    online.value = false;
  }

  onMounted(() => {
    window.addEventListener('online', activar);
    window.addEventListener('offline', desactivar);
    online.value = navigator.onLine;
  });

  onUnmounted(() => {
    window.removeEventListener('online', activar);
    window.removeEventListener('offline', desactivar);
  });

  return { online };
}
