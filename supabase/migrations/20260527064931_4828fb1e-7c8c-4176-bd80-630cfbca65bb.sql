
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.push_subscriptions TO anon;
GRANT INSERT ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode se inscrever"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Staff gerencia subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (is_staff(auth.uid()))
  WITH CHECK (is_staff(auth.uid()));
