-- Create enums
CREATE TYPE public.app_role AS ENUM ('admin', 'merchant');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'success', 'failed');
CREATE TYPE public.transaction_type AS ENUM ('payin', 'payout');

-- Create merchants table
CREATE TABLE public.merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_number VARCHAR(20) UNIQUE NOT NULL,
  merchant_name TEXT NOT NULL,
  api_key UUID DEFAULT gen_random_uuid(),
  payout_key UUID DEFAULT gen_random_uuid(),
  balance DECIMAL(15,2) DEFAULT 0,
  frozen_balance DECIMAL(15,2) DEFAULT 0,
  payin_fee DECIMAL(5,2) DEFAULT 2.5,
  payout_fee DECIMAL(5,2) DEFAULT 1.5,
  callback_url TEXT,
  withdrawal_password TEXT,
  is_active BOOLEAN DEFAULT true,
  is_2fa_enabled BOOLEAN DEFAULT false,
  google_2fa_secret TEXT,
  notify_new_transactions BOOLEAN DEFAULT true,
  notify_balance_changes BOOLEAN DEFAULT true,
  notify_status_updates BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  order_no VARCHAR(50) UNIQUE NOT NULL,
  merchant_order_no VARCHAR(100),
  transaction_type public.transaction_type NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  fee DECIMAL(15,2) DEFAULT 0,
  net_amount DECIMAL(15,2) DEFAULT 0,
  status public.transaction_status DEFAULT 'pending',
  bank_name TEXT,
  account_holder_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  usdt_address TEXT,
  payment_url TEXT,
  callback_data JSONB,
  extra TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create admin_settings table (single row for gateway config)
CREATE TABLE public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_merchant_id TEXT NOT NULL DEFAULT '100888140',
  master_api_key TEXT NOT NULL DEFAULT 'ab76fe01039a5a5aff089d193da40a40',
  master_payout_key TEXT NOT NULL DEFAULT 'D7EF0E76DE29CD13E6128D722C1F6270',
  bondpay_base_url TEXT DEFAULT 'https://api.bond-pays.com',
  default_payin_fee DECIMAL(5,2) DEFAULT 9.0,
  default_payout_fee DECIMAL(5,2) DEFAULT 4.0,
  gateway_name TEXT DEFAULT 'PayGate',
  gateway_domain TEXT,
  logo_url TEXT,
  support_email TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create admin_profiles table
CREATE TABLE public.admin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  is_2fa_enabled BOOLEAN DEFAULT false,
  google_2fa_secret TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create payment_links table
CREATE TABLE public.payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  link_code VARCHAR(20) UNIQUE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to generate account numbers
CREATE OR REPLACE FUNCTION public.generate_account_number()
RETURNS VARCHAR(20)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  new_num VARCHAR(20);
  max_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(account_number FROM 2)::INTEGER), 0) + 1
  INTO max_num
  FROM public.merchants;
  
  new_num := '1' || LPAD(max_num::TEXT, 8, '0');
  RETURN new_num;
END;
$$;

-- Create update_updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_merchants_updated_at
  BEFORE UPDATE ON public.merchants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for merchants
CREATE POLICY "Merchants can view own data"
  ON public.merchants FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Merchants can update own data"
  ON public.merchants FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can insert merchants"
  ON public.merchants FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete merchants"
  ON public.merchants FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for transactions
CREATE POLICY "View own transactions"
  ON public.transactions FOR SELECT
  USING (
    merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Insert transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (
    merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Update transactions"
  ON public.transactions FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for admin_settings
CREATE POLICY "Admin can view settings"
  ON public.admin_settings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update settings"
  ON public.admin_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can insert settings"
  ON public.admin_settings FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for admin_profiles
CREATE POLICY "Admin can view own profile"
  ON public.admin_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can update own profile"
  ON public.admin_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can insert own profile"
  ON public.admin_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for payment_links
CREATE POLICY "Merchants can manage own links"
  ON public.payment_links FOR ALL
  USING (
    merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Public can view active links"
  ON public.payment_links FOR SELECT
  USING (is_active = true);

-- Enable realtime for merchants table (for balance updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.merchants;

-- Create storage bucket for gateway assets
INSERT INTO storage.buckets (id, name, public) VALUES ('gateway-assets', 'gateway-assets', true);

-- Storage policies for gateway-assets bucket
CREATE POLICY "Public can view gateway assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gateway-assets');

CREATE POLICY "Admin can upload gateway assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'gateway-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update gateway assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'gateway-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete gateway assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'gateway-assets' AND public.has_role(auth.uid(), 'admin'));