# APR SaaS — Gestión administrativa, tarifaria y lecturas en terreno

> **Estado: MVP funcional**, no producto final.

MVP funcional multi-tenant para Comités de Agua Potable Rural (APR/SSR) en Chile, alineado con la Ley 20.998 y el subsidio SAP. Incluye API NestJS + Prisma/PostgreSQL con RLS, backoffice Vue 3 y PWA offline-first para operadores.

## Stack y estructura

```text
apps/
  api/            NestJS 10 + Prisma 5 + PostgreSQL 16 + pdfkit
  web-admin/      Vue 3 + Pinia + Vue Router + Tailwind (puerto 5173)
  pwa-operador/   Vue 3 + Dexie + vite-plugin-pwa (puerto 5174)
apps/api/prisma/
  schema.prisma   Modelos multi-tenant y enums
  migrations/     Migración inicial aplicada
  rls.sql         Políticas RLS por comiteId
  init/           Creación de roles apr_admin y apr_app al iniciar Docker
  seed.ts         Dataset demo idempotente
packages/
  design-system/  Tokens, fuentes, estilos base y componentes compartidos
```

Puerto de la API: `3000`. Base URL: `http://localhost:3000/api/v1`.

## Requisitos

- Node.js >= 20
- npm
- Docker Desktop (PostgreSQL 16)

> El host usa el puerto **5433** porque el puerto 5432 suele estar ocupado por una instalación local de PostgreSQL en Windows. Dentro del contenedor PostgreSQL escucha en 5432.

## Puesta en marcha

```bash
npm install
cp .env.example .env          # en Windows: copy .env.example .env
npm run setup
npm run dev
```

`npm run setup` ejecuta:

1. `npm run db:up` — levanta PostgreSQL con `docker compose`.
2. `npm run prisma:migrate` — aplica la migración inicial con `apr_admin`.
3. `npm run prisma:seed` — aplica RLS y crea el dataset demo.

`npm run dev` levanta en paralelo los tres workspaces:

| Servicio | URL |
| --- | --- |
| API | http://localhost:3000/api/v1 |
| Backoffice | http://localhost:5173 |
| PWA operador | http://localhost:5174 |

Health check público: `GET http://localhost:3000/api/v1/health`.

### Credenciales demo

| Rol | Email | Password |
| --- | --- | --- |
| ADMIN / Tesorera | `admin@aprtegualda.cl` | `Admin1234!` |
| OPERADOR | `operador@aprtegualda.cl` | `Operador1234!` |

Comité demo: **Comité APR Agua Pura Tegualda** (Fresia, Los Lagos), cargo fijo CLP 3.500, tarifa CLP 650/m³, tope SAP 15 m³. El seed crea 25 socios con RUT válido, 25 medidores, dos ciclos cerrados con cobros/pagos y un ciclo `ABIERTO` para el mes vigente.

> `npm run prisma:seed` limpia y recrea los datos demo. No ejecutarlo sobre una base de producción. Los formularios de login no precargan credenciales ni muestran accesos rápidos.

## Variables de entorno

Copiar `.env.example` a `.env` y ajustar secretos en despliegues reales.

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Prisma CLI: migraciones y seed. Usuario `apr_admin`, owner de las tablas. |
| `APP_DATABASE_URL` | Runtime de la API. Usuario `apr_app`, no owner: RLS se aplica. |
| `JWT_SECRET` | Firma de tokens JWT. |
| `JWT_EXPIRES_IN` | Vigencia del token, por defecto `8h`. |
| `PORT` | Puerto de la API, por defecto `3000`. |
| `WEB_ADMIN_URL` | Origen permitido por CORS, `http://localhost:5173`. |
| `PWA_URL` | Origen permitido por CORS, `http://localhost:5174`. |

Los frontends usan `VITE_API_URL` si se define; si no, apuntan a `http://localhost:3000/api/v1`.

## Sistema de diseño y temas

`packages/design-system/` es la fuente compartida, importada directamente por ambas apps sin crear un paquete npm publicado.

- `styles/tokens.css`: variables semánticas para color, tipografía, espaciado, radios, sombras, foco y estados. Incluye los modos `light`, `dark` y `system`.
- `styles/fonts.css`: Inter variable servida localmente por `@fontsource-variable/inter`; sin CDN de Google Fonts.
- `styles/base.css`: normalización, foco visible, botones, inputs, chips, alertas, tablas, `apr-num` y utilidad `apr-sr-only`.
- `src/useTheme.ts`: preferencia `light | dark | system`, inicial `system`, persistencia en `localStorage` (`apr-theme`), escucha de `matchMedia`, actualización de `theme-color` y limpieza del listener al desmontar.
- `data-theme` se aplica en `<html>` desde un script inline previo a la renderización para evitar FOUC.
- Componentes compartidos: `AppIcon` (iconografía propia tipo Lucide), `ThemeSwitcher`, `StatusBadge`, `EmptyState` y `ConfirmDialog`.
- Componentes propios del backoffice: `ModalShell`, `KpiCard`, `EstadoBadge`, `ImportarSocios`.
- Tailwind del backoffice mapea paletas a variables RGB semánticas (`rgb(var(--token-rgb) / <alpha-value>)`); no fija colores literalmente por componente.
- Los números de lecturas, consumos, montos e indicadores usan `font-variant-numeric: tabular-nums`.
- Selector rápido Sol/Luna en el header y selector completo en `Más → Configuración → Apariencia` (PWA) y menú de usuario (backoffice).

## Multi-tenancy y seguridad

- Todas las entidades de dominio tienen `comiteId` UUID.
- `AuthController.login` usa una conexión privilegiada porque debe buscar al usuario por email antes de conocer el tenant.
- `TenantInterceptor` abre una transacción Prisma por request autenticado, ejecuta `SET LOCAL app.current_comite_id = '<uuid>'` y expone la transacción vía `AsyncLocalStorage`.
- `rls.sql` habilita RLS con políticas `tenant_isolation` para `comites`, `usuarios`, `socios`, `medidores`, `ciclos_facturacion`, `lecturas`, `cobros` y `pagos`.
- `apr_app` no es dueño de las tablas; por eso no puede evadir las políticas. El seed aplica `rls.sql` al inicializar el dataset.
- Los PDF se renderizan en `Buffer` antes de devolver `StreamableFile`, para no mantener la transacción abierta durante el streaming.
- El almacenamiento local de la PWA conserva `clientUuid`, Dexie, Service Worker, reintentos e idempotencia; no mezcla tenants.

Verificación rápida de políticas:

```bash
docker exec apr-saas-postgres psql -U postgres -d apr_saas \
  -c "SELECT tablename, policyname FROM pg_policies WHERE policyname = 'tenant_isolation' ORDER BY tablename;"
```

Deben aparecer 8 filas. Para comprobar aislamiento real como `apr_app`:

```bash
docker exec -i apr-saas-postgres psql -U postgres -d apr_saas -At <<'SQL'
SELECT id AS comite_id FROM comites ORDER BY nombre LIMIT 1 \gset
BEGIN;
SET ROLE apr_app;
SET LOCAL app.current_comite_id = :'comite_id';
SELECT 'propios', count(*) FROM socios;
SET LOCAL app.current_comite_id = '00000000-0000-4000-8000-000000000000';
SELECT 'ajenos', count(*) FROM socios;
COMMIT;
SQL
```

Resultado esperado con el dataset demo: `propios|25` y `ajenos|0`.

## Reglas de negocio

- Montos CLP siempre `INTEGER`; cada producto se redondea con `Math.round` por ítem.
- RUT chileno con módulo 11 y formato `12345678-9`.
- Períodos `YYYY-MM`; zona horaria `America/Santiago`.
- Consumo normal: `max(0, lectura_actual - lectura_anterior)`.
- Vuelta de medidor: base `10000` o `100000` según `digitos`.
- Incidencias con consumo estimado: promedio de los últimos 3 ciclos válidos + alerta operativa.
- Tarifa SAP:
  - `subtotal = cargo_fijo + round(consumo * tarifa)`
  - `m3_subsidiados = min(consumo, tope)`
  - `base_subsidiable = cargo_fijo + round(m3_subsidiados * tarifa)`
  - `descuento_sap = round(base_subsidiable * porcentaje / 100)`
  - `total = subtotal - descuento_sap + saldo_anterior`
- Al cerrar un ciclo se generan lecturas estimadas para medidores sin lectura y se facturan todos los socios activos.

## Endpoints principales

Salvo `/health` y `/auth/login`, requieren cabecera `Authorization: Bearer <access_token>`.

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/health` | Health check público |
| POST | `/auth/login` | Login con email y password |
| GET | `/auth/perfil` | Usuario autenticado y comité |
| GET | `/dashboard/resumen` | KPIs del comité y ciclo vigente |
| GET/PATCH | `/comites/actual` | Configuración tarifaria del comité |
| GET/POST | `/socios` | Listado y creación de socios |
| GET | `/socios/:id` | Detalle de socio |
| POST | `/socios/importar-lote` | Importación masiva desde CSV |
| GET | `/medidores` | Medidores y orden de ruta |
| PATCH | `/medidores/:id` | Edición de medidor |
| PATCH | `/medidores/:id/reordenar` | Reordenar ruta |
| GET/POST | `/ciclos` | Ciclos y creación manual |
| GET | `/ciclos/activo` | Ciclo abierto actual |
| GET | `/ciclos/:id/ruta-offline` | Ruta para descarga en la PWA |
| POST | `/ciclos/:id/cerrar-y-facturar` | Estimaciones, cierre y facturación |
| GET | `/ciclos/:id/avisos-consolidados.pdf` | 2 avisos por página carta |
| GET | `/ciclos/:id/nomina-sap.csv` | Nómina SAP: RUT, nombre, decreto, m³ y monto |
| POST | `/lecturas/sync` | Sincronización idempotente por `client_uuid` |
| GET | `/lecturas/ciclo/:cicloId` | Lecturas del ciclo |
| GET | `/cobros` | Cobros, filtrables por `cicloId` |
| GET | `/cobros/:id` | Detalle de cobro con historial |
| GET | `/cobros/:id/pdf` | Aviso individual |
| GET/POST | `/pagos` | Listado y registro de pagos |

Ejemplo de login y consulta autenticada:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@aprtegualda.cl","password":"Admin1234!"}' | jq -r .access_token)

curl -s http://localhost:3000/api/v1/dashboard/resumen \
  -H "Authorization: Bearer $TOKEN"
```

## Backoffice web-admin

Rutas: `/login`, `/dashboard`, `/socios`, `/importar`, `/ciclos`, `/cobros`, `/caja` y página de no encontrado.

- Shell con sidebar colapsable y drawer móvil, header sticky, breadcrumbs, comité activo, ciclo vigente, selector de tema y menú de usuario.
- Dashboard con KPIs reales, avance de lecturas y parámetros tarifarios vigentes.
- Tablas con búsqueda, filtros, orden local y paginación donde la API lo permite; scroll horizontal controlado en tablas anchas.
- Montos en CLP, consumos en m³ y fechas chilenas (`dd/mm/aaaa`, `America/Santiago`).
- PDFs y nómina SAP se descargan sin alterar los contenidos oficiales.
- `ModalShell` centraliza diálogos accesibles con `role="dialog"`, `aria-modal`, Escape y foco inicial.

## PWA operador

Rutas: `/login`, `/inicio`, `/descargar`, `/ruta`, `/captura`, `/sincronizar`, `/mas` y `/resumen`.

Navegación principal: **Inicio | Ruta | Envíos | Más**. El contador de pendientes aparece solo en **Envíos** y solo cuando hay lecturas sin sincronizar. En tablet y escritorio la navegación pasa a una barra lateral compacta; en móvil se usa navegación inferior con safe-area y targets de al menos 48 px.

### Inicio

Muestra datos reales: ciclo activo, progreso, total de medidores, registrados, pendientes, incidencias, lecturas por sincronizar, última lectura, estado de descarga y conexión. Las acciones son `Descargar ruta`, `Continuar ruta` o `Ver resumen`. Sin ciclo abierto se muestra un estado vacío comprensible.

### Descarga y actualización de ruta

- Botones: `Descargar ruta`, `Actualizar ruta` y `Descargando ruta...`.
- Error exacto cuando falla la actualización: `No pudimos actualizar la ruta. Puedes continuar utilizando los datos guardados.`
- La actualización no sobrescribe lecturas guardadas que aún no se sincronizaron.
- Las acciones potencialmente destructivas piden confirmación.

### Ruta

- Fila compacta clickeable con orden, socio, medidor, sector, lectura anterior, promedio, estado e indicador.
- No hay botones repetidos `Tomar lectura` en cada fila.
- Filtros: `Todos | Pendientes | Leídos | Incidencias`.
- Búsqueda local normalizada por medidor, socio y sector, insensible a mayúsculas y acentos.
- Los filtros y el scroll se conservan al volver desde la captura.

### Captura

- Identificación prominente del socio y medidor, histórico real y campo dominante con `inputmode="numeric"` y unidad `m³`.
- No se usa `0` como valor inicial ni un placeholder como lectura real: vacío y cero son estados distintos.
- Campo vacío: `Consumo calculado —` e `Ingresa la lectura actual.`
- Lectura inferior a la anterior: `La lectura ingresada es inferior a la anterior. Verifica los números del medidor.` y `Consumo calculado —`.
- El rollover válido según las reglas existentes se calcula solo tras confirmación explícita (`Confirmar vuelta del medidor`) y se explica con la base `10.000`.
- Incidencias: selector accesible con los valores exactos de la API (`NINGUNA`, `VUELTA_MEDIDOR`, `MEDIDOR_TRABADO`, `CASA_CERRADA`, `MEDIDOR_DANADO`); la observación se muestra cuando existe incidencia.
- Guardado: `Guardar lectura`, éxito `Lectura guardada.` y acción siguiente `Siguiente medidor`. No se envía dos veces ni se marca como sincronizado antes de la confirmación del servidor.

### Envíos y offline

- Estados visibles: guardadas, pendientes, en proceso, sincronizadas, rechazadas y conflictos compatibles; sin progresos simulados ni jerga técnica como `idempotente`, `client_uuid` o UUID internos.
- Mensajes exactos:
  - `En línea`
  - `Sin conexión`
  - `No tienes conexión. Puedes continuar tomando lecturas.` (solo con ruta local)
  - `Necesitas descargar una ruta antes de trabajar sin conexión.` (sin ruta)
  - `Conexión recuperada`
  - `Sincronizando lecturas...` (solo con operación real)
  - `Todo actualizado`
- La limpieza destructiva vive en un área secundaria, pide confirmación y nunca elimina lecturas pendientes.
- El resumen distingue ruta completada, sincronización completa y ciclo cerrado. Completar la ruta **no** cierra el ciclo.

### Menú Más

Mi cuenta, Información del comité, Apariencia, Estado de conexión, Información de la ruta, Última sincronización, Información de la aplicación y Cerrar sesión. El cierre pide confirmación si hay lecturas pendientes y no borra datos locales.

## Flujo del operador

1. Ingresar con la cuenta del operador asignada por el comité.
2. Verificar tema, estado de conexión y ruta descargada desde **Inicio**.
3. Descargar o actualizar la ruta del ciclo abierto.
4. Abrir un medidor desde **Ruta**, revisar histórico y registrar lectura o incidencia.
5. Guardar en el dispositivo; continuar con `Siguiente medidor`.
6. Revisar pendientes en **Envíos** y sincronizar cuando haya conexión.
7. Confirmar el resumen de ruta; el cierre del ciclo es una operación separada del backoffice.

## Checklist end-to-end

### Backoffice

- [ ] Abrir `http://localhost:5173` e ingresar con `admin@aprtegualda.cl / Admin1234!`.
- [ ] Verificar en `/dashboard` 25 socios, 25 medidores, ciclo `ABIERTO` y KPIs de morosidad.
- [ ] Probar Claro/Oscuro/Sistema desde el header y el menú de usuario; recargar y confirmar que no hay FOUC.
- [ ] En `/socios`, buscar por RUT, nombre o medidor; ordenar, paginar y editar un socio y un medidor.
- [ ] En `/importar`, pegar filas con formato `rut;nombre;direccion;sector;...` y revisar la vista previa.
- [ ] En `/ciclos`, descargar la ruta del ciclo abierto y comprobar 25 medidores ordenados.
- [ ] En `/cobros`, descargar un PDF individual y el consolidado de un ciclo cerrado.
- [ ] Descargar la nómina SAP CSV y verificar RUT, decreto, m³ y monto subsidiado.
- [ ] En `/caja`, registrar un pago y confirmar que disminuye el saldo pendiente.
- [ ] Verificar en `320/360/375/390/430/768/1024/1280/1440/1920 px` que no hay scroll horizontal.
- [ ] Cerrar y facturar el ciclo abierto; verificar 25 cobros, lecturas estimadas y total SAP.

### PWA y modo avión

- [ ] Abrir `http://localhost:5174` e ingresar como operador.
- [ ] Confirmar el estado `En línea` y el texto de almacenamiento persistente.
- [ ] En `/inicio`, descargar la ruta del ciclo abierto; verificar `Descargando ruta...` y luego el conteo de medidores.
- [ ] Activar Modo Avión o DevTools → Network → Offline y confirmar `No tienes conexión. Puedes continuar tomando lecturas.`
- [ ] Sin ruta local, confirmar `Necesitas descargar una ruta antes de trabajar sin conexión.`
- [ ] En `/ruta`, probar filtros y búsqueda con mayúsculas y acentos; abrir un medidor.
- [ ] En `/captura`, comprobar que campo vacío muestra `Consumo calculado —` e `Ingresa la lectura actual.`; `0000` con anterior `1217` muestra el aviso de lectura inferior y no calcula `8783 m³` sin confirmación.
- [ ] Registrar lecturas en varios medidores, incluyendo una incidencia, y guardar con `Guardar lectura`.
- [ ] Verificar los registros como pendientes en **Envíos** y sincronizar al recuperar conexión.
- [ ] Repetir la sincronización manual y comprobar que no se duplican lecturas.
- [ ] Recargar la página y verificar que las lecturas ya no quedan pendientes.
- [ ] Volver al backoffice y confirmar que el dashboard refleja las lecturas sincronizadas.
- [ ] Probar los mismos anchos que el backoffice y targets táctiles mínimos de 48 px.

### Idempotencia por API

```bash
# Repetir exactamente el mismo payload: la segunda respuesta debe crear 0 y marcar 1 duplicado.
curl -s -X POST http://localhost:3000/api/v1/lecturas/sync \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "ciclo_id": "<cicloId>",
    "lecturas": [{
      "client_uuid": "prueba-idempotencia-0001",
      "medidor_id": "<medidorId>",
      "lectura_actual": 1234,
      "incidencia": "NINGUNA",
      "observacion": "",
      "tomada_en": "2026-11-24T12:00:00.000Z"
    }]
  }'
```

## Comandos útiles

```bash
npm run db:up          # docker compose up -d
npm run db:down        # docker compose down
npm run db:reset       # borra el volumen y vuelve a crear roles (destructivo)

npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

npm run dev            # API + web-admin + PWA
npm run build          # build de producción de los 3 workspaces
npm run start -w @apr/api  # API compilada en producción (puerto 3000)
npm run typecheck      # chequeo TypeScript estricto de los 3 workspaces
```

## Pruebas y verificación

No existen scripts root `lint` ni `test`. La verificación ejecutada en este rediseño fue:

```bash
npx prisma validate --schema apps/api/prisma/schema.prisma
npm run prisma:generate
npm run typecheck
npm run build
```

Además se comprobaron en navegador los flujos de login, temas, descarga de ruta, captura, offline, sincronización, responsive y accesibilidad; y por API/PSQL health, perfil, dashboard, ruta offline, PDF consolidado, nómina SAP, idempotencia y RLS. Véase el informe final para resultados detallados y limitaciones.

Si una instalación de npm bloquea scripts de dependencias nativas, permitir los scripts de `esbuild`, `@prisma/client`, `@prisma/engines`, `prisma` y `vue-demi` antes de ejecutar estos comandos.

## Solución de problemas

| Síntoma | Causa probable | Acción |
| --- | --- | --- |
| `P1000: Authentication failed ... '(not available)'` | La API conecta al puerto 5432 local en vez del contenedor | Confirmar que `.env` y `apps/api/.env` usen `localhost:5433`. |
| `getaddrinfo ENOTFOUND` desde el navegador | Frontend con `VITE_API_URL` incorrecta | Usar `http://localhost:3000/api/v1`. |
| `Descargar ruta` queda deshabilitado | `/ciclos/activo` devolvió `304` sin cuerpo | Los clientes axios envían `Cache-Control: no-cache`; recargar la PWA. |
| `EPERM: operation not permitted, rename ... query_engine-windows.dll.node` al generar Prisma | La API compilada mantiene abierto el engine de Prisma en Windows | Detener el proceso de la API, ejecutar `npm run prisma:generate` y volver a levantarla. |
| `EADDRINUSE :::3000` | Otro proceso ya ocupa la API (por ejemplo un servidor Vercel local) | Verificar `Get-NetTCPConnection -LocalPort 3000` y conservar un solo proceso API. |
| La PWA no funciona sin conexión | Service worker no instalado todavía | Cargar la PWA al menos una vez con conexión y esperar a que se registre. |
| `Cannot read properties of null (reading 'write')` al generar PDF consolidado | Documento PDF sin página inicial | Ya corregido: `generarConsolidado` agrega la primera página antes de dibujar. |
| `P2000` al crear lecturas automáticas | `clientUuid` demasiado largo | Ya corregido: se genera un identificador corto por ciclo/medidor. |

## Decisiones y limitaciones

- Se conservan API, Prisma, migraciones, RLS, contratos, autenticación, roles, reglas de facturación, IndexedDB, Service Worker, `clientUuid`, idempotencia y PDF oficial sin cambios de backend.
- Los problemas detectados en backend no se modificaron en este rediseño: `promedioConsumo` usa `slice(-3)` sobre historial descendente, `/ciclos/activo` puede caer al último ciclo aunque esté cerrado, `lecturaAnterior` de `ruta-offline` no es estable y los pagos no son idempotentes. La PWA mitiga la visualización del promedio/consumo con estados comprensibles y no altera reglas de negocio.
- El repositorio se reinició limpio: los `.env` reales están fuera del historial; solo se versionan `.env.example` y `.env.deploy.example` con valores de ejemplo.
- `browser.screenshot` no estuvo disponible en el entorno de QA; se usaron snapshots de accesibilidad, `browser.evaluate` y Lighthouse en su lugar.
- No se agregaron endpoints, funcionalidades de registro público, credenciales precargadas ni migraciones nuevas.
#   a p r - s a a s  
 