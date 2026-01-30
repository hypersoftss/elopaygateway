# ELOPAY Gateway - Complete Self-Hosting Recreation Prompt

> **Copy this entire prompt to recreate the ELOPAY Payment Gateway system from scratch**
> 
> This is a comprehensive technical specification for building a white-label payment gateway reseller system.

---

## 🎯 MASTER PROMPT FOR AI ASSISTANT

```
Build a complete white-label payment gateway reseller system called "ELOPAY" with the following specifications:

## SYSTEM OVERVIEW

A multi-tenant payment gateway management platform supporting:
- INR (India): UPI, USDT payments
- PKR (Pakistan): Easypaisa, JazzCash, USDT
- BDT (Bangladesh): Nagad, bKash, USDT

The system acts as a middleware between merchants and upstream payment providers, taking a fee on each transaction.

---

## TECHNOLOGY STACK

Frontend:
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui components
- React Query for data fetching
- Zustand for state management
- React Router v6 for routing
- Recharts for analytics charts
- Sonner for toast notifications

Backend:
- Supabase Auth (email/password authentication)
- Supabase PostgreSQL Database
- Supabase Edge Functions (Deno)
- Supabase Realtime for live updates

Security:
- Google Authenticator 2FA (otpauth library)
- Math Captcha on login forms
- Row Level Security (RLS) policies
- Separate withdrawal passwords (hashed)

---

## DATABASE SCHEMA

Create these tables with RLS enabled:

### ENUMS
```sql
CREATE TYPE app_role AS ENUM ('admin', 'merchant');
CREATE TYPE transaction_status AS ENUM ('pending', 'success', 'failed');
CREATE TYPE transaction_type AS ENUM ('payin', 'payout');
```

### TABLE: user_roles
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: Users can view own role, Admin can manage all
```

### TABLE: merchants
```sql
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
-- RLS: Merchants see own data, Admin sees all
```

### TABLE: payment_gateways
```sql
CREATE TABLE payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_code TEXT NOT NULL UNIQUE,
  gateway_name TEXT NOT NULL,
  gateway_type TEXT NOT NULL, -- 'hypersofts' or 'hyperpay'
  currency TEXT NOT NULL, -- 'INR', 'PKR', 'BDT'
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
-- RLS: Admin only
```

### TABLE: transactions
```sql
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
-- RLS: Merchants see own, Admin sees all
```

### TABLE: payment_links
```sql
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
```

### TABLE: admin_settings
```sql
CREATE TABLE admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_name TEXT DEFAULT 'PayGate',
  gateway_domain TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  support_email TEXT,
  telegram_bot_token TEXT,
  admin_telegram_chat_id TEXT,
  default_payin_fee NUMERIC DEFAULT 9.0,
  default_payout_fee NUMERIC DEFAULT 4.0,
  large_payin_threshold NUMERIC DEFAULT 10000,
  large_payout_threshold NUMERIC DEFAULT 5000,
  large_withdrawal_threshold NUMERIC DEFAULT 5000,
  balance_threshold_inr NUMERIC DEFAULT 10000,
  balance_threshold_pkr NUMERIC DEFAULT 50000,
  balance_threshold_bdt NUMERIC DEFAULT 50000,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### TABLE: admin_profiles
```sql
CREATE TABLE admin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  is_2fa_enabled BOOLEAN DEFAULT false,
  google_2fa_secret TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### TABLE: admin_notifications
```sql
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
```

### TABLE: merchant_activity_logs
```sql
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
```

### TABLE: gateway_balance_history
```sql
CREATE TABLE gateway_balance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id UUID NOT NULL REFERENCES payment_gateways(id),
  balance NUMERIC,
  status TEXT DEFAULT 'unknown',
  message TEXT,
  checked_at TIMESTAMPTZ DEFAULT now()
);
```

### TABLE: telegram_bot_messages
```sql
CREATE TABLE telegram_bot_messages (
  chat_id TEXT PRIMARY KEY,
  last_message_id BIGINT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### HELPER FUNCTIONS
```sql
-- Generate sequential account numbers
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
$$ LANGUAGE plpgsql;

-- Check user role
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get merchant's gateway info
CREATE OR REPLACE FUNCTION get_my_gateway()
RETURNS TABLE(...) AS $$
  SELECT pg.id, pg.gateway_code, pg.gateway_name, pg.currency, 
         pg.min_withdrawal_amount, pg.max_withdrawal_amount, pg.daily_withdrawal_limit
  FROM merchants m
  JOIN payment_gateways pg ON pg.id = m.gateway_id
  WHERE m.user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

## ROUTING STRUCTURE

```
/ → Landing page (public)
/merchant-login → Merchant login
/xp7k9m2v-admin → Admin login (obscured URL)
/setup-admin → First-time admin setup
/pay/{link_code} → Payment link page
/payment-success → Success redirect
/payment-failed → Failed redirect

/admin/* → Admin routes (protected)
  /admin/dashboard
  /admin/merchants
  /admin/gateways
  /admin/payin-orders
  /admin/payout-orders
  /admin/withdrawals
  /admin/live
  /admin/settings
  /admin/telegram
  /admin/activity-logs
  /admin/gateway-health

/merchant/* → Merchant routes (protected, requires 2FA)
  /merchant/dashboard
  /merchant/payin-orders
  /merchant/payout-orders
  /merchant/withdrawal
  /merchant/payment-links
  /merchant/analytics
  /merchant/api-testing
  /merchant/documentation
  /merchant/security
  /merchant/account-info
```

---

## EDGE FUNCTIONS TO CREATE

### 1. payin
- Accepts: merchant_id, amount, merchant_order_no, callback_url, trade_type, sign
- Validates signature based on gateway_type
- Creates transaction record
- Forwards to upstream provider
- Returns payment_url

### 2. payout
- Accepts: merchant_id, amount, merchant_order_no, callback_url, bank details, sign
- Validates signature using payout_key
- Checks merchant balance
- Creates pending payout transaction
- For admin-approved payouts, forwards to provider

### 3. callback-handler
- Receives callbacks from upstream providers
- Validates provider signature
- Updates transaction status
- Updates merchant balance (for successful payins)
- Forwards callback to merchant's callback_url with 3 retries

### 4. process-payout
- Admin approves/rejects pending payouts
- Forwards approved payouts to upstream provider
- Deducts from merchant balance
- Sends Telegram notifications

### 5. create-merchant
- Admin creates new merchant account
- Creates auth user via Supabase Admin API
- Creates merchant record with generated account_number
- Assigns user_roles entry

### 6. admin-update-merchant
- Update merchant details
- Reset login password
- Reset withdrawal password
- Clear 2FA secret
- Delete merchant

### 7. verify-withdrawal-password
- Compares hashed password
- Used before processing withdrawals

### 8. payment-link-pay
- Processes payment from payment link
- Creates payin transaction
- Returns payment URL

### 9. get-payment-link-merchant
- Public endpoint
- Returns payment link details for display

### 10. send-telegram
- Sends message via Telegram Bot API
- Supports HTML parse mode

### 11. telegram-bot
- Webhook handler for Telegram bot
- Commands: /start, /help, /tg_id, /balance, /stats, /broadcast

### 12. check-gateway-balance
- Fetches balance from upstream provider
- Stores in gateway_balance_history

### 13. daily-summary
- Cron job (18:30 UTC)
- Generates and sends daily reports

### 14. server-health-monitor
- Checks all gateway endpoints
- Monitors response times

### 15. setup-admin
- First-time admin account creation
- Sets up initial admin_settings

### 16. export-database
- Exports data to CSV/JSON

---

## SIGNATURE ALGORITHMS

### Standard MD5 (ELOPAYGATEWAY_INR)
```javascript
function generateSign(merchantId, amount, orderNo, apiKey, callbackUrl) {
  return md5(merchantId + amount + orderNo + apiKey + callbackUrl);
}
```

### ASCII-Sorted MD5 (ELOPAY_INR, ELOPAY_PKR, ELOPAY_BDT)
```javascript
function generateEloPaySignature(params, secretKey) {
  const filtered = Object.entries(params)
    .filter(([key, value]) => value !== '' && value != null && key !== 'sign')
    .sort(([a], [b]) => a.localeCompare(b));
  
  const queryString = filtered.map(([k, v]) => `${k}=${v}`).join('&');
  return md5(queryString + '&key=' + secretKey).toUpperCase();
}
```

---

## KEY FEATURES TO IMPLEMENT

### Admin Features:
1. Dashboard with charts (Recharts)
2. Merchant CRUD with activity logging
3. Gateway management
4. Real-time transaction feed with sound/desktop notifications
5. Telegram bot integration
6. Branding settings (logo, favicon, name)
7. VPS deployment script generator
8. Domain configuration checker

### Merchant Features:
1. Balance dashboard with frozen balance display
2. Transaction history with filters and export
3. Payment link generator
4. Withdrawal form with method selection based on currency
5. 2FA setup (mandatory)
6. API documentation (dynamic based on currency)
7. API testing sandbox
8. Account info with key regeneration

### Security Features:
1. Math Captcha: Generate random a + b = ? on login forms
2. 2FA: Use 'otpauth' library for TOTP generation/verification
3. Session timeout: Auto-logout after 30 minutes inactivity
4. Withdrawal password: Separate bcrypt-hashed password

### Real-time Features:
1. Subscribe to transactions table changes
2. Play sound on new transactions
3. Show desktop notifications
4. Update balance in real-time

---

## UI COMPONENTS NEEDED

- DashboardLayout with sidebar navigation
- StatusBadge (pending=yellow, success=green, failed=red)
- ThemeToggle (light/dark mode)
- LanguageSwitch (English/Chinese)
- MathCaptcha component
- 2FA setup modal with QR code (qrcode.react)
- DataTable with sorting, filtering, pagination
- StatCards for dashboard
- TransactionFeed for live view

---

## ENVIRONMENT VARIABLES

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

Edge Function Secrets:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- TG_BOT_TOKEN

---

## MULTI-LANGUAGE SUPPORT

Implement i18n with Zustand store:
- English (default)
- Chinese (简体中文)

Translations for: navigation, forms, status messages, error messages

---

## STYLING GUIDELINES

- Use shadcn/ui components
- Tailwind CSS with custom color tokens in index.css
- Dark mode support via CSS variables
- Responsive design (mobile-first)
- Professional, clean UI similar to Stripe Dashboard

---

## DEPLOYMENT

1. Build: npm run build
2. Deploy dist/ folder to any static hosting
3. Set up Nginx with SSL (Certbot)
4. Configure Supabase project
5. Set webhook URLs for Telegram bot
6. Configure upstream payment provider callbacks

This completes the full system specification.
```

---

## 📥 QUICK START COMMANDS

```bash
# Create new Vite React project
npm create vite@latest elopay -- --template react-ts
cd elopay

# Install dependencies
npm install @supabase/supabase-js @tanstack/react-query zustand
npm install react-router-dom recharts sonner otpauth qrcode.react js-md5
npm install date-fns zod react-hook-form @hookform/resolvers

# Install shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button card input label table dialog
npx shadcn@latest add select tabs toast badge avatar dropdown-menu
npx shadcn@latest add form checkbox switch textarea
```

---

## 🔐 SECURITY CHECKLIST

- [ ] Enable RLS on ALL tables
- [ ] Obscure admin login URL
- [ ] Hash all passwords (bcrypt)
- [ ] Validate signatures on all API calls
- [ ] Implement rate limiting
- [ ] Use HTTPS only
- [ ] Set secure cookie flags
- [ ] Validate webhook signatures from providers

---

## 📚 ADDITIONAL RESOURCES

1. **Complete Documentation**: `/docs/ELOPAY_COMPLETE_DOCUMENTATION.md`
2. **SDK Examples**: `/sdk/` folder contains PHP and JavaScript SDKs
3. **Branding Guide**: `/docs/ELOPAY_BRANDING_GUIDE.md`

---

*Generated for ELOPAY Gateway System v2.0*
*© 2026 All Rights Reserved*
