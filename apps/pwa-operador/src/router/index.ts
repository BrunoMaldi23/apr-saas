import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import Login from '@/views/Login.vue';
import Inicio from '@/views/Inicio.vue';
import DescargarRuta from '@/views/DescargarRuta.vue';
import ListaRuta from '@/views/ListaRuta.vue';
import CapturaLectura from '@/views/CapturaLectura.vue';
import SyncStatus from '@/views/SyncStatus.vue';
import Mas from '@/views/Mas.vue';
import ResumenRuta from '@/views/ResumenRuta.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: Login, meta: { public: true } },
    { path: '/', redirect: '/inicio' },
    { path: '/inicio', name: 'inicio', component: Inicio },
    { path: '/descargar', name: 'descargar', component: DescargarRuta },
    { path: '/ruta', name: 'ruta', component: ListaRuta },
    { path: '/captura', name: 'captura', component: CapturaLectura },
    { path: '/sincronizar', name: 'envios', component: SyncStatus },
    { path: '/mas', name: 'mas', component: Mas },
    { path: '/resumen', name: 'resumen', component: ResumenRuta },
    { path: '/:pathMatch(.*)*', redirect: '/inicio' },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (!to.meta.public && !auth.autenticado) return { name: 'login' };
  if (to.name === 'login' && auth.autenticado) return { name: 'inicio' };
  return true;
});

export default router;
