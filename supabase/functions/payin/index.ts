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
  return expectedSign.toLowerCase() === signature.toLowerCase()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { merchant_id, amount, merchant_order_no, callback_url, sign } = body

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

    // Verify signature
    const isValidSign = verifySignature(
      { merchant_id, amount: amount.toString(), merchant_order_no, callback_url: callback_url || '' },
      merchant.api_key,
      sign
    )

    if (!isValidSign) {
      return new Response(
        JSON.stringify({ code: 401, message: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate fee and net amount
    const amountNum = parseFloat(amount)
    const fee = amountNum * (merchant.payin_fee / 100)
    const netAmount = amountNum - fee

    // Generate order number
    const orderNo = generateOrderNo()

    // Get admin settings for BondPay forwarding
    const { data: settings } = await supabaseAdmin
      .from('admin_settings')
      .select('master_merchant_id, master_api_key, bondpay_base_url')
      .limit(1)

    const adminSettings = settings?.[0]

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
      })

    if (txError) {
      console.error('Transaction creation error:', txError)
      return new Response(
        JSON.stringify({ code: 500, message: 'Failed to create transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate payment URL (mock for now)
    const paymentUrl = `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '')}/pay/${orderNo}`

    console.log('Payin order created:', orderNo)

    return new Response(
      JSON.stringify({
        code: 200,
        message: 'Success',
        data: {
          order_no: orderNo,
          merchant_order_no,
          amount: amountNum,
          fee,
          net_amount: netAmount,
          payment_url: paymentUrl,
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
