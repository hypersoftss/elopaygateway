import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const body = await req.json()
    console.log('Callback received from BondPay:', body)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    let redirectUrl: string | null = null

    // Handle payin callback
    // BondPay sends: { orderNo, merchantOrder, status, amount, createtime, updatetime }
    if (body.orderNo && body.merchantOrder) {
      const { orderNo, merchantOrder, status, amount } = body

      // Find our transaction by order_no
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

      // Update transaction status
      const { error: updateError } = await supabaseAdmin
        .from('transactions')
        .update({
          status: newStatus,
          callback_data: body
        })
        .eq('id', transaction.id)

      if (updateError) {
        console.error('Failed to update transaction:', updateError)
      }

      // If payin success, add to merchant balance
      if (newStatus === 'success' && transaction.transaction_type === 'payin') {
        const { error: balanceError } = await supabaseAdmin
          .from('merchants')
          .update({
            balance: (transaction.merchants.balance || 0) + transaction.net_amount
          })
          .eq('id', transaction.merchant_id)

        if (balanceError) {
          console.error('Failed to update balance:', balanceError)
        }

        // Send Telegram notification for payin success
        await sendTelegramNotification(supabaseAdmin, 'payin_success', transaction.merchant_id, {
          orderNo: transaction.order_no,
          amount: transaction.amount,
          fee: transaction.fee,
          netAmount: transaction.net_amount,
        })
      } else if (newStatus === 'failed' && transaction.transaction_type === 'payin') {
        // Send Telegram notification for payin failed
        await sendTelegramNotification(supabaseAdmin, 'payin_failed', transaction.merchant_id, {
          orderNo: transaction.order_no,
          amount: transaction.amount,
        })
      }

      // If payout completed, unfreeze the amount
      if (transaction.transaction_type === 'payout') {
        const unfreezeAmount = transaction.amount + (transaction.fee || 0)
        
        if (newStatus === 'success') {
          const { error: balanceError } = await supabaseAdmin
            .from('merchants')
            .update({
              frozen_balance: Math.max(0, (transaction.merchants.frozen_balance || 0) - unfreezeAmount)
            })
            .eq('id', transaction.merchant_id)

          if (balanceError) {
            console.error('Failed to update frozen balance:', balanceError)
          }

          // Send Telegram notification for payout success
          await sendTelegramNotification(supabaseAdmin, 'payout_success', transaction.merchant_id, {
            orderNo: transaction.order_no,
            amount: transaction.amount,
            bankName: transaction.bank_name,
          })
        } else if (newStatus === 'failed') {
          const { error: balanceError } = await supabaseAdmin
            .from('merchants')
            .update({
              balance: (transaction.merchants.balance || 0) + unfreezeAmount,
              frozen_balance: Math.max(0, (transaction.merchants.frozen_balance || 0) - unfreezeAmount)
            })
            .eq('id', transaction.merchant_id)

          if (balanceError) {
            console.error('Failed to restore balance:', balanceError)
          }

          // Send Telegram notification for payout failed
          await sendTelegramNotification(supabaseAdmin, 'payout_failed', transaction.merchant_id, {
            orderNo: transaction.order_no,
            amount: transaction.amount,
            reason: 'Transaction declined',
          })
        }
      }

      // Parse extra data for callback and redirect URLs
      const extraData = transaction.extra ? JSON.parse(transaction.extra) : {}
      
      // Forward callback to merchant's callback URL if configured
      if (extraData.merchant_callback) {
        try {
          await fetch(extraData.merchant_callback, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderNo: transaction.order_no,
              merchantOrder: transaction.merchant_order_no,
              status: newStatus,
              amount: transaction.amount,
              fee: transaction.fee,
              net_amount: transaction.net_amount,
              timestamp: new Date().toISOString()
            })
          })
          console.log('Forwarded callback to merchant:', extraData.merchant_callback)
        } catch (callbackError) {
          console.error('Failed to forward callback to merchant:', callbackError)
        }
      }

      // Build redirect URL based on payment status
      if (newStatus === 'success' && extraData.success_url) {
        const params = new URLSearchParams({
          order_no: transaction.order_no,
          amount: transaction.amount.toString(),
          merchant: transaction.merchants?.merchant_name || '',
          description: extraData.payment_link_code ? `Payment Link: ${extraData.payment_link_code}` : ''
        })
        redirectUrl = `${extraData.success_url}?${params.toString()}`
        console.log('Success redirect URL:', redirectUrl)
      } else if (newStatus === 'failed' && extraData.failure_url) {
        const params = new URLSearchParams({
          order_no: transaction.order_no,
          amount: transaction.amount.toString(),
          merchant: transaction.merchants?.merchant_name || '',
          reason: 'Payment was declined',
          link_code: extraData.payment_link_code || ''
        })
        redirectUrl = `${extraData.failure_url}?${params.toString()}`
        console.log('Failure redirect URL:', redirectUrl)
      }

      console.log('Callback processed successfully for order:', merchantOrder)
    }

    // Handle payout callback
    if (body.transaction_id && body.merchant_id && !body.orderNo) {
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

      const { error: updateError } = await supabaseAdmin
        .from('transactions')
        .update({
          status: newStatus,
          callback_data: body
        })
        .eq('id', transaction.id)

      if (updateError) {
        console.error('Failed to update transaction:', updateError)
      }

      const unfreezeAmount = transaction.amount + (transaction.fee || 0)
      
      if (newStatus === 'success') {
        const { error: balanceError } = await supabaseAdmin
          .from('merchants')
          .update({
            frozen_balance: Math.max(0, (transaction.merchants.frozen_balance || 0) - unfreezeAmount)
          })
          .eq('id', transaction.merchant_id)

        if (balanceError) {
          console.error('Failed to update frozen balance:', balanceError)
        }

        // Send Telegram notification
        await sendTelegramNotification(supabaseAdmin, 'payout_success', transaction.merchant_id, {
          orderNo: transaction.order_no,
          amount: transaction.amount,
          bankName: transaction.bank_name,
        })
      } else if (newStatus === 'failed') {
        const { error: balanceError } = await supabaseAdmin
          .from('merchants')
          .update({
            balance: (transaction.merchants.balance || 0) + unfreezeAmount,
            frozen_balance: Math.max(0, (transaction.merchants.frozen_balance || 0) - unfreezeAmount)
          })
          .eq('id', transaction.merchant_id)

        if (balanceError) {
          console.error('Failed to restore balance:', balanceError)
        }

        // Send Telegram notification
        await sendTelegramNotification(supabaseAdmin, 'payout_failed', transaction.merchant_id, {
          orderNo: transaction.order_no,
          amount: transaction.amount,
          reason: 'Transaction failed',
        })
      }

      const extraData = transaction.extra ? JSON.parse(transaction.extra) : {}
      if (extraData.merchant_callback) {
        try {
          await fetch(extraData.merchant_callback, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              merchant_id: transaction.merchants.account_number,
              transaction_id: transaction.merchant_order_no,
              amount: transaction.amount.toString(),
              status: newStatus.toUpperCase(),
              timestamp: new Date().toISOString()
            })
          })
          console.log('Forwarded payout callback to merchant:', extraData.merchant_callback)
        } catch (callbackError) {
          console.error('Failed to forward callback to merchant:', callbackError)
        }
      }

      console.log('Payout callback processed successfully for order:', transaction_id)
    }

    // Return redirect URL if available, otherwise return success
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