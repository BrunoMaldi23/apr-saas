#!/usr/bin/env sh
set -eu

: "${ADMIN_DB_PASSWORD:?Definir ADMIN_DB_PASSWORD en .env.deploy}"
: "${APP_DB_PASSWORD:?Definir APP_DB_PASSWORD en .env.deploy}"
: "${POSTGRES_PASSWORD:?Definir POSTGRES_PASSWORD en .env.deploy}"

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
OUT="$ROOT/deploy/generated/01-roles.sql"
mkdir -p "$(dirname "$OUT")"

esc() {
  printf '%s' "$1" | sed "s/'/''/g"
}

cat > "$OUT" <<SQL
-- Generado por deploy/scripts/render-roles.sh. No editar a mano.
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'apr_admin') THEN
    CREATE ROLE apr_admin LOGIN PASSWORD '$(esc "$ADMIN_DB_PASSWORD")' CREATEDB;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'apr_app') THEN
    CREATE ROLE apr_app LOGIN PASSWORD '$(esc "$APP_DB_PASSWORD")';
  END IF;
END
\$\$;

ALTER DATABASE apr_saas OWNER TO apr_admin;

GRANT CONNECT ON DATABASE apr_saas TO apr_app;
GRANT USAGE ON SCHEMA public TO apr_admin;
GRANT USAGE ON SCHEMA public TO apr_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public FOR ROLE apr_admin
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO apr_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public FOR ROLE apr_admin
  GRANT USAGE, SELECT ON SEQUENCES TO apr_app;
SQL

printf 'Roles SQL generados en %s\n' "$OUT"
