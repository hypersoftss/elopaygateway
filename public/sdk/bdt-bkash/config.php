<?php
/**
 * ELOPAY BDT - bKash Configuration
 * Gateway: ELOPAY Bangladesh (bKash)
 * Signature: ASCII-sorted MD5 (uppercase)
 */

return [
    // === API Settings ===
    'API_URL'       => 'https://elopaygateway.in/api/order/create',
    'APP_ID'        => 'YOUR_APP_ID',        // Provided by ELOPAY admin
    'API_KEY'       => 'YOUR_API_KEY',        // Secret key for signature
    'TRADE_TYPE'    => 'bkash',              // Fixed: bKash method
    'CURRENCY'      => 'BDT',

    // === Callback / Notify URL ===
    'NOTIFY_URL'    => 'https://yourdomain.com/elopay/bdt-bkash/callback.php',
    'RETURN_URL'    => 'https://yourdomain.com/payment-success',

    // === Logging ===
    'LOG_FILE'      => __DIR__ . '/elopay_bdt_bkash.log',
];
