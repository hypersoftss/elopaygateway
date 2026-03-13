import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Md5 } from 'https://deno.land/std@0.119.0/hash/md5.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateEloPaySignature(params: Record<string, any>, key: string): string {
  const filteredParams = Object.entries(params)
    .filter(([k, v]) => v !== '' && v !== null && v !== undefined && k !== 'sign')
    .sort(([a], [b]) => a.localeCompare(b))
  const queryString = filteredParams.map(([k, v]) => `${k}=${v}`).join('&')
  const signString = `${queryString}&key=${key}`
  const hash = new Md5()
  hash.update(signString)
  return hash.toString().toUpperCase()
}

const getSafeCallbackData = (callbackData: any): Record<string, any> => {
  if (!callbackData || typeof callbackData !== 'object' || Array.isArray(callbackData)) return {}
  return callbackData
}

const getPayoutBalanceMode = (callbackData: any): 'frozen' | 'deducted' => {
  return callbackData?.balance_mode === 'deducted' ? 'deducted' : 'frozen'
}

async function applyPayoutSettlement(supabaseAdmin: any, transaction: any, targetStatus: 'success' | 'failed') {
  const merchant = transaction.merchants
  if (!merchant) return

  const totalDeduction = Number(transaction.amount || 0) + Number(transaction.fee || 0)
  if (totalDeduction <= 0) return

  const balanceMode = getPayoutBalanceMode(transaction.callback_data)

  if (targetStatus === 'success') {
    if (balanceMode !== 'frozen') return

    await supabaseAdmin
      .from('merchants')
      .update({
        frozen_balance: Math.max(0, (merchant.frozen_balance || 0) - totalDeduction),
      })
      .eq('id', transaction.merchant_id)

    return
  }

  const updates: Record<string, number> = {
    balance: (merchant.balance || 0) + totalDeduction,
  }

  if (balanceMode === 'frozen') {
    updates.frozen_balance = Math.max(0, (merchant.frozen_balance || 0) - totalDeduction)
  }

  await supabaseAdmin
    .from('merchants')
    .update(updates)
    .eq('id', transaction.merchant_id)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { order_no, auto_update } = await req.json()

    if (!order_no) {
      return new Response(
        JSON.stringify({ success: false, message: 'order_no is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Find transaction
    const { data: transactions, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('*, merchants(*), payment_gateways(*)')
      .eq('order_no', order_no)
      .limit(1)

    if (txError || !transactions || transactions.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const transaction = transactions[0]
    const gateway = transaction.payment_gateways

    if (!gateway) {
      return new Response(
        JSON.stringify({ success: false, message: 'No gateway assigned to this transaction' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let gatewayStatus = 'unknown'
    let gatewayResponse: any = null

    // Query gateway based on type
    if (gateway.gateway_type === 'hypersofts' || gateway.gateway_type === 'lgpay') {
      const queryParams: Record<string, any> = {
        app_id: gateway.app_id,
        order_sn: order_no,
      }
      queryParams.sign = generateEloPaySignature(queryParams, gateway.api_key)

      const formBody = new URLSearchParams()
      Object.entries(queryParams).forEach(([k, v]) => formBody.append(k, String(v)))

      console.log('Querying LG Pay order status:', queryParams)

      const response = await fetch(`${gateway.base_url}/api/order/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody.toString(),
      })

      gatewayResponse = await response.json()
      console.log('LG Pay query response:', gatewayResponse)

      if (gatewayResponse.status === 1) {
        const orderStatus = gatewayResponse.data?.status
        const msgLower = String(gatewayResponse.msg || '').toLowerCase()

        if (orderStatus === 2 || orderStatus === '2' || msgLower === 'success') {
          gatewayStatus = 'success'
        } else if (orderStatus === 3 || orderStatus === '3' || msgLower === 'failed' || msgLower === 'fail') {
          gatewayStatus = 'failed'
        } else if (orderStatus === 1 || orderStatus === '1' || msgLower === 'pending' || msgLower === 'processing') {
          gatewayStatus = 'processing'
        } else {
          gatewayStatus = `unknown (status=${orderStatus}, msg=${gatewayResponse.msg})`
        }
      } else if (gatewayResponse.status === 0) {
        gatewayStatus = 'failed'
      } else {
        gatewayStatus = 'query_failed'
      }
    } else if (gateway.gateway_type === 'hyperpay' || gateway.gateway_type === 'bondpay') {
      const queryParams: Record<string, any> = {
        merchant_id: gateway.app_id,
        merchant_order_no: order_no,
      }

      const signStr = `${queryParams.merchant_id}${queryParams.merchant_order_no}${gateway.api_key}`
      const hash = new Md5()
      hash.update(signStr)
      queryParams.sign = hash.toString()

      console.log('Querying ELOPAYGATEWAY order status')

      try {
        const response = await fetch(`${gateway.base_url}/v1/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(queryParams),
        })
        gatewayResponse = await response.json()
        console.log('ELOPAYGATEWAY query response:', gatewayResponse)

        if (gatewayResponse?.status !== undefined && gatewayResponse?.status !== null) {
          const s = String(gatewayResponse.status).toLowerCase()
          if (s === 'success' || s === 'completed' || s === '1') {
            gatewayStatus = 'success'
          } else if (s === 'failed' || s === 'rejected' || s === '0') {
            gatewayStatus = 'failed'
          } else if (s === 'pending' || s === 'processing' || s === 'in_progress') {
            gatewayStatus = 'processing'
          } else {
            gatewayStatus = s
          }
        }
      } catch (e) {
        console.error('ELOPAYGATEWAY query error:', e)
        gatewayStatus = 'query_error'
      }
    }

    let updated = false
    let effectiveStatus = transaction.status

    if (auto_update) {
      const existingCallbackData = getSafeCallbackData(transaction.callback_data)

      if (transaction.transaction_type === 'payin') {
        if (gatewayStatus === 'success' && transaction.status === 'pending') {
          await supabaseAdmin
            .from('transactions')
            .update({
              status: 'success',
              callback_data: {
                ...existingCallbackData,
                gateway_query: true,
                gateway_response: gatewayResponse,
                queried_at: new Date().toISOString(),
              },
            })
            .eq('id', transaction.id)

          await supabaseAdmin
            .from('merchants')
            .update({
              balance: (transaction.merchants.balance || 0) + (transaction.net_amount || 0),
            })
            .eq('id', transaction.merchant_id)

          updated = true
          effectiveStatus = 'success'
          console.log(`Order ${order_no} auto-updated to success, credited ${transaction.net_amount}`)
        } else if (gatewayStatus === 'failed' && transaction.status === 'pending') {
          await supabaseAdmin
            .from('transactions')
            .update({
              status: 'failed',
              callback_data: {
                ...existingCallbackData,
                gateway_query: true,
                gateway_response: gatewayResponse,
                queried_at: new Date().toISOString(),
              },
            })
            .eq('id', transaction.id)

          updated = true
          effectiveStatus = 'failed'
          console.log(`Order ${order_no} auto-updated to failed`) 
        } else if (gatewayStatus === 'processing' && transaction.status === 'pending') {
          await supabaseAdmin
            .from('transactions')
            .update({
              status: 'processing',
              callback_data: {
                ...existingCallbackData,
                gateway_query: true,
                gateway_response: gatewayResponse,
                queried_at: new Date().toISOString(),
              },
            })
            .eq('id', transaction.id)

          updated = true
          effectiveStatus = 'processing'
        }
      } else if (transaction.transaction_type === 'payout') {
        if (gatewayStatus === 'success' && (transaction.status === 'pending' || transaction.status === 'processing')) {
          await supabaseAdmin
            .from('transactions')
            .update({
              status: 'success',
              callback_data: {
                ...existingCallbackData,
                gateway_query: true,
                gateway_response: gatewayResponse,
                queried_at: new Date().toISOString(),
              },
            })
            .eq('id', transaction.id)

          await applyPayoutSettlement(supabaseAdmin, transaction, 'success')

          updated = true
          effectiveStatus = 'success'
          console.log(`Payout ${order_no} auto-updated to success`) 
        } else if (gatewayStatus === 'failed' && (transaction.status === 'pending' || transaction.status === 'processing')) {
          await supabaseAdmin
            .from('transactions')
            .update({
              status: 'failed',
              callback_data: {
                ...existingCallbackData,
                gateway_query: true,
                gateway_response: gatewayResponse,
                queried_at: new Date().toISOString(),
              },
            })
            .eq('id', transaction.id)

          await applyPayoutSettlement(supabaseAdmin, transaction, 'failed')

          updated = true
          effectiveStatus = 'failed'
          console.log(`Payout ${order_no} auto-updated to failed and refunded`) 
        } else if (
          (gatewayStatus === 'processing' || gatewayStatus === 'pending') &&
          transaction.status === 'pending'
        ) {
          await supabaseAdmin
            .from('transactions')
            .update({
              status: 'processing',
              callback_data: {
                ...existingCallbackData,
                gateway_query: true,
                gateway_response: gatewayResponse,
                queried_at: new Date().toISOString(),
              },
            })
            .eq('id', transaction.id)

          updated = true
          effectiveStatus = 'processing'
          console.log(`Payout ${order_no} moved to processing`) 
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_no,
        our_status: effectiveStatus,
        gateway_status: gatewayStatus,
        gateway_response: gatewayResponse,
        auto_updated: updated,
        amount: transaction.amount,
        net_amount: transaction.net_amount,
        merchant: transaction.merchants?.merchant_name,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    console.error('Check order status error:', error)
    const msg = error instanceof Error ? error.message : 'Internal error'
    return new Response(
      JSON.stringify({ success: false, message: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
