# ELOPAY Branding Guide

> Comprehensive documentation for ELOPAY gateway branding, identifiers, and naming conventions.

---

## 1. Brand Identity

### Primary Brand Name
- **ELOPAY** - The unified brand identity for all payment gateway services

### Brand Usage
| Context | Display Name |
|---------|-------------|
| Header/Navigation | ELOPAY |
| Login Pages | ELOPAY |
| Footer Copyright | © 2024 ELOPAY. All rights reserved. |
| Payment Pages | Powered by ELOPAY |
| Documentation | ELOPAY API Documentation |
| 2FA Issuer | ELOPAY |

---

## 2. Gateway Identifiers

### SDK Documentation Labels

| Gateway ID | Display Label | Region | Currency |
|------------|---------------|--------|----------|
| `ELOPAY_INR` | ELOPAY_INR | India | INR (₹) |
| `ELOPAY_PKR` | ELOPAY_PKR | Pakistan | PKR (Rs.) |
| `ELOPAY_BDT` | ELOPAY_BDT | Bangladesh | BDT (৳) |
| `ELOPAYGATEWAY_INR` | ELOPAYGATEWAY_INR | India | INR (₹) |

### Internal Gateway Types (Database)

| Gateway Type | Brand Mapping | Description |
|--------------|---------------|-------------|
| `hypersofts` | ELOPAY | Multi-currency gateway (INR, PKR, BDT) |
| `hyperpay` | ELOPAYGATEWAY | India-specific gateway (INR only) |
| `bondpay` | ELOPAYGATEWAY | Legacy alias for hyperpay |
| `lgpay` | ELOPAY | Legacy alias for hypersofts |

---

## 3. Regional Configuration

### India (INR) 🇮🇳

| Property | ELOPAY_INR | ELOPAYGATEWAY_INR |
|----------|------------|-------------------|
| Currency Symbol | ₹ | ₹ |
| Gateway Type | `hypersofts` | `hyperpay` |
| Deposit Trade Types | `INRUPI`, `usdt` | UPI (default) |
| Withdrawal Code | `INR` | Bank Transfer |
| Signature Algorithm | ASCII-sorted MD5 | Standard MD5 |

### Pakistan (PKR) 🇵🇰

| Property | Value |
|----------|-------|
| Brand Label | ELOPAY_PKR |
| Currency Symbol | Rs. |
| Gateway Type | `hypersofts` |
| Deposit Trade Type | `PKRPH` (unified) |
| Payment Methods | Easypaisa, JazzCash |
| Withdrawal Code | `PKR` |
| Signature Algorithm | ASCII-sorted MD5 |

### Bangladesh (BDT) 🇧🇩

| Property | Value |
|----------|-------|
| Brand Label | ELOPAY_BDT |
| Currency Symbol | ৳ |
| Gateway Type | `hypersofts` |
| Deposit Trade Types | `nagad`, `bkash` |
| Payment Methods | Nagad, bKash |
| Withdrawal Code | `BDT` |
| Signature Algorithm | ASCII-sorted MD5 |

---

## 4. Signature Algorithms

### ELOPAY (hypersofts) - ASCII Sorted MD5

```javascript
// ELOPAY Signature Generation
function generateElopaySignature(params, secretKey) {
  // 1. Filter out empty values
  const filtered = Object.entries(params)
    .filter(([_, v]) => v !== '' && v !== null && v !== undefined);
  
  // 2. Sort by ASCII key order
  const sorted = filtered.sort((a, b) => a[0].localeCompare(b[0]));
  
  // 3. Build query string
  const queryString = sorted
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  
  // 4. Append secret key
  const signString = `${queryString}&key=${secretKey}`;
  
  // 5. MD5 hash and uppercase
  return md5(signString).toUpperCase();
}
```

### ELOPAYGATEWAY (hyperpay) - Standard MD5

```javascript
// ELOPAYGATEWAY Signature Generation
function generateElopayGatewaySignature(params) {
  const { merchant_id, amount, merchant_order_no, api_key, callback_url } = params;
  
  // Concatenate in fixed order
  const signString = merchant_id + amount + merchant_order_no + api_key + callback_url;
  
  // MD5 hash
  return md5(signString);
}
```

---

## 5. Trade Type Mapping

### Deposit (Payin) Trade Types

| Region | User Selection | API Trade Type |
|--------|----------------|----------------|
| INR (ELOPAY) | UPI | `INRUPI` |
| INR (ELOPAY) | USDT | `usdt` |
| INR (ELOPAYGATEWAY) | UPI | (default) |
| PKR | Easypaisa | `PKRPH` |
| PKR | JazzCash | `PKRPH` |
| BDT | Nagad | `nagad` |
| BDT | bKash | `bkash` |

### Withdrawal (Payout) Codes

| Currency | Withdrawal Code |
|----------|-----------------|
| INR | `INR` |
| PKR | `PKR` |
| BDT | `BDT` |

---

## 6. UI Component Branding

### Color Palette

Use semantic design tokens from the theme system:

```css
/* Primary brand colors - defined in index.css */
--primary: /* HSL value */
--primary-foreground: /* HSL value */

/* Do NOT use hardcoded colors in components */
/* ✓ Correct */ className="bg-primary text-primary-foreground"
/* ✗ Wrong */ className="bg-blue-500 text-white"
```

### Logo Usage

```tsx
// Dynamic logo with fallback
{settings.logoUrl ? (
  <img src={settings.logoUrl} alt="ELOPAY" className="h-10 w-10 rounded-xl" />
) : (
  <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
    <Zap className="h-5 w-5 text-primary-foreground" />
  </div>
)}
```

### Gateway Name Display

```tsx
// Always use fallback to ELOPAY
const gatewayName = settings.gatewayName || 'ELOPAY';
```

---

## 7. File & Code References

### Key Configuration Files

| File | Purpose |
|------|---------|
| `src/hooks/useGatewaySettings.tsx` | Central branding settings hook |
| `src/pages/admin/sdk/*.tsx` | SDK documentation pages |
| `src/components/DashboardLayout.tsx` | Sidebar navigation labels |
| `src/pages/merchant/MerchantDocumentation.tsx` | Merchant API docs |

### Database Tables

| Table | Branding Fields |
|-------|-----------------|
| `admin_settings` | `gateway_name`, `logo_url`, `favicon_url` |
| `payment_gateways` | `gateway_name`, `gateway_type`, `gateway_code` |

### Edge Functions

| Function | Gateway Logic |
|----------|---------------|
| `payin` | Signature verification by gateway type |
| `payout` | Regional withdrawal code mapping |
| `process-payout` | ELOPAY payout processing |
| `payment-link-pay` | Dynamic gateway routing |

---

## 8. Sidebar Navigation Labels

### Admin Portal - SDK Documentation

```
SDK Documentation
├── ELOPAYGATEWAY_INR  → /admin/sdk/hyperpay-inr
├── ELOPAY_INR         → /admin/sdk/hypersofts-inr
├── ELOPAY_PKR         → /admin/sdk/hypersofts-pkr
└── ELOPAY_BDT         → /admin/sdk/hypersofts-bdt
```

---

## 9. Legacy Mapping Reference

When migrating or maintaining legacy code:

| Legacy Name | New Brand Name |
|-------------|----------------|
| PayGate | ELOPAY |
| Payment Gateway | ELOPAY |
| LG Pay | ELOPAY |
| HYPER SOFTS | ELOPAY |
| BondPay | ELOPAYGATEWAY |
| HYPER PAY | ELOPAYGATEWAY |
| lgpay (type) | hypersofts |
| bondpay (type) | hyperpay |

---

## 10. Internationalization

### Supported Languages
- English (en) - Default for new users
- Chinese (zh) - Default system language

### Branded Translations

| Key | English | Chinese |
|-----|---------|---------|
| Brand | ELOPAY | ELOPAY |
| Tagline | Payment Gateway Solution | 支付网关解决方案 |
| Secure Payment | Powered by ELOPAY | 由 ELOPAY 提供支持 |

---

## 11. Implementation Checklist

When adding new pages or components:

- [ ] Import `useGatewaySettings` hook for dynamic branding
- [ ] Use `settings.gatewayName || 'ELOPAY'` for display name
- [ ] Use semantic color tokens (never hardcode colors)
- [ ] Include bilingual support (en/zh)
- [ ] Add consistent header with logo/name
- [ ] Include footer with copyright
- [ ] Test both light and dark themes

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2024 | Initial ELOPAY branding guide |

---

*This document is maintained as part of the ELOPAY payment gateway system.*
