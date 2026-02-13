<?php
/**
 * ELOPAY PKR - Easypaisa Configuration
 * Gateway: ELOPAY Pakistan (Easypaisa)
 * Signature: md5(merchant_id + amount + merchant_order_no + api_key + callback_url)
 */

return [
    'API_URL'       => 'https://elopaygateway.in/api/payin',
    'MERCHANT_ID'   => 'YOUR_MERCHANT_ID',   // Your Merchant ID (Account Number from dashboard)
    'API_KEY'       => 'YOUR_API_KEY',        // Your API Key from dashboard
    'TRADE_TYPE'    => 'PKRPH-EASY',          // Easypaisa deposit trade type
    'CURRENCY'      => 'PKR',

    'NOTIFY_URL'    => 'https://yourdomain.com/elopay/pkr-easypaisa/callback.php',
    'RETURN_URL'    => 'https://yourdomain.com/payment-success',

    'LOG_FILE'      => __DIR__ . '/elopay_pkr_easypaisa.log',
];
