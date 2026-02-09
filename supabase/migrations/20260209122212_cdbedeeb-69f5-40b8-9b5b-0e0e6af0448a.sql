
-- Criar tabela de perfis de acesso (ex: Diretoria, Engenheiro)
CREATE TABLE public.access_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    filter_level text NOT NULL DEFAULT 'obra' CHECK (filter_level IN ('none', 'estado', 'cidade', 'obra')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.access_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas: admins gerenciam, todos autenticados podem ler
CREATE POLICY "Admins can manage access profiles"
ON public.access_profiles FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view access profiles"
ON public.access_profiles FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Trigger para updated_at
CREATE TRIGGER update_access_profiles_updated_at
BEFORE UPDATE ON public.access_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar campos de localização e perfil de acesso ao profiles
ALTER TABLE public.profiles
ADD COLUMN estado text,
ADD COLUMN cidade text,
ADD COLUMN obra text,
ADD COLUMN access_profile_id uuid REFERENCES public.access_profiles(id);

-- Inserir perfis padrão
INSERT INTO public.access_profiles (name, description, filter_level) VALUES
('Diretoria', 'Visualiza todos os estados sem filtro', 'none'),
('Engenheiro', 'Visualiza apenas a obra em que trabalha', 'obra');
