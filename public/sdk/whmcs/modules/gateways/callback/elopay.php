<?php
/**
 * ELOPAY Callback Handler for WHMCS
 *
 * Processes payment notifications from ELOPAY gateway
 * URL: /modules/gateways/callback/elopay.php
 */

require_once __DIR__ . '/../../../init.php';
require_once __DIR__ . '/../../../includes/gatewayfunctions.php';
require_once __DIR__ . '/../../../includes/invoicefunctions.php';

$gatewayModuleName = 'elopay';
$gatewayParams = getGatewayVariables($gatewayModuleName);

if (!$gatewayParams['type']) {
    die("Module Not Activated");
}

// Read callback data
$post = $_POST;
if (empty($post)) {
    $raw = file_get_contents('php://input');
    if (!empty($raw)) {
        $post = json_decode($raw, true);
        if (!is_array($post)) {
            $post = [];
            parse_str($raw, $post);
        }
    }
}
if (empty($post)) {
    $post = $_GET;
}

$merchantOrderNo = $post['merchant_order_no'] ?? '';
$status          = strtolower($post['status'] ?? '');
$amount          = $post['amount'] ?? 0;
$gatewayOrderNo  = $post['order_no'] ?? '';
$invoiceId       = $post['extra'] ?? '';

// Log callback
logTransaction($gatewayModuleName, json_encode($post), $status);

// Verify signature
$apiKey = $gatewayParams['apiKey'];
$receivedSign = $post['sign'] ?? '';

$filtered = array_filter($post, function ($v, $k) {
    return $k !== 'sign' && $v !== '' && $v !== null;
}, ARRAY_FILTER_USE_BOTH);
ksort($filtered);
$parts = [];
foreach ($filtered as $k => $v) {
    $parts[] = "{$k}={$v}";
}
$expectedSign = strtoupper(md5(implode('&', $parts) . '&key=' . $apiKey));

if (!hash_equals($expectedSign, $receivedSign)) {
    logTransaction($gatewayModuleName, "SIGNATURE MISMATCH", "Invalid Signature");
    die("FAIL");
}

// Resolve invoice ID from order mapping if not in extra
if (empty($invoiceId)) {
    $pdo = \Illuminate\Database\Capsule\Manager::connection()->getPdo();
    $stmt = $pdo->prepare("SELECT invoice_id FROM mod_elopay_orders WHERE order_no = ? LIMIT 1");
    $stmt->execute([$merchantOrderNo]);
    $row = $stmt->fetch(\PDO::FETCH_ASSOC);
    $invoiceId = $row['invoice_id'] ?? '';
}

if (empty($invoiceId)) {
    logTransaction($gatewayModuleName, "No invoice found for: {$merchantOrderNo}", "Error");
    die("FAIL");
}

// Validate invoice exists
$invoiceId = checkCbInvoiceID($invoiceId, $gatewayModuleName);

// Check for duplicate
checkCbTransID($gatewayOrderNo);

if (in_array($status, ['1', 'success', 'paid', 'completed'])) {
    // Mark invoice as paid
    addInvoicePayment(
        $invoiceId,
        $gatewayOrderNo,
        $amount,
        0, // fee
        $gatewayModuleName
    );

    // Update order status
    try {
        $pdo = \Illuminate\Database\Capsule\Manager::connection()->getPdo();
        $stmt = $pdo->prepare("UPDATE mod_elopay_orders SET status = 'success', gateway_order_no = ?, updated_at = NOW() WHERE order_no = ?");
        $stmt->execute([$gatewayOrderNo, $merchantOrderNo]);
    } catch (\Exception $e) {
        // silent
    }

    logTransaction($gatewayModuleName, "Payment SUCCESS | Invoice: {$invoiceId} | Amount: {$amount}", "Successful");
}

echo "SUCCESS";
