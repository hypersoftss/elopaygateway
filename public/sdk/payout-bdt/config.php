<?php
/**
 * ELOPAY BDT - Payout Configuration
 * Gateway: ELOPAY Bangladesh (Nagad/bKash)
 * Signature: md5(account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payout_key)
 */

return [
    'API_URL'       => 'https://api.elopaygateway.in/api/payout',
    'MERCHANT_ID'   => 'YOUR_MERCHANT_ID',   // Your Merchant ID (Account Number from dashboard)
    'PAYOUT_KEY'    => 'YOUR_PAYOUT_KEY',    // Your Payout Key from dashboard
    'CURRENCY'      => 'BDT',

    'NOTIFY_URL'    => 'https://yourdomain.com/elopay/payout-bdt/callback.php',

    'LOG_FILE'      => __DIR__ . '/elopay_payout_bdt.log',
];
