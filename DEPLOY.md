# Deploy del MVP en Oracle Always Free + Vercel

Arquitectura acordada:

```text
Vercel
  ├─ web-admin  → https://admin-xxx.vercel.app
  └─ PWA        → https://pwa-xxx.vercel.app

Oracle VM Always Free (ARM64 recomendado)
  ├─ api       → NestJS, red interna :3000
  ├─ postgres  → PostgreSQL 16, red interna :5432
  └─ tunnel    → cloudflared, HTTPS público sin abrir puertos
```

> No exponemos los puertos `3000` ni `5432` al host. Cloudflare Tunnel alcanza el servicio `api` por nombre de red dentro de Docker.

---

## 1. Crear la VM en Oracle

Recommended para este stack:

- **Shape:** `VM.Standard.A1.Flex` (Ampere ARM64)
- **Recursos:** 4 OCPU / 24 GB RAM / 50 GB disco
- **SO:** Ubuntu 24.04 ARM64
- **Región:** la que tenga capacidad disponible

No usar el AMD Always Free de 1 GB para este MVP: es insuficiente para Postgres + NestJS sin swap y los builds son muy lentos.

Reglas de ingress:

- SSH `22` solo desde tu IP.
- No abrir `3000` ni `5432`: Cloudflare Tunnel sale por HTTPS externo.

---

## 2. Preparar la VM

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
docker compose version
```

Copiar el proyecto a `/opt/apr-saas` (por `scp`, `rsync` o `git clone` una vez inicializado Git):

```bash
sudo mkdir -p /opt/apr-saas
sudo chown "$USER:$USER" /opt/apr-saas
cd /opt/apr-saas
```

---

## 3. Configurar secretos

```bash
cp .env.deploy.example .env.deploy
nano .env.deploy
```

Rellenar:

- `POSTGRES_PASSWORD`
- `ADMIN_DB_PASSWORD`
- `APP_DB_PASSWORD`
- `JWT_SECRET`
- `WEB_ADMIN_URL` y `PWA_URL` con las URLs reales de Vercel
- `CLOUDFLARE_TUNNEL_TOKEN`

Generar el SQL de roles con esos passwords:

```bash
set -a
. ./.env.deploy
set +a
sh deploy/scripts/render-roles.sh
```

Esto crea `deploy/generated/01-roles.sql`, que se monta solo en la primera inicialización de Postgres.

---

## 4. Crear el túnel en Cloudflare

En Cloudflare Zero Trust:

1. **Networks → Tunnels → Create a tunnel**
2. Elegir entorno **Docker** y copiar el token.
3. Pegar el token en `.env.deploy` como `CLOUDFLARE_TUNNEL_TOKEN`.
4. Agregar **Public Hostname**, por ejemplo:

```text
Hostname: api.tudominio.com
Service:  HTTP
URL:      api:3000
```

`api:3000` funciona porque `cloudflared` corre en la misma red de Docker que la API.

---

## 5. Levantar API + Postgres + tunnel

```bash
docker compose --env-file .env.deploy -f docker-compose.deploy.yml up -d --build
```

Ver logs:

```bash
docker compose --env-file .env.deploy -f docker-compose.deploy.yml logs -f api
docker compose --env-file .env.deploy -f docker-compose.deploy.yml logs -f cloudflared
```

---

## 6. Migraciones y seed de una sola vez

```bash
docker compose --env-file .env.deploy -f docker-compose.deploy.yml exec api \
  npx prisma migrate deploy --schema apps/api/prisma/schema.prisma

docker compose --env-file .env.deploy -f docker-compose.deploy.yml exec api \
  npm run prisma:seed -w @apr/api
```

> `prisma db seed` limpia y recrea el dataset demo. Ejecutarlo solo en la primera instalación.

Verificar RLS:

```bash
docker compose --env-file .env.deploy -f docker-compose.deploy.yml exec postgres \
  psql -U postgres -d apr_saas -Atc \
  "SELECT count(*) FROM pg_policies WHERE policyname = 'tenant_isolation';"
```

Resultado esperado: `8`.

---

## 7. Desplegar frontends en Vercel

Crear dos proyectos Vercel:

| Proyecto | Root Directory | Build | Output |
| --- | --- | --- | --- |
| `apr-admin` | `apps/web-admin` | `npm run build` | `dist` |
| `apr-pwa` | `apps/pwa-operador` | `npm run build` | `dist` |

Variable de entorno en **ambos**:

```text
VITE_API_URL=https://api.tudominio.com/api/v1
```

Después de conocer las URLs finales, actualizar CORS en `.env.deploy`:

```text
WEB_ADMIN_URL=https://admin-xxx.vercel.app
PWA_URL=https://pwa-xxx.vercel.app
```

Y reiniciar la API:

```bash
docker compose --env-file .env.deploy -f docker-compose.deploy.yml up -d api
```

---

## 8. Verificación final

```bash
curl https://api.tudominio.com/api/v1/health

curl -X POST https://api.tudominio.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@aprtegualda.cl","password":"Admin1234!"}'
```

Comprobar en navegador:

- `/login` del backoffice con ADMIN.
- `/login` de la PWA con OPERADOR.
- Descarga de ruta en la PWA.
- Captura y guardado offline.
- Cambio de tema y recarga sin FOUC.
- Service Worker registrado en la PWA.

---

## 9. Backup

```bash
docker compose --env-file .env.deploy -f docker-compose.deploy.yml exec -T postgres \
  pg_dump -U postgres apr_saas > backup-$(date +%F).sql
```

Guardar el archivo fuera de la VM.

---

## 10. Troubleshooting rápido

| Síntoma | Acción |
| --- | --- |
| `502` del túnel | En Cloudflare, el Public Hostname debe apuntar a `HTTP api:3000`. |
| CORS bloqueado | Actualizar `WEB_ADMIN_URL`/`PWA_URL` y reiniciar `api`. |
| Prisma engine arm64 | El build ocurre dentro de la VM ARM, así que Prisma genera el engine nativo; no copiar `node_modules` desde Windows. |
| `P1000` | La API debe usar `APP_DATABASE_URL` con host `postgres`, no `localhost`. |
| PWA no actualiza | Verificar headers de `/sw.js` desde `apps/pwa-operador/vercel.json`. |
| Seed repetido borra datos | No volver a ejecutar `prisma:seed` después de la primera carga. |
