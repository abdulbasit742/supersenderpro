CREATE TABLE public.ecommerce_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('daraz','etsy','amazon','shopify')),
  shop_id text,
  shop_name text,
  access_token text,
  refresh_token text,
  api_key text,
  api_secret text,
  is_active boolean NOT NULL DEFAULT true,
  meta jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('daraz','etsy','amazon','shopify')),
  listing_id text,
  listing_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','paused','error')),
  last_synced_at timestamptz,
  sync_errors jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ecommerce_accounts TO authenticated;
GRANT ALL ON public.ecommerce_accounts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_listings TO authenticated;
GRANT ALL ON public.marketplace_listings TO service_role;

ALTER TABLE public.ecommerce_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ecommerce accounts" ON public.ecommerce_accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own marketplace listings" ON public.marketplace_listings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER ecommerce_accounts_updated_at BEFORE UPDATE ON public.ecommerce_accounts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER marketplace_listings_updated_at BEFORE UPDATE ON public.marketplace_listings FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();