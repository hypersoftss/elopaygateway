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
  // Signature = md5(account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payout_key)
  const signStr = `${params.account_number}${params.amount}${params.bank_name}${params.callback_url}${params.ifsc}${params.merchant_id}${params.name}${params.transaction_id}${payoutKey}`
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

    // Validate required fields
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

    // Get merchant by account number
    const { data: merchants, error: merchantError } = await supabaseAdmin
      .from('merchants')
      .select('id, payout_key, payout_fee, is_active, balance, frozen_balance')
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
      return new Response(
        JSON.stringify({ code: 401, message: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate fee and net amount
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

    // Generate order number
    const orderNo = generateOrderNo()

    // Create transaction record
    const { error: txError } = await supabaseAdmin
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
      })

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

    console.log('Payout order created:', orderNo)

    return new Response(
      JSON.stringify({
        code: 200,
        message: 'Success',
        data: {
          order_no: orderNo,
          merchant_order_no: transaction_id,
          amount: amountNum,
          fee,
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
