<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import ModalShell from '@/components/ModalShell.vue';
import ImportarSocios from '@/components/ImportarSocios.vue';
import { useSociosStore } from '@/stores/socios';
import { mensajeError } from '@/api/client';
import type { FilaSocioImportacion, Socio } from '@/types';

const router = useRouter();
const store = useSociosStore();
const mostrarNuevo = ref(false);
const mostrarImportar = ref(false);
const guardando = ref(false);
const error = ref('');
const aviso = ref('');

const ordenarPorRuta = ref(false);
const tamanoPagina = ref(25);
const pagina = ref(1);

let busquedaTimer: ReturnType<typeof setTimeout> | undefined;
let avisoTimer: ReturnType<typeof setTimeout> | undefined;

const formulario = reactive<FilaSocioImportacion>({
  fila: 1,
  rut: '',
  nombre: '',
  direccion: '',
  sector: '',
  telefono: '',
  decretoSap: '',
  porcentajeSubsidio: 50,
  numeroMedidor: '',
  digitos: 4,
  lecturaInicial: 0,
});

const sociosOrdenados = computed<Socio[]>(() => {
  const lista = [...store.socios];
  if (!ordenarPorRuta.value) return lista;
  const sinRuta = Number.MAX_SAFE_INTEGER;
  return lista.sort(
    (a, b) =>
      (a.medidor?.ordenRuta ?? sinRuta) - (b.medidor?.ordenRuta ?? sinRuta) ||
      a.rut.localeCompare(b.rut),
  );
});
const totalPaginas = computed(() => Math.max(1, Math.ceil(sociosOrdenados.value.length / tamanoPagina.value)));
const paginaActual = computed(() => Math.min(Math.max(pagina.value, 1), totalPaginas.value));
const sociosVisibles = computed(() =>
  sociosOrdenados.value.slice((paginaActual.value - 1) * tamanoPagina.value, paginaActual.value * tamanoPagina.value),
);

onMounted(() => void store.cargar());
watch(
  () => store.busqueda,
  () => {
    pagina.value = 1;
    if (busquedaTimer) clearTimeout(busquedaTimer);
    busquedaTimer = setTimeout(() => void store.cargar(), 280);
  },
);
watch(totalPaginas, (total) => {
  if (pagina.value > total) pagina.value = total;
});
onUnmounted(() => {
  if (busquedaTimer) clearTimeout(busquedaTimer);
  if (avisoTimer) clearTimeout(avisoTimer);
});

function irAPagina(nuevaPagina: number): void {
  pagina.value = Math.min(Math.max(nuevaPagina, 1), totalPaginas.value);
}

function cambiarTamanoPagina(): void {
  pagina.value = 1;
}

function nuevoSocio(): void {
  Object.assign(formulario, {
    rut: '',
    nombre: '',
    direccion: '',
    sector: '',
    telefono: '',
    decretoSap: '',
    porcentajeSubsidio: 50,
    numeroMedidor: '',
    digitos: 4,
    lecturaInicial: 0,
  });
  error.value = '';
  aviso.value = '';
  mostrarNuevo.value = true;
}

async function guardar(): Promise<void> {
  guardando.value = true;
  error.value = '';
  aviso.value = '';
  if (avisoTimer) clearTimeout(avisoTimer);
  try {
    await store.crear({ ...formulario });
    mostrarNuevo.value = false;
    aviso.value = 'Socio y medidor creados correctamente';
    avisoTimer = setTimeout(() => (aviso.value = ''), 3000);
  } catch (e) {
    error.value = mensajeError(e);
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h1 class="text-lg font-bold text-text-primary">Padrón de socios y medidores</h1>
        <p class="text-xs text-text-secondary">{{ store.socios.length }} registros · búsqueda por RUT, nombre o medidor</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn-secondary" @click="router.push('/importar')">Importar CSV (página)</button>
        <button type="button" class="btn-secondary" @click="mostrarImportar = true">Importar CSV (ventana)</button>
        <button type="button" class="btn-primary" @click="nuevoSocio"><span aria-hidden="true">+</span> Nuevo socio</button>
      </div>
    </div>

    <p v-if="aviso" class="apr-alert apr-alert--success" role="status">{{ aviso }}</p>
    <p v-if="store.error" class="apr-alert apr-alert--danger" role="alert">{{ store.error }}</p>

    <div class="card p-3">
      <label class="label" for="socios-busqueda">Buscar</label>
      <input
        id="socios-busqueda"
        v-model="store.busqueda"
        type="search"
        class="input max-w-md"
        placeholder="Ej: 10.234.567, María o APR-1005"
        aria-describedby="socios-busqueda-ayuda"
      />
      <p id="socios-busqueda-ayuda" class="mt-1 text-xs text-text-secondary">
        Busca por RUT, nombre o número de medidor. La búsqueda se aplica automáticamente.
      </p>
    </div>

    <div class="card p-3">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="flex flex-wrap items-end gap-3">
          <button
            type="button"
            class="btn-secondary"
            :aria-pressed="ordenarPorRuta"
            @click="ordenarPorRuta = !ordenarPorRuta"
          >
            {{ ordenarPorRuta ? 'Orden: ruta' : 'Orden: registro' }}
          </button>
          <div>
            <label class="label" for="socios-tamano-pagina">Filas por página</label>
            <select
              id="socios-tamano-pagina"
              v-model.number="tamanoPagina"
              class="input w-24"
              @change="cambiarTamanoPagina"
            >
              <option :value="25">25</option>
              <option :value="50">50</option>
            </select>
          </div>
        </div>
        <p class="text-xs text-text-secondary">
          {{ sociosOrdenados.length }} registros · página {{ paginaActual }} de {{ totalPaginas }}
        </p>
      </div>
    </div>

    <div class="card scroll-slim max-h-[calc(100vh-310px)] overflow-x-auto overflow-y-auto">
      <table class="tabla min-w-[900px]">
        <caption class="sr-only">Padrón de socios y medidores, ordenado según el criterio seleccionado</caption>
        <thead>
          <tr>
            <th scope="col">Orden</th>
            <th scope="col">RUT</th>
            <th scope="col">Socio</th>
            <th scope="col">Sector</th>
            <th scope="col">Dirección</th>
            <th scope="col">Medidor</th>
            <th scope="col">Dígitos</th>
            <th scope="col">Lect. inicial</th>
            <th scope="col">Subsidio</th>
            <th scope="col">Decreto SAP</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="socio in sociosVisibles" :key="socio.id">
            <td class="apr-num text-text-secondary">{{ socio.medidor?.ordenRuta ?? '—' }}</td>
            <td class="apr-num">{{ socio.rut }}</td>
            <td class="font-semibold text-text-primary">{{ socio.nombre }}</td>
            <td>{{ socio.sector }}</td>
            <td class="max-w-[220px] truncate text-text-secondary" :title="socio.direccion">{{ socio.direccion }}</td>
            <td class="apr-num font-semibold">{{ socio.medidor?.numero ?? 'Sin medidor' }}</td>
            <td class="apr-num">{{ socio.medidor?.digitos ?? '—' }}</td>
            <td class="apr-num">{{ socio.medidor?.lecturaInicial ?? '—' }}</td>
            <td class="apr-num">{{ socio.porcentajeSubsidio }}%</td>
            <td class="apr-num text-text-secondary">{{ socio.decretoSap ?? '—' }}</td>
          </tr>
          <tr v-if="sociosVisibles.length === 0">
            <td colspan="10" class="py-8 text-center text-text-secondary">No hay socios que coincidan con la búsqueda</td>
          </tr>
        </tbody>
      </table>
    </div>

    <nav class="flex flex-wrap items-center justify-between gap-2" aria-label="Paginación del padrón">
      <button
        type="button"
        class="btn-secondary"
        :disabled="paginaActual <= 1"
        @click="irAPagina(paginaActual - 1)"
      >
        Página anterior
      </button>
      <p class="text-xs text-text-secondary" role="status">Página {{ paginaActual }} de {{ totalPaginas }}</p>
      <button
        type="button"
        class="btn-secondary"
        :disabled="paginaActual >= totalPaginas"
        @click="irAPagina(paginaActual + 1)"
      >
        Página siguiente
      </button>
    </nav>

    <ModalShell v-if="mostrarNuevo" titulo="Nuevo socio y medidor" @cerrar="mostrarNuevo = false">
      <form class="grid gap-3 md:grid-cols-2" @submit.prevent="guardar">
        <div>
          <label class="label" for="socio-rut">RUT</label>
          <input id="socio-rut" v-model="formulario.rut" class="input" placeholder="12345678-9" required />
        </div>
        <div>
          <label class="label" for="socio-nombre">Nombre completo</label>
          <input id="socio-nombre" v-model="formulario.nombre" class="input" required />
        </div>
        <div>
          <label class="label" for="socio-direccion">Dirección</label>
          <input id="socio-direccion" v-model="formulario.direccion" class="input" required />
        </div>
        <div>
          <label class="label" for="socio-sector">Sector</label>
          <input id="socio-sector" v-model="formulario.sector" class="input" required />
        </div>
        <div>
          <label class="label" for="socio-telefono">Teléfono</label>
          <input id="socio-telefono" v-model="formulario.telefono" class="input" placeholder="+56 9 ..." />
        </div>
        <div>
          <label class="label" for="socio-medidor">N° de medidor</label>
          <input id="socio-medidor" v-model="formulario.numeroMedidor" class="input" required />
        </div>
        <div>
          <label class="label" for="socio-subsidio">Subsidio SAP (%)</label>
          <select id="socio-subsidio" v-model.number="formulario.porcentajeSubsidio" class="input">
            <option :value="0">0%</option>
            <option :value="50">50%</option>
            <option :value="100">100%</option>
          </select>
        </div>
        <div>
          <label class="label" for="socio-decreto">N° decreto SAP</label>
          <input id="socio-decreto" v-model="formulario.decretoSap" class="input" placeholder="SAP-2026-001" />
        </div>
        <div>
          <label class="label" for="socio-digitos">Dígitos del medidor</label>
          <select id="socio-digitos" v-model.number="formulario.digitos" class="input" aria-describedby="socio-digitos-ayuda">
            <option :value="4">4 dígitos (hasta 9.999)</option>
            <option :value="5">5 dígitos (hasta 99.999)</option>
          </select>
          <p id="socio-digitos-ayuda" class="mt-1 text-xs text-text-secondary">Cantidad de dígitos del medidor.</p>
        </div>
        <div>
          <label class="label" for="socio-lectura">Lectura inicial (m³)</label>
          <input id="socio-lectura" v-model.number="formulario.lecturaInicial" type="number" min="0" class="input apr-num" />
        </div>

        <p v-if="error" class="apr-alert apr-alert--danger md:col-span-2" role="alert">{{ error }}</p>
        <div class="flex flex-wrap justify-end gap-2 md:col-span-2">
          <button type="button" class="btn-secondary" @click="mostrarNuevo = false">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="guardando">{{ guardando ? 'Guardando...' : 'Guardar socio' }}</button>
        </div>
      </form>
    </ModalShell>

    <ModalShell v-if="mostrarImportar" titulo="Importación masiva de socios" ancho="max-w-5xl" @cerrar="mostrarImportar = false">
      <ImportarSocios @guardado="mostrarImportar = false" />
    </ModalShell>
  </div>
</template>
