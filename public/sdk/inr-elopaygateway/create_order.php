<?php
/**
 * ELOPAYGATEWAY INR: Create Payment Order
 * Signature Algorithm: Standard MD5
 * Formula: md5(merchant_id + amount + merchant_order_no + api_key + callback_url)
 * 
 * This is the BondPay-style integration (different from ELOPAY ASCII-sorted).
 */

header('Content-Type: application/json; charset=utf-8');
$config = include __DIR__ . '/config.php';

// ============================================
// 1. Signature Generation (Standard MD5)
// ============================================
function generateEloPayGatewaySignature($merchantId, $amount, $orderNo, $apiKey, $callbackUrl) {
    $signStr = $merchantId . $amount . $orderNo . $apiKey . $callbackUrl;
    return md5($signStr);
}

// ============================================
// 2. Prepare Order Data
// ============================================
$amount = isset($_GET['amount']) ? number_format((float)$_GET['amount'], 2, '.', '') : '0.00';
if ((float)$amount < 1.00) {
    echo json_encode(['status' => false, 'message' => 'Amount must be >= 1.00']);
    exit;
}

$orderNo = isset($_GET['order_id']) ? $_GET['order_id'] : 'ORD_' . date('Ymd') . '_' . time() . '_' . random_int(1000, 9999);

$signature = generateEloPayGatewaySignature(
    $config['MERCHANT_ID'],
    $amount,
    $orderNo,
    $config['API_KEY'],
    $config['NOTIFY_URL']
);

$payload = [
    'merchant_id'       => $config['MERCHANT_ID'],
    'api_key'           => $config['API_KEY'],
    'amount'            => $amount,
    'merchant_order_no' => $orderNo,
    'callback_url'      => $config['NOTIFY_URL'],
    'extra'             => 0,
    'signature'         => $signature,
];

// ============================================
// 3. Send API Request (JSON body)
// ============================================
$ch = curl_init();
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
curl_setopt($ch, CURLOPT_URL, $config['API_URL']);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
curl_setopt($ch, CURLOPT_TIMEOUT, 25);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

file_put_contents($config['LOG_FILE'], date('c') . " | CREATE | HTTP={$httpCode} | {$response}\n", FILE_APPEND);

if ($curlErr) {
    echo json_encode(['status' => false, 'message' => 'Gateway error', 'debug' => $curlErr]);
    exit;
}

$result = json_decode($response, true);

// ============================================
// 4. Handle Response
// ============================================
if ($httpCode >= 200 && $httpCode < 300 && !empty($result['success']) && !empty($result['payment_url'])) {
    header('Location: ' . $result['payment_url']);
    exit;
} else {
    echo json_encode([
        'status'  => false,
        'message' => $result['message'] ?? 'Failed to create order',
        'debug'   => $result
    ]);
}
