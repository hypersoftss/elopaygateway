import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Md5 } from 'https://deno.land/std@0.119.0/hash/md5.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateOrderNo(): string {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `PO${timestamp}${random}`
}

function verifySignature(params: Record<string, string>, payoutKey: string, signature: string): boolean {
  const signStr = `${params.account_number}${params.amount}${params.bank_name}${params.callback_url}${params.ifsc}${params.merchant_id}${params.name}${params.transaction_id}${payoutKey}`
  const hash = new Md5()
  hash.update(signStr)
  const expectedSign = hash.toString()
  console.log('Payout signature verification:', { signStr, expectedSign, receivedSign: signature })
  return expectedSign.toLowerCase() === signature.toLowerCase()
}

function generateBondPayPayoutSignature(
  accountNumber: string, 
  amount: string, 
  bankName: string, 
  callbackUrl: string, 
  ifsc: string, 
  merchantId: string, 
  name: string, 
  transactionId: string, 
  payoutKey: string
): string {
  const signStr = `${accountNumber}${amount}${bankName}${callbackUrl}${ifsc}${merchantId}${name}${transactionId}${payoutKey}`
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { 
      merchant_id, 
      amount, 
      transaction_id, 
      account_number, 
      ifsc, 
      name, 
      bank_name, 
      callback_url,
      sign 
    } = body

    console.log('Payout request received:', { merchant_id, amount, transaction_id })

    if (!merchant_id || !amount || !transaction_id || !account_number || !ifsc || !name || !bank_name || !sign) {
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

    // Get merchant
    const { data: merchants, error: merchantError } = await supabaseAdmin
      .from('merchants')
      .select('id, payout_key, payout_fee, is_active, balance, frozen_balance, merchant_name')
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

    // Verify signature
    const isValidSign = verifySignature(
      { 
        account_number, 
        amount: amount.toString(), 
        bank_name, 
        callback_url: callback_url || '', 
        ifsc, 
        merchant_id, 
        name, 
        transaction_id 
      },
      merchant.payout_key,
      sign
    )

    if (!isValidSign) {
      console.error('Invalid signature for merchant:', merchant_id)
      return new Response(
        JSON.stringify({ code: 401, message: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const amountNum = parseFloat(amount)
    const fee = amountNum * (merchant.payout_fee / 100)
    const totalDeduction = amountNum + fee

    // Check balance
    if (merchant.balance < totalDeduction) {
      return new Response(
        JSON.stringify({ code: 400, message: 'Insufficient balance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get admin settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('admin_settings')
      .select('master_merchant_id, master_payout_key, bondpay_base_url, large_payout_threshold')
      .limit(1)

    if (settingsError || !settings || settings.length === 0) {
      console.error('Admin settings not found')
      return new Response(
        JSON.stringify({ code: 500, message: 'System configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminSettings = settings[0]
    const orderNo = generateOrderNo()
    const internalCallbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/callback-handler`

    // Generate BondPay signature
    const bondPaySignature = generateBondPayPayoutSignature(
      account_number,
      amount.toString(),
      bank_name,
      internalCallbackUrl,
      ifsc,
      adminSettings.master_merchant_id,
      name,
      orderNo,
      adminSettings.master_payout_key
    )

    console.log('Calling BondPay Payout API...')

    // Call BondPay API
    const formData = new URLSearchParams()
    formData.append('merchant_id', adminSettings.master_merchant_id)
    formData.append('amount', amount.toString())
    formData.append('transaction_id', orderNo)
    formData.append('account_number', account_number)
    formData.append('ifsc', ifsc)
    formData.append('name', name)
    formData.append('bank_name', bank_name)
    formData.append('callback_url', internalCallbackUrl)
    formData.append('signature', bondPaySignature)

    const bondPayResponse = await fetch(`${adminSettings.bondpay_base_url}/payout/payment.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    })

    const bondPayData = await bondPayResponse.json()
    console.log('BondPay Payout response:', bondPayData)

    // Create transaction
    const { data: txData, error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        merchant_id: merchant.id,
        order_no: orderNo,
        merchant_order_no: transaction_id,
        transaction_type: 'payout',
        amount: amountNum,
        fee,
        net_amount: amountNum,
        status: 'pending',
        bank_name,
        account_number,
        account_holder_name: name,
        ifsc_code: ifsc,
        extra: JSON.stringify({
          bondpay_response: bondPayData,
          merchant_callback: callback_url
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

    // Deduct balance and freeze
    const { error: balanceError } = await supabaseAdmin
      .from('merchants')
      .update({
        balance: merchant.balance - totalDeduction,
        frozen_balance: (merchant.frozen_balance || 0) + totalDeduction,
      })
      .eq('id', merchant.id)

    if (balanceError) {
      console.error('Balance update error:', balanceError)
    }

    // Check for large transaction and create notification
    if (amountNum >= (adminSettings.large_payout_threshold || 5000)) {
      await createNotification(
        supabaseAdmin,
        'large_payout',
        `Large Pay-out: ₹${amountNum.toLocaleString()}`,
        `Merchant ${merchant.merchant_name} (${merchant_id}) requested a pay-out of ₹${amountNum.toLocaleString()} to ${bank_name}`,
        amountNum,
        merchant.id,
        txData?.id
      )
    }

    console.log('Payout order created successfully:', orderNo)

    return new Response(
      JSON.stringify({
        code: 200,
        message: 'Success',
        status: 'success',
        data: {
          order_no: orderNo,
          merchant_order_no: transaction_id,
          amount: amountNum,
          fee,
          total_amount: totalDeduction,
          status: 'pending'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Payout error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ code: 500, message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
