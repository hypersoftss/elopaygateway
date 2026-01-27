# ELOPAY SDK Integration Guide

Easy-to-use SDK for integrating ELOPAY payment gateway APIs.

## 🚀 Quick Start (3 Simple Steps)

### Step 1: Get Your Credentials
From your Merchant Dashboard → API Documentation:
- **Merchant ID** - Your unique account number
- **API Key** - For collecting payments (Pay-in)
- **Payout Key** - For sending payments (Pay-out)

### Step 2: Install SDK
```bash
# Node.js / npm
npm install js-md5

# Browser - add to your HTML
<script src="https://cdn.jsdelivr.net/npm/js-md5@0.8.3/src/md5.min.js"></script>
<script src="paygate-sdk.js"></script>
```

### Step 3: Initialize
```javascript
const sdk = new PayGateSDK({
  merchantId: 'YOUR_MERCHANT_ID',
  apiKey: 'YOUR_API_KEY',
  payoutKey: 'YOUR_PAYOUT_KEY',
  baseUrl: 'https://your-gateway.com/functions/v1'
});
```

---

## 💳 Pay-in (Collect Payments)

### India (INR) - UPI
```javascript
const result = await sdk.createPayin({
  amount: '500.00',
  orderNo: 'ORDER_' + Date.now(),
  callbackUrl: 'https://yoursite.com/callback'
});

// Redirect customer to payment page
window.location.href = result.data.payment_url;
```

### Pakistan (PKR) - Easypaisa/JazzCash
```javascript
const result = await sdk.createPayin({
  amount: '5000.00',
  orderNo: 'ORDER_' + Date.now(),
  callbackUrl: 'https://yoursite.com/callback',
  tradeType: 'easypaisa'  // or 'jazzcash'
});
```

### Bangladesh (BDT) - Nagad/bKash
```javascript
const result = await sdk.createPayin({
  amount: '2000.00',
  orderNo: 'ORDER_' + Date.now(),
  callbackUrl: 'https://yoursite.com/callback',
  tradeType: 'nagad'  // or 'bkash'
});
```

### Response
```json
{
  "code": 200,
  "success": true,
  "data": {
    "order_no": "PI1737569847123ABC",
    "payment_url": "https://pay.gateway.com/...",
    "amount": 500.00,
    "fee": 60.00,
    "net_amount": 440.00,
    "status": "pending"
  }
}
```

---

## 💸 Pay-out (Send Payments)

### India (INR) - Bank Transfer
```javascript
const result = await sdk.createPayout({
  amount: 1500,
  transactionId: 'TXN_' + Date.now(),
  accountNumber: '1234567890',
  ifsc: 'HDFC0001234',
  name: 'Rahul Sharma',
  bankName: 'HDFC Bank',
  callbackUrl: 'https://yoursite.com/payout-callback'
});
```

### Pakistan (PKR) - Easypaisa/JazzCash
```javascript
const result = await sdk.createPayout({
  amount: 5000,
  transactionId: 'TXN_' + Date.now(),
  accountNumber: '03001234567',  // Mobile number
  name: 'Muhammad Ali',
  withdrawalMethod: 'easypaisa', // or 'jazzcash'
  callbackUrl: 'https://yoursite.com/payout-callback'
});
```

### Bangladesh (BDT) - Nagad/bKash
```javascript
const result = await sdk.createPayout({
  amount: 2000,
  transactionId: 'TXN_' + Date.now(),
  accountNumber: '01712345678',  // Mobile number
  name: 'Rahim Ahmed',
  callbackUrl: 'https://yoursite.com/payout-callback'
});
```

---

## 🔔 Callback Handling

Your callback URL will receive POST requests when payment status changes.

### Express.js Example
```javascript
app.post('/callback', express.json(), async (req, res) => {
  const { sign, ...data } = req.body;
  
  // Step 1: Verify signature
  const isValid = await sdk.verifyPayinCallback(data, sign);
  if (!isValid) {
    return res.status(400).send('Invalid signature');
  }
  
  // Step 2: Process the callback
  if (data.status === 'success') {
    // Payment successful - deliver product/service
    await updateOrderStatus(data.merchant_order_no, 'paid');
  } else if (data.status === 'failed') {
    // Payment failed
    await updateOrderStatus(data.merchant_order_no, 'failed');
  }
  
  // Step 3: Return "ok" to acknowledge
  res.send('ok');
});
```

### Callback Data
```json
{
  "order_no": "PI1737569847123ABC",
  "merchant_order_no": "ORDER_123",
  "amount": "500.00",
  "status": "success",
  "timestamp": "2024-01-23T12:00:00Z",
  "sign": "abc123..."
}
```

---

## 🔐 Signature Generation

### For INR (Standard MD5)
```javascript
// Pay-in
sign = md5(merchant_id + amount + order_no + api_key + callback_url)

// Pay-out
sign = md5(account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payout_key)
```

### For PKR/BDT (ASCII Sorted MD5)
```javascript
function generateSignature(params, secretKey) {
  // 1. Remove empty values and 'sign' key
  const filtered = Object.entries(params)
    .filter(([k, v]) => v !== '' && v != null && k !== 'sign');
  
  // 2. Sort by ASCII (a-z, A-Z, 0-9)
  filtered.sort(([a], [b]) => a.localeCompare(b));
  
  // 3. Create query string
  const queryString = filtered
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  
  // 4. Append key and hash
  return md5(queryString + '&key=' + secretKey).toUpperCase();
}
```

---

## 📊 Status Codes

| Status | Description |
|--------|-------------|
| `pending` | Payment initiated, waiting for customer |
| `success` | Payment completed successfully |
| `failed` | Payment failed or expired |

---

## ⚠️ Important Notes

1. **Always verify signatures** before processing callbacks
2. **Handle callbacks idempotently** - same callback may be sent multiple times
3. **Respond within 3 seconds** with plain text "ok"
4. **Use HTTPS** for all callback URLs
5. **Store order_no** for tracking and support

---

## 🆘 Error Handling

```javascript
try {
  const result = await sdk.createPayin({...});
  if (result.success) {
    // Success - redirect to payment
    window.location.href = result.data.payment_url;
  }
} catch (error) {
  console.error('Payment error:', error.message);
  // Show user-friendly error message
}
```

### Common Error Codes
| Code | Meaning |
|------|---------|
| 400 | Invalid parameters |
| 401 | Invalid signature |
| 403 | Merchant not active |
| 429 | Rate limit exceeded |
| 500 | Server error |

---

## 📞 Support

For API credentials and technical support, contact your gateway administrator.
