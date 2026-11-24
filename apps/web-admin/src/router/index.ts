import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import Login from '@/views/Login.vue';
import Dashboard from '@/views/Dashboard.vue';
import Socios from '@/views/Socios.vue';
import ImportarCSV from '@/views/ImportarCSV.vue';
import Ciclos from '@/views/Ciclos.vue';
import Cobros from '@/views/Cobros.vue';
import Caja from '@/views/Caja.vue';
import NotFound from '@/views/NotFound.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: Login, meta: { public: true, title: 'Ingreso' } },
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', name: 'dashboard', component: Dashboard, meta: { title: 'Resumen' } },
    { path: '/socios', name: 'socios', component: Socios, meta: { title: 'Padrón de socios' } },
    { path: '/importar', name: 'importar', component: ImportarCSV, meta: { title: 'Importación CSV', admin: true } },
    { path: '/ciclos', name: 'ciclos', component: Ciclos, meta: { title: 'Ciclos y facturación', admin: true } },
    { path: '/cobros', name: 'cobros', component: Cobros, meta: { title: 'Cobros y avisos' } },
    { path: '/caja', name: 'caja', component: Caja, meta: { title: 'Caja y pagos', admin: true } },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFound, meta: { title: 'Página no encontrada' } },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (!to.meta.public && !auth.estaAutenticado) return { name: 'login' };
  if (to.name === 'login' && auth.estaAutenticado) return { name: 'dashboard' };
  if (to.meta.admin && !auth.esAdmin) return { name: 'dashboard' };
  return true;
});

export default router;
