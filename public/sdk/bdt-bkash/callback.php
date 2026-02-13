<?php
/**
 * ELOPAY BDT - bKash: Payment Callback Handler
 * This file receives payment status notifications from the gateway.
 * Signature Algorithm: ASCII-sorted MD5 (uppercase)
 */

$config = include __DIR__ . '/config.php';

// ============================================
// 1. Receive Callback Data
// ============================================
$postData = $_POST;

file_put_contents($config['LOG_FILE'], date('c') . " | CALLBACK | " . json_encode($postData) . "\n", FILE_APPEND);

$status         = $postData['status'] ?? '';
$orderNo        = $postData['order_no'] ?? '';
$merchantOrderNo = $postData['merchant_order_no'] ?? '';
$amount         = $postData['amount'] ?? '';
$sign           = $postData['sign'] ?? '';

// ============================================
// 2. Verify Signature
// ============================================
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
    $signStr = implode('&', $parts) . '&key=' . $secretKey;
    $localSign = strtoupper(md5($signStr));

    return $receivedSign === $localSign;
}

if (!verifyEloPaySignature($postData, $config['API_KEY'])) {
    file_put_contents($config['LOG_FILE'], date('c') . " | CALLBACK | SIGNATURE_MISMATCH\n", FILE_APPEND);
    echo "FAIL";
    exit;
}

// ============================================
// 3. Process Payment Result
// ============================================
if ($status == '1' || $status == 'success') {
    /**
     * Payment Successful!
     * 
     * TODO: Add your business logic here:
     * - Update order status in your database
     * - Credit user wallet: UPDATE users SET balance = balance + {amount} WHERE ...
     * - Send confirmation notification
     * 
     * Available data:
     *   $merchantOrderNo - Your original order ID
     *   $orderNo         - Gateway's order ID
     *   $amount          - Payment amount (in cents, divide by 100)
     */
    
    file_put_contents($config['LOG_FILE'], date('c') . " | CALLBACK | SUCCESS | order={$merchantOrderNo}\n", FILE_APPEND);
    echo "SUCCESS";
} else {
    file_put_contents($config['LOG_FILE'], date('c') . " | CALLBACK | FAILED | status={$status}\n", FILE_APPEND);
    echo "FAIL";
}
