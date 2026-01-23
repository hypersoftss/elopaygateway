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
    const { link_code } = await req.json()

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

    // Get payment link with merchant info
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
        merchants (
          id,
          merchant_name,
          account_number,
          payin_fee,
          callback_url
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
    const amount = link.amount
    const fee = amount * ((merchant?.payin_fee || 2) / 100)
    const netAmount = amount - fee
    const orderNo = generateOrderNo()

    // Create internal callback URL
    const internalCallbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/callback-handler`

    // Generate BondPay signature
    const bondPaySignature = generateBondPaySignature(
      adminSettings.master_merchant_id,
      amount.toString(),
      orderNo,
      adminSettings.master_api_key,
      internalCallbackUrl
    )

    console.log('Calling BondPay API for payment link...')
    console.log('BondPay URL:', `${adminSettings.bondpay_base_url}/v1/create`)

    // Call BondPay API to create payment
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

    // Create transaction record
    const { data: txData, error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        merchant_id: merchant?.id || link.merchant_id,
        order_no: orderNo,
        merchant_order_no: `LINK-${link_code}`,
        transaction_type: 'payin',
        amount: amount,
        fee,
        net_amount: netAmount,
        status: 'pending',
        payment_url: bondPayData.payment_url || null,
        extra: JSON.stringify({ 
          bondpay_order: bondPayData.order_no,
          payment_link_code: link_code,
          payment_link_id: link.id,
          merchant_callback: merchant?.callback_url
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

    // Create notification for large transaction
    if (amount >= (adminSettings.large_payin_threshold || 10000)) {
      await supabaseAdmin.from('admin_notifications').insert({
        notification_type: 'large_payin',
        title: `Large Payment Link: ₹${amount.toLocaleString()}`,
        message: `Payment link ${link_code} for ₹${amount.toLocaleString()} is being processed`,
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
        payment_url: bondPayData.payment_url || null,
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