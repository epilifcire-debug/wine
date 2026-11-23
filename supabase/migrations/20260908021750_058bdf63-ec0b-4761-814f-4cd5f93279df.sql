REVOKE EXECUTE ON FUNCTION public.gerar_codigo_wbc() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_codigo_wbc_profile() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_codigo_wbc_aluno() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_sync_ficha_role() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.log_role_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sincronizar_ficha_aluno(uuid) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.sincronizar_ficha_aluno(uuid) TO service_role;