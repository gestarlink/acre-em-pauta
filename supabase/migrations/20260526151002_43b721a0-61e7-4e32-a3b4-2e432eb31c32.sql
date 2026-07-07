
-- 1) Restringe leitura de profiles (esconde emails do público)
DROP POLICY IF EXISTS "Perfis públicos são visíveis" ON public.profiles;

CREATE POLICY "User vê próprio perfil"
ON public.profiles
FOR SELECT
USING (auth.uid() = id OR public.is_staff(auth.uid()));

-- 2) Permite registrar visualizações publicamente (sem expor leituras)
GRANT INSERT ON public.post_views TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.post_views_id_seq TO anon, authenticated;

CREATE POLICY "Qualquer um registra view"
ON public.post_views
FOR INSERT
WITH CHECK (post_id IS NOT NULL);
