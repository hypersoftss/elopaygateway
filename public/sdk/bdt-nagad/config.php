<?php
/**
 * ELOPAY BDT - Nagad Configuration
 * Gateway: ELOPAY Bangladesh (Nagad)
 * Signature: md5(merchant_id + amount + merchant_order_no + api_key + callback_url)
 */

return [
    'API_URL'       => 'https://elopaygateway.in/api/payin',
    'MERCHANT_ID'   => 'YOUR_MERCHANT_ID',   // Your Merchant ID (Account Number from dashboard)
    'API_KEY'       => 'YOUR_API_KEY',        // Your API Key from dashboard
    'TRADE_TYPE'    => 'nagad',               // Fixed: Nagad method
    'CURRENCY'      => 'BDT',

    'NOTIFY_URL'    => 'https://yourdomain.com/elopay/bdt-nagad/callback.php',
    'RETURN_URL'    => 'https://yourdomain.com/payment-success',

    'LOG_FILE'      => __DIR__ . '/elopay_bdt_nagad.log',
];
