# ELOPAY Gateway - Complete System Documentation

> **Version:** 2.0  
> **Last Updated:** January 2026  
> **White-Label Payment Gateway Reseller System**

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [Authentication & Security](#authentication--security)
5. [Admin Portal Features](#admin-portal-features)
6. [Merchant Portal Features](#merchant-portal-features)
7. [Edge Functions API Reference](#edge-functions-api-reference)
8. [Signature Algorithms](#signature-algorithms)
9. [Real-time Features](#real-time-features)
10. [Multi-Gateway Support](#multi-gateway-support)
11. [Telegram Integration](#telegram-integration)
12. [Deployment Guide](#deployment-guide)

---

## System Overview

ELOPAY is a white-label payment gateway reseller system that allows you to manage multiple regional payment providers under a unified brand. The system supports:

- **INR (India)**: UPI, USDT
- **PKR (Pakistan)**: Easypaisa, JazzCash, USDT
- **BDT (Bangladesh)**: Nagad, bKash, USDT

### Key Features

- Multi-tenant merchant management
- Real-time transaction monitoring
- Automated callback distribution
- Google Authenticator 2FA
- Telegram bot notifications
- Dynamic branding (logo, favicon, name)
- Bilingual support (English/Chinese)

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| State Management | Zustand, React Query |
| Backend | Supabase (Auth, Database, Edge Functions, Realtime) |
| Charts | Recharts |
| Notifications | Sonner (Toast), Web Notifications API |

---

## Database Schema

### Core Tables

#### `merchants`
```sql
CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_number VARCHAR NOT NULL,
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
```

#### `transactions`
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  gateway_id UUID REFERENCES payment_gateways(id),
  order_no VARCHAR NOT NULL,
  merchant_order_no VARCHAR,
  transaction_type transaction_type NOT NULL, -- 'payin' | 'payout'
  amount NUMERIC NOT NULL,
  fee NUMERIC DEFAULT 0,
  net_amount NUMERIC DEFAULT 0,
  status transaction_status DEFAULT 'pending', -- 'pending' | 'success' | 'failed'
  payment_url TEXT,
  callback_data JSONB,
  -- Bank/Wallet details for payouts
  bank_name TEXT,
  account_number TEXT,
  account_holder_name TEXT,
  ifsc_code TEXT,
  usdt_address TEXT,
  extra TEXT, -- Stores trade_type for payout routing
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `payment_gateways`
```sql
CREATE TABLE payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_code TEXT NOT NULL, -- e.g., 'ELOPAY_INR', 'ELOPAY_PKR'
  gateway_name TEXT NOT NULL,
  gateway_type TEXT NOT NULL, -- 'hypersofts', 'hyperpay', 'bondpay'
  currency TEXT NOT NULL, -- 'INR', 'PKR', 'BDT'
  app_id TEXT NOT NULL,
  api_key TEXT NOT NULL,
  payout_key TEXT,
  base_url TEXT NOT NULL,
  trade_type TEXT, -- Default trade type
  min_withdrawal_amount NUMERIC DEFAULT 1000,
  max_withdrawal_amount NUMERIC DEFAULT 50000,
  daily_withdrawal_limit NUMERIC DEFAULT 200000,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `payment_links`
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

#### `admin_settings`
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

### Enums

```sql
CREATE TYPE app_role AS ENUM ('admin', 'merchant');
CREATE TYPE transaction_status AS ENUM ('pending', 'success', 'failed');
CREATE TYPE transaction_type AS ENUM ('payin', 'payout');
```

---

## Authentication & Security

### Login Flow

1. **Admin Login**: `/xp7k9m2v-admin` (obscured URL for security)
2. **Merchant Login**: `/merchant-login`

### Security Features

- **Math Captcha**: Simple arithmetic captcha on all login forms
- **2FA (Google Authenticator)**: 
  - Mandatory for merchants
  - Optional for admins (configurable)
- **Session Timeout**: Automatic logout after inactivity
- **Withdrawal Password**: Separate password for fund withdrawals
- **RLS Policies**: Row-Level Security on all tables

### 2FA Implementation

```typescript
import { TOTP } from 'otpauth';

// Generate secret
const totp = new TOTP({
  issuer: 'ELOPAY',
  label: merchantEmail,
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
  secret: generateRandomSecret()
});

// Verify code
const isValid = totp.validate({ token: userCode, window: 1 }) !== null;
```

---

## Admin Portal Features

### Dashboard (`/admin/dashboard`)
- Total merchants count
- Transaction volume (24h, 7d, 30d)
- Success rate charts
- Recent activity feed

### Merchant Management (`/admin/merchants`)
- Create/Edit/Delete merchants
- Assign gateways
- Set fees (payin/payout)
- Reset login password
- Reset withdrawal password
- Clear 2FA secret
- Bulk actions (export CSV, toggle status)

### Gateway Management (`/admin/gateways`)
- Add/Edit payment gateways
- Configure API credentials
- Set withdrawal limits
- Monitor gateway balance

### Order Management
- **Payin Orders** (`/admin/payin-orders`): All deposit transactions
- **Payout Orders** (`/admin/payout-orders`): All withdrawal transactions
- **Withdrawals** (`/admin/withdrawals`): Pending approval queue

### Live Transactions (`/admin/live`)
- Real-time transaction feed
- Audio notifications
- Desktop notifications

### Settings (`/admin/settings`)
- Branding (logo, favicon, name)
- Default fees
- Telegram configuration
- VPS deployment script generator
- Domain configuration checker

---

## Merchant Portal Features

### Dashboard (`/merchant/dashboard`)
- Available balance
- Frozen balance
- Today's transactions
- Recent activity

### Transaction History
- **Payin Orders** (`/merchant/payin-orders`)
- **Payout Orders** (`/merchant/payout-orders`)
- Export to CSV

### Payment Links (`/merchant/payment-links`)
- Generate payment links
- Set amount and description
- Select trade type (currency-specific)
- Manage active links

### Withdrawals (`/merchant/withdrawal`)
- Request fund withdrawal
- Select method:
  - **INR**: Bank Transfer, USDT
  - **PKR**: Easypaisa, JazzCash, USDT
  - **BDT**: Nagad, bKash, USDT
- Requires withdrawal password + 2FA

### API Documentation (`/merchant/documentation`)
- Dynamic based on merchant's currency
- Code examples (cURL, PHP, JavaScript)
- Signature generation guide

### Security (`/merchant/security`)
- Enable/Disable 2FA
- Change withdrawal password
- View activity logs

---

## Edge Functions API Reference

### 1. Payin (Deposit) API

**Endpoint:** `POST /functions/v1/payin`

**Request:**
```json
{
  "merchant_id": "your_merchant_id",
  "amount": 1000,
  "merchant_order_no": "ORDER_123456",
  "callback_url": "https://yoursite.com/callback",
  "trade_type": "INRUPI",
  "sign": "generated_signature"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "order_no": "PAY_1234567890",
    "merchant_order_no": "ORDER_123456",
    "amount": 1000,
    "payment_url": "https://gateway.provider.com/pay/xyz123",
    "status": "pending"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Invalid signature",
  "code": "INVALID_SIGN"
}
```

**Signature Formula:**
```
sign = MD5(merchant_id + amount + merchant_order_no + api_key + callback_url)
```

---

### 2. Payout (Withdrawal) API

**Endpoint:** `POST /functions/v1/payout`

**Request (Bank Transfer - INR):**
```json
{
  "merchant_id": "your_merchant_id",
  "amount": 5000,
  "merchant_order_no": "PAYOUT_123456",
  "callback_url": "https://yoursite.com/callback",
  "bank_name": "HDFC Bank",
  "account_number": "1234567890123456",
  "account_holder_name": "John Doe",
  "ifsc_code": "HDFC0001234",
  "sign": "generated_signature"
}
```

**Request (Mobile Wallet - PKR):**
```json
{
  "merchant_id": "your_merchant_id",
  "amount": 10000,
  "merchant_order_no": "PAYOUT_789",
  "callback_url": "https://yoursite.com/callback",
  "trade_type": "easypaisa",
  "account_number": "03001234567",
  "account_holder_name": "Ali Khan",
  "sign": "generated_signature"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order_no": "PO_1234567890",
    "merchant_order_no": "PAYOUT_123456",
    "amount": 5000,
    "fee": 75,
    "net_amount": 4925,
    "status": "pending"
  }
}
```

**Signature Formula:**
```
sign = MD5(account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payout_key)
```

---

### 3. Callback Handler

**Endpoint:** `POST /functions/v1/callback-handler`

The system automatically receives callbacks from payment providers and forwards them to the merchant's configured `callback_url`.

**Callback Payload to Merchant:**
```json
{
  "order_no": "PAY_1234567890",
  "merchant_order_no": "ORDER_123456",
  "amount": 1000,
  "status": "success",
  "transaction_type": "payin",
  "timestamp": "2026-01-30T12:00:00Z",
  "sign": "callback_signature"
}
```

---

### 4. Payment Link Pay

**Endpoint:** `POST /functions/v1/payment-link-pay`

**Request:**
```json
{
  "link_code": "ABC123XYZ",
  "trade_type": "nagad",
  "customer_email": "customer@email.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment_url": "https://gateway.provider.com/pay/xyz",
    "order_no": "PL_1234567890",
    "amount": 500,
    "expires_in": 900
  }
}
```

---

### 5. Get Payment Link Merchant

**Endpoint:** `GET /functions/v1/get-payment-link-merchant?code={link_code}`

**Response:**
```json
{
  "success": true,
  "data": {
    "merchant_name": "Test Store",
    "amount": 1000,
    "description": "Product Purchase",
    "currency": "BDT",
    "gateway_type": "hypersofts",
    "trade_types": ["nagad", "bkash"],
    "is_active": true,
    "expires_at": null
  }
}
```

---

### 6. Process Payout (Admin Approval)

**Endpoint:** `POST /functions/v1/process-payout`

**Request:**
```json
{
  "transaction_id": "uuid-of-transaction",
  "action": "approve"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payout processed successfully",
  "data": {
    "provider_order_no": "PROVIDER_123",
    "status": "processing"
  }
}
```

---

### 7. Create Merchant

**Endpoint:** `POST /functions/v1/create-merchant`

**Headers:**
```
Authorization: Bearer {admin_jwt_token}
```

**Request:**
```json
{
  "email": "merchant@example.com",
  "password": "securepassword123",
  "merchant_name": "New Store",
  "gateway_id": "uuid-of-gateway",
  "payin_fee": 2.5,
  "payout_fee": 1.5,
  "callback_url": "https://merchant.com/callback"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "merchant_id": "uuid",
    "account_number": "100000001",
    "api_key": "uuid-api-key",
    "payout_key": "uuid-payout-key"
  }
}
```

---

### 8. Verify Withdrawal Password

**Endpoint:** `POST /functions/v1/verify-withdrawal-password`

**Request:**
```json
{
  "merchant_id": "uuid",
  "password": "withdrawal_password"
}
```

**Response:**
```json
{
  "success": true,
  "valid": true
}
```

---

### 9. Send Telegram

**Endpoint:** `POST /functions/v1/send-telegram`

**Request:**
```json
{
  "chat_id": "123456789",
  "message": "New transaction received!",
  "parse_mode": "HTML"
}
```

**Response:**
```json
{
  "success": true,
  "message_id": 12345
}
```

---

### 10. Check Gateway Balance

**Endpoint:** `POST /functions/v1/check-gateway-balance`

**Request:**
```json
{
  "gateway_id": "uuid-of-gateway"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 150000,
    "currency": "INR",
    "last_checked": "2026-01-30T12:00:00Z"
  }
}
```

---

### 11. Daily Summary

**Endpoint:** Triggered via cron (18:30 UTC = 00:00 IST)

Generates and sends daily transaction summaries to:
- Admin Telegram group
- Individual merchant Telegram accounts

---

### 12. Admin Update Merchant

**Endpoint:** `POST /functions/v1/admin-update-merchant`

**Request (Update):**
```json
{
  "action": "update",
  "merchant_id": "uuid",
  "updates": {
    "merchant_name": "Updated Name",
    "payin_fee": 3.0,
    "is_active": false
  }
}
```

**Request (Delete):**
```json
{
  "action": "delete",
  "merchant_id": "uuid"
}
```

**Request (Reset Password):**
```json
{
  "action": "reset_password",
  "merchant_id": "uuid",
  "new_password": "newpassword123"
}
```

---

## Signature Algorithms

### Standard MD5 (BondPay, HyperPay INR)

```javascript
function generateStandardSignature(params, secretKey) {
  const signString = params.merchant_id + 
                     params.amount + 
                     params.merchant_order_no + 
                     secretKey + 
                     params.callback_url;
  return md5(signString);
}
```

### ASCII-Sorted MD5 (HyperSofts - PKR/BDT)

```javascript
function generateAsciiSortedSignature(params, secretKey) {
  // 1. Filter out empty values and sign parameter
  const filtered = Object.entries(params)
    .filter(([key, value]) => value !== '' && value != null && key !== 'sign')
    .sort(([a], [b]) => a.localeCompare(b));
  
  // 2. Build query string
  const queryString = filtered
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  // 3. Append secret key
  const signString = queryString + '&key=' + secretKey;
  
  // 4. MD5 and uppercase
  return md5(signString).toUpperCase();
}
```

### Example Signature Generation (PHP)

```php
<?php
// Standard MD5
function generateSign($merchantId, $amount, $orderNo, $apiKey, $callbackUrl) {
    return md5($merchantId . $amount . $orderNo . $apiKey . $callbackUrl);
}

// ASCII-Sorted MD5
function generateAsciiSign($params, $secretKey) {
    // Remove empty values and 'sign'
    $filtered = array_filter($params, function($v, $k) {
        return $v !== '' && $v !== null && $k !== 'sign';
    }, ARRAY_FILTER_USE_BOTH);
    
    // Sort by key (ASCII order)
    ksort($filtered);
    
    // Build query string
    $queryString = http_build_query($filtered);
    
    // Append key and hash
    return strtoupper(md5($queryString . '&key=' . $secretKey));
}
```

---

## Real-time Features

### Supabase Realtime Subscription

```typescript
import { supabase } from '@/integrations/supabase/client';

// Subscribe to transaction changes
const channel = supabase
  .channel('transactions-realtime')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'transactions',
      filter: `merchant_id=eq.${merchantId}`
    },
    (payload) => {
      if (payload.eventType === 'INSERT') {
        showNotification('New Transaction', payload.new);
        playNotificationSound();
      }
    }
  )
  .subscribe();
```

### Desktop Notifications

```typescript
// Request permission
if (Notification.permission === 'default') {
  await Notification.requestPermission();
}

// Show notification
if (Notification.permission === 'granted') {
  new Notification('ELOPAY Alert', {
    body: 'New payin received: ₹1,000',
    icon: '/favicon.ico'
  });
}
```

---

## Multi-Gateway Support

### Gateway Types

| Gateway Code | Type | Currency | Trade Types |
|--------------|------|----------|-------------|
| ELOPAY_INR | hypersofts | INR | INRUPI, usdt |
| ELOPAY_PKR | hypersofts | PKR | easypaisa, jazzcash |
| ELOPAY_BDT | hypersofts | BDT | nagad, bkash |
| ELOPAYGATEWAY_INR | hyperpay | INR | UPI |

### Gateway Selection Logic

```typescript
// Merchant is assigned a gateway_id
// All transactions use merchant's gateway credentials

const merchantGateway = await supabase
  .from('merchants')
  .select(`
    *,
    gateway:payment_gateways(*)
  `)
  .eq('id', merchantId)
  .single();

const { app_id, api_key, base_url, gateway_type } = merchantGateway.gateway;
```

---

## Telegram Integration

### Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Initialize bot |
| `/help` | Show available commands |
| `/tg_id` or `/id` | Get your chat ID |
| `/balance` | Check merchant balance |
| `/stats` | View transaction statistics |
| `/broadcast {message}` | Admin: Send to all merchants |

### Webhook Setup

```bash
# Set webhook URL
curl -X POST "https://api.telegram.org/bot{BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.com/functions/v1/telegram-bot"}'
```

---

## Deployment Guide

### VPS Deployment (Nginx + Certbot)

```bash
#!/bin/bash
# Auto-generated deployment script

DOMAIN="your-domain.com"
REPO_URL="https://github.com/your-repo/elopay.git"
PROJECT_DIR="/var/www/elopay"

# Install dependencies
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx nodejs npm

# Clone repository
git clone $REPO_URL $PROJECT_DIR
cd $PROJECT_DIR

# Install and build
npm install
npm run build

# Configure Nginx
cat > /etc/nginx/sites-available/elopay << EOF
server {
    listen 80;
    server_name $DOMAIN;
    root $PROJECT_DIR/dist;
    index index.html;
    
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

ln -s /etc/nginx/sites-available/elopay /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# SSL Certificate
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN
```

### Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

---

## Support

For technical support, contact the system administrator or refer to the in-app documentation.

---

*© 2026 ELOPAY Gateway System. All rights reserved.*
