import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { registerSW } from 'virtual:pwa-register';
import App from './App.vue';
import router from './router';
import '../../../packages/design-system/styles/fonts.css';
import '../../../packages/design-system/styles/tokens.css';
import '../../../packages/design-system/styles/base.css';
import './style.css';

registerSW({ immediate: true });

createApp(App).use(createPinia()).use(router).mount('#app');
