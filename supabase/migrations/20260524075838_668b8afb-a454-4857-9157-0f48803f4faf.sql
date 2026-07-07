
ALTER TABLE public.generated_social_posts
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS image_prompt text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('social-media', 'social-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Social media publicamente visível" ON storage.objects;
CREATE POLICY "Social media publicamente visível"
ON storage.objects FOR SELECT
USING (bucket_id = 'social-media');

DROP POLICY IF EXISTS "Staff gerencia social-media" ON storage.objects;
CREATE POLICY "Staff gerencia social-media"
ON storage.objects FOR ALL
USING (bucket_id = 'social-media' AND public.is_staff(auth.uid()))
WITH CHECK (bucket_id = 'social-media' AND public.is_staff(auth.uid()));
