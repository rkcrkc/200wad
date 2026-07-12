-- S4 (SECURITY_AUDIT.md): notification_broadcasts, notification_templates and
-- notification_types had RLS ENABLED but ZERO policies, while still carrying the
-- default broad table grants (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/... ) for BOTH
-- `anon` and `authenticated`. RLS "fails closed" with no policies, so this is safe
-- today, but it is a latent trap: the moment any policy is added, or any query is
-- switched from the service-role client to the anon/authenticated (RLS) client,
-- these admin-only config tables would become reachable by ordinary users.
--
-- Every real access path in the app uses the service-role client
-- (`createAdminClient()`), which bypasses RLS entirely:
--   * reads  — src/lib/queries/notification-config.ts, src/lib/queries/notifications.ts
--   * writes — src/lib/mutations/admin/notification{,-config}.ts (all requireAdmin())
--   * dispatch — src/lib/notifications/dispatcher.ts, template.ts
-- Toast templates reach the browser as server-rendered props, never as a direct
-- client table read. So NO anon/authenticated access to these tables is needed.
--
-- Fix (both layers):
--   1. Grant layer — revoke ALL from `anon` (no business here at all); reduce
--      `authenticated` to the minimal DML set (SELECT/INSERT/UPDATE/DELETE), i.e.
--      drop TRUNCATE/TRIGGER/REFERENCES.
--   2. Policy layer — add an explicit admin-only (`is_admin()`) FOR ALL policy per
--      table. This documents intent, removes the "RLS enabled, no policy" advisor,
--      and gives defense-in-depth: even if a query is later moved to the RLS client,
--      only admins pass, and never anon. `service_role` continues to bypass RLS, so
--      the app is unaffected.

-- ---------------------------------------------------------------------------
-- notification_broadcasts
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.notification_broadcasts FROM anon;
REVOKE ALL ON public.notification_broadcasts FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_broadcasts TO authenticated;

CREATE POLICY "Admins manage broadcasts"
  ON public.notification_broadcasts
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- notification_templates
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.notification_templates FROM anon;
REVOKE ALL ON public.notification_templates FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_templates TO authenticated;

CREATE POLICY "Admins manage notification templates"
  ON public.notification_templates
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- notification_types
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.notification_types FROM anon;
REVOKE ALL ON public.notification_types FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_types TO authenticated;

CREATE POLICY "Admins manage notification types"
  ON public.notification_types
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
