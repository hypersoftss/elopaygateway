import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GatewayBalance {
  gateway_id: string
  gateway_name: string
  gateway_code: string
  currency: string
  balance: number | null
  status: 'online' | 'offline' | 'error'
  message: string
  last_checked: string
}

interface BalanceThresholds {
  inr: number
  pkr: number
  bdt: number
}

// Pure JavaScript MD5 implementation
function md5(message: string): string {
  function rotateLeft(x: number, n: number): number {
    return (x << n) | (x >>> (32 - n));
  }
  
  function addUnsigned(x: number, y: number): number {
    const lsw = (x & 0xFFFF) + (y & 0xFFFF);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }
  
  function F(x: number, y: number, z: number): number { return (x & y) | ((~x) & z); }
  function G(x: number, y: number, z: number): number { return (x & z) | (y & (~z)); }
  function H(x: number, y: number, z: number): number { return x ^ y ^ z; }
  function I(x: number, y: number, z: number): number { return y ^ (x | (~z)); }
  
  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  
  function convertToWordArray(str: string): number[] {
    const lWordCount: number[] = [];
    const lMessageLength = str.length;
    const lNumberOfWords_temp1 = lMessageLength + 8;
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    
    for (let i = 0; i < lNumberOfWords; i++) lWordCount[i] = 0;
    
    let lBytePosition = 0;
    let lByteCount = 0;
    while (lByteCount < lMessageLength) {
      const lWordIndex = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordCount[lWordIndex] = lWordCount[lWordIndex] | (str.charCodeAt(lByteCount) << lBytePosition);
      lByteCount++;
    }
    const lWordIndex = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordCount[lWordIndex] = lWordCount[lWordIndex] | (0x80 << lBytePosition);
    lWordCount[lNumberOfWords - 2] = lMessageLength << 3;
    lWordCount[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordCount;
  }
  
  function wordToHex(lValue: number): string {
    let result = "";
    for (let lCount = 0; lCount <= 3; lCount++) {
      const lByte = (lValue >>> (lCount * 8)) & 255;
      result += ("0" + lByte.toString(16)).slice(-2);
    }
    return result;
  }
  
  const x = convertToWordArray(message);
  let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;
  
  const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  const S21 = 5, S22 = 9,  S23 = 14, S24 = 20;
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21;
  
  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;
    a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478); d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB); b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
    a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF); d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
    c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613); b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8); d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
    c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1); b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
    a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122); d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
    c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E); b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
    a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562); d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
    c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51); b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
    a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D); d = GG(d, a, b, c, x[k + 10], S22, 0x02441453);
    c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681); b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
    a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6); d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
    c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87); b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
    a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905); d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
    c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9); b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
    a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942); d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
    c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122); b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
    a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44); d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
    c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60); b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
    a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6); d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
    c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085); b = HH(b, c, d, a, x[k + 6], S34, 0x04881D05);
    a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039); d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
    c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8); b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
    a = II(a, b, c, d, x[k + 0], S41, 0xF4292244); d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
    c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7); b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
    a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3); d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
    c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D); b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
    a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F); d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
    c = II(c, d, a, b, x[k + 6], S43, 0xA3014314); b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
    a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82); d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
    c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB); b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
    a = addUnsigned(a, AA); b = addUnsigned(b, BB); c = addUnsigned(c, CC); d = addUnsigned(d, DD);
  }
  
  return wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
}

// HYPERSOFTS (LG Pay) signature generation (ASCII sorted MD5)
function generateHyperSoftsSign(params: Record<string, string>, apiKey: string): string {
  const sortedKeys = Object.keys(params).sort()
  const signStr = sortedKeys
    .filter(key => params[key] !== '' && params[key] !== undefined && params[key] !== null)
    .map(key => `${key}=${params[key]}`)
    .join('&')
  const finalStr = signStr + '&key=' + apiKey
  return md5(finalStr).toUpperCase()
}

// HYPERSOFTS balance check - uses /api/deposit/balance endpoint with 'time' parameter
async function checkHyperSoftsBalance(gateway: any): Promise<GatewayBalance> {
  const baseUrl = gateway.base_url?.replace(/\/$/, '') || 'https://www.lg-pay.com'
  const timestamp = Math.floor(Date.now() / 1000).toString()
  
  const params: Record<string, string> = {
    app_id: gateway.app_id,
    time: timestamp, // Use 'time' not 'timestamp' per API docs
  }
  
  const sign = generateHyperSoftsSign(params, gateway.api_key)
  params.sign = sign

  try {
    console.log(`Checking HYPERSOFTS balance for ${gateway.gateway_code} at ${baseUrl}/api/deposit/balance`)
    
    // Use the correct endpoint /api/deposit/balance (not /api/balance)
    const response = await fetch(`${baseUrl}/api/deposit/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })

    const responseText = await response.text()
    console.log(`HYPERSOFTS raw response for ${gateway.gateway_code}:`, responseText)
    
    let result: any
    try {
      result = JSON.parse(responseText)
    } catch {
      return {
        gateway_id: gateway.id,
        gateway_name: gateway.gateway_name,
        gateway_code: gateway.gateway_code,
        currency: gateway.currency,
        balance: null,
        status: 'error',
        message: 'Invalid JSON response from gateway',
        last_checked: new Date().toISOString(),
      }
    }

    // HYPERSOFTS uses status: 1 for success
    // API returns balance in paisa/cents, so divide by 100 to get actual value
    if (result.status === 1 || result.status === '1' || result.code === 200 || result.code === '200') {
      const rawBalance = parseFloat(result.data?.balance || result.balance || '0')
      const balance = rawBalance / 100 // Convert from paisa to actual currency
      return {
        gateway_id: gateway.id,
        gateway_name: gateway.gateway_name,
        gateway_code: gateway.gateway_code,
        currency: gateway.currency,
        balance,
        status: 'online',
        message: 'Balance fetched successfully',
        last_checked: new Date().toISOString(),
      }
    } else {
      // API responded but with error
      return {
        gateway_id: gateway.id,
        gateway_name: gateway.gateway_name,
        gateway_code: gateway.gateway_code,
        currency: gateway.currency,
        balance: null,
        status: 'error',
        message: result.msg || result.message || 'API error - check credentials',
        last_checked: new Date().toISOString(),
      }
    }
  } catch (error) {
    console.error(`Error checking HYPERSOFTS balance for ${gateway.gateway_code}:`, error)
    return {
      gateway_id: gateway.id,
      gateway_name: gateway.gateway_name,
      gateway_code: gateway.gateway_code,
      currency: gateway.currency,
      balance: null,
      status: 'offline',
      message: error instanceof Error ? error.message : 'Connection failed',
      last_checked: new Date().toISOString(),
    }
  }
}

// HYPER PAY (BondPay) balance check
async function checkHyperPayBalance(gateway: any): Promise<GatewayBalance> {
  const baseUrl = gateway.base_url?.replace(/\/$/, '') || 'https://api.bond-pays.com'
  
  try {
    console.log(`Checking HYPERPAY balance for ${gateway.gateway_code} at ${baseUrl}`)
    
    // Try the balance query endpoint
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const signStr = `app_id=${gateway.app_id}&timestamp=${timestamp}&key=${gateway.api_key}`
    const sign = md5(signStr).toUpperCase()

    const response = await fetch(`${baseUrl}/api/merchant/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: gateway.app_id,
        timestamp,
        sign,
      }),
    })

    const responseText = await response.text()
    console.log(`HYPERPAY raw response for ${gateway.gateway_code}:`, responseText)
    
    // Check if response is HTML (error page)
    if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html')) {
      return {
        gateway_id: gateway.id,
        gateway_name: gateway.gateway_name,
        gateway_code: gateway.gateway_code,
        currency: gateway.currency,
        balance: null,
        status: 'error',
        message: 'Gateway returned HTML - balance API may not be available',
        last_checked: new Date().toISOString(),
      }
    }
    
    let result: any
    try {
      result = JSON.parse(responseText)
    } catch {
      return {
        gateway_id: gateway.id,
        gateway_name: gateway.gateway_name,
        gateway_code: gateway.gateway_code,
        currency: gateway.currency,
        balance: null,
        status: 'error',
        message: 'Invalid JSON response from gateway',
        last_checked: new Date().toISOString(),
      }
    }

    if (result.code === 200 || result.code === '200' || result.status === 'success' || result.status === 1) {
      const balance = parseFloat(result.data?.balance || result.balance || '0')
      return {
        gateway_id: gateway.id,
        gateway_name: gateway.gateway_name,
        gateway_code: gateway.gateway_code,
        currency: gateway.currency,
        balance,
        status: 'online',
        message: 'Balance fetched successfully',
        last_checked: new Date().toISOString(),
      }
    } else {
      return {
        gateway_id: gateway.id,
        gateway_name: gateway.gateway_name,
        gateway_code: gateway.gateway_code,
        currency: gateway.currency,
        balance: null,
        status: 'error',
        message: result.msg || result.message || 'API error - check credentials',
        last_checked: new Date().toISOString(),
      }
    }
  } catch (error) {
    console.error(`Error checking HYPERPAY balance for ${gateway.gateway_code}:`, error)
    return {
      gateway_id: gateway.id,
      gateway_name: gateway.gateway_name,
      gateway_code: gateway.gateway_code,
      currency: gateway.currency,
      balance: null,
      status: 'offline',
      message: error instanceof Error ? error.message : 'Connection failed',
      last_checked: new Date().toISOString(),
    }
  }
}

function getThresholdForCurrency(currency: string, thresholds: BalanceThresholds): number {
  switch (currency.toUpperCase()) {
    case 'INR': return thresholds.inr
    case 'PKR': return thresholds.pkr
    case 'BDT': return thresholds.bdt
    default: return thresholds.inr
  }
}

// Throttle state: tracks when last alert was sent and count per day per gateway
// Key format: gateway_id -> { lastAlertTime: timestamp, alertCountToday: number, lastAlertDate: 'YYYY-MM-DD' }
const alertThrottleState: Map<string, { lastAlertTime: number, alertCountToday: number, lastAlertDate: string }> = new Map()

const MAX_ALERTS_PER_DAY = 3
const MIN_HOURS_BETWEEN_ALERTS = 5

async function shouldSendLowBalanceAlert(
  supabase: any,
  gatewayId: string
): Promise<boolean> {
  const now = new Date()
  const todayDate = now.toISOString().split('T')[0] // YYYY-MM-DD
  const currentTime = now.getTime()
  const fiveHoursMs = MIN_HOURS_BETWEEN_ALERTS * 60 * 60 * 1000

  // Check if we have recent alerts in the database from today
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  
  const { data: recentAlerts, error } = await supabase
    .from('gateway_balance_history')
    .select('checked_at')
    .eq('gateway_id', gatewayId)
    .eq('status', 'low_balance_alert_sent')
    .gte('checked_at', startOfDay)
    .order('checked_at', { ascending: false })
    .limit(MAX_ALERTS_PER_DAY)

  if (error) {
    console.error('Error checking alert history:', error)
    // If we can't check, allow the alert to be sent
    return true
  }

  const alertsToday = recentAlerts?.length || 0
  
  // Check if we've already sent max alerts today
  if (alertsToday >= MAX_ALERTS_PER_DAY) {
    console.log(`Throttling: Already sent ${alertsToday}/${MAX_ALERTS_PER_DAY} alerts today for gateway ${gatewayId}`)
    return false
  }

  // Check if at least 5 hours have passed since last alert
  if (recentAlerts && recentAlerts.length > 0) {
    const lastAlertTime = new Date(recentAlerts[0].checked_at).getTime()
    const timeSinceLastAlert = currentTime - lastAlertTime
    
    if (timeSinceLastAlert < fiveHoursMs) {
      const hoursRemaining = ((fiveHoursMs - timeSinceLastAlert) / (60 * 60 * 1000)).toFixed(1)
      console.log(`Throttling: Only ${(timeSinceLastAlert / (60 * 60 * 1000)).toFixed(1)}h since last alert for gateway ${gatewayId}. Need ${hoursRemaining}h more.`)
      return false
    }
  }

  return true
}

async function recordAlertSent(supabase: any, gatewayId: string) {
  // Record that we sent an alert by adding a special entry
  await supabase
    .from('gateway_balance_history')
    .insert({
      gateway_id: gatewayId,
      balance: null,
      status: 'low_balance_alert_sent',
      message: 'Low balance Telegram alert sent',
      checked_at: new Date().toISOString(),
    })
}

async function sendLowBalanceAlert(
  supabase: any,
  gateway: GatewayBalance, 
  threshold: number,
  adminChatId: string,
  botToken: string
): Promise<boolean> {
  // Check throttling first
  const shouldSend = await shouldSendLowBalanceAlert(supabase, gateway.gateway_id)
  if (!shouldSend) {
    console.log(`Low balance alert throttled for gateway: ${gateway.gateway_name}`)
    return false
  }

  const currencySymbol = gateway.currency === 'INR' ? '₹' : 
                         gateway.currency === 'PKR' ? 'Rs.' : 
                         gateway.currency === 'BDT' ? '৳' : '$'
  
  const message = `⚠️ <b>Low Gateway Balance Alert</b>\n\n` +
    `🏦 Gateway: ${gateway.gateway_name}\n` +
    `💰 Balance: ${currencySymbol}${gateway.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0'}\n` +
    `📊 Threshold: ${currencySymbol}${threshold.toLocaleString()}\n` +
    `💱 Currency: ${gateway.currency}\n` +
    `⏰ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n` +
    `<i>Max ${MAX_ALERTS_PER_DAY} alerts/day • ${MIN_HOURS_BETWEEN_ALERTS}h gap between alerts</i>`

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text: message,
        parse_mode: 'HTML',
      }),
    })
    
    // Record that we sent this alert
    await recordAlertSent(supabase, gateway.gateway_id)
    
    console.log('Low balance alert sent for gateway:', gateway.gateway_name)
    return true
  } catch (error) {
    console.error('Failed to send low balance alert:', error)
    return false
  }
}

async function saveBalanceHistory(supabase: any, balance: GatewayBalance) {
  try {
    await supabase
      .from('gateway_balance_history')
      .insert({
        gateway_id: balance.gateway_id,
        balance: balance.balance,
        status: balance.status,
        message: balance.message,
        checked_at: balance.last_checked,
      })
    console.log(`Balance history saved for ${balance.gateway_name}`)
  } catch (error) {
    console.error(`Failed to save balance history for ${balance.gateway_name}:`, error)
  }
}

// Test a single gateway configuration (for admin connection testing)
async function testGatewayConfig(config: { gateway_type: string, base_url: string, app_id: string, api_key: string }): Promise<{ status: string, balance?: number, message?: string }> {
  const fakeGateway = {
    id: 'test',
    gateway_name: 'Test',
    gateway_code: 'TEST',
    currency: 'PKR',
    base_url: config.base_url,
    app_id: config.app_id,
    api_key: config.api_key,
    gateway_type: config.gateway_type,
  }

  let result: GatewayBalance

  if (config.gateway_type === 'lgpay' || config.gateway_type === 'hypersofts') {
    result = await checkHyperSoftsBalance(fakeGateway)
  } else if (config.gateway_type === 'bondpay' || config.gateway_type === 'hyperpay') {
    result = await checkHyperPayBalance(fakeGateway)
  } else {
    return { status: 'error', message: `Unknown gateway type: ${config.gateway_type}` }
  }

  return {
    status: result.status === 'online' ? 'success' : result.status,
    balance: result.balance ?? undefined,
    message: result.message,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body for test_connection mode
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      // No body or invalid JSON - continue with default behavior
    }

    // Handle test_connection mode - test a specific gateway config
    if (body.test_connection && body.gateway_config) {
      console.log('Testing gateway connection:', body.gateway_config.gateway_type)
      const testResult = await testGatewayConfig(body.gateway_config)
      return new Response(
        JSON.stringify({ success: true, test_result: testResult }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get all active gateways
    const { data: gateways, error: gatewaysError } = await supabaseAdmin
      .from('payment_gateways')
      .select('*')
      .eq('is_active', true)

    if (gatewaysError) {
      throw new Error(`Failed to fetch gateways: ${gatewaysError.message}`)
    }

    if (!gateways || gateways.length === 0) {
      return new Response(
        JSON.stringify({ success: true, balances: [], message: 'No active gateways found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get admin settings for thresholds and Telegram config
    const { data: adminSettings } = await supabaseAdmin
      .from('admin_settings')
      .select('admin_telegram_chat_id, balance_threshold_inr, balance_threshold_pkr, balance_threshold_bdt')
      .limit(1)
      .maybeSingle()
    
    const thresholds: BalanceThresholds = {
      inr: adminSettings?.balance_threshold_inr || 10000,
      pkr: adminSettings?.balance_threshold_pkr || 50000,
      bdt: adminSettings?.balance_threshold_bdt || 50000,
    }

    const botToken = Deno.env.get('TG_BOT_TOKEN')
    const adminChatId = adminSettings?.admin_telegram_chat_id

    const balances: GatewayBalance[] = []

    // Check balance for each gateway
    for (const gateway of gateways) {
      let balance: GatewayBalance

      // HYPER SOFTS (lgpay/hypersofts) gateway types
      if (gateway.gateway_type === 'lgpay' || gateway.gateway_type === 'hypersofts') {
        balance = await checkHyperSoftsBalance(gateway)
      } 
      // HYPER PAY (bondpay/hyperpay) gateway types
      else if (gateway.gateway_type === 'bondpay' || gateway.gateway_type === 'hyperpay') {
        balance = await checkHyperPayBalance(gateway)
      } else {
        balance = {
          gateway_id: gateway.id,
          gateway_name: gateway.gateway_name,
          gateway_code: gateway.gateway_code,
          currency: gateway.currency,
          balance: null,
          status: 'error',
          message: `Unknown gateway type: ${gateway.gateway_type}`,
          last_checked: new Date().toISOString(),
        }
      }

      balances.push(balance)

      // Save balance history
      await saveBalanceHistory(supabaseAdmin, balance)

      // Send alert if balance is below currency-specific threshold (with throttling)
      if (balance.balance !== null && botToken && adminChatId) {
        const threshold = getThresholdForCurrency(balance.currency, thresholds)
        if (balance.balance < threshold) {
          await sendLowBalanceAlert(supabaseAdmin, balance, threshold, adminChatId, botToken)
        }
      }
    }

    console.log('Gateway balances checked:', balances.length)

    return new Response(
      JSON.stringify({ 
        success: true, 
        balances,
        thresholds,
        checked_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Gateway balance check error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
