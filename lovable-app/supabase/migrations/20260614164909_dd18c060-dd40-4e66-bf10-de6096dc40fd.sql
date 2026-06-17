CREATE TABLE public.channel_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'telegram',
  name text NOT NULL,
  identifier text NOT NULL,
  bot_account_id uuid REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  last_update_id bigint DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  auto_publish boolean NOT NULL DEFAULT false,
  ai_rewrite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_sources TO authenticated;
GRANT ALL ON public.channel_sources TO service_role;
ALTER TABLE public.channel_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sources" ON public.channel_sources FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

CREATE TABLE public.channel_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_id uuid NOT NULL REFERENCES public.channel_sources(id) ON DELETE CASCADE,
  remote_id text NOT NULL,
  content text,
  media_urls text[] DEFAULT '{}',
  media_type text,
  status text NOT NULL DEFAULT 'queued',
  post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (source_id, remote_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_items TO authenticated;
GRANT ALL ON public.channel_items TO service_role;
ALTER TABLE public.channel_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own items" ON public.channel_items FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

CREATE TRIGGER trg_channel_sources_updated BEFORE UPDATE ON public.channel_sources FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();