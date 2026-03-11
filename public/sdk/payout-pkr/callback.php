<?php
/**
 * ELOPAY PKR - Payout Callback Handler
 * Receives payout status notifications from gateway
 */

$config = include __DIR__ . '/config.php';

$postData = $_POST;
@file_put_contents($config['LOG_FILE'], date('c') . " | PAYOUT_CALLBACK | " . json_encode($postData) . "\n", FILE_APPEND);

$status          = $postData['status'] ?? '';
$orderNo         = $postData['order_no'] ?? '';
$merchantOrderNo = $postData['merchant_order_no'] ?? '';
$amount          = $postData['amount'] ?? '';

if ($status == '1' || $status == 'success') {
    @file_put_contents($config['LOG_FILE'], date('c') . " | PAYOUT_SUCCESS | order={$merchantOrderNo}\n", FILE_APPEND);
    echo "SUCCESS";
} else {
    @file_put_contents($config['LOG_FILE'], date('c') . " | PAYOUT_FAILED | status={$status}\n", FILE_APPEND);
    echo "FAIL";
}
