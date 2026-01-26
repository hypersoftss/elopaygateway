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

// Simple MD5 implementation for Deno
async function md5(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('MD5', msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// LG Pay signature generation (ASCII sorted MD5)
async function generateLGPaySign(params: Record<string, string>, apiKey: string): Promise<string> {
  const sortedKeys = Object.keys(params).sort()
  const signStr = sortedKeys
    .filter(key => params[key] !== '' && params[key] !== undefined && params[key] !== null)
    .map(key => `${key}=${params[key]}`)
    .join('&')
  const finalStr = signStr + '&key=' + apiKey
  return (await md5(finalStr)).toUpperCase()
}

async function checkLGPayBalance(gateway: any): Promise<GatewayBalance> {
  const baseUrl = gateway.base_url || 'https://lgpay.co'
  const timestamp = Math.floor(Date.now() / 1000).toString()
  
  const params: Record<string, string> = {
    app_id: gateway.app_id,
    timestamp,
  }
  
  const sign = await generateLGPaySign(params, gateway.api_key)
  params.sign = sign

  try {
    const response = await fetch(`${baseUrl}/api/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })

    const result = await response.json()
    console.log(`LG Pay balance response for ${gateway.gateway_code}:`, result)

    if (result.code === 200 || result.code === '200') {
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
        message: result.msg || result.message || 'Failed to fetch balance',
        last_checked: new Date().toISOString(),
      }
    }
  } catch (error) {
    console.error(`Error checking LG Pay balance for ${gateway.gateway_code}:`, error)
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

async function checkBondPayBalance(gateway: any): Promise<GatewayBalance> {
  const baseUrl = gateway.base_url || 'https://api.bond-pays.com'
  
  try {
    // BondPay balance check (using their balance API)
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const signStr = gateway.app_id + timestamp + gateway.api_key
    const sign = await md5(signStr)

    const response = await fetch(`${baseUrl}/api/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: gateway.app_id,
        timestamp,
        sign,
      }),
    })

    const result = await response.json()
    console.log(`BondPay balance response for ${gateway.gateway_code}:`, result)

    if (result.code === 200 || result.status === 'success') {
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
        message: result.msg || result.message || 'Failed to fetch balance',
        last_checked: new Date().toISOString(),
      }
    }
  } catch (error) {
    console.error(`Error checking BondPay balance for ${gateway.gateway_code}:`, error)
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
    default: return thresholds.inr // Default to INR threshold
  }
}

async function sendLowBalanceAlert(
  gateway: GatewayBalance, 
  threshold: number,
  adminChatId: string,
  botToken: string
) {
  const currencySymbol = gateway.currency === 'INR' ? '₹' : 
                         gateway.currency === 'PKR' ? 'Rs.' : 
                         gateway.currency === 'BDT' ? '৳' : '$'
  
  const message = `⚠️ <b>Low Gateway Balance Alert</b>\n\n` +
    `🏦 Gateway: ${gateway.gateway_name}\n` +
    `💰 Balance: ${currencySymbol}${gateway.balance?.toLocaleString() || '0'}\n` +
    `📊 Threshold: ${currencySymbol}${threshold.toLocaleString()}\n` +
    `💱 Currency: ${gateway.currency}\n` +
    `⏰ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n` +
    `<i>Please top up the gateway balance to avoid payout failures.</i>`

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
    console.log('Low balance alert sent for gateway:', gateway.gateway_name)
  } catch (error) {
    console.error('Failed to send low balance alert:', error)
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
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

      if (gateway.gateway_type === 'lgpay') {
        balance = await checkLGPayBalance(gateway)
      } else if (gateway.gateway_type === 'bondpay') {
        balance = await checkBondPayBalance(gateway)
      } else {
        balance = {
          gateway_id: gateway.id,
          gateway_name: gateway.gateway_name,
          gateway_code: gateway.gateway_code,
          currency: gateway.currency,
          balance: null,
          status: 'error',
          message: 'Unknown gateway type',
          last_checked: new Date().toISOString(),
        }
      }

      balances.push(balance)

      // Save balance history
      await saveBalanceHistory(supabaseAdmin, balance)

      // Send alert if balance is below currency-specific threshold
      if (balance.balance !== null && botToken && adminChatId) {
        const threshold = getThresholdForCurrency(balance.currency, thresholds)
        if (balance.balance < threshold) {
          await sendLowBalanceAlert(balance, threshold, adminChatId, botToken)
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
