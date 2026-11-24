-- Se ejecuta una sola vez, cuando Docker inicializa el volumen de PostgreSQL.
-- apr_admin : owner de las tablas, usado por prisma migrate / seed.
-- apr_app   : usuario de la API; NO es owner, por lo que RLS sí se aplica.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'apr_admin') THEN
    CREATE ROLE apr_admin LOGIN PASSWORD 'Admin1234!' CREATEDB;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'apr_app') THEN
    CREATE ROLE apr_app LOGIN PASSWORD 'App1234!';
  END IF;
END
$$;

ALTER DATABASE apr_saas OWNER TO apr_admin;

GRANT CONNECT ON DATABASE apr_saas TO apr_app;
GRANT USAGE ON SCHEMA public TO apr_admin;
GRANT USAGE ON SCHEMA public TO apr_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public FOR ROLE apr_admin
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO apr_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public FOR ROLE apr_admin
  GRANT USAGE, SELECT ON SEQUENCES TO apr_app;
