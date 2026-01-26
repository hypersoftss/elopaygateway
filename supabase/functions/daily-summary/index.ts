import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Format currency
function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
}

function formatAmount(amount: number, currency: string = 'INR'): string {
  const symbols: Record<string, string> = { INR: '₹', PKR: 'Rs.', BDT: '৳' }
  const symbol = symbols[currency] || '₹'
  return `${symbol}${amount.toLocaleString('en-IN')}`
}

// Send Telegram message
async function sendTelegram(botToken: string, chatId: string, text: string) {
  if (!botToken || !chatId) return
  
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get admin settings
    const { data: settings } = await supabaseAdmin
      .from('admin_settings')
      .select('telegram_bot_token, admin_telegram_chat_id, gateway_name')
      .limit(1)
      .maybeSingle()

    const botToken = settings?.telegram_bot_token || Deno.env.get('TG_BOT_TOKEN')
    const adminChatId = settings?.admin_telegram_chat_id
    const gatewayName = settings?.gateway_name || 'HYPER SOFTS'

    if (!botToken) {
      console.log('No bot token configured, skipping daily summary')
      return new Response(JSON.stringify({ ok: true, message: 'No bot token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Calculate yesterday's date range
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    // Get yesterday's transactions
    const { data: yesterdayTx } = await supabaseAdmin
      .from('transactions')
      .select('amount, status, transaction_type, fee, net_amount, merchant_id')
      .gte('created_at', yesterday.toISOString())
      .lt('created_at', todayStart.toISOString())

    // Calculate stats
    let payinTotal = 0, payinSuccess = 0, payinSuccessAmount = 0, payinFees = 0
    let payoutTotal = 0, payoutSuccess = 0, payoutSuccessAmount = 0, payoutFees = 0
    let failedCount = 0, pendingCount = 0

    yesterdayTx?.forEach((tx: any) => {
      if (tx.transaction_type === 'payin') {
        payinTotal++
        if (tx.status === 'success') {
          payinSuccess++
          payinSuccessAmount += tx.amount || 0
          payinFees += tx.fee || 0
        }
      } else {
        payoutTotal++
        if (tx.status === 'success') {
          payoutSuccess++
          payoutSuccessAmount += tx.amount || 0
          payoutFees += tx.fee || 0
        }
      }
      if (tx.status === 'failed') failedCount++
      if (tx.status === 'pending') pendingCount++
    })

    const payinRate = payinTotal > 0 ? Math.round((payinSuccess / payinTotal) * 100) : 0
    const payoutRate = payoutTotal > 0 ? Math.round((payoutSuccess / payoutTotal) * 100) : 0

    // Get merchant balances
    const { data: merchants } = await supabaseAdmin
      .from('merchants')
      .select('id, merchant_name, balance, frozen_balance, is_active, telegram_chat_id, gateway_id')

    const totalBalance = merchants?.reduce((sum: number, m: any) => sum + (m.balance || 0), 0) || 0
    const totalFrozen = merchants?.reduce((sum: number, m: any) => sum + (m.frozen_balance || 0), 0) || 0
    const activeCount = merchants?.filter((m: any) => m.is_active)?.length || 0

    // Format date for display
    const dateStr = yesterday.toLocaleDateString('en-IN', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'Asia/Kolkata'
    })

    // Build admin summary message
    const adminSummary = `📊 <b>${gatewayName} Daily Summary</b>
📅 ${dateStr}

━━━━━ 📥 PAY-IN ━━━━━
📦 Orders: ${payinTotal}
✅ Success: ${payinSuccess} (${payinRate}%)
💰 Volume: ${formatINR(payinSuccessAmount)}
💵 Fees Earned: ${formatINR(payinFees)}

━━━━━ 📤 PAY-OUT ━━━━━
📦 Orders: ${payoutTotal}
✅ Success: ${payoutSuccess} (${payoutRate}%)
💰 Volume: ${formatINR(payoutSuccessAmount)}
💵 Fees Earned: ${formatINR(payoutFees)}

━━━━━ 📈 SUMMARY ━━━━━
📊 Total Orders: ${payinTotal + payoutTotal}
❌ Failed: ${failedCount}
⏳ Pending: ${pendingCount}
💰 Total Volume: ${formatINR(payinSuccessAmount + payoutSuccessAmount)}
💵 Total Fees: ${formatINR(payinFees + payoutFees)}

━━━━━ 💼 BALANCES ━━━━━
💰 Total Balance: ${formatINR(totalBalance)}
🧊 Frozen: ${formatINR(totalFrozen)}
👥 Active Merchants: ${activeCount}/${merchants?.length || 0}

🤖 Automated Report • ${gatewayName}`

    // Send to admin
    if (adminChatId) {
      await sendTelegram(botToken, adminChatId, adminSummary)
      console.log('Sent daily summary to admin')
    }

    // Send individual summaries to merchants with telegram configured
    for (const merchant of merchants || []) {
      if (!merchant.telegram_chat_id) continue

      // Get merchant's gateway currency
      let currency = 'INR'
      if (merchant.gateway_id) {
        const { data: gateway } = await supabaseAdmin
          .from('payment_gateways')
          .select('currency')
          .eq('id', merchant.gateway_id)
          .maybeSingle()
        currency = gateway?.currency || 'INR'
      }

      // Get merchant's yesterday transactions
      const { data: merchantTx } = await supabaseAdmin
        .from('transactions')
        .select('amount, status, transaction_type, fee, net_amount')
        .eq('merchant_id', merchant.id)
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', todayStart.toISOString())

      let mPayinTotal = 0, mPayinSuccess = 0, mPayinAmount = 0
      let mPayoutTotal = 0, mPayoutSuccess = 0, mPayoutAmount = 0

      merchantTx?.forEach((tx: any) => {
        if (tx.transaction_type === 'payin') {
          mPayinTotal++
          if (tx.status === 'success') {
            mPayinSuccess++
            mPayinAmount += tx.net_amount || 0
          }
        } else {
          mPayoutTotal++
          if (tx.status === 'success') {
            mPayoutSuccess++
            mPayoutAmount += tx.amount || 0
          }
        }
      })

      const merchantSummary = `📊 <b>Daily Summary</b>
📅 ${dateStr}

━━━ 📥 PAY-IN ━━━
📦 Orders: ${mPayinTotal}
✅ Success: ${mPayinSuccess}
💰 Net Amount: ${formatAmount(mPayinAmount, currency)}

━━━ 📤 PAY-OUT ━━━
📦 Orders: ${mPayoutTotal}
✅ Success: ${mPayoutSuccess}
💰 Amount: ${formatAmount(mPayoutAmount, currency)}

━━━ 💰 BALANCE ━━━
Available: ${formatAmount(merchant.balance || 0, currency)}
Frozen: ${formatAmount(merchant.frozen_balance || 0, currency)}

🤖 ${gatewayName}`

      await sendTelegram(botToken, merchant.telegram_chat_id, merchantSummary)
      console.log(`Sent daily summary to merchant: ${merchant.merchant_name}`)
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      message: 'Daily summary sent',
      stats: { payinTotal, payoutTotal, merchantsNotified: merchants?.filter((m: any) => m.telegram_chat_id).length }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    console.error('Daily summary error:', error)
    return new Response(JSON.stringify({ 
      ok: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
