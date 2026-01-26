import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tables to export (in order to respect foreign key dependencies)
const TABLES_TO_EXPORT = [
  'admin_settings',
  'admin_profiles',
  'user_roles',
  'payment_gateways',
  'merchants',
  'transactions',
  'payment_links',
  'admin_notifications',
  'merchant_activity_logs',
  'gateway_balance_history',
];

// Helper to escape SQL string values
const escapeSqlValue = (value: any): string => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
};

// Generate INSERT statement for a row
const generateInsertStatement = (tableName: string, row: Record<string, any>): string => {
  const columns = Object.keys(row);
  const values = columns.map(col => escapeSqlValue(row[col]));
  return `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;`;
};

// Complete schema SQL
const SCHEMA_SQL = `
-- ================================================
-- HYPER SOFTS GATEWAY - COMPLETE DATABASE SCHEMA
-- ================================================

-- ==================== ENUMS ====================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'merchant');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.transaction_status AS ENUM ('pending', 'success', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.transaction_type AS ENUM ('payin', 'payout');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==================== FUNCTIONS ====================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.generate_account_number()
RETURNS character varying
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ==================== TABLES ====================

-- admin_settings
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_merchant_id text NOT NULL DEFAULT '100888140',
  master_api_key text NOT NULL DEFAULT 'ab76fe01039a5a5aff089d193da40a40',
  master_payout_key text NOT NULL DEFAULT 'D7EF0E76DE29CD13E6128D722C1F6270',
  default_payin_fee numeric DEFAULT 9.0,
  default_payout_fee numeric DEFAULT 4.0,
  gateway_name text DEFAULT 'PayGate',
  gateway_domain text,
  logo_url text,
  favicon_url text,
  support_email text,
  large_payin_threshold numeric DEFAULT 10000,
  large_payout_threshold numeric DEFAULT 5000,
  large_withdrawal_threshold numeric DEFAULT 5000,
  admin_telegram_chat_id text,
  telegram_bot_token text,
  telegram_webhook_url text,
  bondpay_base_url text DEFAULT 'https://api.bond-pays.com',
  balance_threshold_inr numeric DEFAULT 10000,
  balance_threshold_pkr numeric DEFAULT 50000,
  balance_threshold_bdt numeric DEFAULT 50000,
  updated_at timestamptz DEFAULT now()
);

-- admin_profiles
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  is_2fa_enabled boolean DEFAULT false,
  google_2fa_secret text,
  created_at timestamptz DEFAULT now()
);

-- user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

-- payment_gateways
CREATE TABLE IF NOT EXISTS public.payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_name text NOT NULL,
  gateway_type text NOT NULL,
  gateway_code text NOT NULL,
  currency text NOT NULL,
  base_url text NOT NULL,
  app_id text NOT NULL,
  api_key text NOT NULL,
  payout_key text,
  trade_type text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- merchants
CREATE TABLE IF NOT EXISTS public.merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  merchant_name text NOT NULL,
  account_number varchar NOT NULL,
  api_key uuid DEFAULT gen_random_uuid(),
  payout_key uuid DEFAULT gen_random_uuid(),
  balance numeric DEFAULT 0,
  frozen_balance numeric DEFAULT 0,
  payin_fee numeric DEFAULT 2.5,
  payout_fee numeric DEFAULT 1.5,
  callback_url text,
  is_active boolean DEFAULT true,
  is_2fa_enabled boolean DEFAULT false,
  google_2fa_secret text,
  gateway_id uuid REFERENCES public.payment_gateways(id),
  trade_type text,
  telegram_chat_id text,
  withdrawal_password text,
  notify_new_transactions boolean DEFAULT true,
  notify_status_updates boolean DEFAULT true,
  notify_balance_changes boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id),
  gateway_id uuid REFERENCES public.payment_gateways(id),
  order_no varchar NOT NULL,
  merchant_order_no varchar,
  transaction_type transaction_type NOT NULL,
  amount numeric NOT NULL,
  fee numeric DEFAULT 0,
  net_amount numeric DEFAULT 0,
  status transaction_status DEFAULT 'pending',
  bank_name text,
  account_number text,
  account_holder_name text,
  ifsc_code text,
  usdt_address text,
  payment_url text,
  callback_data jsonb,
  extra text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- payment_links
CREATE TABLE IF NOT EXISTS public.payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id),
  link_code varchar NOT NULL,
  amount numeric NOT NULL,
  description text,
  trade_type text,
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- admin_notifications
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  notification_type text NOT NULL,
  merchant_id uuid REFERENCES public.merchants(id),
  transaction_id uuid REFERENCES public.transactions(id),
  amount numeric,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- merchant_activity_logs
CREATE TABLE IF NOT EXISTS public.merchant_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES public.merchants(id),
  admin_user_id uuid,
  action_type text NOT NULL,
  action_details jsonb,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- gateway_balance_history
CREATE TABLE IF NOT EXISTS public.gateway_balance_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id uuid NOT NULL REFERENCES public.payment_gateways(id),
  balance numeric,
  status text DEFAULT 'unknown',
  message text,
  checked_at timestamptz DEFAULT now()
);

-- ==================== TRIGGERS ====================
DROP TRIGGER IF EXISTS update_merchants_updated_at ON public.merchants;
CREATE TRIGGER update_merchants_updated_at
  BEFORE UPDATE ON public.merchants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_gateways_updated_at ON public.payment_gateways;
CREATE TRIGGER update_payment_gateways_updated_at
  BEFORE UPDATE ON public.payment_gateways
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== ROW LEVEL SECURITY ====================
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gateway_balance_history ENABLE ROW LEVEL SECURITY;

-- ==================== RLS POLICIES ====================

-- admin_settings policies
DROP POLICY IF EXISTS "Anyone can view gateway branding" ON public.admin_settings;
CREATE POLICY "Anyone can view gateway branding" ON public.admin_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can insert settings" ON public.admin_settings;
CREATE POLICY "Admin can insert settings" ON public.admin_settings FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin can update settings" ON public.admin_settings;
CREATE POLICY "Admin can update settings" ON public.admin_settings FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- admin_profiles policies
DROP POLICY IF EXISTS "Admin can view own profile" ON public.admin_profiles;
CREATE POLICY "Admin can view own profile" ON public.admin_profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can insert own profile" ON public.admin_profiles;
CREATE POLICY "Admin can insert own profile" ON public.admin_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can update own profile" ON public.admin_profiles;
CREATE POLICY "Admin can update own profile" ON public.admin_profiles FOR UPDATE USING (auth.uid() = user_id);

-- user_roles policies
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin can manage roles" ON public.user_roles;
CREATE POLICY "Admin can manage roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'));

-- payment_gateways policies
DROP POLICY IF EXISTS "Admin can manage gateways" ON public.payment_gateways;
CREATE POLICY "Admin can manage gateways" ON public.payment_gateways FOR ALL USING (has_role(auth.uid(), 'admin'));

-- merchants policies
DROP POLICY IF EXISTS "Merchants can view own data" ON public.merchants;
CREATE POLICY "Merchants can view own data" ON public.merchants FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Merchants can update own data" ON public.merchants;
CREATE POLICY "Merchants can update own data" ON public.merchants FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin can insert merchants" ON public.merchants;
CREATE POLICY "Admin can insert merchants" ON public.merchants FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin can delete merchants" ON public.merchants;
CREATE POLICY "Admin can delete merchants" ON public.merchants FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- transactions policies
DROP POLICY IF EXISTS "View own transactions" ON public.transactions;
CREATE POLICY "View own transactions" ON public.transactions FOR SELECT USING (
  merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Insert transactions" ON public.transactions;
CREATE POLICY "Insert transactions" ON public.transactions FOR INSERT WITH CHECK (
  merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Update transactions" ON public.transactions;
CREATE POLICY "Update transactions" ON public.transactions FOR UPDATE USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin can delete transactions" ON public.transactions;
CREATE POLICY "Admin can delete transactions" ON public.transactions FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- payment_links policies
DROP POLICY IF EXISTS "Public can view active links" ON public.payment_links;
CREATE POLICY "Public can view active links" ON public.payment_links FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Merchants can manage own links" ON public.payment_links;
CREATE POLICY "Merchants can manage own links" ON public.payment_links FOR ALL USING (
  merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin')
);

-- admin_notifications policies
DROP POLICY IF EXISTS "Admin can view notifications" ON public.admin_notifications;
CREATE POLICY "Admin can view notifications" ON public.admin_notifications FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin can update notifications" ON public.admin_notifications;
CREATE POLICY "Admin can update notifications" ON public.admin_notifications FOR UPDATE USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin can delete notifications" ON public.admin_notifications;
CREATE POLICY "Admin can delete notifications" ON public.admin_notifications FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- merchant_activity_logs policies
DROP POLICY IF EXISTS "Admin can view merchant logs" ON public.merchant_activity_logs;
CREATE POLICY "Admin can view merchant logs" ON public.merchant_activity_logs FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin can insert merchant logs" ON public.merchant_activity_logs;
CREATE POLICY "Admin can insert merchant logs" ON public.merchant_activity_logs FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- gateway_balance_history policies
DROP POLICY IF EXISTS "Admin can view gateway history" ON public.gateway_balance_history;
CREATE POLICY "Admin can view gateway history" ON public.gateway_balance_history FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- ==================== STORAGE ====================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('gateway-assets', 'gateway-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view gateway assets" ON storage.objects 
FOR SELECT USING (bucket_id = 'gateway-assets');

CREATE POLICY "Admin can upload gateway assets" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'gateway-assets' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update gateway assets" ON storage.objects 
FOR UPDATE USING (bucket_id = 'gateway-assets' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete gateway assets" ON storage.objects 
FOR DELETE USING (bucket_id = 'gateway-assets' AND has_role(auth.uid(), 'admin'));

`;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Starting COMPLETE database export for admin:', user.email);

    // Build SQL output
    const lines: string[] = [];
    const timestamp = new Date().toISOString();
    
    // Header
    lines.push('-- ================================================================');
    lines.push('-- HYPER SOFTS GATEWAY - COMPLETE DATABASE EXPORT');
    lines.push('-- ================================================================');
    lines.push(`-- Generated: ${timestamp}`);
    lines.push(`-- Admin: ${user.email}`);
    lines.push('-- ');
    lines.push('-- This file contains EVERYTHING needed to recreate the database:');
    lines.push('--   1. ENUMS (app_role, transaction_status, transaction_type)');
    lines.push('--   2. FUNCTIONS (has_role, generate_account_number, update_updated_at)');
    lines.push('--   3. TABLES (all 10 tables with proper structure)');
    lines.push('--   4. TRIGGERS (auto update timestamps)');
    lines.push('--   5. ROW LEVEL SECURITY policies');
    lines.push('--   6. STORAGE bucket and policies');
    lines.push('--   7. DATA (all rows from all tables)');
    lines.push('-- ');
    lines.push('-- HOW TO USE:');
    lines.push('--   1. Create a new Supabase project');
    lines.push('--   2. Go to SQL Editor');
    lines.push('--   3. Paste and run this entire file');
    lines.push('--   4. Deploy edge functions from your code');
    lines.push('--   5. Setup admin user via /setup-admin page');
    lines.push('-- ================================================================');
    lines.push('');

    // Add schema
    lines.push(SCHEMA_SQL);
    lines.push('');
    lines.push('-- ================================================================');
    lines.push('-- DATA EXPORT');
    lines.push('-- ================================================================');
    lines.push('');

    let totalRows = 0;
    const tableStats: Record<string, number> = {};

    for (const tableName of TABLES_TO_EXPORT) {
      console.log(`Exporting table: ${tableName}`);
      
      // Fetch all rows from the table
      const { data: rows, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error(`Error fetching ${tableName}:`, error.message);
        lines.push(`-- Error exporting ${tableName}: ${error.message}`);
        lines.push('');
        continue;
      }

      const rowCount = rows?.length || 0;
      tableStats[tableName] = rowCount;
      totalRows += rowCount;

      lines.push('-- ------------------------------------------------');
      lines.push(`-- Table: ${tableName} (${rowCount} rows)`);
      lines.push('-- ------------------------------------------------');
      
      if (rows && rows.length > 0) {
        for (const row of rows) {
          lines.push(generateInsertStatement(tableName, row));
        }
      } else {
        lines.push(`-- No data in ${tableName}`);
      }
      
      lines.push('');
    }

    // Summary
    lines.push('-- ================================================================');
    lines.push('-- EXPORT SUMMARY');
    lines.push('-- ================================================================');
    lines.push(`-- Total rows exported: ${totalRows}`);
    for (const [table, count] of Object.entries(tableStats)) {
      lines.push(`--   ${table}: ${count} rows`);
    }
    lines.push('-- ');
    lines.push('-- NEXT STEPS:');
    lines.push('--   1. Deploy frontend code to hosting (Vercel, Netlify, etc.)');
    lines.push('--   2. Deploy edge functions: supabase functions deploy');
    lines.push('--   3. Update .env with new Supabase URL and keys');
    lines.push('--   4. Create admin user and run /setup-admin');
    lines.push('-- ================================================================');
    lines.push('');
    lines.push('-- Export completed successfully!');

    const sqlContent = lines.join('\n');
    const filename = `hyper_softs_complete_${timestamp.split('T')[0]}.sql`;

    console.log(`Export complete: ${totalRows} total rows, schema + RLS + data included`);

    return new Response(sqlContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/sql',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (err) {
    console.error('Export error:', err);
    const message = err instanceof Error ? err.message : 'Export failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
