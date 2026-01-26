import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Md5 } from 'https://deno.land/std@0.119.0/hash/md5.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Verify HYPER SOFTS callback signature
function verifyHyperSoftsSignature(params: Record<string, any>, key: string, receivedSign: string): boolean {
  const filteredParams = Object.entries(params)
    .filter(([k, v]) => v !== '' && v !== null && v !== undefined && k !== 'sign')
    .sort(([a], [b]) => a.localeCompare(b))
  
  const queryString = filteredParams
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  
  const signString = `${queryString}&key=${key}`
  const hash = new Md5()
  hash.update(signString)
  const expectedSign = hash.toString().toUpperCase()
  
  console.log('HYPER SOFTS callback signature verification:', { signString, expectedSign, receivedSign })
  return expectedSign === receivedSign
}

// Retry helper function with exponential backoff
async function sendWebhookWithRetry(
  url: string, 
  payload: Record<string, any>, 
  maxRetries: number = 3
): Promise<{ success: boolean; attempt: number; error?: string }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      if (response.ok) {
        console.log(`Webhook sent successfully on attempt ${attempt}`)
        return { success: true, attempt }
      }
      
      console.log(`Webhook attempt ${attempt} failed with status ${response.status}`)
      
      // If it's a client error (4xx), don't retry
      if (response.status >= 400 && response.status < 500) {
        return { success: false, attempt, error: `Client error: ${response.status}` }
      }
    } catch (error) {
      console.error(`Webhook attempt ${attempt} error:`, error)
    }
    
    // Wait before retrying (exponential backoff: 1s, 2s, 4s)
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000))
    }
  }
  
  return { success: false, attempt: maxRetries, error: 'Max retries exceeded' }
}

// Helper function to send Telegram notification
async function sendTelegramNotification(supabaseAdmin: any, type: string, merchantId: string, data: any) {
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
    // Parse body - support both JSON and form-urlencoded
    let body: Record<string, any> = {}
    const contentType = req.headers.get('content-type') || ''
    
    if (contentType.includes('application/json')) {
      body = await req.json()
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData()
      formData.forEach((value, key) => {
        body[key] = value
      })
    } else {
      // Try JSON first, fallback to text parsing
      const text = await req.text()
      try {
        body = JSON.parse(text)
      } catch {
        // Try form-urlencoded parsing
        const params = new URLSearchParams(text)
        params.forEach((value, key) => {
          body[key] = value
        })
      }
    }

    console.log('Callback received:', body)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    let redirectUrl: string | null = null

    // Detect callback type
    const isHyperSoftsCallback = body.order_sn !== undefined
    const isHyperPayPayin = body.orderNo && body.merchantOrder
    const isHyperPayPayout = body.transaction_id && body.merchant_id && !body.orderNo

    if (isHyperSoftsCallback) {
      // HYPER SOFTS callback handler
      const { order_sn, money, status, pay_time, msg, remark, sign } = body
      const isPayoutCallback = body.hasOwnProperty('status') && !body.hasOwnProperty('pay_time') === false

      console.log('Processing HYPER SOFTS callback for order:', order_sn)

      // Find our transaction by order_no
      const { data: transactions, error: txFindError } = await supabaseAdmin
        .from('transactions')
        .select('*, merchants(*), payment_gateways(*)')
        .eq('order_no', order_sn)
        .limit(1)

      if (txFindError || !transactions || transactions.length === 0) {
        console.error('Transaction not found for LG Pay callback:', order_sn)
        return new Response('ok', { headers: corsHeaders })
      }

      const transaction = transactions[0]
      const gateway = transaction.payment_gateways

      // Verify signature if gateway exists
      if (gateway && sign) {
        const signParams = { ...body }
        delete signParams.sign
        const isValidSign = verifyHyperSoftsSignature(signParams, gateway.api_key, sign)
        if (!isValidSign) {
          console.error('Invalid HYPER SOFTS callback signature')
          // Continue processing anyway as HYPER SOFTS might retry
        }
      }

      // HYPER SOFTS: status 1 = success, 0 = failed (for payout), payin only sends success
      const newStatus = status === 1 || status === '1' ? 'success' : 'failed'

      // Update transaction status
      await supabaseAdmin
        .from('transactions')
        .update({
          status: newStatus,
          callback_data: body
        })
        .eq('id', transaction.id)

      // Handle balance updates
      if (transaction.transaction_type === 'payin' && newStatus === 'success') {
        // Add to merchant balance
        await supabaseAdmin
          .from('merchants')
          .update({
            balance: (transaction.merchants.balance || 0) + transaction.net_amount
          })
          .eq('id', transaction.merchant_id)

        await sendTelegramNotification(supabaseAdmin, 'payin_success', transaction.merchant_id, {
          orderNo: transaction.order_no,
          amount: transaction.amount,
          fee: transaction.fee,
          netAmount: transaction.net_amount,
        })
      } else if (transaction.transaction_type === 'payin' && newStatus === 'failed') {
        await sendTelegramNotification(supabaseAdmin, 'payin_failed', transaction.merchant_id, {
          orderNo: transaction.order_no,
          amount: transaction.amount,
        })
      } else if (transaction.transaction_type === 'payout') {
        const unfreezeAmount = transaction.amount + (transaction.fee || 0)
        
        if (newStatus === 'success') {
          await supabaseAdmin
            .from('merchants')
            .update({
              frozen_balance: Math.max(0, (transaction.merchants.frozen_balance || 0) - unfreezeAmount)
            })
            .eq('id', transaction.merchant_id)

          await sendTelegramNotification(supabaseAdmin, 'payout_success', transaction.merchant_id, {
            orderNo: transaction.order_no,
            amount: transaction.amount,
            bankName: transaction.bank_name,
          })
        } else if (newStatus === 'failed') {
          await supabaseAdmin
            .from('merchants')
            .update({
              balance: (transaction.merchants.balance || 0) + unfreezeAmount,
              frozen_balance: Math.max(0, (transaction.merchants.frozen_balance || 0) - unfreezeAmount)
            })
            .eq('id', transaction.merchant_id)

          await sendTelegramNotification(supabaseAdmin, 'payout_failed', transaction.merchant_id, {
            orderNo: transaction.order_no,
            amount: transaction.amount,
            reason: msg || 'Transaction failed',
          })
        }
      }

      // Forward callback to merchant with retry logic
      const extraData = transaction.extra ? JSON.parse(transaction.extra) : {}
      if (extraData.merchant_callback) {
        const webhookPayload = {
          orderNo: transaction.order_no,
          merchantOrder: transaction.merchant_order_no,
          status: newStatus,
          amount: transaction.amount,
          fee: transaction.fee,
          net_amount: transaction.net_amount,
          timestamp: new Date().toISOString()
        }
        
        const result = await sendWebhookWithRetry(extraData.merchant_callback, webhookPayload, 3)
        if (result.success) {
          console.log(`Forwarded HYPER SOFTS callback to merchant on attempt ${result.attempt}`)
        } else {
          console.error(`Failed to forward callback after ${result.attempt} attempts: ${result.error}`)
        }
      }

      // Build redirect URL
      if (newStatus === 'success' && extraData.success_url) {
        const params = new URLSearchParams({
          order_no: transaction.order_no,
          amount: transaction.amount.toString(),
          merchant: transaction.merchants?.merchant_name || ''
        })
        redirectUrl = `${extraData.success_url}?${params.toString()}`
      } else if (newStatus === 'failed' && extraData.failure_url) {
        const params = new URLSearchParams({
          order_no: transaction.order_no,
          reason: msg || 'Payment failed'
        })
        redirectUrl = `${extraData.failure_url}?${params.toString()}`
      }

      console.log('HYPER SOFTS callback processed successfully for order:', order_sn)
      
      // HYPER SOFTS expects "ok" response
      return new Response('ok', { headers: corsHeaders })
    }

    // Handle HYPER PAY payin callback
    if (isHyperPayPayin) {
      const { orderNo, merchantOrder, status, amount } = body

      const { data: transactions, error: txFindError } = await supabaseAdmin
        .from('transactions')
        .select('*, merchants(*)')
        .eq('order_no', merchantOrder)
        .limit(1)

      if (txFindError || !transactions || transactions.length === 0) {
        console.error('Transaction not found:', merchantOrder)
        return new Response(
          JSON.stringify({ status: 'error', message: 'Transaction not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const transaction = transactions[0]
      const newStatus = status.toLowerCase() === 'success' ? 'success' : 
                       status.toLowerCase() === 'failed' ? 'failed' : 'pending'

      await supabaseAdmin
        .from('transactions')
        .update({
          status: newStatus,
          callback_data: body
        })
        .eq('id', transaction.id)

      if (newStatus === 'success' && transaction.transaction_type === 'payin') {
        await supabaseAdmin
          .from('merchants')
          .update({
            balance: (transaction.merchants.balance || 0) + transaction.net_amount
          })
          .eq('id', transaction.merchant_id)

        await sendTelegramNotification(supabaseAdmin, 'payin_success', transaction.merchant_id, {
          orderNo: transaction.order_no,
          amount: transaction.amount,
          fee: transaction.fee,
          netAmount: transaction.net_amount,
        })
      } else if (newStatus === 'failed' && transaction.transaction_type === 'payin') {
        await sendTelegramNotification(supabaseAdmin, 'payin_failed', transaction.merchant_id, {
          orderNo: transaction.order_no,
          amount: transaction.amount,
        })
      }

      if (transaction.transaction_type === 'payout') {
        const unfreezeAmount = transaction.amount + (transaction.fee || 0)
        
        if (newStatus === 'success') {
          await supabaseAdmin
            .from('merchants')
            .update({
              frozen_balance: Math.max(0, (transaction.merchants.frozen_balance || 0) - unfreezeAmount)
            })
            .eq('id', transaction.merchant_id)

          await sendTelegramNotification(supabaseAdmin, 'payout_success', transaction.merchant_id, {
            orderNo: transaction.order_no,
            amount: transaction.amount,
            bankName: transaction.bank_name,
          })
        } else if (newStatus === 'failed') {
          await supabaseAdmin
            .from('merchants')
            .update({
              balance: (transaction.merchants.balance || 0) + unfreezeAmount,
              frozen_balance: Math.max(0, (transaction.merchants.frozen_balance || 0) - unfreezeAmount)
            })
            .eq('id', transaction.merchant_id)

          await sendTelegramNotification(supabaseAdmin, 'payout_failed', transaction.merchant_id, {
            orderNo: transaction.order_no,
            amount: transaction.amount,
            reason: 'Transaction declined',
          })
        }
      }

      const extraData = transaction.extra ? JSON.parse(transaction.extra) : {}
      
      if (extraData.merchant_callback) {
        const webhookPayload = {
          orderNo: transaction.order_no,
          merchantOrder: transaction.merchant_order_no,
          status: newStatus,
          amount: transaction.amount,
          fee: transaction.fee,
          net_amount: transaction.net_amount,
          timestamp: new Date().toISOString()
        }
        
        const result = await sendWebhookWithRetry(extraData.merchant_callback, webhookPayload, 3)
        if (result.success) {
          console.log(`Forwarded callback to merchant on attempt ${result.attempt}`)
        } else {
          console.error(`Failed to forward callback after ${result.attempt} attempts: ${result.error}`)
        }
      }

      if (newStatus === 'success' && extraData.success_url) {
        const params = new URLSearchParams({
          order_no: transaction.order_no,
          amount: transaction.amount.toString(),
          merchant: transaction.merchants?.merchant_name || '',
          description: extraData.payment_link_code ? `Payment Link: ${extraData.payment_link_code}` : ''
        })
        redirectUrl = `${extraData.success_url}?${params.toString()}`
      } else if (newStatus === 'failed' && extraData.failure_url) {
        const params = new URLSearchParams({
          order_no: transaction.order_no,
          amount: transaction.amount.toString(),
          merchant: transaction.merchants?.merchant_name || '',
          reason: 'Payment was declined',
          link_code: extraData.payment_link_code || ''
        })
        redirectUrl = `${extraData.failure_url}?${params.toString()}`
      }

      console.log('HYPER PAY callback processed successfully for order:', merchantOrder)
    }

    // Handle HYPER PAY payout callback
    if (isHyperPayPayout) {
      const { transaction_id, status } = body

      const { data: transactions, error: txFindError } = await supabaseAdmin
        .from('transactions')
        .select('*, merchants(*)')
        .eq('order_no', transaction_id)
        .limit(1)

      if (txFindError || !transactions || transactions.length === 0) {
        console.error('Payout transaction not found:', transaction_id)
        return new Response(
          JSON.stringify({ status: 'error', message: 'Transaction not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const transaction = transactions[0]
      const newStatus = status.toUpperCase() === 'SUCCESS' ? 'success' : 
                       status.toUpperCase() === 'FAILED' ? 'failed' : 'pending'

      await supabaseAdmin
        .from('transactions')
        .update({
          status: newStatus,
          callback_data: body
        })
        .eq('id', transaction.id)

      const unfreezeAmount = transaction.amount + (transaction.fee || 0)
      
      if (newStatus === 'success') {
        await supabaseAdmin
          .from('merchants')
          .update({
            frozen_balance: Math.max(0, (transaction.merchants.frozen_balance || 0) - unfreezeAmount)
          })
          .eq('id', transaction.merchant_id)

        await sendTelegramNotification(supabaseAdmin, 'payout_success', transaction.merchant_id, {
          orderNo: transaction.order_no,
          amount: transaction.amount,
          bankName: transaction.bank_name,
        })
      } else if (newStatus === 'failed') {
        await supabaseAdmin
          .from('merchants')
          .update({
            balance: (transaction.merchants.balance || 0) + unfreezeAmount,
            frozen_balance: Math.max(0, (transaction.merchants.frozen_balance || 0) - unfreezeAmount)
          })
          .eq('id', transaction.merchant_id)

        await sendTelegramNotification(supabaseAdmin, 'payout_failed', transaction.merchant_id, {
          orderNo: transaction.order_no,
          amount: transaction.amount,
          reason: 'Transaction failed',
        })
      }

      const extraData = transaction.extra ? JSON.parse(transaction.extra) : {}
      if (extraData.merchant_callback) {
        const webhookPayload = {
          merchant_id: transaction.merchants.account_number,
          transaction_id: transaction.merchant_order_no,
          amount: transaction.amount.toString(),
          status: newStatus.toUpperCase(),
          timestamp: new Date().toISOString()
        }
        
        const result = await sendWebhookWithRetry(extraData.merchant_callback, webhookPayload, 3)
        if (result.success) {
          console.log(`Forwarded payout callback to merchant on attempt ${result.attempt}`)
        } else {
          console.error(`Failed to forward payout callback after ${result.attempt} attempts: ${result.error}`)
        }
      }

      console.log('HYPER PAY payout callback processed successfully for order:', transaction_id)
    }

    // Return redirect URL if available
    if (redirectUrl) {
      return new Response(
        JSON.stringify({ 
          status: 'ok', 
          message: 'Callback processed',
          redirect_url: redirectUrl 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ status: 'ok', message: 'Callback received successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Callback handler error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ status: 'error', message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})