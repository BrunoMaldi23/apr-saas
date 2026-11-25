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

- **Shape series:** `Ampere` (ARM64)
- **Shape name:** `VM.Standard.A1.Flex` — aparece como *Always Free-eligible*
- **Recursos:** 4 OCPU / 24 GB RAM / 50 GB disco (tope ARM gratuito). Si no hay capacidad, bajar a 2 OCPU / 12 GB o probar otra región.
- **SO:** `Canonical Ubuntu 24.04 Minimal aarch64` (recomendado). En la lista de Oracle elegir una imagen que diga **aarch64**; las que no lo dicen son x86 y no sirven con Ampere. Alternativas: `Ubuntu 22.04 Minimal aarch64` u `Oracle Linux 9 ARM64` (en ese caso cambiar `apt` por `dnf`).
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
- `CLOUDFLARE_TUNNEL_TOKEN` **solo** si usas túnel nombrado con dominio propio; en el MVP sin dominio no hace falta.

Generar el SQL de roles con esos passwords:

```bash
set -a
. ./.env.deploy
set +a
sh deploy/scripts/render-roles.sh
```

Esto crea `deploy/generated/01-roles.sql`, que se monta solo en la primera inicialización de Postgres.

---

## 4. Exponer la API con Cloudflare Tunnel

### Opción elegida: sin dominio propio (Quick Tunnel)

`docker-compose.deploy.yml` ya viene habilitado:

```yaml
command: tunnel --no-autoupdate --url http://api:3000
```

Al levantar el contenedor, `cloudflared` imprime en sus logs una URL pública:

```text
https://xxxx-xxxx.trycloudflare.com
```

Usa esa URL como `${URL_PUBLICA_API}`.

> La URL de Quick Tunnel cambia cada vez que el contenedor se reinicia. Cuando pase, actualiza `VITE_API_URL` en los dos proyectos de Vercel y vuelve a desplegarlos.

### Opción estable: con dominio propio

Si después quieres una URL fija, en Cloudflare Zero Trust:

1. **Networks → Tunnels → Create a tunnel**, entorno **Docker**, copiar el token.
2. Pegarlo en `.env.deploy` como `CLOUDFLARE_TUNNEL_TOKEN`.
3. En `docker-compose.deploy.yml`, comentar la línea de `--url` y descomentar:

```yaml
command: tunnel --no-autoupdate run --token ${CLOUDFLARE_TUNNEL_TOKEN}
```

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
VITE_API_URL=https://<URL_PUBLICA_API>/api/v1
```

Donde `<URL_PUBLICA_API>` es la URL `trycloudflare.com` que imprimió `cloudflared` (o tu hostname propio si usas túnel nombrado).

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
curl https://<URL_PUBLICA_API>/api/v1/health

curl -X POST https://<URL_PUBLICA_API>/api/v1/auth/login \
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
| `502` del túnel | En Quick Tunnel revisa los logs de `cloudflared`; en túnel nombrado el Public Hostname debe apuntar a `HTTP api:3000`. |
| La URL `trycloudflare.com` dejó de funcionar | El contenedor se reinició y cambió la URL; actualiza `VITE_API_URL` en Vercel y redespliega. |
| CORS bloqueado | Actualizar `WEB_ADMIN_URL`/`PWA_URL` y reiniciar `api`. |
| Prisma engine arm64 | El build ocurre dentro de la VM ARM, así que Prisma genera el engine nativo; no copiar `node_modules` desde Windows. |
| `P1000` | La API debe usar `APP_DATABASE_URL` con host `postgres`, no `localhost`. |
| PWA no actualiza | Verificar headers de `/sw.js` desde `apps/pwa-operador/vercel.json`. |
| Seed repetido borra datos | No volver a ejecutar `prisma:seed` después de la primera carga. |
