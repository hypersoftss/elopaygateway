<?php
/**
 * ELOPAY BDT - bKash: Create Payment Order
 * Signature Algorithm: ASCII-sorted MD5 (uppercase)
 * 
 * Required GET params: amount
 * Optional GET params: order_id (auto-generated if not provided)
 */

header('Content-Type: application/json; charset=utf-8');

$config = include __DIR__ . '/config.php';

// ============================================
// 1. Signature Generation (ASCII-sorted MD5)
// ============================================
function generateEloPaySignature($params, $secretKey) {
    // Remove empty values and 'sign' field
    $filtered = array_filter($params, function($v, $k) {
        return $k !== 'sign' && $v !== '' && $v !== null;
    }, ARRAY_FILTER_USE_BOTH);

    // Sort by key (ASCII order)
    ksort($filtered);

    // Build query string: key1=value1&key2=value2&...&key=SECRET
    $parts = [];
    foreach ($filtered as $k => $v) {
        $parts[] = $k . '=' . $v;
    }
    $signStr = implode('&', $parts) . '&key=' . $secretKey;

    // MD5 + uppercase
    return strtoupper(md5($signStr));
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

$params = [
    'app_id'            => $config['APP_ID'],
    'amount'            => (string)((int)((float)$amount * 100)), // Convert to cents
    'merchant_order_no' => $orderNo,
    'trade_type'        => $config['TRADE_TYPE'],
    'notify_url'        => $config['NOTIFY_URL'],
];

// Generate signature
$params['sign'] = generateEloPaySignature($params, $config['API_KEY']);

// ============================================
// 3. Send API Request
// ============================================
$ch = curl_init();
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
curl_setopt($ch, CURLOPT_URL, $config['API_URL']);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
curl_setopt($ch, CURLOPT_TIMEOUT, 25);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

// Log
file_put_contents($config['LOG_FILE'], date('c') . " | CREATE_ORDER | HTTP={$httpCode} | {$response}\n", FILE_APPEND);

if ($curlErr) {
    echo json_encode(['status' => false, 'message' => 'Gateway error', 'debug' => $curlErr]);
    exit;
}

$result = json_decode($response, true);

// ============================================
// 4. Handle Response
// ============================================
if (isset($result['status']) && $result['status'] == 1 && !empty($result['payment_url'])) {
    // Success - redirect user to payment page
    header('Location: ' . $result['payment_url']);
    exit;
} else {
    echo json_encode([
        'status'  => false,
        'message' => $result['message'] ?? 'Failed to create order',
        'debug'   => $result
    ]);
}
