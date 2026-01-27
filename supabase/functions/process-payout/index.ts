import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Md5 } from 'https://deno.land/std@0.119.0/hash/md5.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// HYPER PAY payout signature
function generateHyperPayPayoutSignature(
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

// ELOPAY signature (ASCII sorted + uppercase MD5)
function generateEloPaySignature(params: Record<string, any>, key: string): string {
  const filteredParams = Object.entries(params)
    .filter(([k, v]) => v !== '' && v !== null && v !== undefined && k !== 'sign')
    .sort(([a], [b]) => a.localeCompare(b))
  
  const queryString = filteredParams
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  
  const signString = `${queryString}&key=${key}`
  console.log('ELOPAY payout sign string:', signString)
  
  const hash = new Md5()
  hash.update(signString)
  return hash.toString().toUpperCase()
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

    // Get the transaction with gateway info and merchant's trade_type
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('*, merchants(id, balance, frozen_balance, merchant_name, gateway_id, trade_type)')
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
      // Get gateway configuration
      let gateway = null
      if (transaction.gateway_id) {
        const { data: gatewayData } = await supabaseAdmin
          .from('payment_gateways')
          .select('*')
          .eq('id', transaction.gateway_id)
          .single()
        gateway = gatewayData
      }

      // Fallback to HYPER PAY from admin_settings
      if (!gateway) {
        const { data: settings } = await supabaseAdmin
          .from('admin_settings')
          .select('master_merchant_id, master_api_key, master_payout_key, bondpay_base_url')
          .limit(1)
          .single()

        if (!settings) {
          console.error('Admin settings not found')
          return new Response(
            JSON.stringify({ success: false, message: 'System configuration error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        gateway = {
          gateway_type: 'hyperpay',
          app_id: settings.master_merchant_id,
          api_key: settings.master_api_key,
          payout_key: settings.master_payout_key,
          base_url: settings.bondpay_base_url,
          currency: 'INR',
        }
      }

      const internalCallbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/callback-handler`
      let gatewayResponse = null

      if (gateway.gateway_type === 'hypersofts') {
        // ELOPAY payout - use specific withdrawal codes based on gateway_code
        // ELOPAY_BDT -> BDT withdrawal
        // ELOPAY_PKR -> PKR withdrawal  
        // ELOPAY_INR -> INR withdrawal
        let withdrawalCode = gateway.currency // Default to currency code
        
        // Map gateway_code to specific withdrawal codes
        if (gateway.gateway_code === 'ELOPAY_BDT' || gateway.gateway_code === 'hypersofts_bdt') {
          withdrawalCode = 'BDT' // BDT payout code
        } else if (gateway.gateway_code === 'ELOPAY_PKR' || gateway.gateway_code === 'hypersofts_pkr') {
          withdrawalCode = 'PKR' // PKR payout code
        } else if (gateway.gateway_code === 'ELOPAY_INR' || gateway.gateway_code === 'hypersofts_inr') {
          withdrawalCode = 'INR' // INR payout code
        }
        
        console.log('ELOPAY payout - Gateway code:', gateway.gateway_code, 'Currency:', gateway.currency, 'Withdrawal code:', withdrawalCode)
        
        const hsParams: Record<string, any> = {
          app_id: gateway.app_id,
          order_sn: transaction.order_no,
          currency: withdrawalCode, // Use withdrawal-specific code
          money: Math.round(transaction.amount * 100), // HYPER SOFTS uses cents
          notify_url: internalCallbackUrl,
          name: transaction.account_holder_name || '',
          card_number: transaction.account_number || '',
          bank_name: transaction.bank_name || '',
          addon2: 'v1.0',
        }

        // Add addon1 based on currency and method
        if (gateway.currency === 'INR' && transaction.ifsc_code) {
          // INR bank transfers use IFSC code in addon1
          hsParams.addon1 = transaction.ifsc_code
        } else if (gateway.currency === 'PKR') {
          // PKR uses addon1 for wallet method: jazzcash or easypaisa
          const bankName = (transaction.bank_name || '').toLowerCase()
          if (bankName === 'jazzcash' || bankName === 'jazz') {
            hsParams.addon1 = 'jazzcash'
          } else if (bankName === 'easypaisa' || bankName === 'easy') {
            hsParams.addon1 = 'easypaisa'
          }
          console.log('PKR payout addon1:', hsParams.addon1, 'from bank_name:', transaction.bank_name)
        } else if (gateway.currency === 'BDT') {
          // BDT uses addon1 for wallet method: nagad or bkash
          const bankName = (transaction.bank_name || '').toLowerCase()
          if (bankName === 'nagad') {
            hsParams.addon1 = 'nagad'
          } else if (bankName === 'bkash') {
            hsParams.addon1 = 'bkash'
          }
          console.log('BDT payout addon1:', hsParams.addon1, 'from bank_name:', transaction.bank_name)
        }

        hsParams.sign = generateEloPaySignature(hsParams, gateway.payout_key || gateway.api_key)

        console.log('Calling ELOPAY Payout API:', hsParams)

        const formBody = new URLSearchParams()
        Object.entries(hsParams).forEach(([k, v]) => formBody.append(k, String(v)))

        const hsResponse = await fetch(`${gateway.base_url}/api/deposit/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formBody.toString()
        })

        gatewayResponse = await hsResponse.json()
        console.log('ELOPAY Payout response:', gatewayResponse)

      } else {
        // ELOPAYGATEWAY payout (default)
        const eloPayGatewaySignature = generateHyperPayPayoutSignature(
          transaction.account_number || '',
          transaction.amount.toString(),
          transaction.bank_name || '',
          internalCallbackUrl,
          transaction.ifsc_code || '',
          gateway.app_id,
          transaction.account_holder_name || '',
          transaction.order_no,
          gateway.payout_key
        )

        console.log('Calling ELOPAYGATEWAY Payout API for approved transaction...')

        const formData = new URLSearchParams()
        formData.append('merchant_id', gateway.app_id)
        formData.append('amount', transaction.amount.toString())
        formData.append('transaction_id', transaction.order_no)
        formData.append('account_number', transaction.account_number || '')
        formData.append('ifsc', transaction.ifsc_code || '')
        formData.append('name', transaction.account_holder_name || '')
        formData.append('bank_name', transaction.bank_name || '')
        formData.append('callback_url', internalCallbackUrl)
        formData.append('signature', eloPayGatewaySignature)

        const eloPayGatewayResponse = await fetch(`${gateway.base_url}/payout/payment.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString()
        })

        gatewayResponse = await eloPayGatewayResponse.json()
        console.log('ELOPAYGATEWAY Payout response:', gatewayResponse)
      }

      // Update transaction with gateway response
      await supabaseAdmin
        .from('transactions')
        .update({ 
          callback_data: { gateway_response: gatewayResponse, approved_at: new Date().toISOString() }
        })
        .eq('id', transaction_id)

      // Remove from frozen balance
      if (merchant) {
        await supabaseAdmin
          .from('merchants')
          .update({
            frozen_balance: Math.max(0, (merchant.frozen_balance || 0) - transaction.amount - (transaction.fee || 0)),
          })
          .eq('id', merchant.id)
      }

      console.log('Payout approved and sent to gateway:', transaction_id)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payout approved and sent to gateway',
          gateway_response: gatewayResponse
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