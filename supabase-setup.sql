-- 0. Limpieza de la base de datos (eliminar todo en orden)
DROP FUNCTION IF EXISTS public.is_shared_with_user(uuid, uuid);
DROP POLICY IF EXISTS "Owners can manage slides in their presentations" ON slides;
DROP POLICY IF EXISTS "Users can view slides of accessible presentations" ON slides;
DROP POLICY IF EXISTS "Shared users can view their own share records" ON presentation_shares;
DROP POLICY IF EXISTS "Owners can manage shares for their presentations" ON presentation_shares;
DROP POLICY IF EXISTS "Users can delete own presentations" ON presentations;
DROP POLICY IF EXISTS "Users can update own presentations" ON presentations;
DROP POLICY IF EXISTS "Users can insert own presentations" ON presentations;
DROP POLICY IF EXISTS "Users can view accessible presentations" ON presentations;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

DROP TABLE IF EXISTS presentation_shares CASCADE;
DROP TABLE IF EXISTS slides CASCADE;
DROP TABLE IF EXISTS presentations CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 1. Tabla de perfiles de usuario
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de presentaciones
CREATE TABLE public.presentations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_public BOOLEAN DEFAULT FALSE
);

-- 3. Tabla de slides
CREATE TABLE public.slides (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    presentation_id UUID REFERENCES public.presentations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    html_content TEXT NOT NULL DEFAULT '',
    slide_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla para gestionar con quién se comparte una presentación
CREATE TABLE public.presentation_shares (
    presentation_id UUID REFERENCES public.presentations(id) ON DELETE CASCADE,
    shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (presentation_id, shared_with_user_id)
);

-- 5. Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_shares ENABLE ROW LEVEL SECURITY;

-- 6. Función SECURITY DEFINER para romper la recursión
CREATE OR REPLACE FUNCTION public.is_shared_with_user(p_id UUID, u_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1
    FROM public.presentation_shares
    WHERE presentation_id = p_id AND shared_with_user_id = u_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Políticas RLS para `profiles`
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 8. Políticas RLS para `presentations` (simplificadas)
CREATE POLICY "Users can view accessible presentations" ON public.presentations FOR SELECT USING (
    auth.uid() = user_id OR
    is_public = true OR
    public.is_shared_with_user(id, auth.uid())
);
CREATE POLICY "Users can insert own presentations" ON public.presentations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own presentations" ON public.presentations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Shared users with edit can update presentations" ON public.presentations FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.presentation_shares
        WHERE presentation_id = presentations.id
        AND shared_with_user_id = auth.uid()
        AND permission_level = 'edit'
    )
);
CREATE POLICY "Users can delete own presentations" ON public.presentations FOR DELETE USING (auth.uid() = user_id);

-- 9. Políticas RLS para `presentation_shares`
CREATE POLICY "Owners can manage shares for their presentations" ON public.presentation_shares FOR ALL USING (
    EXISTS (SELECT 1 FROM public.presentations WHERE id = presentation_shares.presentation_id AND user_id = auth.uid())
);
CREATE POLICY "Shared users can view their own share records" ON public.presentation_shares FOR SELECT USING (shared_with_user_id = auth.uid());

-- 10. Políticas RLS para `slides` (corregidas)
CREATE POLICY "Users can view slides of accessible presentations" ON public.slides FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.presentations p
        WHERE p.id = slides.presentation_id AND (
            p.user_id = auth.uid() OR
            p.is_public = true OR
            public.is_shared_with_user(p.id, auth.uid())
        )
    )
);
CREATE POLICY "Owners can manage slides in their presentations" ON public.slides FOR ALL USING (
    EXISTS (SELECT 1 FROM public.presentations WHERE id = slides.presentation_id AND user_id = auth.uid())
);
CREATE POLICY "Shared users with edit can manage slides" ON public.slides FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.presentation_shares
        WHERE presentation_id = slides.presentation_id
        AND shared_with_user_id = auth.uid()
        AND permission_level = 'edit'
    )
);

-- 11. Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_presentations_user_id ON public.presentations(user_id);
CREATE INDEX IF NOT EXISTS idx_slides_presentation_id ON public.slides(presentation_id);
CREATE INDEX IF NOT EXISTS idx_shares_presentation_id ON public.presentation_shares(presentation_id);
CREATE INDEX IF NOT EXISTS idx_shares_user_id ON public.presentation_shares(shared_with_user_id);

-- 12. Función y Trigger para crear un perfil de usuario automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
EXCEPTION WHEN unique_violation THEN
  -- Profile already exists (id or email conflict); ignore and continue
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 13. Función y Triggers para actualizar `updated_at` automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_presentations_updated_at BEFORE UPDATE ON public.presentations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_slides_updated_at BEFORE UPDATE ON public.slides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
