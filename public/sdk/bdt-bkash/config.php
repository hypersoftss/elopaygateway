<?php
/**
 * ELOPAY BDT - bKash Configuration
 * Gateway: ELOPAY Bangladesh (bKash)
 * Signature: md5(merchant_id + amount + merchant_order_no + api_key + callback_url)
 */

return [
    // === API Settings ===
    'API_URL'       => 'https://elopaygateway.in/api/payin',
    'MERCHANT_ID'   => 'YOUR_MERCHANT_ID',   // Your Merchant ID (Account Number from dashboard)
    'API_KEY'       => 'YOUR_API_KEY',        // Your API Key from dashboard
    'TRADE_TYPE'    => 'bkash',               // Fixed: bKash method
    'CURRENCY'      => 'BDT',

    // === Callback / Notify URL ===
    'NOTIFY_URL'    => 'https://yourdomain.com/elopay/bdt-bkash/callback.php',
    'RETURN_URL'    => 'https://yourdomain.com/payment-success',

    // === Logging ===
    'LOG_FILE'      => __DIR__ . '/elopay_bdt_bkash.log',
];
