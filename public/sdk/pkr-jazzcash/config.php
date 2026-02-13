<?php
/**
 * ELOPAY PKR - JazzCash Configuration
 * Gateway: ELOPAY Pakistan (JazzCash)
 * Signature: ASCII-sorted MD5 (uppercase)
 */

return [
    'API_URL'       => 'https://YOUR_GATEWAY_BASE_URL/api/order/create',
    'APP_ID'        => 'YOUR_APP_ID',
    'API_KEY'       => 'YOUR_API_KEY',
    'TRADE_TYPE'    => 'PKRPH',              // JazzCash deposit trade type
    'CURRENCY'      => 'PKR',

    'NOTIFY_URL'    => 'https://yourdomain.com/elopay/pkr-jazzcash/callback.php',
    'RETURN_URL'    => 'https://yourdomain.com/payment-success',

    'LOG_FILE'      => '/tmp/elopay_pkr_jazzcash.log',
];
