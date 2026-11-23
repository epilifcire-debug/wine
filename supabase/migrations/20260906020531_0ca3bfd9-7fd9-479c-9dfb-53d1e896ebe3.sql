REVOKE EXECUTE ON FUNCTION public.ativar_plano(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.ativar_plano(uuid) TO authenticated;