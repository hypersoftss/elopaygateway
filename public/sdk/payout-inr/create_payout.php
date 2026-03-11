<?php
/**
 * ELOPAY INR - Payout: Create Withdrawal Order
 * Sends money to Indian bank accounts via IMPS/NEFT
 * Signature: md5(account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payout_key)
 */

$config = include __DIR__ . '/config.php';

function generatePayoutSignature($accountNumber, $amount, $bankName, $callbackUrl, $ifsc, $merchantId, $name, $transactionId, $payoutKey) {
    $signStr = $accountNumber . $amount . $bankName . $callbackUrl . $ifsc . $merchantId . $name . $transactionId . $payoutKey;
    return md5($signStr);
}

// === Get Parameters ===
$amount        = isset($_GET['amount']) ? (float)$_GET['amount'] : 0;
$transactionId = isset($_GET['transaction_id']) ? $_GET['transaction_id'] : 'WD_' . date('Ymd') . '_' . time() . '_' . random_int(1000, 9999);
$accountNumber = isset($_GET['account_number']) ? $_GET['account_number'] : '';
$ifsc          = isset($_GET['ifsc']) ? $_GET['ifsc'] : '';
$name          = isset($_GET['name']) ? $_GET['name'] : '';
$bankName      = isset($_GET['bank_name']) ? $_GET['bank_name'] : '';

header('Content-Type: application/json; charset=utf-8');

// === Validate ===
if ($amount < 100) {
    echo json_encode(['status' => false, 'message' => 'Amount must be >= 100']);
    exit;
}
if (empty($accountNumber) || empty($ifsc) || empty($name) || empty($bankName)) {
    echo json_encode(['status' => false, 'message' => 'Missing required fields: account_number, ifsc, name, bank_name']);
    exit;
}

// === Generate Signature ===
$signature = generatePayoutSignature(
    $accountNumber,
    $amount,
    $bankName,
    $config['NOTIFY_URL'],
    $ifsc,
    $config['MERCHANT_ID'],
    $name,
    $transactionId,
    $config['PAYOUT_KEY']
);

// === Build Request ===
$payload = [
    'merchant_id'    => $config['MERCHANT_ID'],
    'amount'         => $amount,
    'transaction_id' => $transactionId,
    'account_number' => $accountNumber,
    'ifsc'           => $ifsc,
    'name'           => $name,
    'bank_name'      => $bankName,
    'callback_url'   => $config['NOTIFY_URL'],
    'sign'           => $signature,
];

// === Send API Request ===
$ch = curl_init();
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
curl_setopt($ch, CURLOPT_URL, $config['API_URL']);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

// === Log ===
@file_put_contents($config['LOG_FILE'], date('c') . " | PAYOUT | HTTP={$httpCode} | REQ=" . json_encode($payload) . " | RES={$response}\n", FILE_APPEND);

if ($curlErr) {
    echo json_encode(['status' => false, 'message' => 'Connection error: ' . $curlErr]);
    exit;
}

$result = json_decode($response, true);
echo json_encode($result ?: ['status' => false, 'message' => 'Invalid gateway response']);
