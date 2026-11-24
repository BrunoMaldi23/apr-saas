-- Row-Level Security por comiteId.
-- Se aplica al usuario apr_app (usuario de runtime de la API).
-- El valor se fija por transacción desde TenantInterceptor:
--   SET LOCAL app.current_comite_id = '<uuid>';
-- Usamos current_setting(..., true) en el helper para evitar error si no está fijado.

GRANT USAGE ON SCHEMA public TO apr_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO apr_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO apr_app;

-- Tabla raíz: el tenant ve únicamente su propio comité.
ALTER TABLE comites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON comites;
CREATE POLICY tenant_isolation ON comites
  FOR ALL TO apr_app
  USING (id = nullif(current_setting('app.current_comite_id', true), '')::uuid)
  WITH CHECK (id = nullif(current_setting('app.current_comite_id', true), '')::uuid);

-- Entidades de dominio: todas llevan comiteId.
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON usuarios;
CREATE POLICY tenant_isolation ON usuarios
  FOR ALL TO apr_app
  USING ("comiteId" = nullif(current_setting('app.current_comite_id', true), '')::uuid)
  WITH CHECK ("comiteId" = nullif(current_setting('app.current_comite_id', true), '')::uuid);

ALTER TABLE socios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON socios;
CREATE POLICY tenant_isolation ON socios
  FOR ALL TO apr_app
  USING ("comiteId" = nullif(current_setting('app.current_comite_id', true), '')::uuid)
  WITH CHECK ("comiteId" = nullif(current_setting('app.current_comite_id', true), '')::uuid);

ALTER TABLE medidores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON medidores;
CREATE POLICY tenant_isolation ON medidores
  FOR ALL TO apr_app
  USING ("comiteId" = nullif(current_setting('app.current_comite_id', true), '')::uuid)
  WITH CHECK ("comiteId" = nullif(current_setting('app.current_comite_id', true), '')::uuid);

ALTER TABLE ciclos_facturacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON ciclos_facturacion;
CREATE POLICY tenant_isolation ON ciclos_facturacion
  FOR ALL TO apr_app
  USING ("comiteId" = nullif(current_setting('app.current_comite_id', true), '')::uuid)
  WITH CHECK ("comiteId" = nullif(current_setting('app.current_comite_id', true), '')::uuid);

ALTER TABLE lecturas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON lecturas;
CREATE POLICY tenant_isolation ON lecturas
  FOR ALL TO apr_app
  USING ("comiteId" = nullif(current_setting('app.current_comite_id', true), '')::uuid)
  WITH CHECK ("comiteId" = nullif(current_setting('app.current_comite_id', true), '')::uuid);

ALTER TABLE cobros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON cobros;
CREATE POLICY tenant_isolation ON cobros
  FOR ALL TO apr_app
  USING ("comiteId" = nullif(current_setting('app.current_comite_id', true), '')::uuid)
  WITH CHECK ("comiteId" = nullif(current_setting('app.current_comite_id', true), '')::uuid);

ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON pagos;
CREATE POLICY tenant_isolation ON pagos
  FOR ALL TO apr_app
  USING ("comiteId" = nullif(current_setting('app.current_comite_id', true), '')::uuid)
  WITH CHECK ("comiteId" = nullif(current_setting('app.current_comite_id', true), '')::uuid);
