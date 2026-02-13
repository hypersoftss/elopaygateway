<?php
/**
 * ELOPAY INR - UPI/USDT: Payment Callback Handler
 * Signature Algorithm: ASCII-sorted MD5 (uppercase)
 */

$config = include __DIR__ . '/config.php';

$postData = $_POST;
file_put_contents($config['LOG_FILE'], date('c') . " | CALLBACK | " . json_encode($postData) . "\n", FILE_APPEND);

function verifyEloPaySignature($params, $secretKey) {
    $receivedSign = $params['sign'] ?? '';
    $filtered = array_filter($params, function($v, $k) {
        return $k !== 'sign' && $v !== '' && $v !== null;
    }, ARRAY_FILTER_USE_BOTH);
    ksort($filtered);
    $parts = [];
    foreach ($filtered as $k => $v) {
        $parts[] = $k . '=' . $v;
    }
    return $receivedSign === strtoupper(md5(implode('&', $parts) . '&key=' . $secretKey));
}

if (!verifyEloPaySignature($postData, $config['API_KEY'])) {
    echo "FAIL";
    exit;
}

$status = $postData['status'] ?? '';
$merchantOrderNo = $postData['merchant_order_no'] ?? '';

if ($status == '1' || $status == 'success') {
    // TODO: Credit user wallet, update order status
    echo "SUCCESS";
} else {
    echo "FAIL";
}
