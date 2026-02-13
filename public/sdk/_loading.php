<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Processing Payment...</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#fff;overflow:hidden}
.container{text-align:center;position:relative;z-index:2}
.spinner{width:56px;height:56px;margin:0 auto 28px;position:relative}
.spinner::before,.spinner::after{content:'';position:absolute;inset:0;border-radius:50%;border:3px solid transparent}
.spinner::before{border-top-color:#6366f1;animation:spin 1s linear infinite}
.spinner::after{border-bottom-color:#22d3ee;animation:spin 1.5s linear infinite reverse;inset:6px}
@keyframes spin{to{transform:rotate(360deg)}}
.dots{display:flex;gap:6px;justify-content:center;margin-bottom:20px}
.dots span{width:8px;height:8px;background:#6366f1;border-radius:50%;animation:bounce 1.4s infinite ease-in-out both}
.dots span:nth-child(1){animation-delay:-.32s}
.dots span:nth-child(2){animation-delay:-.16s}
@keyframes bounce{0%,80%,100%{transform:scale(0);opacity:.4}40%{transform:scale(1);opacity:1}}
#status-text{font-size:15px;color:#94a3b8;letter-spacing:.3px}
.pulse-ring{position:fixed;top:50%;left:50%;width:200px;height:200px;transform:translate(-50%,-50%);border-radius:50%;border:1px solid rgba(99,102,241,.15);animation:pulse-ring 2s ease-out infinite}
.pulse-ring:nth-child(2){animation-delay:.5s;width:260px;height:260px}
@keyframes pulse-ring{0%{opacity:1;transform:translate(-50%,-50%) scale(.8)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.4)}}
.timer{font-size:12px;color:#475569;margin-top:12px;font-variant-numeric:tabular-nums}
</style>
</head>
<body>
<div class="pulse-ring"></div>
<div class="pulse-ring"></div>
<div class="container">
  <div class="spinner" id="spinner"></div>
  <div class="dots"><span></span><span></span><span></span></div>
  <p id="status-text">Connecting to payment gateway...</p>
  <p class="timer" id="timer">0s</p>
</div>
<script>
var s=0;setInterval(function(){s++;document.getElementById('timer').textContent=s+'s';},1000);
</script>
</body>
</html>
