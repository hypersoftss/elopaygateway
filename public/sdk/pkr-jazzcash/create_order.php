<?php
/**
 * ELOPAY PKR - JazzCash: Create Payment Order
 * Signature: md5(merchant_id + amount + merchant_order_no + api_key + callback_url)
 */

$config = include __DIR__ . '/config.php';

function generateSignature($merchantId, $amount, $orderNo, $apiKey, $callbackUrl) {
    return md5($merchantId . $amount . $orderNo . $apiKey . $callbackUrl);
}

$amount = isset($_GET['amount']) ? number_format((float)$_GET['amount'], 2, '.', '') : '0.00';
if ((float)$amount < 1.00) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['status' => false, 'message' => 'Amount must be >= 1.00']);
    exit;
}

$orderNo = isset($_GET['order_id']) ? $_GET['order_id'] : 'ORD_' . date('Ymd') . '_' . time() . '_' . random_int(1000, 9999);

echo '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Processing Payment...</title><style>*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#fff;overflow:hidden}.container{text-align:center;position:relative;z-index:2}.spinner{width:56px;height:56px;margin:0 auto 28px;position:relative}.spinner::before,.spinner::after{content:"";position:absolute;inset:0;border-radius:50%;border:3px solid transparent}.spinner::before{border-top-color:#6366f1;animation:spin 1s linear infinite}.spinner::after{border-bottom-color:#22d3ee;animation:spin 1.5s linear infinite reverse;inset:6px}@keyframes spin{to{transform:rotate(360deg)}}.dots{display:flex;gap:6px;justify-content:center;margin-bottom:20px}.dots span{width:8px;height:8px;background:#6366f1;border-radius:50%;animation:bounce 1.4s infinite ease-in-out both}.dots span:nth-child(1){animation-delay:-.32s}.dots span:nth-child(2){animation-delay:-.16s}@keyframes bounce{0%,80%,100%{transform:scale(0);opacity:.4}40%{transform:scale(1);opacity:1}}#status-text{font-size:15px;color:#94a3b8;letter-spacing:.3px}.pulse-ring{position:fixed;top:50%;left:50%;width:200px;height:200px;transform:translate(-50%,-50%);border-radius:50%;border:1px solid rgba(99,102,241,.15);animation:pulse-ring 2s ease-out infinite}.pulse-ring:nth-child(2){animation-delay:.5s;width:260px;height:260px}@keyframes pulse-ring{0%{opacity:1;transform:translate(-50%,-50%) scale(.8)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.4)}}.timer{font-size:12px;color:#475569;margin-top:12px;font-variant-numeric:tabular-nums}</style></head><body><div class="pulse-ring"></div><div class="pulse-ring"></div><div class="container"><div class="spinner" id="spinner"></div><div class="dots"><span></span><span></span><span></span></div><p id="status-text">Connecting to payment gateway...</p><p class="timer" id="timer">0s</p></div><script>var s=0;setInterval(function(){s++;document.getElementById("timer").textContent=s+"s";},1000);</script>';
if (function_exists('ob_flush')) ob_flush();
flush();

$signature = generateSignature(
    $config['MERCHANT_ID'], $amount, $orderNo, $config['API_KEY'], $config['NOTIFY_URL']
);

$payload = [
    'merchant_id'       => $config['MERCHANT_ID'],
    'amount'            => $amount,
    'merchant_order_no' => $orderNo,
    'callback_url'      => $config['NOTIFY_URL'],
    'sign'              => $signature,
    'trade_type'        => $config['TRADE_TYPE'],
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
curl_setopt($ch, CURLOPT_URL, $config['API_URL']);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
curl_setopt($ch, CURLOPT_TIMEOUT, 25);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

@file_put_contents($config['LOG_FILE'], date('c') . " | CREATE | HTTP={$httpCode} | REQ=" . json_encode($payload) . " | RES={$response}\n", FILE_APPEND);

if ($curlErr) { echo '<script>document.getElementById("status-text").textContent="Gateway error";document.getElementById("spinner").style.display="none";</script></body></html>'; exit; }
if (empty($response)) { echo '<script>document.getElementById("status-text").textContent="Empty response";document.getElementById("spinner").style.display="none";</script></body></html>'; exit; }
$result = json_decode($response, true);
if ($result === null) { echo '<script>document.getElementById("status-text").textContent="Invalid response";document.getElementById("spinner").style.display="none";</script></body></html>'; exit; }

if ($httpCode >= 200 && $httpCode < 300 && !empty($result['success']) && !empty($result['data']['payment_url'])) {
    $url = $result['data']['payment_url'];
    echo '<script>document.getElementById("status-text").textContent="Redirecting to payment...";setTimeout(function(){window.location.replace(' . json_encode($url) . ');},500);</script></body></html>';
} else {
    $msg = $result['message'] ?? 'Failed to create order';
    echo '<script>document.getElementById("status-text").textContent=' . json_encode($msg) . ';document.getElementById("spinner").style.display="none";</script></body></html>';
}
