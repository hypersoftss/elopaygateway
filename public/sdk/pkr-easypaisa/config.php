<?php
/**
 * ELOPAY PKR - Easypaisa Configuration
 * Gateway: ELOPAY Pakistan (Easypaisa)
 * Signature: ASCII-sorted MD5 (uppercase)
 */

return [
    'API_URL'       => 'https://YOUR_GATEWAY_BASE_URL/api/order/create',
    'APP_ID'        => 'YOUR_APP_ID',
    'API_KEY'       => 'YOUR_API_KEY',
    'TRADE_TYPE'    => 'PKRPH-EASY',         // Easypaisa deposit trade type
    'CURRENCY'      => 'PKR',

    'NOTIFY_URL'    => 'https://yourdomain.com/elopay/pkr-easypaisa/callback.php',
    'RETURN_URL'    => 'https://yourdomain.com/payment-success',

    'LOG_FILE'      => '/tmp/elopay_pkr_easypaisa.log',
];
