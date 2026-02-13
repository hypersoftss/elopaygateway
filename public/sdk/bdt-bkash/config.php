<?php
/**
 * ELOPAY BDT - bKash Configuration
 * Gateway: ELOPAY Bangladesh (bKash)
 * Signature: ASCII-sorted MD5 (uppercase)
 */

return [
    // === API Settings ===
    'API_URL'       => 'https://YOUR_GATEWAY_BASE_URL/api/order/create',
    'APP_ID'        => 'YOUR_APP_ID',        // Provided by ELOPAY admin
    'API_KEY'       => 'YOUR_API_KEY',        // Secret key for signature
    'TRADE_TYPE'    => 'bkash',              // Fixed: bKash method
    'CURRENCY'      => 'BDT',

    // === Callback / Notify URL ===
    'NOTIFY_URL'    => 'https://yourdomain.com/elopay/bdt-bkash/callback.php',
    'RETURN_URL'    => 'https://yourdomain.com/payment-success',

    // === Logging ===
    'LOG_FILE'      => '/tmp/elopay_bdt_bkash.log',
];
