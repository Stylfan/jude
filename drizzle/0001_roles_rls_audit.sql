-- Security for Jude's data: the application's own role, row-level
-- security so one account never sees another's profile, an audit log
-- written by triggers that nobody can rewrite, the counting function for
-- the cost ceilings, and deleting an account completely.

-- The role the application connects as. It owns nothing, so row-level
-- security applies to it in full. scripts/migrate.mjs gives it LOGIN and
-- its password from JUDE_APP_PASSWORD.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'jude_app') THEN
    CREATE ROLE jude_app NOLOGIN;
  END IF;
END
$$;
--> statement-breakpoint

GRANT USAGE ON SCHEMA public TO jude_app;
--> statement-breakpoint
-- Accounts and sign-in sit outside row-level security: nobody is known to
-- be signed in while these rows are looked up (as in Prismatic, ADR 0002).
GRANT SELECT, INSERT, UPDATE, DELETE ON
  "users", "sessions", "passkeys", "recovery_codes", "auth_challenges", "profiles"
TO jude_app;
--> statement-breakpoint
-- Usage is read for one's own account; it is written only by charge_usage().
GRANT SELECT ON "usage_days", "audit_log" TO jude_app;
--> statement-breakpoint

-- The acting user, set per transaction by withUser() in src/db/client.ts.
CREATE OR REPLACE FUNCTION app_user_id() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.user_id', true), '')
$$;
--> statement-breakpoint

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "profiles" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_own_profile ON "profiles" FOR ALL TO jude_app
  USING (user_id = app_user_id()) WITH CHECK (user_id = app_user_id());
--> statement-breakpoint

ALTER TABLE "usage_days" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "usage_days" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_own_usage ON "usage_days" FOR SELECT TO jude_app
  USING (user_id = app_user_id());
--> statement-breakpoint

-- The server's totals: no policy for the application at all.
ALTER TABLE "usage_server_days" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "usage_server_days" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "audit_log" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_read_own_audit ON "audit_log" FOR SELECT TO jude_app
  USING (owner_id = app_user_id());
--> statement-breakpoint

-- Row-change capture. SECURITY DEFINER, so the insert works although the
-- application role may not write the log itself. Passwords never reach it:
-- the account and sign-in tables are not audited.
CREATE OR REPLACE FUNCTION audit_row_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_before jsonb;
  v_after jsonb;
BEGIN
  IF TG_OP <> 'INSERT' THEN v_before := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN v_after := to_jsonb(NEW); END IF;
  INSERT INTO audit_log (at, actor_user_id, table_name, operation, row_id, owner_id, before, after)
  VALUES (
    (extract(epoch FROM clock_timestamp()) * 1000)::bigint,
    app_user_id(),
    TG_TABLE_NAME,
    lower(TG_OP),
    coalesce(v_after ->> 'user_id', v_before ->> 'user_id'),
    coalesce(v_after ->> 'user_id', v_before ->> 'user_id'),
    v_before,
    v_after
  );
  RETURN coalesce(NEW, OLD);
END
$$;
--> statement-breakpoint
CREATE TRIGGER audit_profiles AFTER INSERT OR UPDATE OR DELETE ON "profiles"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint

-- Append-only: no role may update, delete or truncate the log. The single
-- exception is delete_account(), which sets jude.purge inside its own
-- transaction to erase an account completely.
CREATE OR REPLACE FUNCTION audit_block_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('jude.purge', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'audit_log is append-only';
END
$$;
--> statement-breakpoint
CREATE TRIGGER audit_log_no_update_delete
  BEFORE UPDATE OR DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION audit_block_mutation();
--> statement-breakpoint
CREATE TRIGGER audit_log_no_truncate
  BEFORE TRUNCATE ON "audit_log"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_block_mutation();
--> statement-breakpoint

-- Deleting an account and everything it owns, its audit trail included.
-- Only the account itself may call it.
CREATE OR REPLACE FUNCTION delete_account(p_user text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_user IS DISTINCT FROM app_user_id() THEN
    RAISE EXCEPTION 'delete_account: not the signed-in account';
  END IF;
  DELETE FROM profiles WHERE user_id = p_user;
  DELETE FROM usage_days WHERE user_id = p_user;
  PERFORM set_config('jude.purge', 'on', true);
  DELETE FROM audit_log WHERE owner_id = p_user OR actor_user_id = p_user;
  PERFORM set_config('jude.purge', 'off', true);
  DELETE FROM sessions WHERE user_id = p_user;
  DELETE FROM users WHERE id = p_user;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION delete_account(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION delete_account(text) TO jude_app;
--> statement-breakpoint

-- The cost ceilings: counts use for the acting account and for the whole
-- server, but only when both stay within their ceiling for the day. Locks
-- the server's row, so two requests cannot both slip under the ceiling.
-- Returns 'ok', 'account' or 'server' (which ceiling stopped it).
CREATE OR REPLACE FUNCTION charge_usage(
  p_day text,
  p_conversations integer, p_turns integer, p_chars integer,
  p_max_conversations integer, p_max_turns integer, p_max_chars integer,
  p_server_conversations integer, p_server_turns integer, p_server_chars integer
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user text := app_user_id();
  v_mine usage_days%ROWTYPE;
  v_all usage_server_days%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'charge_usage: nobody is signed in';
  END IF;
  INSERT INTO usage_server_days (day) VALUES (p_day) ON CONFLICT DO NOTHING;
  SELECT * INTO v_all FROM usage_server_days WHERE day = p_day FOR UPDATE;
  INSERT INTO usage_days (user_id, day) VALUES (v_user, p_day) ON CONFLICT DO NOTHING;
  SELECT * INTO v_mine FROM usage_days WHERE user_id = v_user AND day = p_day FOR UPDATE;

  IF v_all.conversations + p_conversations > p_server_conversations
     OR v_all.turns + p_turns > p_server_turns
     OR v_all.chars + p_chars > p_server_chars THEN
    RETURN 'server';
  END IF;
  IF v_mine.conversations + p_conversations > p_max_conversations
     OR v_mine.turns + p_turns > p_max_turns
     OR v_mine.chars + p_chars > p_max_chars THEN
    RETURN 'account';
  END IF;

  UPDATE usage_server_days SET
    conversations = conversations + p_conversations,
    turns = turns + p_turns,
    chars = chars + p_chars
  WHERE day = p_day;
  UPDATE usage_days SET
    conversations = conversations + p_conversations,
    turns = turns + p_turns,
    chars = chars + p_chars
  WHERE user_id = v_user AND day = p_day;
  RETURN 'ok';
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION charge_usage(text, integer, integer, integer, integer, integer, integer, integer, integer, integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION charge_usage(text, integer, integer, integer, integer, integer, integer, integer, integer, integer) TO jude_app;
