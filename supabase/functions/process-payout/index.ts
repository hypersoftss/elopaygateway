import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Md5 } from 'https://deno.land/std@0.119.0/hash/md5.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { transaction_id, action } = body

    console.log('Process payout request:', { transaction_id, action })

    if (!transaction_id || !action) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get the transaction
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('*, merchants(id, balance, frozen_balance, merchant_name)')
      .eq('id', transaction_id)
      .single()

    if (txError || !transaction) {
      console.error('Transaction not found:', txError)
      return new Response(
        JSON.stringify({ success: false, message: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (transaction.status !== 'pending') {
      return new Response(
        JSON.stringify({ success: false, message: 'Transaction is not pending' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const merchant = transaction.merchants

    if (action === 'reject') {
      // Reject - update status and unfreeze balance
      await supabaseAdmin
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', transaction_id)

      if (merchant) {
        await supabaseAdmin
          .from('merchants')
          .update({
            balance: merchant.balance + transaction.amount + (transaction.fee || 0),
            frozen_balance: Math.max(0, (merchant.frozen_balance || 0) - transaction.amount - (transaction.fee || 0)),
          })
          .eq('id', merchant.id)
      }

      console.log('Payout rejected and balance unfrozen:', transaction_id)

      return new Response(
        JSON.stringify({ success: true, message: 'Payout rejected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'approve') {
      // Get admin settings for BondPay
      const { data: settings } = await supabaseAdmin
        .from('admin_settings')
        .select('master_merchant_id, master_payout_key, bondpay_base_url')
        .limit(1)
        .single()

      if (!settings) {
        console.error('Admin settings not found')
        return new Response(
          JSON.stringify({ success: false, message: 'System configuration error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const internalCallbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/callback-handler`

      // Generate BondPay signature
      const bondPaySignature = generateBondPayPayoutSignature(
        transaction.account_number || '',
        transaction.amount.toString(),
        transaction.bank_name || '',
        internalCallbackUrl,
        transaction.ifsc_code || '',
        settings.master_merchant_id,
        transaction.account_holder_name || '',
        transaction.order_no,
        settings.master_payout_key
      )

      console.log('Calling BondPay Payout API for approved transaction...')

      // Call BondPay API
      const formData = new URLSearchParams()
      formData.append('merchant_id', settings.master_merchant_id)
      formData.append('amount', transaction.amount.toString())
      formData.append('transaction_id', transaction.order_no)
      formData.append('account_number', transaction.account_number || '')
      formData.append('ifsc', transaction.ifsc_code || '')
      formData.append('name', transaction.account_holder_name || '')
      formData.append('bank_name', transaction.bank_name || '')
      formData.append('callback_url', internalCallbackUrl)
      formData.append('signature', bondPaySignature)

      const bondPayResponse = await fetch(`${settings.bondpay_base_url}/payout/payment.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      })

      const bondPayData = await bondPayResponse.json()
      console.log('BondPay Payout response:', bondPayData)

      // Update transaction with BondPay response - keep pending, callback will update
      await supabaseAdmin
        .from('transactions')
        .update({ 
          callback_data: { bondpay_response: bondPayData, approved_at: new Date().toISOString() }
        })
        .eq('id', transaction_id)

      // Remove from frozen balance (already deducted from balance when created)
      if (merchant) {
        await supabaseAdmin
          .from('merchants')
          .update({
            frozen_balance: Math.max(0, (merchant.frozen_balance || 0) - transaction.amount - (transaction.fee || 0)),
          })
          .eq('id', merchant.id)
      }

      console.log('Payout approved and sent to BondPay:', transaction_id)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payout approved and sent to BondPay',
          bondpay_response: bondPayData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Process payout error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
