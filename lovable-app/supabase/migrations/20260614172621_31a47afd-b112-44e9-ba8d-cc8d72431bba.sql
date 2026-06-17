REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;