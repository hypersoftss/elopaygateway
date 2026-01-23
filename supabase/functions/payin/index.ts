import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Md5 } from 'https://deno.land/std@0.119.0/hash/md5.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateOrderNo(): string {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `PI${timestamp}${random}`
}

// BondPay signature (concatenation style)
function verifyBondPaySignature(params: Record<string, string>, apiKey: string, signature: string): boolean {
  const signStr = `${params.merchant_id}${params.amount}${params.merchant_order_no}${apiKey}${params.callback_url}`
  const hash = new Md5()
  hash.update(signStr)
  const expectedSign = hash.toString()
  console.log('BondPay signature verification:', { signStr, expectedSign, receivedSign: signature })
  return expectedSign.toLowerCase() === signature.toLowerCase()
}

// LG Pay signature (ASCII sorted + uppercase MD5)
function generateLGPaySignature(params: Record<string, any>, key: string): string {
  // Filter out empty values and sign itself
  const filteredParams = Object.entries(params)
    .filter(([k, v]) => v !== '' && v !== null && v !== undefined && k !== 'sign')
    .sort(([a], [b]) => a.localeCompare(b)) // ASCII sort
  
  const queryString = filteredParams
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  
  const signString = `${queryString}&key=${key}`
  console.log('LG Pay sign string:', signString)
  
  const hash = new Md5()
  hash.update(signString)
  return hash.toString().toUpperCase()
}

function generateBondPaySignature(merchantId: string, amount: string, orderNo: string, apiKey: string, callbackUrl: string): string {
  const signStr = `${merchantId}${amount}${orderNo}${apiKey}${callbackUrl}`
  const hash = new Md5()
  hash.update(signStr)
  return hash.toString()
}

async function createNotification(
  supabaseAdmin: any,
  type: string,
  title: string,
  message: string,
  amount: number,
  merchantId: string,
  transactionId?: string
) {
  try {
    await supabaseAdmin.from('admin_notifications').insert({
      notification_type: type,
      title,
      message,
      amount,
      merchant_id: merchantId,
      transaction_id: transactionId || null,
    })
    console.log('Notification created:', title)
  } catch (error) {
    console.error('Failed to create notification:', error)
  }
}

async function sendTelegramNotification(type: string, merchantId: string, data: any) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    await fetch(`${supabaseUrl}/functions/v1/send-telegram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ type, merchantId, data }),
    })
  } catch (error) {
    console.error('Failed to send Telegram notification:', error)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { merchant_id, amount, merchant_order_no, callback_url, sign, extra } = body

    console.log('Payin request received:', { merchant_id, amount, merchant_order_no })

    if (!merchant_id || !amount || !merchant_order_no || !sign) {
      return new Response(
        JSON.stringify({ code: 400, message: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get merchant with gateway info and trade_type
    const { data: merchants, error: merchantError } = await supabaseAdmin
      .from('merchants')
      .select(`
        id, api_key, payin_fee, is_active, callback_url, merchant_name, gateway_id, trade_type,
        payment_gateways (gateway_type)
      `)
      .eq('account_number', merchant_id)
      .limit(1)

    if (merchantError || !merchants || merchants.length === 0) {
      console.error('Merchant not found:', merchant_id)
      return new Response(
        JSON.stringify({ code: 404, message: 'Merchant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const merchant = merchants[0]
    const gatewayType = (merchant.payment_gateways as any)?.gateway_type || 'bondpay'

    if (!merchant.is_active) {
      return new Response(
        JSON.stringify({ code: 403, message: 'Merchant is inactive' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify signature based on gateway type
    // All merchants use the same signature format: md5(merchant_id + amount + merchant_order_no + api_key + callback_url)
    const isValidSign = verifyBondPaySignature(
      { merchant_id, amount: amount.toString(), merchant_order_no, callback_url: callback_url || '' },
      merchant.api_key,
      sign
    )

    if (!isValidSign) {
      console.error('Invalid signature for merchant:', merchant_id, 'Gateway type:', gatewayType)
      return new Response(
        JSON.stringify({ code: 401, message: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('Signature verified for merchant:', merchant_id, 'Gateway type:', gatewayType)

    // Get merchant's gateway configuration
    let gateway = null
    if (merchant.gateway_id) {
      const { data: gatewayData } = await supabaseAdmin
        .from('payment_gateways')
        .select('*')
        .eq('id', merchant.gateway_id)
        .eq('is_active', true)
        .single()
      gateway = gatewayData
    }

    // Fallback to BondPay from admin_settings if no gateway assigned
    if (!gateway) {
      const { data: settings } = await supabaseAdmin
        .from('admin_settings')
        .select('master_merchant_id, master_api_key, bondpay_base_url, large_payin_threshold')
        .limit(1)

      if (!settings || settings.length === 0) {
        console.error('Admin settings not found')
        return new Response(
          JSON.stringify({ code: 500, message: 'System configuration error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      gateway = {
        gateway_type: 'bondpay',
        app_id: settings[0].master_merchant_id,
        api_key: settings[0].master_api_key,
        base_url: settings[0].bondpay_base_url,
        currency: 'INR',
        trade_type: null,
      }
    }

    // Get admin settings for thresholds
    const { data: adminSettings } = await supabaseAdmin
      .from('admin_settings')
      .select('large_payin_threshold')
      .limit(1)

    const amountNum = parseFloat(amount)
    const fee = amountNum * (merchant.payin_fee / 100)
    const netAmount = amountNum - fee
    const orderNo = generateOrderNo()

    // Create internal callback URL
    const internalCallbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/callback-handler`

    let paymentUrl = null
    let gatewayResponse = null

    // Route to appropriate gateway
    if (gateway.gateway_type === 'lgpay') {
      // LG Pay integration - use gateway's trade_type for API (PKRPH, BDTBNK, etc.)
      // Merchant's trade_type (easypaisa, jazzcash, nagad, bkash) is for internal categorization only
      const tradeType = gateway.trade_type || 'test'
      
      console.log('LG Pay payin - Gateway trade_type:', tradeType, 'Merchant trade_type:', merchant.trade_type)
      
      const lgParams: Record<string, any> = {
        app_id: gateway.app_id,
        trade_type: tradeType, // Use gateway's deposit code (PKRPH, BDTBNK, etc.)
        order_sn: orderNo,
        money: Math.round(amountNum * 100), // LG Pay uses cents
        notify_url: internalCallbackUrl,
        ip: '0.0.0.0',
        remark: merchant.id,
      }

      lgParams.sign = generateLGPaySignature(lgParams, gateway.api_key)

      console.log('Calling LG Pay API:', lgParams)

      const formBody = new URLSearchParams()
      Object.entries(lgParams).forEach(([k, v]) => formBody.append(k, String(v)))

      const lgResponse = await fetch(`${gateway.base_url}/api/order/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody.toString()
      })

      gatewayResponse = await lgResponse.json()
      console.log('LG Pay response:', gatewayResponse)

      if (gatewayResponse.status === 1 && gatewayResponse.data?.pay_url) {
        paymentUrl = gatewayResponse.data.pay_url
      }
    } else {
      // BondPay integration (default)
      const bondPaySignature = generateBondPaySignature(
        gateway.app_id,
        amount.toString(),
        orderNo,
        gateway.api_key,
        internalCallbackUrl
      )

      console.log('Calling BondPay API with credentials...')

      const bondPayResponse = await fetch(`${gateway.base_url}/v1/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: gateway.app_id,
          api_key: gateway.api_key,
          amount: amount.toString(),
          merchant_order_no: orderNo,
          callback_url: internalCallbackUrl,
          extra: merchant.id,
          signature: bondPaySignature
        })
      })

      gatewayResponse = await bondPayResponse.json()
      console.log('BondPay response:', gatewayResponse)
      paymentUrl = gatewayResponse.payment_url
    }

    // Create transaction
    const { data: txData, error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        merchant_id: merchant.id,
        gateway_id: merchant.gateway_id || null,
        order_no: orderNo,
        merchant_order_no,
        transaction_type: 'payin',
        amount: amountNum,
        fee,
        net_amount: netAmount,
        status: 'pending',
        payment_url: paymentUrl || null,
        extra: JSON.stringify({ 
          gateway_response: gatewayResponse,
          merchant_callback: callback_url,
          gateway_type: gateway.gateway_type
        })
      })
      .select('id')
      .single()

    if (txError) {
      console.error('Transaction creation error:', txError)
      return new Response(
        JSON.stringify({ code: 500, message: 'Failed to create transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for large transaction and create notification
    if (amountNum >= (adminSettings?.[0]?.large_payin_threshold || 10000)) {
      await createNotification(
        supabaseAdmin,
        'large_payin',
        `Large Pay-in: ₹${amountNum.toLocaleString()}`,
        `Merchant ${merchant.merchant_name} (${merchant_id}) created a large pay-in order of ₹${amountNum.toLocaleString()}`,
        amountNum,
        merchant.id,
        txData?.id
      )
    }

    // Send Telegram notification for payin created
    await sendTelegramNotification('payin_created', merchant.id, {
      orderNo,
      merchantOrderNo: merchant_order_no,
      amount: amountNum,
    })

    console.log('Payin order created successfully:', orderNo)

    return new Response(
      JSON.stringify({
        code: 200,
        message: 'Success',
        success: true,
        data: {
          order_no: orderNo,
          merchant_order_no,
          amount: amountNum,
          fee,
          net_amount: netAmount,
          payment_url: paymentUrl || `https://pay.example.com/${orderNo}`,
          status: 'pending'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Payin error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ code: 500, message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})