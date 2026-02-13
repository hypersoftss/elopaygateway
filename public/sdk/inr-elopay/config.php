<?php
/**
 * ELOPAY INR - UPI Configuration
 * Gateway: ELOPAY India (UPI)
 * Signature: md5(merchant_id + amount + merchant_order_no + api_key + callback_url)
 */

return [
    'API_URL'       => 'https://elopaygateway.in/api/payin',
    'MERCHANT_ID'   => 'YOUR_MERCHANT_ID',   // Your Merchant ID (Account Number from dashboard)
    'API_KEY'       => 'YOUR_API_KEY',        // Your API Key from dashboard
    'TRADE_TYPE'    => 'INRUPI',              // Change to 'usdt' for USDT payments
    'CURRENCY'      => 'INR',

    'NOTIFY_URL'    => 'https://yourdomain.com/elopay/inr-elopay/callback.php',
    'RETURN_URL'    => 'https://yourdomain.com/payment-success',

    'LOG_FILE'      => __DIR__ . '/elopay_inr.log',
];
