<?php
/**
 * ELOPAY BDT - Nagad Configuration
 * Gateway: ELOPAY Bangladesh (Nagad)
 * Signature: ASCII-sorted MD5 (uppercase)
 */

return [
    'API_URL'       => 'https://YOUR_GATEWAY_BASE_URL/api/order/create',
    'APP_ID'        => 'YOUR_APP_ID',
    'API_KEY'       => 'YOUR_API_KEY',
    'TRADE_TYPE'    => 'nagad',              // Fixed: Nagad method
    'CURRENCY'      => 'BDT',

    'NOTIFY_URL'    => 'https://yourdomain.com/elopay/bdt-nagad/callback.php',
    'RETURN_URL'    => 'https://yourdomain.com/payment-success',

    'LOG_FILE'      => '/tmp/elopay_bdt_nagad.log',
];
