<?php
/**
 * ELOPAY Payment Gateway Module for WHMCS
 *
 * @see https://developers.whmcs.com/payment-gateways/
 */

if (!defined("WHMCS")) {
    die("This file cannot be accessed directly");
}

/**
 * Module metadata
 */
function elopay_MetaData()
{
    return [
        'DisplayName' => 'ELOPAY Gateway',
        'APIVersion'  => '1.1',
    ];
}

/**
 * Gateway configuration fields shown in WHMCS admin
 */
function elopay_config()
{
    return [
        'FriendlyName' => [
            'Type'  => 'System',
            'Value' => 'ELOPAY Gateway',
        ],
        'merchantId' => [
            'FriendlyName' => 'Merchant ID',
            'Type'         => 'text',
            'Size'         => '30',
            'Description'  => 'Your ELOPAY Merchant ID (Account Number)',
        ],
        'apiKey' => [
            'FriendlyName' => 'API Key',
            'Type'         => 'password',
            'Size'         => '60',
            'Description'  => 'Your ELOPAY API Key (Pay-in)',
        ],
        'payoutKey' => [
            'FriendlyName' => 'Payout Key',
            'Type'         => 'password',
            'Size'         => '60',
            'Description'  => 'Your ELOPAY Payout Key (optional)',
        ],
        'apiUrl' => [
            'FriendlyName' => 'API URL',
            'Type'         => 'text',
            'Size'         => '60',
            'Default'      => 'https://api.elopaygateway.in/api',
            'Description'  => 'ELOPAY API Base URL',
        ],
        'tradeType' => [
            'FriendlyName' => 'Trade Type',
            'Type'         => 'dropdown',
            'Options'      => [
                'INRUPI'    => 'INR - UPI',
                'usdt'      => 'INR - USDT',
                'bkash'     => 'BDT - bKash',
                'nagad'     => 'BDT - Nagad',
                'easypaisa' => 'PKR - Easypaisa',
                'jazzcash'  => 'PKR - JazzCash',
            ],
            'Description'  => 'Select your payment method',
        ],
        'currency' => [
            'FriendlyName' => 'Currency',
            'Type'         => 'dropdown',
            'Options'      => [
                'INR' => 'INR (Indian Rupee)',
                'BDT' => 'BDT (Bangladeshi Taka)',
                'PKR' => 'PKR (Pakistani Rupee)',
            ],
            'Default'      => 'INR',
        ],
    ];
}

/**
 * Generate payment link for invoice
 */
function elopay_link($params)
{
    $merchantId = $params['merchantId'];
    $apiKey     = $params['apiKey'];
    $apiUrl     = rtrim($params['apiUrl'], '/');
    $tradeType  = $params['tradeType'];
    $currency   = $params['currency'];

    $invoiceId  = $params['invoiceid'];
    $amount     = number_format($params['amount'], 2, '.', '');
    $orderNo    = 'WHMCS_' . $invoiceId . '_' . time();

    $callbackUrl = $params['systemurl'] . '/modules/gateways/callback/elopay.php';
    $returnUrl   = $params['returnurl'];

    $sign = md5($merchantId . $amount . $orderNo . $apiKey . $callbackUrl);

    $postData = json_encode([
        'merchant_id'       => $merchantId,
        'amount'            => $amount,
        'merchant_order_no' => $orderNo,
        'callback_url'      => $callbackUrl,
        'success_url'       => $returnUrl,
        'trade_type'        => $tradeType,
        'currency'          => $currency,
        'sign'              => $sign,
        'extra'             => (string)$invoiceId,
    ]);

    // Call API to create order
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "{$apiUrl}/payin");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $response = curl_exec($ch);
    curl_close($ch);

    $res = json_decode($response, true);

    $paymentUrl = $res['data']['payment_url']
        ?? $res['payment_url']
        ?? null;

    // Fallback: extract URL from response
    if (!$paymentUrl && preg_match('/https?:\/\/[^\s"\'<>]+/', $response, $m)) {
        $paymentUrl = $m[0];
    }

    if ($paymentUrl) {
        // Store order mapping for callback
        $pdo = \Illuminate\Database\Capsule\Manager::connection()->getPdo();
        $stmt = $pdo->prepare("INSERT INTO mod_elopay_orders (invoice_id, order_no, amount, status, created_at) VALUES (?, ?, ?, 'pending', NOW())");
        $stmt->execute([$invoiceId, $orderNo, $amount]);

        return '<a href="' . htmlspecialchars($paymentUrl) . '" class="btn btn-primary" target="_blank" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#6366f1,#06b6d4);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">💎 Pay with ELOPAY</a>';
    }

    return '<p style="color:red;">⚠️ Payment gateway error. Please try again or contact support.</p>';
}

/**
 * Module activation - create required database table
 */
function elopay_activate()
{
    try {
        $pdo = \Illuminate\Database\Capsule\Manager::connection()->getPdo();
        $pdo->exec("CREATE TABLE IF NOT EXISTS mod_elopay_orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            invoice_id INT NOT NULL,
            order_no VARCHAR(100) NOT NULL,
            amount DECIMAL(12,2) NOT NULL,
            gateway_order_no VARCHAR(100) DEFAULT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT NULL,
            INDEX idx_order_no (order_no),
            INDEX idx_invoice_id (invoice_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        return ['status' => 'success', 'description' => 'ELOPAY module activated successfully.'];
    } catch (\Exception $e) {
        return ['status' => 'error', 'description' => 'Activation failed: ' . $e->getMessage()];
    }
}

/**
 * Module deactivation
 */
function elopay_deactivate()
{
    return ['status' => 'success', 'description' => 'ELOPAY module deactivated.'];
}
