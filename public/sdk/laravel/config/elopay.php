<?php

return [

    /*
    |--------------------------------------------------------------------------
    | ELOPAY Gateway Configuration
    |--------------------------------------------------------------------------
    |
    | Configure your ELOPAY payment gateway credentials here.
    | Get your credentials from the ELOPAY Merchant Dashboard.
    |
    */

    'api_url'       => env('ELOPAY_API_URL', 'https://api.elopaygateway.in/api'),
    'merchant_id'   => env('ELOPAY_MERCHANT_ID', ''),
    'api_key'       => env('ELOPAY_API_KEY', ''),
    'payout_key'    => env('ELOPAY_PAYOUT_KEY', ''),
    'trade_type'    => env('ELOPAY_TRADE_TYPE', 'INRUPI'),
    'currency'      => env('ELOPAY_CURRENCY', 'INR'),

    'callback_url'  => env('ELOPAY_CALLBACK_URL', ''),
    'return_url'    => env('ELOPAY_RETURN_URL', ''),

];
