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

function verifySignature(params: Record<string, string>, apiKey: string, signature: string): boolean {
  // Signature = md5(merchant_id + amount + merchant_order_no + api_key + callback_url)
  const signStr = `${params.merchant_id}${params.amount}${params.merchant_order_no}${apiKey}${params.callback_url}`
  const hash = new Md5()
  hash.update(signStr)
  const expectedSign = hash.toString()
  console.log('Payin signature verification:', { signStr, expectedSign, receivedSign: signature })
  return expectedSign.toLowerCase() === signature.toLowerCase()
}

function generateBondPaySignature(merchantId: string, amount: string, orderNo: string, apiKey: string, callbackUrl: string): string {
  const signStr = `${merchantId}${amount}${orderNo}${apiKey}${callbackUrl}`
  const hash = new Md5()
  hash.update(signStr)
  return hash.toString()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { merchant_id, amount, merchant_order_no, callback_url, sign, extra } = body

    console.log('Payin request received:', { merchant_id, amount, merchant_order_no })

    // Validate required fields
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

    // Get merchant by account number
    const { data: merchants, error: merchantError } = await supabaseAdmin
      .from('merchants')
      .select('id, api_key, payin_fee, is_active, callback_url')
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

    if (!merchant.is_active) {
      return new Response(
        JSON.stringify({ code: 403, message: 'Merchant is inactive' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify signature using merchant's own API key
    const isValidSign = verifySignature(
      { merchant_id, amount: amount.toString(), merchant_order_no, callback_url: callback_url || '' },
      merchant.api_key,
      sign
    )

    if (!isValidSign) {
      console.error('Invalid signature for merchant:', merchant_id)
      return new Response(
        JSON.stringify({ code: 401, message: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get admin settings for BondPay master credentials
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('admin_settings')
      .select('master_merchant_id, master_api_key, bondpay_base_url')
      .limit(1)

    if (settingsError || !settings || settings.length === 0) {
      console.error('Admin settings not found')
      return new Response(
        JSON.stringify({ code: 500, message: 'System configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminSettings = settings[0]

    // Calculate fee and net amount
    const amountNum = parseFloat(amount)
    const fee = amountNum * (merchant.payin_fee / 100)
    const netAmount = amountNum - fee

    // Generate our own order number
    const orderNo = generateOrderNo()

    // Create our internal callback URL for BondPay to call us
    const internalCallbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/callback-handler`

    // Generate signature for BondPay using master credentials
    const bondPaySignature = generateBondPaySignature(
      adminSettings.master_merchant_id,
      amount.toString(),
      orderNo,
      adminSettings.master_api_key,
      internalCallbackUrl
    )

    console.log('Calling BondPay API with master credentials...')

    // Call BondPay API with master credentials
    const bondPayResponse = await fetch(`${adminSettings.bondpay_base_url}/v1/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: adminSettings.master_merchant_id,
        api_key: adminSettings.master_api_key,
        amount: amount.toString(),
        merchant_order_no: orderNo,
        callback_url: internalCallbackUrl,
        extra: merchant.id, // Store merchant ID for callback routing
        signature: bondPaySignature
      })
    })

    const bondPayData = await bondPayResponse.json()
    console.log('BondPay response:', bondPayData)

    // Create transaction record
    const { error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        merchant_id: merchant.id,
        order_no: orderNo,
        merchant_order_no,
        transaction_type: 'payin',
        amount: amountNum,
        fee,
        net_amount: netAmount,
        status: 'pending',
        payment_url: bondPayData.payment_url || null,
        extra: JSON.stringify({ 
          bondpay_order: bondPayData.order_no,
          merchant_callback: callback_url
        })
      })

    if (txError) {
      console.error('Transaction creation error:', txError)
      return new Response(
        JSON.stringify({ code: 500, message: 'Failed to create transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Payin order created successfully:', orderNo)

    // Return response with BondPay payment URL
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
          payment_url: bondPayData.payment_url || `https://pay.example.com/${orderNo}`,
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
