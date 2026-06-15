-- Suportar múltiplas obras por usuário
ALTER TABLE public.profiles ADD COLUMN obras text[] NOT NULL DEFAULT '{}';

-- Migrar dado existente de obra (singular) para obras (array)
UPDATE public.profiles SET obras = ARRAY[obra] WHERE obra IS NOT NULL AND obra <> '';

-- Manter coluna obra como legado opcional (não remover para evitar quebra), mas zerar default
ALTER TABLE public.profiles ALTER COLUMN obra DROP NOT NULL;