-- Remover policies permissivas e substituir por mais restritivas
DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "System can insert roles" ON public.user_roles;

-- Profiles: apenas o trigger de SECURITY DEFINER pode inserir (não precisa de policy para INSERT pois o trigger roda com SECURITY DEFINER)