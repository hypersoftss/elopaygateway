import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Md5 } from 'https://deno.land/std@0.119.0/hash/md5.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateOrderNo(): string {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `PL${timestamp}${random}`
}

// BondPay signature: simple concatenation
function generateBondPaySignature(merchantId: string, amount: string, orderNo: string, apiKey: string, callbackUrl: string): string {
  const signStr = `${merchantId}${amount}${orderNo}${apiKey}${callbackUrl}`
  const hash = new Md5()
  hash.update(signStr)
  return hash.toString()
}

// HYPER SOFTS signature: ASCII-sorted parameters + &key=secret (uppercase)
function generateHyperSoftsSignature(params: Record<string, any>, key: string): string {
  // Filter out empty values and sign itself
  const filteredParams = Object.entries(params)
    .filter(([k, v]) => v !== '' && v !== null && v !== undefined && k !== 'sign')
    .sort(([a], [b]) => a.localeCompare(b)) // ASCII sort
  
  const queryString = filteredParams
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  
  const signString = `${queryString}&key=${key}`
  console.log('HYPER SOFTS sign string:', signString)
  
  const hash = new Md5()
  hash.update(signString)
  return hash.toString().toUpperCase()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { link_code, success_url, failure_url } = await req.json()

    if (!link_code) {
      return new Response(
        JSON.stringify({ error: 'Link code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing payment link:', link_code)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get payment link with merchant and gateway info
    const { data: linkData, error: linkError } = await supabaseAdmin
      .from('payment_links')
      .select(`
        id,
        link_code,
        amount,
        description,
        is_active,
        expires_at,
        merchant_id,
        trade_type,
        merchants (
          id,
          merchant_name,
          account_number,
          payin_fee,
          callback_url,
          trade_type,
          gateway_id,
          payment_gateways (
            id,
            gateway_type,
            gateway_code,
            currency,
            base_url,
            app_id,
            api_key,
            trade_type
          )
        )
      `)
      .eq('link_code', link_code)
      .limit(1)

    if (linkError || !linkData || linkData.length === 0) {
      console.error('Payment link not found:', link_code)
      return new Response(
        JSON.stringify({ error: 'Payment link not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const link = linkData[0]
    const merchant = link.merchants as unknown as { 
      id: string
      merchant_name: string
      account_number: string
      payin_fee: number
      callback_url: string | null
      trade_type: string | null
      gateway_id: string | null
      payment_gateways: {
        id: string
        gateway_type: string
        gateway_code: string
        currency: string
        base_url: string
        app_id: string
        api_key: string
        trade_type: string | null
      } | null
    }

    // Validate link
    if (!link.is_active) {
      return new Response(
        JSON.stringify({ error: 'Payment link is inactive' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Payment link has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const gateway = merchant?.payment_gateways
    const amount = link.amount
    const fee = amount * ((merchant?.payin_fee || 2) / 100)
    const netAmount = amount - fee
    const orderNo = generateOrderNo()
    const internalCallbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/callback-handler`

    let paymentUrl: string | null = null
    let gatewayOrderNo: string | null = null
    let gatewayId: string | null = null

    // Determine trade_type: link-level > merchant-level > gateway-level
    const tradeType = link.trade_type || merchant?.trade_type || gateway?.trade_type

    // Route based on gateway type (hypersofts = lgpay rebranded)
    if (gateway && (gateway.gateway_type === 'hypersofts' || gateway.gateway_type === 'lgpay')) {
      // HYPER SOFTS Integration
      console.log('Using HYPER SOFTS gateway:', gateway.gateway_code)
      gatewayId = gateway.id

      // Determine trade_type for HYPER SOFTS API
      // PKR always uses 'PKRPH' for deposits (jazzcash/easypaisa are just UI selections)
      // BDT uses the selected trade_type (nagad/bkash)
      // INR uses the selected trade_type (INRUPI/usdt)
      let apiTradeType: string
      if (gateway.currency === 'PKR') {
        apiTradeType = 'PKRPH' // PKR deposits ALWAYS use PKRPH
      } else if (gateway.currency === 'BDT') {
        apiTradeType = tradeType || 'nagad' // BDT uses selected method or default nagad
      } else if (gateway.currency === 'INR') {
        apiTradeType = tradeType || 'INRUPI' // INR uses selected method or default INRUPI
      } else {
        apiTradeType = tradeType || 'INRUPI'
      }

      const hsParams: Record<string, any> = {
        app_id: gateway.app_id,
        trade_type: apiTradeType,
        order_sn: orderNo,
        money: Math.round(amount * 100), // HYPER SOFTS uses cents
        notify_url: internalCallbackUrl,
        ip: '0.0.0.0',
        remark: merchant?.id || link.merchant_id,
      }

      hsParams.sign = generateHyperSoftsSignature(hsParams, gateway.api_key)

      console.log('Calling HYPER SOFTS API:', `${gateway.base_url}/api/order/create`)
      console.log('HYPER SOFTS params:', hsParams)

      const formBody = new URLSearchParams()
      Object.entries(hsParams).forEach(([k, v]) => formBody.append(k, String(v)))

      const hsResponse = await fetch(`${gateway.base_url}/api/order/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody.toString()
      })

      const hsData = await hsResponse.json()
      console.log('HYPER SOFTS response:', hsData)

      if (hsData.status === 1 && hsData.data?.pay_url) {
        paymentUrl = hsData.data.pay_url
        gatewayOrderNo = hsData.data?.order_no || hsData.data?.order_sn
      } else {
        console.error('HYPER SOFTS error:', hsData)
        return new Response(
          JSON.stringify({ error: hsData.msg || 'Gateway error' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

    } else {
      // BondPay Integration (default)
      console.log('Using BondPay gateway (default)')

      // Get admin settings for BondPay credentials
      const { data: settings, error: settingsError } = await supabaseAdmin
        .from('admin_settings')
        .select('master_merchant_id, master_api_key, bondpay_base_url, large_payin_threshold')
        .limit(1)

      if (settingsError || !settings || settings.length === 0) {
        console.error('Admin settings not found')
        return new Response(
          JSON.stringify({ error: 'System configuration error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const adminSettings = settings[0]

      const bondPaySignature = generateBondPaySignature(
        adminSettings.master_merchant_id,
        amount.toString(),
        orderNo,
        adminSettings.master_api_key,
        internalCallbackUrl
      )

      console.log('Calling BondPay API:', `${adminSettings.bondpay_base_url}/v1/create`)

      const bondPayResponse = await fetch(`${adminSettings.bondpay_base_url}/v1/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: adminSettings.master_merchant_id,
          api_key: adminSettings.master_api_key,
          amount: amount.toString(),
          merchant_order_no: orderNo,
          callback_url: internalCallbackUrl,
          extra: merchant?.id || link.merchant_id,
          signature: bondPaySignature
        })
      })

      const bondPayData = await bondPayResponse.json()
      console.log('BondPay response:', bondPayData)

      paymentUrl = bondPayData.payment_url
      gatewayOrderNo = bondPayData.order_no
    }

    // Create transaction record
    const { data: txData, error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        merchant_id: merchant?.id || link.merchant_id,
        gateway_id: gatewayId,
        order_no: orderNo,
        merchant_order_no: `LINK-${link_code}`,
        transaction_type: 'payin',
        amount: amount,
        fee,
        net_amount: netAmount,
        status: 'pending',
        payment_url: paymentUrl,
        extra: JSON.stringify({ 
          gateway_order: gatewayOrderNo,
          payment_link_code: link_code,
          payment_link_id: link.id,
          merchant_callback: merchant?.callback_url,
          success_url: success_url || null,
          failure_url: failure_url || null,
          trade_type: tradeType
        })
      })
      .select('id')
      .single()

    if (txError) {
      console.error('Transaction creation error:', txError)
      return new Response(
        JSON.stringify({ error: 'Failed to create transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get admin settings for notification threshold
    const { data: adminSettings } = await supabaseAdmin
      .from('admin_settings')
      .select('large_payin_threshold')
      .limit(1)
    
    const threshold = adminSettings?.[0]?.large_payin_threshold || 10000

    // Create notification for large transaction
    if (amount >= threshold) {
      await supabaseAdmin.from('admin_notifications').insert({
        notification_type: 'large_payin',
        title: `Large Payment Link: ${gateway?.currency === 'PKR' ? 'Rs.' : gateway?.currency === 'BDT' ? '৳' : '₹'}${amount.toLocaleString()}`,
        message: `Payment link ${link_code} for ${amount.toLocaleString()} is being processed`,
        amount: amount,
        merchant_id: merchant?.id || link.merchant_id,
        transaction_id: txData?.id
      })
    }

    console.log('Payment link order created:', orderNo)

    // Return payment URL for redirection
    return new Response(
      JSON.stringify({
        success: true,
        order_no: orderNo,
        amount: amount,
        payment_url: paymentUrl,
        merchant_name: merchant?.merchant_name,
        description: link.description
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Payment link pay error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})