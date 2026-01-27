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

    if (!merchant_id || !amount || !transaction_id || !account_number || !name || !bank_name || !sign) {
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
    
    // Minimum payout amount (configurable, default 100)
    const MIN_PAYOUT_AMOUNT = 100
    if (amountNum < MIN_PAYOUT_AMOUNT) {
      console.error('Amount below minimum threshold:', amountNum)
      return new Response(
        JSON.stringify({ code: 400, message: `Payout amount must be at least ${MIN_PAYOUT_AMOUNT}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Maximum payout amount (safety limit)
    const MAX_PAYOUT_AMOUNT = 5000000 // 50 lakh
    if (amountNum > MAX_PAYOUT_AMOUNT) {
      console.error('Amount exceeds maximum threshold:', amountNum)
      return new Response(
        JSON.stringify({ code: 400, message: `Payout amount cannot exceed ${MAX_PAYOUT_AMOUNT}` }),
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
      .select('id, payout_key, payout_fee, is_active, balance, frozen_balance, merchant_name, gateway_id, trade_type')
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
        ifsc: ifsc || '', 
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

    // amountNum already validated above
    const fee = amountNum * (merchant.payout_fee / 100)
    const totalDeduction = amountNum + fee

    // Check balance
    if (merchant.balance < totalDeduction) {
      return new Response(
        JSON.stringify({ code: 400, message: 'Insufficient balance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get admin settings for thresholds
    const { data: settings } = await supabaseAdmin
      .from('admin_settings')
      .select('large_payout_threshold')
      .limit(1)

    const adminSettings = settings?.[0]
    const orderNo = generateOrderNo()

    // Create transaction in PENDING state - admin must approve before gateway call
    // Store trade_type in extra field for process-payout to use
    const { data: txData, error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        merchant_id: merchant.id,
        gateway_id: merchant.gateway_id || null,
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
        ifsc_code: ifsc || null,
        callback_data: { merchant_callback: callback_url },
        extra: JSON.stringify({ trade_type: merchant.trade_type })
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

    // Deduct balance and freeze - will be processed when admin approves
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

    // Create notification for admin
    await createNotification(
      supabaseAdmin,
      'new_payout_request',
      `New Payout: ₹${amountNum.toLocaleString()}`,
      `Merchant ${merchant.merchant_name} (${merchant_id}) requested payout of ₹${amountNum.toLocaleString()} to ${bank_name} - ${account_number}`,
      amountNum,
      merchant.id,
      txData?.id
    )

    // Also check for large transaction notification
    if (amountNum >= (adminSettings?.large_payout_threshold || 5000)) {
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

    // Send Telegram notification for payout created
    await sendTelegramNotification('payout_created', merchant.id, {
      orderNo,
      amount: amountNum,
      bankName: bank_name,
      accountNumber: account_number,
    })

    // Send LARGE TRANSACTION ALERT to admin if threshold exceeded
    const largePayoutThreshold = adminSettings?.large_payout_threshold || 50000
    if (amountNum >= largePayoutThreshold) {
      console.log('Large payout detected, sending alert:', amountNum, '>=', largePayoutThreshold)
      await sendTelegramNotification('large_payout_alert', merchant.id, {
        orderNo,
        amount: amountNum,
        bankName: bank_name,
        accountNumber: account_number,
        threshold: largePayoutThreshold,
      })
    }

    console.log('Payout order created (pending admin approval):', orderNo)

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
          status: 'pending',
          note: 'Awaiting admin approval'
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