<?php
/**
 * ELOPAY PKR - JazzCash: Create Payment Order
 * Signature Algorithm: ASCII-sorted MD5 (uppercase)
 */

header('Content-Type: application/json; charset=utf-8');
$config = include __DIR__ . '/config.php';

function generateEloPaySignature($params, $secretKey) {
    $filtered = array_filter($params, function($v, $k) {
        return $k !== 'sign' && $v !== '' && $v !== null;
    }, ARRAY_FILTER_USE_BOTH);
    ksort($filtered);
    $parts = [];
    foreach ($filtered as $k => $v) {
        $parts[] = $k . '=' . $v;
    }
    return strtoupper(md5(implode('&', $parts) . '&key=' . $secretKey));
}

$amount = isset($_GET['amount']) ? number_format((float)$_GET['amount'], 2, '.', '') : '0.00';
if ((float)$amount < 1.00) {
    echo json_encode(['status' => false, 'message' => 'Amount must be >= 1.00']);
    exit;
}

$orderNo = isset($_GET['order_id']) ? $_GET['order_id'] : 'ORD_' . date('Ymd') . '_' . time() . '_' . random_int(1000, 9999);

$params = [
    'app_id'            => $config['APP_ID'],
    'amount'            => (string)((int)((float)$amount * 100)),
    'merchant_order_no' => $orderNo,
    'trade_type'        => $config['TRADE_TYPE'],
    'notify_url'        => $config['NOTIFY_URL'],
];
$params['sign'] = generateEloPaySignature($params, $config['API_KEY']);

$ch = curl_init();
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
curl_setopt($ch, CURLOPT_URL, $config['API_URL']);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
curl_setopt($ch, CURLOPT_TIMEOUT, 25);
$response = curl_exec($ch);
$curlErr = curl_error($ch);
curl_close($ch);

file_put_contents($config['LOG_FILE'], date('c') . " | CREATE | {$response}\n", FILE_APPEND);

if ($curlErr) {
    echo json_encode(['status' => false, 'message' => 'Gateway error', 'debug' => $curlErr]);
    exit;
}

$result = json_decode($response, true);

if (isset($result['status']) && $result['status'] == 1 && !empty($result['payment_url'])) {
    header('Location: ' . $result['payment_url']);
    exit;
} else {
    echo json_encode(['status' => false, 'message' => $result['message'] ?? 'Failed', 'debug' => $result]);
}
