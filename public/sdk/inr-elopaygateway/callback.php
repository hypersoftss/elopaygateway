<?php
/**
 * ELOPAYGATEWAY INR: Payment Callback Handler
 * Signature Algorithm: Standard MD5
 * Formula: md5(order_id + amount + secret_key)
 */

$config = include __DIR__ . '/config.php';

// ============================================
// 1. Receive Callback Data
// ============================================
$status   = $_POST['status'] ?? '';
$orderId  = $_POST['order_id'] ?? '';
$amount   = $_POST['amount'] ?? '';
$sign     = $_POST['sign'] ?? '';
$currency = $_POST['currency'] ?? '';

file_put_contents($config['LOG_FILE'], date('c') . " | CALLBACK | " . json_encode($_POST) . "\n", FILE_APPEND);

// ============================================
// 2. Verify Signature
// ============================================
$localSign = md5($orderId . $amount . $config['API_KEY']);

if ($sign !== $localSign) {
    file_put_contents($config['LOG_FILE'], date('c') . " | SIGNATURE_MISMATCH\n", FILE_APPEND);
    echo "FAIL";
    exit;
}

// ============================================
// 3. Process Payment Result
// ============================================
if ($status == 'success') {
    /**
     * Payment Successful!
     * 
     * TODO: Add your business logic here:
     * - Update order status in your database
     * - Credit user wallet
     * - Send confirmation notification
     */
    file_put_contents($config['LOG_FILE'], date('c') . " | SUCCESS | order={$orderId} amount={$amount}\n", FILE_APPEND);
    echo "SUCCESS";
} else {
    file_put_contents($config['LOG_FILE'], date('c') . " | FAILED | status={$status}\n", FILE_APPEND);
    echo "FAIL";
}
