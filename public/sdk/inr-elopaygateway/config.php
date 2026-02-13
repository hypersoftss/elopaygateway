<?php
/**
 * ELOPAYGATEWAY INR Configuration
 * Gateway: ELOPAY India (Standard)
 * Signature: md5(merchant_id + amount + merchant_order_no + api_key + callback_url)
 */

return [
    'API_URL'       => 'https://elopaygateway.in/api/payin',
    'MERCHANT_ID'   => 'YOUR_MERCHANT_ID',   // Your Merchant ID (Account Number from dashboard)
    'API_KEY'       => 'YOUR_API_KEY',        // Your API Key from dashboard
    'CURRENCY'      => 'INR',

    'NOTIFY_URL'    => 'https://yourdomain.com/elopay/inr-elopaygateway/callback.php',
    'RETURN_URL'    => 'https://yourdomain.com/payment-success',

    'LOG_FILE'      => __DIR__ . '/elopaygateway_inr.log',
];
