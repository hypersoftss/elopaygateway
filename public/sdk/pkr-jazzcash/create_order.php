<?php
/**
 * ELOPAY PKR - JazzCash: Create Payment Order
 * Signature: md5(merchant_id + amount + merchant_order_no + api_key + callback_url)
 */

$config = include __DIR__ . '/config.php';

function generateSignature($merchantId, $amount, $orderNo, $apiKey, $callbackUrl) {
    return md5($merchantId . $amount . $orderNo . $apiKey . $callbackUrl);
}

$amount = isset($_GET['amount']) ? number_format((float)$_GET['amount'], 2, '.', '') : '0.00';
if ((float)$amount < 1.00) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['status' => false, 'message' => 'Amount must be >= 1.00']);
    exit;
}

$orderNo = isset($_GET['order_id']) ? $_GET['order_id'] : 'ORD_' . date('Ymd') . '_' . time() . '_' . random_int(1000, 9999);

ob_start();
include __DIR__ . '/../_loading.php';
ob_end_flush();
if (function_exists('ob_flush')) ob_flush();
flush();

$signature = generateSignature(
    $config['MERCHANT_ID'], $amount, $orderNo, $config['API_KEY'], $config['NOTIFY_URL']
);

$payload = [
    'merchant_id'       => $config['MERCHANT_ID'],
    'amount'            => $amount,
    'merchant_order_no' => $orderNo,
    'callback_url'      => $config['NOTIFY_URL'],
    'sign'              => $signature,
    'trade_type'        => $config['TRADE_TYPE'],
];

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
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

@file_put_contents($config['LOG_FILE'], date('c') . " | CREATE | HTTP={$httpCode} | REQ=" . json_encode($payload) . " | RES={$response}\n", FILE_APPEND);

if ($curlErr) { echo "<script>document.getElementById('status-text').textContent='Gateway error';document.getElementById('spinner').style.display='none';</script>"; exit; }
if (empty($response)) { echo "<script>document.getElementById('status-text').textContent='Empty response';document.getElementById('spinner').style.display='none';</script>"; exit; }
$result = json_decode($response, true);
if ($result === null) { echo "<script>document.getElementById('status-text').textContent='Invalid response';document.getElementById('spinner').style.display='none';</script>"; exit; }

if ($httpCode >= 200 && $httpCode < 300 && !empty($result['success']) && !empty($result['data']['payment_url'])) {
    $url = $result['data']['payment_url'];
    echo "<script>document.getElementById('status-text').textContent='Redirecting to payment...';setTimeout(function(){window.location.replace(" . json_encode($url) . ");},500);</script>";
} else {
    $msg = $result['message'] ?? 'Failed to create order';
    echo "<script>document.getElementById('status-text').textContent=" . json_encode($msg) . ";document.getElementById('spinner').style.display='none';</script>";
}
