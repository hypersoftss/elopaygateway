<?php
/**
 * ELOPAYGATEWAY INR: Create Payment Order
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

// Show loading UI first
echo '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Processing Payment...</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0a0a1a 0%,#0d1033 50%,#0a0a1a 100%);font-family:"Segoe UI",system-ui,sans-serif;color:#fff;overflow:hidden}.bg{position:fixed;inset:0;background-image:linear-gradient(rgba(99,102,241,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.03) 1px,transparent 1px);background-size:50px 50px}.orb{position:fixed;border-radius:50%;filter:blur(80px);opacity:.15}.orb.a{width:300px;height:300px;background:#6366f1;top:20%;left:30%;animation:fa 8s ease-in-out infinite}.orb.b{width:250px;height:250px;background:#06b6d4;bottom:20%;right:25%;animation:fb 10s ease-in-out infinite}@keyframes fa{0%,100%{transform:translate(0,0)}50%{transform:translate(30px,-20px)}}@keyframes fb{0%,100%{transform:translate(0,0)}50%{transform:translate(-20px,30px)}}.c{text-align:center;position:relative;z-index:2;max-width:380px;padding:0 20px}.sh{width:72px;height:72px;margin:0 auto 32px;position:relative}.si{width:72px;height:72px;animation:sp 2s ease-in-out infinite}.si svg{width:100%;height:100%}.sr{position:absolute;inset:-8px;border-radius:50%;border:2px solid transparent;border-top-color:rgba(99,102,241,.6);animation:sn 1.5s linear infinite}.sr.i{inset:-4px;border-top-color:rgba(6,182,212,.4);animation:sn 2s linear infinite reverse}@keyframes sn{to{transform:rotate(360deg)}}@keyframes sp{0%,100%{transform:scale(1);filter:drop-shadow(0 0 8px rgba(99,102,241,.3))}50%{transform:scale(1.05);filter:drop-shadow(0 0 20px rgba(99,102,241,.5))}}h2{font-size:18px;font-weight:600;margin-bottom:6px;background:linear-gradient(135deg,#e2e8f0,#fff);-webkit-background-clip:text;-webkit-text-fill-color:transparent}#st{font-size:14px;color:#64748b;margin-bottom:28px;line-height:1.5}.pt{width:100%;height:3px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden;margin-bottom:24px}.pb{height:100%;width:0%;background:linear-gradient(90deg,#6366f1,#06b6d4);border-radius:4px;animation:pf 3s ease-in-out infinite}@keyframes pf{0%{width:0%;opacity:.8}50%{width:70%;opacity:1}100%{width:100%;opacity:.6}}.steps{display:flex;justify-content:center;gap:24px;margin-bottom:20px}.step{display:flex;flex-direction:column;align-items:center;gap:6px}.sd{width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.15);transition:all .5s}.sd.on{background:#6366f1;border-color:#818cf8;box-shadow:0 0 12px rgba(99,102,241,.5)}.sd.ok{background:#22c55e;border-color:#4ade80;box-shadow:0 0 12px rgba(34,197,94,.4)}.sl{font-size:10px;color:#475569;text-transform:uppercase;letter-spacing:1px}.tm{font-size:11px;color:#334155;font-variant-numeric:tabular-nums}.sb{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:#475569;margin-top:16px;padding:4px 12px;border-radius:20px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)}.sb svg{width:12px;height:12px}#eb{display:none;margin-top:20px;padding:14px 18px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:10px;color:#fca5a5;font-size:13px;text-align:left}</style></head><body>
<div class="bg"></div><div class="orb a"></div><div class="orb b"></div>
<div class="c"><div class="sh"><div class="sr"></div><div class="sr i"></div><div class="si"><svg viewBox="0 0 24 24" fill="none" stroke="url(#g)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#818cf8"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient></defs><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4" stroke="#4ade80" stroke-width="2"/></svg></div></div>
<h2>Processing Your Payment</h2><p id="st">Initializing secure connection...</p>
<div class="pt"><div class="pb"></div></div>
<div class="steps"><div class="step"><div class="sd on" id="s1"></div><span class="sl">Verify</span></div><div class="step"><div class="sd" id="s2"></div><span class="sl">Process</span></div><div class="step"><div class="sd" id="s3"></div><span class="sl">Redirect</span></div></div>
<p class="tm" id="tm">0s</p>
<div class="sb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>256-bit Encrypted</div>
<div id="eb"></div></div>
<script>var s=0,si=setInterval(function(){s++;document.getElementById("tm").textContent=s+"s";if(s===1){document.getElementById("s1").className="sd ok";document.getElementById("s2").className="sd on";document.getElementById("st").textContent="Connecting to gateway...";}if(s===2){document.getElementById("s2").className="sd ok";document.getElementById("s3").className="sd on";document.getElementById("st").textContent="Almost ready...";}},1000);
function showError(m){clearInterval(si);document.getElementById("st").textContent="Payment failed";document.getElementById("eb").style.display="block";document.getElementById("eb").textContent=m;document.querySelector(".pb").style.animation="none";document.querySelector(".pb").style.background="#ef4444";document.querySelector(".pb").style.width="100%";}
function doRedirect(u){document.getElementById("st").textContent="Redirecting to payment...";document.getElementById("s3").className="sd ok";document.querySelector(".pb").style.animation="none";document.querySelector(".pb").style.width="100%";setTimeout(function(){window.location.replace(u);},400);}</script>';
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
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

@file_put_contents($config['LOG_FILE'], date('c') . " | CREATE | HTTP={$httpCode} | REQ=" . json_encode($payload) . " | RES={$response}\n", FILE_APPEND);

if ($curlErr) { echo '<script>showError("Connection error. Please try again.");</script></body></html>'; exit; }
if (empty($response)) { echo '<script>showError("Empty response from gateway.");</script></body></html>'; exit; }

$result = json_decode($response, true);
if ($result === null) { echo '<script>showError("Invalid gateway response.");</script></body></html>'; exit; }

if ($httpCode >= 200 && $httpCode < 300 && !empty($result['success']) && !empty($result['data']['payment_url'])) {
    echo '<script>doRedirect(' . json_encode($result['data']['payment_url']) . ');</script></body></html>';
} else {
    $msg = $result['message'] ?? 'Failed to create order';
    echo '<script>showError(' . json_encode($msg) . ');</script></body></html>';
}
