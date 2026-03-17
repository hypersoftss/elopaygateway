# ELOPAY WHMCS Payment Module

## Quick Setup (3 Minutes)

### Step 1: Upload Files
Copy the `modules/` folder to your WHMCS installation root:
```
whmcs/
├── modules/
│   └── gateways/
│       ├── elopay.php              ← Gateway module
│       └── callback/
│           └── elopay.php          ← Callback handler
```

### Step 2: Activate in WHMCS
1. Go to **WHMCS Admin → Setup → Payment Gateways**
2. Click **"All Payment Gateways"** tab
3. Find **"ELOPAY Gateway"** and click **Activate**

### Step 3: Configure
Fill in your credentials:
- **Merchant ID** — Your Account Number from ELOPAY dashboard
- **API Key** — Your Pay-in API Key
- **Trade Type** — Select your payment method (UPI, bKash, etc.)
- **Currency** — INR / BDT / PKR

### Step 4: Done! 🎉
Customers will see the ELOPAY payment option on invoices.

## Supported Payment Methods
| Currency | Methods |
|----------|---------|
| INR | UPI, USDT |
| BDT | bKash, Nagad, USDT |
| PKR | Easypaisa, JazzCash, USDT |

## Callback URL
The callback URL is automatically set to:
```
https://your-whmcs-domain.com/modules/gateways/callback/elopay.php
```
