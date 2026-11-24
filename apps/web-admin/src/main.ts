import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './style.css';
import '../../../packages/design-system/styles/fonts.css';
import '../../../packages/design-system/styles/tokens.css';
import '../../../packages/design-system/styles/base.css';

createApp(App).use(createPinia()).use(router).mount('#app');
