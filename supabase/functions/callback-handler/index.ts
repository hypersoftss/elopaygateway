import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      }

      // If payout completed, unfreeze the amount
      if (transaction.transaction_type === 'payout') {
        const unfreezeAmount = transaction.amount + (transaction.fee || 0)
        
        if (newStatus === 'success') {
          // Success: just unfreeze, money already deducted
          const { error: balanceError } = await supabaseAdmin
            .from('merchants')
            .update({
              frozen_balance: Math.max(0, (transaction.merchants.frozen_balance || 0) - unfreezeAmount)
            })
            .eq('id', transaction.merchant_id)

          if (balanceError) {
            console.error('Failed to update frozen balance:', balanceError)
          }
        } else if (newStatus === 'failed') {
          // Failed: unfreeze and return to balance
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
        }
      }

      // Forward callback to merchant's callback URL if configured
      const extraData = transaction.extra ? JSON.parse(transaction.extra) : {}
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

      console.log('Callback processed successfully for order:', merchantOrder)
    }

    // Handle payout callback
    // BondPay sends: { merchant_id, transaction_id, amount, status, timestamp }
    if (body.transaction_id && body.merchant_id && !body.orderNo) {
      const { transaction_id, status, amount } = body

      // Find our transaction by order_no
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

      // Handle balance updates for payout
      const unfreezeAmount = transaction.amount + (transaction.fee || 0)
      
      if (newStatus === 'success') {
        // Success: just unfreeze
        const { error: balanceError } = await supabaseAdmin
          .from('merchants')
          .update({
            frozen_balance: Math.max(0, (transaction.merchants.frozen_balance || 0) - unfreezeAmount)
          })
          .eq('id', transaction.merchant_id)

        if (balanceError) {
          console.error('Failed to update frozen balance:', balanceError)
        }
      } else if (newStatus === 'failed') {
        // Failed: return funds to balance
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
      }

      // Forward callback to merchant
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
