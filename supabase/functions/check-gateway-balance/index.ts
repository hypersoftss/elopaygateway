import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { md5 } from 'https://esm.sh/js-md5@0.8.3'

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

// LG Pay signature generation (ASCII sorted MD5)
function generateLGPaySign(params: Record<string, string>, apiKey: string): string {
  const sortedKeys = Object.keys(params).sort()
  const signStr = sortedKeys
    .filter(key => params[key] !== '' && params[key] !== undefined && params[key] !== null)
    .map(key => `${key}=${params[key]}`)
    .join('&')
  const finalStr = signStr + '&key=' + apiKey
  return md5(finalStr).toUpperCase()
}

async function checkLGPayBalance(gateway: any): Promise<GatewayBalance> {
  const baseUrl = gateway.base_url || 'https://lgpay.co'
  const timestamp = Math.floor(Date.now() / 1000).toString()
  
  const params: Record<string, string> = {
    app_id: gateway.app_id,
    timestamp,
  }
  
  const sign = generateLGPaySign(params, gateway.api_key)
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
    const sign = md5(signStr)

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

async function sendLowBalanceAlert(
  supabase: any, 
  gateway: GatewayBalance, 
  threshold: number
) {
  const { data: adminSettings } = await supabase
    .from('admin_settings')
    .select('admin_telegram_chat_id, gateway_name')
    .limit(1)
    .maybeSingle()

  if (!adminSettings?.admin_telegram_chat_id) {
    console.log('No admin Telegram chat ID configured for low balance alert')
    return
  }

  const botToken = Deno.env.get('TG_BOT_TOKEN')
  if (!botToken) {
    console.error('TG_BOT_TOKEN not configured')
    return
  }

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
        chat_id: adminSettings.admin_telegram_chat_id,
        text: message,
        parse_mode: 'HTML',
      }),
    })
    console.log('Low balance alert sent for gateway:', gateway.gateway_name)
  } catch (error) {
    console.error('Failed to send low balance alert:', error)
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

    // Get low balance threshold from admin settings
    const { data: adminSettings } = await supabaseAdmin
      .from('admin_settings')
      .select('large_payout_threshold')
      .limit(1)
      .maybeSingle()
    
    // Use payout threshold as low balance threshold (default 5000)
    const lowBalanceThreshold = adminSettings?.large_payout_threshold || 5000

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

      // Send alert if balance is below threshold
      if (balance.balance !== null && balance.balance < lowBalanceThreshold) {
        await sendLowBalanceAlert(supabaseAdmin, balance, lowBalanceThreshold)
      }
    }

    console.log('Gateway balances checked:', balances.length)

    return new Response(
      JSON.stringify({ 
        success: true, 
        balances,
        threshold: lowBalanceThreshold,
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
