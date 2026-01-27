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

// HYPER PAY signature (concatenation style)
function verifyHyperPaySignature(params: Record<string, string>, apiKey: string, signature: string): boolean {
  const signStr = `${params.merchant_id}${params.amount}${params.merchant_order_no}${apiKey}${params.callback_url}`
  const hash = new Md5()
  hash.update(signStr)
  const expectedSign = hash.toString()
  console.log('HYPER PAY signature verification:', { signStr, expectedSign, receivedSign: signature })
  return expectedSign.toLowerCase() === signature.toLowerCase()
}

// ELOPAY signature (ASCII sorted + uppercase MD5)
function generateEloPaySignature(params: Record<string, any>, key: string): string {
  // Filter out empty values and sign itself
  const filteredParams = Object.entries(params)
    .filter(([k, v]) => v !== '' && v !== null && v !== undefined && k !== 'sign')
    .sort(([a], [b]) => a.localeCompare(b)) // ASCII sort
  
  const queryString = filteredParams
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  
  const signString = `${queryString}&key=${key}`
  console.log('ELOPAY sign string:', signString)
  
  const hash = new Md5()
  hash.update(signString)
  return hash.toString().toUpperCase()
}

function generateHyperPaySignature(merchantId: string, amount: string, orderNo: string, apiKey: string, callbackUrl: string): string {
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
    const { merchant_id, amount, merchant_order_no, callback_url, sign, extra, trade_type: requestTradeType } = body

    console.log('Payin request received:', { merchant_id, amount, merchant_order_no, trade_type: requestTradeType })

    if (!merchant_id || !amount || !merchant_order_no || !sign) {
      return new Response(
        JSON.stringify({ code: 400, message: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate amount format and value
    const amountStr = String(amount)
    const amountNum = parseFloat(amountStr)
    
    // Check for valid number
    if (isNaN(amountNum)) {
      console.error('Invalid amount format:', amount)
      return new Response(
        JSON.stringify({ code: 400, message: 'Invalid amount: must be a valid number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Check for positive amount
    if (amountNum <= 0) {
      console.error('Invalid amount value (not positive):', amountNum)
      return new Response(
        JSON.stringify({ code: 400, message: 'Invalid amount: must be greater than zero' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Validate decimal precision (max 2 decimal places for currency)
    if (!/^\d+(\.\d{1,2})?$/.test(amountStr) && !/^\d+$/.test(amountStr)) {
      console.error('Invalid amount precision:', amount)
      return new Response(
        JSON.stringify({ code: 400, message: 'Invalid amount: maximum 2 decimal places allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Minimum transaction amount (configurable, default 10)
    const MIN_TRANSACTION_AMOUNT = 10
    if (amountNum < MIN_TRANSACTION_AMOUNT) {
      console.error('Amount below minimum threshold:', amountNum)
      return new Response(
        JSON.stringify({ code: 400, message: `Amount must be at least ${MIN_TRANSACTION_AMOUNT}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Maximum transaction amount (safety limit)
    const MAX_TRANSACTION_AMOUNT = 10000000 // 1 crore
    if (amountNum > MAX_TRANSACTION_AMOUNT) {
      console.error('Amount exceeds maximum threshold:', amountNum)
      return new Response(
        JSON.stringify({ code: 400, message: `Amount cannot exceed ${MAX_TRANSACTION_AMOUNT}` }),
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
    const gatewayType = (merchant.payment_gateways as any)?.gateway_type || 'hyperpay'

    if (!merchant.is_active) {
      return new Response(
        JSON.stringify({ code: 403, message: 'Merchant is inactive' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify signature based on gateway type
    // All merchants use the same signature format: md5(merchant_id + amount + merchant_order_no + api_key + callback_url)
    const isValidSign = verifyHyperPaySignature(
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

    // Fallback to HYPER PAY from admin_settings if no gateway assigned
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
        gateway_type: 'hyperpay',
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

    // amountNum already validated above
    const fee = amountNum * (merchant.payin_fee / 100)
    const netAmount = amountNum - fee
    const orderNo = generateOrderNo()

    // Create internal callback URL
    const internalCallbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/callback-handler`

    let paymentUrl = null
    let gatewayResponse = null

    // Route to appropriate gateway
    if (gateway.gateway_type === 'hypersofts' || gateway.gateway_type === 'lgpay') {
      // ELOPAY integration - trade_type logic varies by gateway_code:
      // - ELOPAY_PKR: Use REQUEST's trade_type (PKRPH for JazzCash, PKRPH-EASY for Easypaisa)
      // - ELOPAY_BDT: Use REQUEST's trade_type (Nagad, bKash)
      // - ELOPAY_INR: Use REQUEST's trade_type or gateway default (INRUPI/usdt)
      let tradeType = gateway.trade_type || 'INRUPI'
      
      if (gateway.gateway_code === 'ELOPAY_PKR' || gateway.gateway_code === 'hypersofts_pkr') {
        // For PKR, use REQUEST's trade_type to select JazzCash (PKRPH) or Easypaisa (PKRPH-EASY)
        // Fall back to gateway default if not provided
        tradeType = requestTradeType || gateway.trade_type || 'PKRPH'
      } else if ((gateway.gateway_code === 'ELOPAY_BDT' || gateway.gateway_code === 'hypersofts_bdt')) {
        // For BDT, use REQUEST's trade_type (Nagad/bKash) or merchant default
        tradeType = requestTradeType || merchant.trade_type || 'nagad'
      } else if ((gateway.gateway_code === 'ELOPAY_INR' || gateway.gateway_code === 'hypersofts_inr')) {
        // For INR, use REQUEST's trade_type or merchant/gateway default
        tradeType = requestTradeType || merchant.trade_type || gateway.trade_type || 'INRUPI'
      }
      
      console.log('ELOPAY payin - Gateway code:', gateway.gateway_code, 'Currency:', gateway.currency, 'Trade type:', tradeType, 'Request trade_type:', requestTradeType)
      
      const hsParams: Record<string, any> = {
        app_id: gateway.app_id,
        trade_type: tradeType,
        order_sn: orderNo,
        money: Math.round(amountNum * 100), // HYPER SOFTS uses cents
        notify_url: internalCallbackUrl,
        ip: '0.0.0.0',
        remark: merchant.id,
      }

      hsParams.sign = generateEloPaySignature(hsParams, gateway.api_key)

      console.log('Calling ELOPAY API:', hsParams)

      const formBody = new URLSearchParams()
      Object.entries(hsParams).forEach(([k, v]) => formBody.append(k, String(v)))

      const hsResponse = await fetch(`${gateway.base_url}/api/order/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody.toString()
      })

      gatewayResponse = await hsResponse.json()
      console.log('ELOPAY response:', gatewayResponse)

      if (gatewayResponse.status === 1 && gatewayResponse.data?.pay_url) {
        paymentUrl = gatewayResponse.data.pay_url
      }
    } else if (gateway.gateway_type === 'hyperpay' || gateway.gateway_type === 'bondpay') {
      // ELOPAYGATEWAY integration (explicitly handling hyperpay/bondpay gateway types)
      console.log('Using ELOPAYGATEWAY gateway:', gateway.gateway_code || 'default')
      
      const eloPayGatewaySignature = generateHyperPaySignature(
        gateway.app_id,
        amount.toString(),
        orderNo,
        gateway.api_key,
        internalCallbackUrl
      )

      console.log('Calling ELOPAYGATEWAY API:', `${gateway.base_url}/v1/create`)

      const eloPayGatewayResponse = await fetch(`${gateway.base_url}/v1/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: gateway.app_id,
          api_key: gateway.api_key,
          amount: amount.toString(),
          merchant_order_no: orderNo,
          callback_url: internalCallbackUrl,
          extra: merchant.id,
          signature: eloPayGatewaySignature
        })
      })

      gatewayResponse = await eloPayGatewayResponse.json()
      console.log('ELOPAYGATEWAY response:', gatewayResponse)
      
      if (gatewayResponse.payment_url) {
        paymentUrl = gatewayResponse.payment_url
      } else {
        console.error('ELOPAYGATEWAY error:', gatewayResponse)
        return new Response(
          JSON.stringify({ code: 400, message: gatewayResponse.message || 'Gateway error' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // Fallback for unknown gateway types - treat as ELOPAYGATEWAY
      console.log('Using fallback ELOPAYGATEWAY logic for unknown gateway type:', gateway.gateway_type)
      
      const fallbackSignature = generateHyperPaySignature(
        gateway.app_id,
        amount.toString(),
        orderNo,
        gateway.api_key,
        internalCallbackUrl
      )

      const fallbackResponse = await fetch(`${gateway.base_url}/v1/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: gateway.app_id,
          api_key: gateway.api_key,
          amount: amount.toString(),
          merchant_order_no: orderNo,
          callback_url: internalCallbackUrl,
          extra: merchant.id,
          signature: fallbackSignature
        })
      })

      gatewayResponse = await fallbackResponse.json()
      console.log('Fallback ELOPAYGATEWAY response:', gatewayResponse)
      
      if (gatewayResponse.payment_url) {
        paymentUrl = gatewayResponse.payment_url
      } else {
        console.error('Fallback gateway error:', gatewayResponse)
        return new Response(
          JSON.stringify({ code: 400, message: gatewayResponse.message || 'Gateway error' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
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

    // Always create notification for new payin
    await createNotification(
      supabaseAdmin,
      amountNum >= (adminSettings?.[0]?.large_payin_threshold || 10000) ? 'large_payin' : 'new_payin',
      amountNum >= (adminSettings?.[0]?.large_payin_threshold || 10000) 
        ? `🔔 Large Pay-in: ₹${amountNum.toLocaleString()}`
        : `🔔 New Pay-in: ₹${amountNum.toLocaleString()}`,
      `Merchant ${merchant.merchant_name} (${merchant_id}) created a pay-in order of ₹${amountNum.toLocaleString()}`,
      amountNum,
      merchant.id,
      txData?.id
    )

    // Send Telegram notification for payin created
    await sendTelegramNotification('payin_created', merchant.id, {
      orderNo,
      merchantOrderNo: merchant_order_no,
      amount: amountNum,
    })

    // Send LARGE TRANSACTION ALERT to admin if threshold exceeded
    const largePayinThreshold = adminSettings?.[0]?.large_payin_threshold || 100000
    if (amountNum >= largePayinThreshold) {
      console.log('Large payin detected, sending alert:', amountNum, '>=', largePayinThreshold)
      await sendTelegramNotification('large_payin_alert', merchant.id, {
        orderNo,
        merchantOrderNo: merchant_order_no,
        amount: amountNum,
        threshold: largePayinThreshold,
      })
    }

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