-- À exécuter UNE SEULE FOIS dans l'éditeur SQL du Dashboard Supabase.
-- Cette fonction est nécessaire pour l'import de traductions (admin + scripts).

CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Restreindre l'accès au rôle service_role uniquement
REVOKE ALL ON FUNCTION exec_sql(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;
