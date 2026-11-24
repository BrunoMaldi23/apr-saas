<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppIcon from '../../../../packages/design-system/src/components/AppIcon.vue';
import StatusBadge from '../../../../packages/design-system/src/components/StatusBadge.vue';
import { guardarLectura, obtenerMedidor, obtenerMeta, obtenerRuta } from '@/db/dexie';
import { baseMedidor, calcularConsumoLocal, nuevoClientUuid } from '@/utils/consumo';
import type { Incidencia, LecturaPendiente, RutaMedidor } from '@/types';

const route = useRoute();
const router = useRouter();

const medidor = ref<RutaMedidor | undefined>();
const cicloId = ref('');
const lecturaTexto = ref('');
const incidencia = ref<Incidencia>('NINGUNA');
const observacion = ref('');
const error = ref('');
const guardando = ref(false);
const guardado = ref(false);
const siguiente = ref<RutaMedidor | undefined>();

const incidencias: Array<{ valor: Incidencia; etiqueta: string }> = [
  { valor: 'NINGUNA', etiqueta: 'Sin incidencia' },
  { valor: 'VUELTA_MEDIDOR', etiqueta: 'Vuelta del medidor' },
  { valor: 'MEDIDOR_TRABADO', etiqueta: 'Medidor trabajado' },
  { valor: 'CASA_CERRADA', etiqueta: 'Casa cerrada' },
  { valor: 'MEDIDOR_DANADO', etiqueta: 'Medidor dañado' },
];

const hayLectura = computed(() => lecturaTexto.value !== '');
const lecturaActual = computed(() => (hayLectura.value ? Number(lecturaTexto.value) : null));
const esInferior = computed(
  () =>
    !!medidor.value &&
    hayLectura.value &&
    lecturaActual.value !== null &&
    lecturaActual.value < medidor.value.lecturaAnterior &&
    incidencia.value === 'NINGUNA',
);

const resultado = computed(() => {
  if (!medidor.value || !hayLectura.value || lecturaActual.value === null || esInferior.value) return null;
  return calcularConsumoLocal({
    lecturaAnterior: medidor.value.lecturaAnterior,
    lecturaActual: lecturaActual.value,
    digitos: medidor.value.digitos,
    incidencia: incidencia.value,
    promedio3m: medidor.value.promedio3m,
  });
});

const esFuga = computed(() => resultado.value?.alerta?.startsWith('POSIBLE FUGA') ?? false);
const mensajeVacio = 'Ingresa la lectura actual.';
const mensajeInferior = 'La lectura ingresada es inferior a la anterior. Verifica los números del medidor.';

function soloDigitos(evento: Event): void {
  const input = evento.target as HTMLInputElement;
  const maximo = medidor.value?.digitos === 5 ? 5 : 4;
  const limpio = input.value.replace(/\D/g, '').slice(0, maximo);
  lecturaTexto.value = limpio;
  input.value = limpio;
  error.value = '';
  guardado.value = false;
}

onMounted(async () => {
  const id = String(route.query.medidorId ?? '');
  medidor.value = await obtenerMedidor(id);
  const meta = await obtenerMeta();
  cicloId.value = meta?.cicloId ?? '';
  if (!medidor.value) error.value = 'Medidor no encontrado en la ruta descargada.';
  else if (!cicloId.value) error.value = 'No hay una ruta descargada. Descarga la ruta antes de tomar lecturas.';
});

async function guardar(): Promise<void> {
  if (guardando.value) return;
  error.value = '';

  if (!medidor.value) {
    error.value = 'No hay medidor seleccionado.';
    return;
  }
  if (!hayLectura.value || lecturaActual.value === null) {
    error.value = mensajeVacio;
    return;
  }
  if (!cicloId.value) {
    error.value = 'No hay una ruta descargada. Descarga la ruta antes de tomar lecturas.';
    return;
  }
  if (esInferior.value) {
    error.value = mensajeInferior;
    return;
  }

  const ahora = new Date().toISOString();
  const lectura: LecturaPendiente = {
    clientUuid: nuevoClientUuid(),
    cicloId: cicloId.value,
    medidorId: medidor.value.medidorId,
    lecturaActual: lecturaActual.value,
    incidencia: incidencia.value,
    observacion: observacion.value.trim(),
    tomadaEn: ahora,
    sincronizado: 0,
    creadaEn: ahora,
    numeroMedidor: medidor.value.numero,
    nombreSocio: medidor.value.nombreSocio,
    ordenRuta: medidor.value.ordenRuta,
  };

  guardando.value = true;
  try {
    await guardarLectura(lectura);
    const ruta = await obtenerRuta();
    const indice = ruta.findIndex((item) => item.medidorId === medidor.value?.medidorId);
    siguiente.value = ruta[indice + 1];
    guardado.value = true;
    sessionStorage.setItem('apr_flash', 'Lectura guardada');
  } catch {
    error.value = 'No pudimos guardar la lectura en este equipo. Inténtalo nuevamente.';
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <div class="pwa-page">
    <template v-if="medidor">
      <div class="apr-page-header">
        <div>
          <h1>Captura de lectura</h1>
          <p class="apr-page-subtitle">
            {{ medidor.numero }} · {{ medidor.nombreSocio }} · {{ medidor.sector }}
          </p>
        </div>
        <StatusBadge :label="`Orden ${medidor.ordenRuta}`" tone="info" />
      </div>

      <div class="apr-card">
        <h2 class="apr-section-title">Historial del medidor</h2>
        <dl class="apr-stat-grid">
          <div class="apr-stat">
            <dt>Lectura anterior</dt>
            <dd class="apr-num">{{ medidor.lecturaAnterior }} m³</dd>
          </div>
          <div class="apr-stat">
            <dt>Promedio 3 meses</dt>
            <dd class="apr-num">{{ medidor.promedio3m }} m³</dd>
          </div>
        </dl>
        <p class="apr-meta" style="margin: var(--space-3) 0 0">
          Medidor de {{ medidor.digitos }} dígitos · orden {{ medidor.ordenRuta }} de la ruta
        </p>
      </div>

      <div class="apr-card pwa-seccion">
        <label class="apr-label" for="lectura">Lectura actual</label>
        <input
          id="lectura"
          :value="lecturaTexto"
          class="pwa-lectura-input"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          autocomplete="off"
          placeholder="Ej. 1218"
          aria-describedby="consumo-lectura"
          @input="soloDigitos"
        />
        <p class="apr-meta" style="margin: 6px 0 0; text-align: right">Unidad: m³ · máximo {{ medidor.digitos }} dígitos</p>

        <div id="consumo-lectura" class="pwa-consumo" style="margin-top: var(--space-4)" aria-live="polite">
          <div>
            <p class="apr-label" style="margin: 0">Consumo calculado</p>
            <p v-if="resultado" class="pwa-consumo__valor">{{ resultado.consumoM3 }} m³</p>
            <p v-else class="pwa-consumo__valor">—</p>
          </div>
          <StatusBadge
            :label="!hayLectura ? 'Sin calcular' : esInferior ? 'Revisar' : resultado?.esEstimada ? 'Estimado' : esFuga ? 'Revisar consumo' : 'Calculado'"
            :tone="!hayLectura ? 'neutral' : esInferior ? 'warning' : resultado?.esEstimada ? 'info' : esFuga ? 'warning' : 'success'"
          />
        </div>

        <p v-if="!hayLectura" class="apr-meta" style="margin: var(--space-2) 0 0">{{ mensajeVacio }}</p>
        <p v-else-if="esInferior" class="apr-alert apr-alert--warning" style="margin: var(--space-3) 0 0" role="alert">
          <AppIcon name="alert" :size="17" />
          <span>
            {{ mensajeInferior }}
            <button type="button" class="apr-btn apr-btn--small" style="margin-top: 8px" @click="incidencia = 'VUELTA_MEDIDOR'">
              Confirmar vuelta del medidor
            </button>
          </span>
        </p>
        <p v-else-if="resultado?.esEstimada" class="apr-alert apr-alert--info" style="margin: var(--space-3) 0 0">
          {{ resultado.alerta }}
        </p>
        <p v-else-if="esFuga" class="apr-alert apr-alert--warning" style="margin: var(--space-3) 0 0" role="status">
          {{ resultado?.alerta }}
        </p>
        <p v-else-if="incidencia === 'VUELTA_MEDIDOR' && hayLectura" class="apr-alert apr-alert--info" style="margin: var(--space-3) 0 0">
          Vuelta confirmada: se aplica la base de {{ baseMedidor(medidor.digitos).toLocaleString('es-CL') }} m³ según las reglas vigentes.
        </p>
      </div>

      <div class="apr-card pwa-seccion">
        <h2 class="apr-section-title">Incidencias</h2>
        <div class="pwa-incidencias" role="group" aria-label="Tipo de incidencia">
          <button
            v-for="opcion in incidencias"
            :key="opcion.valor"
            type="button"
            class="apr-btn"
            :aria-pressed="incidencia === opcion.valor"
            @click="incidencia = opcion.valor"
          >
            {{ opcion.etiqueta }}
          </button>
        </div>

        <div v-if="incidencia !== 'NINGUNA' || observacion">
          <label class="apr-label" for="observacion" style="margin-top: var(--space-4)">Observación</label>
          <textarea id="observacion" v-model="observacion" class="apr-textarea" rows="2" maxlength="500" placeholder="Detalle la incidencia"></textarea>
        </div>
      </div>

      <p v-if="error" class="apr-alert apr-alert--danger" style="margin-top: var(--space-4)" role="alert">{{ error }}</p>

      <div v-if="guardado" class="apr-alert apr-alert--success" style="margin-top: var(--space-4)" role="status">
        <AppIcon name="check" :size="18" />
        <span>
          Lectura guardada.
          <span v-if="siguiente" style="display: block; margin-top: 8px">
            <button class="apr-btn apr-btn--primary apr-btn--small" @click="router.push({ name: 'captura', query: { medidorId: siguiente.medidorId } })">
              Siguiente medidor
            </button>
          </span>
          <button v-else class="apr-btn apr-btn--small" style="margin-top: 8px" @click="router.push('/resumen')">Ver resumen</button>
        </span>
      </div>

      <div class="pwa-seccion pwa-lista-menu">
        <button class="apr-btn apr-btn--primary apr-btn--wide" :disabled="guardando || guardado || !hayLectura || esInferior" :aria-busy="guardando" @click="guardar">
          {{ guardando ? 'Guardando…' : guardado ? 'Lectura guardada' : 'Guardar lectura' }}
        </button>
        <button class="apr-btn apr-btn--wide" @click="router.push('/ruta')">Volver a la ruta</button>
      </div>
    </template>

    <div v-else class="apr-card">
      <p>{{ error || 'Cargando medidor…' }}</p>
      <button class="apr-btn apr-btn--primary" style="margin-top: var(--space-3)" @click="router.push('/ruta')">Volver a la ruta</button>
    </div>
  </div>
</template>
