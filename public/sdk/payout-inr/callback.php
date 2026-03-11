<?php
/**
 * ELOPAY INR - Payout Callback Handler
 * Receives payout status notifications from gateway
 */

$config = include __DIR__ . '/config.php';

$postData = $_POST;
@file_put_contents($config['LOG_FILE'], date('c') . " | PAYOUT_CALLBACK | " . json_encode($postData) . "\n", FILE_APPEND);

$status          = $postData['status'] ?? '';
$orderNo         = $postData['order_no'] ?? '';
$merchantOrderNo = $postData['merchant_order_no'] ?? '';
$amount          = $postData['amount'] ?? '';

// === Process Payout Result ===
if ($status == '1' || $status == 'success') {
    /**
     * ✅ Payout Successful!
     * The money has been sent to the beneficiary's bank account.
     * 
     * Add your business logic here:
     *   - Update withdrawal status in your database
     *   - Send notification to user
     */
    @file_put_contents($config['LOG_FILE'], date('c') . " | PAYOUT_SUCCESS | order={$merchantOrderNo}\n", FILE_APPEND);
    echo "SUCCESS";
} else {
    /**
     * ❌ Payout Failed
     * Refund the amount back to user's balance in your system
     */
    @file_put_contents($config['LOG_FILE'], date('c') . " | PAYOUT_FAILED | status={$status}\n", FILE_APPEND);
    echo "FAIL";
}
