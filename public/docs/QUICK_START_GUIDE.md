# 🚀 ELOPAY Gateway - Quick Start Guide (Hindi/English)

> **अपना खुद का Payment Gateway 15 मिनट में Deploy करें!**

---

## 📋 Requirements (क्या चाहिए)

| Item | Free Option | Notes |
|------|-------------|-------|
| **VPS Server** | Oracle Cloud Free Tier (Lifetime Free) | 4 vCPU, 24GB RAM FREE! |
| **Domain** | आपके पास पहले से है | DNS access required |
| **Supabase** | Supabase Free Tier | 500MB database, 2 Edge Functions |

---

## 🎯 Step 1: VPS लें (Oracle Cloud Free - Recommended)

### Oracle Cloud Free Tier Setup:
1. https://cloud.oracle.com पर जाएं
2. "Start for free" पर click करें
3. Account बनाएं (Credit card verify होगा, charge नहीं होगा)
4. **Compute > Instances > Create Instance**
5. Settings:
   - Shape: `VM.Standard.A1.Flex` (Always Free)
   - OCPUs: 4
   - Memory: 24 GB
   - Image: **Ubuntu 22.04**
6. SSH key generate करके download करें
7. Instance create करें

### SSH से Connect करें:
```bash
ssh -i your-key.pem ubuntu@YOUR_VPS_IP
```

---

## 🎯 Step 2: Supabase Project बनाएं (Free)

1. https://supabase.com पर जाएं
2. "Start your project" → Free tier select करें
3. Project बनाएं और note करें:
   - **Project URL**: `https://xxxxxx.supabase.co`
   - **Anon Key**: Settings > API > `anon` key
   - **Service Role Key**: Settings > API > `service_role` key

### Database Schema Setup:
Supabase Dashboard > SQL Editor में जाएं और यह SQL run करें:

```sql
-- ENUMS
CREATE TYPE app_role AS ENUM ('admin', 'merchant');
CREATE TYPE transaction_status AS ENUM ('pending', 'success', 'failed');
CREATE TYPE transaction_type AS ENUM ('payin', 'payout');

-- USER ROLES TABLE
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- PAYMENT GATEWAYS TABLE
CREATE TABLE payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_code TEXT NOT NULL UNIQUE,
  gateway_name TEXT NOT NULL,
  gateway_type TEXT NOT NULL,
  currency TEXT NOT NULL,
  app_id TEXT NOT NULL,
  api_key TEXT NOT NULL,
  payout_key TEXT,
  base_url TEXT NOT NULL,
  trade_type TEXT,
  min_withdrawal_amount NUMERIC DEFAULT 1000,
  max_withdrawal_amount NUMERIC DEFAULT 50000,
  daily_withdrawal_limit NUMERIC DEFAULT 200000,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;

-- MERCHANTS TABLE
CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_number VARCHAR NOT NULL UNIQUE,
  merchant_name TEXT NOT NULL,
  api_key UUID DEFAULT gen_random_uuid(),
  payout_key UUID DEFAULT gen_random_uuid(),
  balance NUMERIC DEFAULT 0,
  frozen_balance NUMERIC DEFAULT 0,
  payin_fee NUMERIC DEFAULT 2.5,
  payout_fee NUMERIC DEFAULT 1.5,
  is_active BOOLEAN DEFAULT true,
  is_2fa_enabled BOOLEAN DEFAULT false,
  google_2fa_secret TEXT,
  callback_url TEXT,
  telegram_chat_id TEXT,
  gateway_id UUID REFERENCES payment_gateways(id),
  trade_type TEXT,
  withdrawal_password TEXT,
  withdrawal_password_hash TEXT,
  notify_new_transactions BOOLEAN DEFAULT true,
  notify_balance_changes BOOLEAN DEFAULT true,
  notify_status_updates BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

-- TRANSACTIONS TABLE
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  gateway_id UUID REFERENCES payment_gateways(id),
  order_no VARCHAR NOT NULL UNIQUE,
  merchant_order_no VARCHAR,
  transaction_type transaction_type NOT NULL,
  amount NUMERIC NOT NULL,
  fee NUMERIC DEFAULT 0,
  net_amount NUMERIC DEFAULT 0,
  status transaction_status DEFAULT 'pending',
  payment_url TEXT,
  callback_data JSONB,
  bank_name TEXT,
  account_number TEXT,
  account_holder_name TEXT,
  ifsc_code TEXT,
  usdt_address TEXT,
  extra TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- PAYMENT LINKS TABLE
CREATE TABLE payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  link_code VARCHAR NOT NULL UNIQUE,
  amount NUMERIC NOT NULL,
  description TEXT,
  trade_type TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

-- ADMIN SETTINGS TABLE
CREATE TABLE admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_name TEXT DEFAULT 'PayGate',
  gateway_domain TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  support_email TEXT,
  telegram_bot_token TEXT,
  admin_telegram_chat_id TEXT,
  master_api_key UUID DEFAULT gen_random_uuid(),
  master_merchant_id UUID DEFAULT gen_random_uuid(),
  master_payout_key UUID DEFAULT gen_random_uuid(),
  default_payin_fee NUMERIC DEFAULT 9.0,
  default_payout_fee NUMERIC DEFAULT 4.0,
  large_payin_threshold NUMERIC DEFAULT 10000,
  large_payout_threshold NUMERIC DEFAULT 5000,
  large_withdrawal_threshold NUMERIC DEFAULT 5000,
  balance_threshold_inr NUMERIC DEFAULT 10000,
  balance_threshold_pkr NUMERIC DEFAULT 50000,
  balance_threshold_bdt NUMERIC DEFAULT 50000,
  response_time_threshold NUMERIC DEFAULT 5000,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ADMIN PROFILES TABLE
CREATE TABLE admin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  is_2fa_enabled BOOLEAN DEFAULT false,
  google_2fa_secret TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- ADMIN NOTIFICATIONS TABLE
CREATE TABLE admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  amount NUMERIC,
  merchant_id UUID REFERENCES merchants(id),
  transaction_id UUID REFERENCES transactions(id),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- MERCHANT ACTIVITY LOGS TABLE
CREATE TABLE merchant_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id),
  admin_user_id UUID,
  action_type TEXT NOT NULL,
  action_details JSONB,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE merchant_activity_logs ENABLE ROW LEVEL SECURITY;

-- GATEWAY BALANCE HISTORY TABLE
CREATE TABLE gateway_balance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id UUID NOT NULL REFERENCES payment_gateways(id),
  balance NUMERIC,
  status TEXT DEFAULT 'unknown',
  message TEXT,
  checked_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE gateway_balance_history ENABLE ROW LEVEL SECURITY;

-- TELEGRAM BOT MESSAGES TABLE
CREATE TABLE telegram_bot_messages (
  chat_id TEXT PRIMARY KEY,
  last_message_id BIGINT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION generate_account_number()
RETURNS VARCHAR AS $$
DECLARE 
  new_num VARCHAR(20);
  max_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(account_number FROM 2)::INTEGER), 0) + 1
  INTO max_num FROM merchants;
  new_num := '1' || LPAD(max_num::TEXT, 8, '0');
  RETURN new_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_my_gateway()
RETURNS TABLE(
  gateway_id UUID,
  gateway_code TEXT,
  gateway_name TEXT,
  gateway_type TEXT,
  currency TEXT,
  min_withdrawal_amount NUMERIC,
  max_withdrawal_amount NUMERIC,
  daily_withdrawal_limit NUMERIC
) AS $$
  SELECT
    pg.id, pg.gateway_code, pg.gateway_name, pg.gateway_type, pg.currency,
    COALESCE(pg.min_withdrawal_amount, 1000),
    COALESCE(pg.max_withdrawal_amount, 50000),
    COALESCE(pg.daily_withdrawal_limit, 200000)
  FROM merchants m
  JOIN payment_gateways pg ON pg.id = m.gateway_id
  WHERE m.user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_gateway_branding()
RETURNS TABLE(
  gateway_name TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  support_email TEXT,
  gateway_domain TEXT
) AS $$
  SELECT gateway_name, logo_url, favicon_url, support_email, gateway_domain
  FROM admin_settings
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Enable Realtime for transactions
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

-- INSERT DEFAULT ADMIN SETTINGS
INSERT INTO admin_settings (gateway_name) VALUES ('ELOPAY');
```

---

## 🎯 Step 3: Domain DNS Setup

अपने domain registrar में जाएं और ये records add करें:

| Type | Name | Value |
|------|------|-------|
| A | @ | YOUR_VPS_IP |
| A | www | YOUR_VPS_IP |

DNS propagate होने में 5-30 minutes लग सकते हैं।

---

## 🎯 Step 4: VPS पर Deploy करें

SSH से VPS में connect करके ये commands run करें:

```bash
# Script download करें
wget https://YOUR_DOMAIN/docs/VPS_DEPLOYMENT_SCRIPT.sh

# या manually paste करें
nano deploy.sh
# Paste the script content
# Save with Ctrl+X, Y, Enter

# Permission दें
chmod +x deploy.sh

# Run करें
sudo ./deploy.sh
```

Script आपसे पूछेगा:
- Domain name
- Email for SSL
- Supabase URL
- Supabase keys

---

## 🎯 Step 5: Build Files Upload करें

### Option A: GitHub से (Recommended)
Script में GitHub repo URL दे दें, automatic clone हो जाएगा।

### Option B: Manual Upload
1. अपने computer पर project build करें:
```bash
bun run build
```

2. `dist/` folder को VPS पर upload करें:
```bash
scp -r dist/* ubuntu@YOUR_VPS_IP:/var/www/elopay/dist/
```

---

## 🎯 Step 6: Edge Functions Deploy करें

Supabase Dashboard > Edge Functions में जाएं और ये functions create करें:

1. **payin** - Payment create करने के लिए
2. **payout** - Withdrawal create करने के लिए  
3. **callback-handler** - Provider callbacks handle करने के लिए
4. **process-payout** - Admin approval के लिए
5. **create-merchant** - Merchant बनाने के लिए
6. **verify-withdrawal-password** - Withdrawal verify करने के लिए
7. **send-telegram** - Telegram notifications के लिए

> 📖 Edge function code के लिए `ELOPAY_SELF_HOSTING_PROMPT.md` देखें

### Edge Function Secrets Setup:
Supabase Dashboard > Settings > Edge Functions > Secrets:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TG_BOT_TOKEN` (optional)

---

## 🎯 Step 7: Admin Account बनाएं

1. Browser में जाएं: `https://YOUR_DOMAIN/setup-admin`
2. Admin credentials enter करें
3. Login करें: `https://YOUR_DOMAIN/xp7k9m2v-admin`

---

## ✅ Done! आपका Gateway Ready है!

| URL | Purpose |
|-----|---------|
| `https://YOUR_DOMAIN` | Landing Page |
| `https://YOUR_DOMAIN/xp7k9m2v-admin` | Admin Login |
| `https://YOUR_DOMAIN/merchant-login` | Merchant Login |
| `https://YOUR_DOMAIN/pay/LINK_CODE` | Payment Links |

---

## 🔧 Troubleshooting

### SSL Error?
```bash
sudo certbot --nginx -d YOUR_DOMAIN --force-renewal
```

### Nginx not starting?
```bash
sudo nginx -t  # Check config
sudo systemctl status nginx  # Check status
```

### Permission denied?
```bash
sudo chown -R www-data:www-data /var/www/elopay
```

---

## 📞 Support

- Documentation: `/docs/ELOPAY_COMPLETE_DOCUMENTATION.md`
- Self-Hosting Guide: `/docs/ELOPAY_SELF_HOSTING_PROMPT.md`
- Branding Guide: `/docs/ELOPAY_BRANDING_GUIDE.md`

---

**🎉 Congratulations! आपका Free Payment Gateway Ready है!**
