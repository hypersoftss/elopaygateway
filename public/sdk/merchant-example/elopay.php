<?php
@ob_start();
date_default_timezone_set("Asia/Kolkata");

/* ================= DATABASE ================= */

$db_host = "localhost";
$db_user = "85clubhyper";
$db_pass = "85clubhyper";
$db_name = "85clubhyper";

$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

if ($conn->connect_error) {
    die("DB ERROR");
}

/* ================= CONFIG ================= */

$API_URL    = "https://api.elopaygateway.in/api/payin";
$MERCHANT_ID = "100000031";
$API_KEY    = "2addae2f-7f44-4467-a85a-34e9babc72ae";
$TRADE_TYPE = "INRUPI";
$CURRENCY   = "INR";
$NOTIFY_URL = "https://85clubs.space/pay/elopay.php";
$RETURN_URL = "https://85clubs.space/#/wallet/RechargeHistory";
$LOG_FILE   = __DIR__ . "/elopay.log";

/* ================= LOG ================= */

function elog($msg) {
    global $LOG_FILE;
    file_put_contents($LOG_FILE, date("Y-m-d H:i:s") . " | " . $msg . "\n", FILE_APPEND);
}

/* ================= SIGNATURE ================= */

function makeSign($merchant, $amount, $order, $key, $callback) {
    return md5($merchant . $amount . $order . $key . $callback);
}

/* ================= VERIFY CALLBACK SIGNATURE ================= */

function verifyCallbackSign($params, $secretKey) {
    $receivedSign = $params['sign'] ?? '';
    $filtered = array_filter($params, function($v, $k) {
        return $k !== 'sign' && $v !== '' && $v !== null;
    }, ARRAY_FILTER_USE_BOTH);
    ksort($filtered);
    $parts = [];
    foreach ($filtered as $k => $v) {
        $parts[] = $k . '=' . $v;
    }
    $expectedSign = strtoupper(md5(implode('&', $parts) . '&key=' . $secretKey));
    return $receivedSign === $expectedSign;
}

/* ================= FORMAT ================= */

function formatAmount($a) {
    $a = preg_replace('/[^\d.]/', '', $a);
    return number_format((float)$a, 2, '.', '');
}

/* ===================================================
                CALLBACK HANDLER
=================================================== */

$post = $_POST;

if (empty($post)) {
    $raw = file_get_contents("php://input");
    if (!empty($raw)) {
        $post = json_decode($raw, true);
        if (!is_array($post)) {
            $post = [];
            parse_str($raw, $post);
        }
        elog("RAW BODY: " . $raw);
    }
}

if (empty($post)) {
    $post = $_GET;
}

if (isset($post['merchant_order_no']) && isset($post['status'])) {

    elog("CALLBACK DATA: " . json_encode($post));

    /* ===== VERIFY SIGNATURE ===== */
    if (isset($post['sign']) && !verifyCallbackSign($post, $API_KEY)) {
        elog("SIGNATURE VERIFICATION FAILED for " . ($post['merchant_order_no'] ?? 'unknown'));
        echo "FAIL";
        exit;
    }

    $status        = strtolower($post['status'] ?? '');
    $orderNo       = $post['order_no'] ?? '';
    $merchantOrder = $post['merchant_order_no'] ?? '';
    $amount        = $post['amount'] ?? '';

    $stmt = $conn->prepare("SELECT balakedara, motta, sthiti FROM thevani WHERE dharavahi = ? LIMIT 1");
    $stmt->bind_param("s", $merchantOrder);
    $stmt->execute();
    $stmt->bind_result($uid, $dbAmount, $dbStatus);
    $stmt->fetch();
    $stmt->close();

    if (!$uid) {
        elog("ORDER NOT FOUND " . $merchantOrder);
        echo "FAIL";
        exit;
    }

    if ((int)$dbStatus === 1) {
        elog("ALREADY SUCCESS " . $merchantOrder);
        echo "SUCCESS";
        exit;
    }

    if (abs((float)$amount - (float)$dbAmount) > 1) {
        elog("AMOUNT MISMATCH " . $amount . " vs " . $dbAmount);
        echo "FAIL";
        exit;
    }

    if (!in_array($status, ["1", "success", "paid", "completed"])) {
        elog("STATUS FAILED " . $status);
        echo "FAIL";
        exit;
    }

    /* ===== UPDATE ORDER ===== */
    $up = $conn->prepare("UPDATE thevani SET sthiti = 1, ullekha = ? WHERE dharavahi = ?");
    $up->bind_param("ss", $orderNo, $merchantOrder);
    $up->execute();
    $up->close();

    /* ===== CREDIT BALANCE ===== */
    $credit = $conn->prepare("UPDATE shonu_kaichila SET motta = motta + ? WHERE balakedara = ?");
    $credit->bind_param("ds", $dbAmount, $uid);
    $credit->execute();
    $credit->close();

    elog("PAYMENT SUCCESS " . $merchantOrder . " | Amount: " . $dbAmount . " | UID: " . $uid);

    echo "SUCCESS";
    exit;
}

/* ===================================================
                ORDER CREATE
=================================================== */

if (!isset($_GET['amount']) || !isset($_GET['uid'])) {
    die("Missing params");
}

$amount = formatAmount($_GET['amount']);
$uid    = (int)$_GET['uid'];

if ((float)$amount < 1) {
    die("Invalid amount");
}

$order = "ORD_" . time() . rand(1000, 9999);
$sign  = makeSign($MERCHANT_ID, $amount, $order, $API_KEY, $NOTIFY_URL);

$data = [
    "merchant_id"       => $MERCHANT_ID,
    "amount"            => $amount,
    "merchant_order_no" => $order,
    "callback_url"      => $NOTIFY_URL,
    "trade_type"        => $TRADE_TYPE,
    "currency"          => $CURRENCY,
    "sign"              => $sign
];

elog("CREATE ORDER " . $order . " | Amount: " . $amount . " | UID: " . $uid);

/* ================= CALL API ================= */

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $API_URL);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

elog("API RESPONSE [HTTP " . $httpCode . "]: " . $response);

if ($curlErr) {
    elog("CURL ERROR: " . $curlErr);
}

$res = json_decode($response, true);

/* ===== FALLBACK: Extract URL from redirect/HTML ===== */
$payment_url    = '';
$gatewayOrder   = '';

if (!empty($res['data']['payment_url'])) {
    $payment_url  = $res['data']['payment_url'];
    $gatewayOrder = $res['data']['order_no'] ?? '';
} elseif (!empty($res['payment_url'])) {
    $payment_url  = $res['payment_url'];
    $gatewayOrder = $res['order_no'] ?? '';
} else {
    // Try to extract from Location header or HTML
    if (preg_match('/https?:\/\/[^\s"\'<>]+/', $response, $urlMatch)) {
        $payment_url = $urlMatch[0];
        elog("EXTRACTED URL FROM RESPONSE: " . $payment_url);
    }
}

if (empty($payment_url)) {
    elog("API ERROR - NO PAYMENT URL | Response: " . $response);
    echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
    <title>Payment Error</title>
    <style>body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a1a;font-family:system-ui;color:#fff}
    .box{text-align:center;padding:40px;background:rgba(255,255,255,0.05);border-radius:16px;border:1px solid rgba(239,68,68,0.3)}
    .icon{font-size:48px;margin-bottom:16px}h2{color:#f87171;margin-bottom:8px}p{color:#94a3b8}
    a{display:inline-block;margin-top:20px;padding:12px 32px;background:#818cf8;color:#fff;text-decoration:none;border-radius:8px}</style></head>
    <body><div class="box"><div class="icon">⚠️</div><h2>Payment Failed</h2><p>Unable to process payment. Please try again.</p>
    <a href="javascript:history.back()">← Go Back</a></div></body></html>';
    exit;
}

/* ================= SAVE ORDER ================= */

$stmt = $conn->prepare("INSERT INTO thevani
    (payid, balakedara, motta, dharavahi, mula, ullekha, duravani, ekikrtapavati, dinankavannuracisi, madari, pavatiaidi, sthiti)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

$payid  = 2;
$mobile = "N/A";
$upi    = "UPI";
$date   = date("Y-m-d H:i:s");
$ekik   = "1005";
$pav    = 2;
$sthiti = 0;

$stmt->bind_param("isdsssssssii", $payid, $uid, $amount, $order, $upi, $gatewayOrder, $mobile, $upi, $date, $ekik, $pav, $sthiti);
$stmt->execute();
$stmt->close();

elog("ORDER SAVED " . $order . " | Gateway: " . $gatewayOrder . " | Redirecting...");

/* =====================================================
                PREMIUM LOADING UI + REDIRECT
===================================================== */
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ELOPAY Secure Payment</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}

body{
    min-height:100vh;
    display:flex;
    align-items:center;
    justify-content:center;
    background:linear-gradient(135deg,#0a0a1a 0%,#0d1033 50%,#0a0a1a 100%);
    font-family:"Segoe UI",system-ui,-apple-system,sans-serif;
    color:#fff;
    overflow:hidden
}

.container{
    text-align:center;
    padding:40px 30px;
    max-width:420px;
    width:90%
}

.logo{
    font-size:28px;
    font-weight:800;
    letter-spacing:2px;
    background:linear-gradient(135deg,#818cf8,#06b6d4);
    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
    background-clip:text;
    margin-bottom:32px
}

.loader-ring{
    position:relative;
    width:80px;
    height:80px;
    margin:0 auto 28px
}

.loader-ring .ring{
    position:absolute;
    inset:0;
    border:3px solid transparent;
    border-radius:50%;
    animation:spin 1.2s linear infinite
}

.loader-ring .ring:nth-child(1){
    border-top-color:#818cf8;
    animation-delay:0s
}

.loader-ring .ring:nth-child(2){
    inset:6px;
    border-right-color:#06b6d4;
    animation-delay:0.15s;
    animation-direction:reverse
}

.loader-ring .ring:nth-child(3){
    inset:12px;
    border-bottom-color:#a78bfa;
    animation-delay:0.3s
}

@keyframes spin{
    0%{transform:rotate(0deg)}
    100%{transform:rotate(360deg)}
}

.amount-display{
    font-size:32px;
    font-weight:700;
    color:#e2e8f0;
    margin-bottom:8px
}

.amount-display span{
    font-size:18px;
    color:#64748b;
    font-weight:400
}

.status-text{
    font-size:15px;
    color:#94a3b8;
    margin-bottom:32px
}

.steps{
    display:flex;
    justify-content:center;
    gap:12px;
    margin-bottom:32px
}

.step{
    display:flex;
    align-items:center;
    gap:6px;
    padding:8px 16px;
    background:rgba(255,255,255,0.04);
    border:1px solid rgba(255,255,255,0.08);
    border-radius:24px;
    font-size:12px;
    color:#64748b;
    transition:all 0.5s ease
}

.step.active{
    border-color:rgba(129,140,248,0.4);
    background:rgba(129,140,248,0.1);
    color:#818cf8
}

.step.done{
    border-color:rgba(34,197,94,0.4);
    background:rgba(34,197,94,0.1);
    color:#22c55e
}

.step .dot{
    width:6px;
    height:6px;
    border-radius:50%;
    background:#64748b;
    transition:all 0.3s
}

.step.active .dot{
    background:#818cf8;
    box-shadow:0 0 8px rgba(129,140,248,0.5)
}

.step.done .dot{
    background:#22c55e;
    box-shadow:0 0 8px rgba(34,197,94,0.5)
}

.progress-bar{
    width:100%;
    height:3px;
    background:rgba(255,255,255,0.06);
    border-radius:4px;
    margin-bottom:24px;
    overflow:hidden
}

.progress-bar .fill{
    height:100%;
    width:0%;
    background:linear-gradient(90deg,#818cf8,#06b6d4);
    border-radius:4px;
    transition:width 0.8s ease
}

.security-badge{
    display:inline-flex;
    align-items:center;
    gap:6px;
    padding:6px 14px;
    background:rgba(34,197,94,0.08);
    border:1px solid rgba(34,197,94,0.2);
    border-radius:20px;
    font-size:11px;
    color:#4ade80;
    letter-spacing:0.5px
}

.particles{
    position:fixed;
    inset:0;
    pointer-events:none;
    overflow:hidden;
    z-index:-1
}

.particle{
    position:absolute;
    width:2px;
    height:2px;
    background:rgba(129,140,248,0.3);
    border-radius:50%;
    animation:float linear infinite
}

@keyframes float{
    0%{transform:translateY(100vh) scale(0);opacity:0}
    10%{opacity:1}
    90%{opacity:1}
    100%{transform:translateY(-10vh) scale(1);opacity:0}
}
</style>
</head>
<body>

<div class="particles">
    <div class="particle" style="left:10%;animation-duration:6s;animation-delay:0s"></div>
    <div class="particle" style="left:20%;animation-duration:8s;animation-delay:1s"></div>
    <div class="particle" style="left:35%;animation-duration:7s;animation-delay:0.5s"></div>
    <div class="particle" style="left:50%;animation-duration:9s;animation-delay:2s"></div>
    <div class="particle" style="left:65%;animation-duration:6.5s;animation-delay:1.5s"></div>
    <div class="particle" style="left:80%;animation-duration:8.5s;animation-delay:0.8s"></div>
    <div class="particle" style="left:90%;animation-duration:7.5s;animation-delay:2.5s"></div>
</div>

<div class="container">
    <div class="logo">ELOPAY</div>

    <div class="loader-ring">
        <div class="ring"></div>
        <div class="ring"></div>
        <div class="ring"></div>
    </div>

    <div class="amount-display">
        ₹<?php echo $amount; ?> <span><?php echo $CURRENCY; ?></span>
    </div>

    <div class="status-text" id="statusText">Initializing secure payment...</div>

    <div class="steps">
        <div class="step active" id="step1">
            <div class="dot"></div>
            Verify
        </div>
        <div class="step" id="step2">
            <div class="dot"></div>
            Process
        </div>
        <div class="step" id="step3">
            <div class="dot"></div>
            Redirect
        </div>
    </div>

    <div class="progress-bar">
        <div class="fill" id="progressFill"></div>
    </div>

    <div class="security-badge">
        🔒 256-bit SSL Encrypted
    </div>
</div>

<script>
var payUrl = <?php echo json_encode($payment_url); ?>;

var messages = [
    { text: "Verifying merchant credentials...", progress: 20, step: 1 },
    { text: "Credentials verified ✓", progress: 40, step: 1, done: true },
    { text: "Processing payment request...", progress: 60, step: 2 },
    { text: "Payment gateway connected ✓", progress: 80, step: 2, done: true },
    { text: "Redirecting to payment page...", progress: 100, step: 3 }
];

var i = 0;

function nextStep() {
    if (i >= messages.length) {
        setTimeout(function() { window.location.href = payUrl; }, 500);
        return;
    }

    var m = messages[i];
    document.getElementById("statusText").textContent = m.text;
    document.getElementById("progressFill").style.width = m.progress + "%";

    // Update step states
    for (var s = 1; s <= 3; s++) {
        var el = document.getElementById("step" + s);
        el.className = "step";
        if (s < m.step) {
            el.className = "step done";
        } else if (s === m.step) {
            el.className = m.done ? "step done" : "step active";
        }
    }

    i++;
    setTimeout(nextStep, 800);
}

setTimeout(nextStep, 600);
</script>

</body>
</html>
<?php exit; ?>
