<?php
/**
 * ELOPAY INR - USDT Configuration
 * Gateway: ELOPAY India (USDT)
 * Signature: md5(merchant_id + amount + merchant_order_no + api_key + callback_url)
 */

return [
    'API_URL'       => 'https://elopaygateway.in/api/payin',
    'MERCHANT_ID'   => 'YOUR_MERCHANT_ID',   // Your Merchant ID (Account Number from dashboard)
    'API_KEY'       => 'YOUR_API_KEY',        // Your API Key from dashboard
    'TRADE_TYPE'    => 'usdt',                // USDT payment method
    'CURRENCY'      => 'INR',

    'NOTIFY_URL'    => 'https://yourdomain.com/elopay/inr-usdt/callback.php',
    'RETURN_URL'    => 'https://yourdomain.com/payment-success',

    'LOG_FILE'      => __DIR__ . '/elopay_inr_usdt.log',
];
