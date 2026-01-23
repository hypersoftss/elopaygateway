# PayGate SDK

Simple SDK for integrating Payin and Payout APIs.

## Installation

### JavaScript (Browser)
```html
<!-- Include MD5 library (required) -->
<script src="https://cdn.jsdelivr.net/npm/js-md5@0.8.3/src/md5.min.js"></script>
<!-- Include SDK -->
<script src="paygate-sdk.js"></script>
```

### Node.js / TypeScript
```bash
# Copy paygate-sdk.ts to your project
cp paygate-sdk.ts ./src/lib/
```

## Quick Start

```javascript
const sdk = new PayGateSDK({
  merchantId: 'YOUR_MERCHANT_ID',      // Your account number
  apiKey: 'YOUR_API_KEY',              // For Payin requests
  payoutKey: 'YOUR_PAYOUT_KEY',        // For Payout requests  
  baseUrl: 'https://your-gateway/functions/v1'
});
```

## Payin (Collection)

```javascript
const result = await sdk.createPayin({
  amount: '500.00',                           // Amount in INR
  orderNo: 'ORDER_' + Date.now(),             // Unique order ID
  callbackUrl: 'https://yoursite.com/callback',
  extra: 'optional_reference'                 // Optional
});

console.log(result.data.payment_url);  // Redirect user to this URL
console.log(result.data.order_no);     // Gateway order number
```

### Payin Response
```json
{
  "code": 200,
  "success": true,
  "data": {
    "order_no": "PI1737569847123ABC",
    "merchant_order_no": "ORDER_123",
    "amount": 500.00,
    "fee": 45.00,
    "net_amount": 455.00,
    "payment_url": "https://pay.gateway.com/...",
    "status": "pending"
  }
}
```

## Payout (Disbursement)

```javascript
const result = await sdk.createPayout({
  amount: 1500,                              // Amount in INR
  transactionId: 'TXN_' + Date.now(),        // Your unique ID
  accountNumber: '1234567890',               // Bank account
  ifsc: 'HDFC0001234',                       // IFSC code
  name: 'Account Holder Name',               // Beneficiary name
  bankName: 'HDFC Bank',                     // Bank name
  callbackUrl: 'https://yoursite.com/payout-callback'
});

console.log(result.data.order_no);     // Gateway order number
console.log(result.data.status);       // 'pending' - waiting for approval
```

### Payout Response
```json
{
  "code": 200,
  "success": true,
  "data": {
    "order_no": "PO1737569847123XYZ",
    "fee": 60.00,
    "total_amount": 1560.00,
    "status": "pending"
  }
}
```

## Callback Verification

When receiving callbacks, verify the signature:

```javascript
// Payin callback
app.post('/callback', (req, res) => {
  const { sign, ...data } = req.body;
  
  if (sdk.verifyPayinCallback(data, sign)) {
    // Valid callback - update order status
    console.log('Order:', data.order_no, 'Status:', data.status);
    res.send('OK');
  } else {
    res.status(400).send('Invalid signature');
  }
});

// Payout callback
app.post('/payout-callback', (req, res) => {
  const { sign, ...data } = req.body;
  
  if (sdk.verifyPayoutCallback(data, sign)) {
    console.log('Payout:', data.order_no, 'Status:', data.status);
    res.send('OK');
  } else {
    res.status(400).send('Invalid signature');
  }
});
```

## Signature Formula

### Payin
```
sign = md5(merchant_id + amount + merchant_order_no + api_key + callback_url)
```

### Payout
```
sign = md5(account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payout_key)
```

## Error Handling

```javascript
try {
  const result = await sdk.createPayin({...});
  // Handle success
} catch (error) {
  console.error('Payment failed:', error.message);
}
```

## Status Codes

| Status | Description |
|--------|-------------|
| pending | Payment initiated, waiting |
| success | Payment completed |
| failed | Payment failed |

## Support

Contact your gateway administrator for API credentials and support.
