<?php
/**
 * ELOPAY BDT - Nagad: Payment Callback Handler
 * Signature Algorithm: ASCII-sorted MD5 (uppercase)
 */

$config = include __DIR__ . '/config.php';

$postData = $_POST;
file_put_contents($config['LOG_FILE'], date('c') . " | CALLBACK | " . json_encode($postData) . "\n", FILE_APPEND);

$status         = $postData['status'] ?? '';
$merchantOrderNo = $postData['merchant_order_no'] ?? '';
$sign           = $postData['sign'] ?? '';

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
    file_put_contents($config['LOG_FILE'], date('c') . " | SIGNATURE_MISMATCH\n", FILE_APPEND);
    echo "FAIL";
    exit;
}

if ($status == '1' || $status == 'success') {
    // TODO: Credit user wallet, update order status
    file_put_contents($config['LOG_FILE'], date('c') . " | SUCCESS | order={$merchantOrderNo}\n", FILE_APPEND);
    echo "SUCCESS";
} else {
    echo "FAIL";
}
