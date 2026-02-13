<?php
/**
 * ELOPAYGATEWAY INR Configuration
 * Gateway: ELOPAYGATEWAY India (Standard MD5 - BondPay style)
 * Signature: Standard MD5 (merchant_id + amount + order_no + api_key + callback_url)
 * 
 * This gateway uses a DIFFERENT signature algorithm than ELOPAY INR/PKR/BDT.
 */

return [
    'API_URL'       => 'https://elopaygateway.in/api/payin',
    'MERCHANT_ID'   => 'YOUR_MERCHANT_ID',   // Provided by ELOPAY admin
    'API_KEY'       => 'YOUR_API_KEY',        // Secret key for signature
    'CURRENCY'      => 'INR',

    'NOTIFY_URL'    => 'https://yourdomain.com/elopay/inr-elopaygateway/callback.php',
    'RETURN_URL'    => 'https://yourdomain.com/payment-success',

    'LOG_FILE'      => __DIR__ . '/elopaygateway_inr.log',
];
