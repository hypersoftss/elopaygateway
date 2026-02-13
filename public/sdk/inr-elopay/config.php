<?php
/**
 * ELOPAY INR - UPI/USDT Configuration
 * Gateway: ELOPAY India (INRUPI / USDT)
 * Signature: ASCII-sorted MD5 (uppercase)
 * 
 * Trade Types: 'INRUPI' for UPI, 'usdt' for USDT
 */

return [
    'API_URL'       => 'https://YOUR_GATEWAY_BASE_URL/api/order/create',
    'APP_ID'        => 'YOUR_APP_ID',
    'API_KEY'       => 'YOUR_API_KEY',
    'TRADE_TYPE'    => 'INRUPI',             // Change to 'usdt' for USDT payments
    'CURRENCY'      => 'INR',

    'NOTIFY_URL'    => 'https://yourdomain.com/elopay/inr-elopay/callback.php',
    'RETURN_URL'    => 'https://yourdomain.com/payment-success',

    'LOG_FILE'      => '/tmp/elopay_inr.log',
];
