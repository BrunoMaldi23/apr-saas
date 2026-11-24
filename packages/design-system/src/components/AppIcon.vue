<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{ name: string; size?: number | string }>(), { size: 20 });

const trazos: Record<string, string[]> = {
  home: ['M3 10.5 12 3l9 7.5', 'M5.5 9.5V21h13V9.5', 'M9.5 21v-6h5v6'],
  route: ['M6 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'M18 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'M9 16h3a4 4 0 0 0 4-4V9'],
  inbox: ['M4 13h4l2 3h4l2-3h4', 'M5.5 5h13l1.5 8v6H4v-6L5.5 5Z'],
  more: ['M5 12h.01', 'M12 12h.01', 'M19 12h.01'],
  download: ['M12 3v12', 'm7.5 10.5 4.5 4.5 4.5-4.5', 'M4 20h16'],
  refresh: ['M20 7v5h-5', 'M4 17v-5h5', 'M19 12a7 7 0 0 0-12.3-4.4L4 10', 'M5 12a7 7 0 0 0 12.3 4.4L20 14'],
  check: ['m5 12 4.5 4.5L19 7'],
  alert: ['M12 3 2.8 19h18.4L12 3Z', 'M12 9v5', 'M12 17h.01'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 11v5', 'M12 8h.01'],
  sun: ['M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M12 2v2', 'M12 20v2', 'M4.9 4.9l1.4 1.4', 'M17.7 17.7l1.4 1.4', 'M2 12h2', 'M20 12h2', 'M4.9 19.1l1.4-1.4', 'M17.7 6.3l1.4-1.4'],
  moon: ['M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z'],
  monitor: ['M3 5h18v11H3z', 'M8 20h8', 'M12 16v4'],
  wifi: ['M2.5 9a14 14 0 0 1 19 0', 'M6 12.5a9 9 0 0 1 12 0', 'M9.5 16a4.5 4.5 0 0 1 5 0', 'M12 19.5h.01'],
  wifiOff: ['M3 3l18 18', 'M2.5 9a14 14 0 0 1 5.2-3.2', 'M16.3 6.1A14 14 0 0 1 21.5 9', 'M6 12.5a9 9 0 0 1 4-2', 'M9.5 16a4.5 4.5 0 0 1 5 0', 'M12 19.5h.01'],
  logout: ['M10 4H5v16h5', 'M14 8l4 4-4 4', 'M9 12h9'],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4 21a8 8 0 0 1 16 0'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7v5l3.5 2'],
  arrowRight: ['M4 12h15', 'm13 6 6 6-6 6'],
  chevronLeft: ['m15 18-6-6 6-6'],
  chevronRight: ['m9 18 6-6-6-6'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'm17 17 4 4'],
  x: ['M6 6l12 12', 'M18 6 6 18'],
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  settings: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1-2.2 2.2-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21h-3v-.1A1.6 1.6 0 0 0 10.7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1-2.2-2.2.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H5v-3h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1 2.2-2.2.1.1a1.6 1.6 0 0 0 1.8.3H11a1.6 1.6 0 0 0 1-1.5V5h3v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1 2.2 2.2-.1.1a1.6 1.6 0 0 0-.3 1.8V11a1.6 1.6 0 0 0 1.5 1H21v3h-.1a1.6 1.6 0 0 0-1.5 1Z'],
  file: ['M6 3h8l4 4v14H6z', 'M14 3v5h4', 'M9 13h6', 'M9 17h6'],
  chart: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2'],
  shield: ['M12 3 4 6v6c0 5 3.4 8.2 8 9 4.6-.8 8-4 8-9V6l-8-3Z', 'm9 12 2 2 4-4'],
  calculator: ['M5 3h14v18H5z', 'M8 7h8', 'M8 11h2', 'M14 11h2', 'M8 15h2', 'M14 15h2', 'M8 18h8'],
  droplet: ['M12 3s6 6.4 6 10.4a6 6 0 0 1-12 0C6 9.4 12 3 12 3Z'],
  database: ['M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3Z', 'M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5', 'M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3'],
  clipboard: ['M8 4h8v3H8z', 'M9 5H6v16h12V5h-3', 'M9 12h6', 'M9 16h6'],
  calendar: ['M4 6h16v15H4z', 'M4 10h16', 'M8 3v4', 'M16 3v4', 'M8 14h3', 'M14 14h3'],
};

const paths = computed(() => trazos[props.name] ?? trazos.info);
const tamano = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size));
</script>

<template>
  <svg
    :width="tamano"
    :height="tamano"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="(d, indice) in paths" :key="indice" :d="d" />
  </svg>
</template>
