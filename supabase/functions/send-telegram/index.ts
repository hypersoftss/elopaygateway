import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CURRENCY_SYMBOLS: Record<string, string> = { INR: '₹', PKR: 'Rs.', BDT: '৳', USDT: '$' }
const CURRENCY_FLAGS: Record<string, string> = { INR: '🇮🇳', PKR: '🇵🇰', BDT: '🇧🇩' }

function getCurrencySymbol(currency?: string | null): string {
  return CURRENCY_SYMBOLS[currency || 'INR'] || '₹'
}

function getCurrencyFlag(currency?: string | null): string {
  return CURRENCY_FLAGS[currency || 'INR'] || '🇮🇳'
}

function formatAmount(amount: number | string, currency?: string | null): string {
  const sym = getCurrencySymbol(currency)
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `${sym}${num?.toLocaleString?.() || amount}`
}

interface TelegramMessage {
  chatId: string
  message: string
  parseMode?: 'HTML' | 'Markdown'
}

async function sendTelegramMessage({ chatId, message, parseMode = 'HTML' }: TelegramMessage): Promise<boolean> {
  const botToken = Deno.env.get('TG_BOT_TOKEN')
  if (!botToken) {
    console.error('TG_BOT_TOKEN not configured')
    return false
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: parseMode,
      }),
    })

    const result = await response.json()
    if (!result.ok) {
      console.error('Telegram API error:', result)
      return false
    }

    console.log('Telegram message sent to:', chatId)
    return true
  } catch (error) {
    console.error('Failed to send Telegram message:', error)
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { type, merchantId, data } = body

    console.log('Send Telegram notification:', { type, merchantId, data })

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get admin telegram chat ID
    const { data: adminSettings } = await supabaseAdmin
      .from('admin_settings')
      .select('admin_telegram_chat_id, gateway_name')
      .limit(1)
      .maybeSingle()

    const gatewayName = adminSettings?.gateway_name || 'PayGate'

    // Get merchant telegram chat ID and gateway currency if merchantId provided
    let merchantChatId: string | null = null
    let merchantName = ''
    let accountNumber = ''
    let currency: string | null = null
    
    if (merchantId) {
      const { data: merchant } = await supabaseAdmin
        .from('merchants')
        .select('telegram_chat_id, merchant_name, account_number, payment_gateways(currency)')
        .eq('id', merchantId)
        .maybeSingle()

      merchantChatId = merchant?.telegram_chat_id || null
      merchantName = merchant?.merchant_name || ''
      accountNumber = merchant?.account_number || ''
      currency = (merchant?.payment_gateways as any)?.currency || null
    }

    // Use data.currency if explicitly passed, otherwise use merchant's gateway currency
    const cur = data?.currency || currency
    const flag = getCurrencyFlag(cur)
    const fmt = (amount: number | string) => formatAmount(amount, cur)

    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    let adminMessage = ''
    let merchantMessage = ''

    // Build messages based on notification type
    switch (type) {
      case 'payin_created':
        adminMessage = `🟢 <b>New Pay-In Order</b> ${flag}\n\n` +
          `📦 Gateway: ${gatewayName}\n` +
          `👤 Merchant: ${merchantName} (${accountNumber})\n` +
          `💰 Amount: ${fmt(data.amount)}\n` +
          `💱 Currency: ${cur || 'INR'}\n` +
          `📋 Order: ${data.orderNo}\n` +
          `🔖 Merchant Order: ${data.merchantOrderNo || 'N/A'}\n` +
          `⏰ Time: ${timestamp}`

        merchantMessage = `🟢 <b>Pay-In Order Created</b> ${flag}\n\n` +
          `💰 Amount: ${fmt(data.amount)}\n` +
          `📋 Order: ${data.orderNo}\n` +
          `🔖 Your Order: ${data.merchantOrderNo || 'N/A'}\n` +
          `📊 Status: Pending\n` +
          `⏰ Time: ${timestamp}`
        break

      case 'payin_success':
        adminMessage = `✅ <b>Pay-In Success</b> ${flag}\n\n` +
          `📦 Gateway: ${gatewayName}\n` +
          `👤 Merchant: ${merchantName} (${accountNumber})\n` +
          `💰 Amount: ${fmt(data.amount)}\n` +
          `💸 Fee: ${fmt(data.fee || 0)}\n` +
          `💵 Net: ${fmt(data.netAmount || data.amount)}\n` +
          `💱 Currency: ${cur || 'INR'}\n` +
          `📋 Order: ${data.orderNo}\n` +
          `⏰ Time: ${timestamp}`

        merchantMessage = `✅ <b>Pay-In Successful!</b> ${flag}\n\n` +
          `💰 Amount: ${fmt(data.amount)}\n` +
          `💸 Fee: ${fmt(data.fee || 0)}\n` +
          `💵 Net Credited: ${fmt(data.netAmount || data.amount)}\n` +
          `📋 Order: ${data.orderNo}\n` +
          `⏰ Time: ${timestamp}`
        break

      case 'payin_failed':
        adminMessage = `❌ <b>Pay-In Failed</b> ${flag}\n\n` +
          `📦 Gateway: ${gatewayName}\n` +
          `👤 Merchant: ${merchantName} (${accountNumber})\n` +
          `💰 Amount: ${fmt(data.amount)}\n` +
          `📋 Order: ${data.orderNo}\n` +
          `⏰ Time: ${timestamp}`

        merchantMessage = `❌ <b>Pay-In Failed</b> ${flag}\n\n` +
          `💰 Amount: ${fmt(data.amount)}\n` +
          `📋 Order: ${data.orderNo}\n` +
          `📊 Status: Failed\n` +
          `⏰ Time: ${timestamp}`
        break

      case 'payout_created':
        adminMessage = `🔵 <b>New Payout Request</b> ${flag}\n\n` +
          `📦 Gateway: ${gatewayName}\n` +
          `👤 Merchant: ${merchantName} (${accountNumber})\n` +
          `💰 Amount: ${fmt(data.amount)}\n` +
          `💱 Currency: ${cur || 'INR'}\n` +
          `🏦 Bank: ${data.bankName || 'N/A'}\n` +
          `💳 Account: ${data.accountNumber || 'N/A'}\n` +
          `📋 Order: ${data.orderNo}\n` +
          `📊 Status: Pending Approval\n` +
          `⏰ Time: ${timestamp}`

        merchantMessage = `🔵 <b>Payout Request Created</b> ${flag}\n\n` +
          `💰 Amount: ${fmt(data.amount)}\n` +
          `🏦 Bank: ${data.bankName || 'N/A'}\n` +
          `💳 Account: ${data.accountNumber || 'N/A'}\n` +
          `📋 Order: ${data.orderNo}\n` +
          `📊 Status: Pending Approval\n` +
          `⏰ Time: ${timestamp}`
        break

      case 'payout_approved':
        adminMessage = `⚡ <b>Payout Approved</b> ${flag}\n\n` +
          `📦 Gateway: ${gatewayName}\n` +
          `👤 Merchant: ${merchantName} (${accountNumber})\n` +
          `💰 Amount: ${fmt(data.amount)}\n` +
          `📋 Order: ${data.orderNo}\n` +
          `⏰ Time: ${timestamp}`

        merchantMessage = `⚡ <b>Payout Approved!</b> ${flag}\n\n` +
          `💰 Amount: ${fmt(data.amount)}\n` +
          `📋 Order: ${data.orderNo}\n` +
          `📊 Status: Processing\n` +
          `⏰ Time: ${timestamp}`
        break

      case 'payout_success':
        adminMessage = `✅ <b>Payout Success</b> ${flag}\n\n` +
          `📦 Gateway: ${gatewayName}\n` +
          `👤 Merchant: ${merchantName} (${accountNumber})\n` +
          `💰 Amount: ${fmt(data.amount)}\n` +
          `🏦 Bank: ${data.bankName || 'N/A'}\n` +
          `📋 Order: ${data.orderNo}\n` +
          `⏰ Time: ${timestamp}`

        merchantMessage = `✅ <b>Payout Successful!</b> ${flag}\n\n` +
          `💰 Amount: ${fmt(data.amount)}\n` +
          `🏦 Bank: ${data.bankName || 'N/A'}\n` +
          `📋 Order: ${data.orderNo}\n` +
          `📊 Status: Completed\n` +
          `⏰ Time: ${timestamp}`
        break

      case 'payout_failed':
        adminMessage = `❌ <b>Payout Failed</b> ${flag}\n\n` +
          `📦 Gateway: ${gatewayName}\n` +
          `👤 Merchant: ${merchantName} (${accountNumber})\n` +
          `💰 Amount: ${fmt(data.amount)}\n` +
          `📋 Order: ${data.orderNo}\n` +
          `💬 Reason: ${data.reason || 'Unknown'}\n` +
          `⏰ Time: ${timestamp}`

        merchantMessage = `❌ <b>Payout Failed</b> ${flag}\n\n` +
          `💰 Amount: ${fmt(data.amount)}\n` +
          `📋 Order: ${data.orderNo}\n` +
          `💬 Reason: ${data.reason || 'Contact support'}\n` +
          `⏰ Time: ${timestamp}`
        break

      case 'withdrawal_request':
        adminMessage = `💸 <b>New Withdrawal Request</b> ${flag}\n\n` +
          `📦 Gateway: ${gatewayName}\n` +
          `👤 Merchant: ${merchantName} (${accountNumber})\n` +
          `💰 Amount: ${fmt(data.amount)}\n` +
          `💱 Currency: ${cur || 'INR'}\n` +
          `🏦 Bank: ${data.bankName || 'N/A'}\n` +
          `💳 Account: ${data.accountNumber || 'N/A'}\n` +
          `📊 Status: Pending Approval\n` +
          `⏰ Time: ${timestamp}`

        merchantMessage = `💸 <b>Withdrawal Request Submitted</b> ${flag}\n\n` +
          `💰 Amount: ${fmt(data.amount)}\n` +
          `🏦 Bank: ${data.bankName || 'N/A'}\n` +
          `📊 Status: Pending Approval\n` +
          `⏰ Time: ${timestamp}`
        break

      case 'withdrawal_approved':
        merchantMessage = `✅ <b>Withdrawal Approved!</b> ${flag}\n\n` +
          `💰 Amount: ${fmt(data.amount)}\n` +
          `📊 Status: Processing\n` +
          `⏰ Time: ${timestamp}`
        break

      case 'withdrawal_rejected':
        merchantMessage = `❌ <b>Withdrawal Rejected</b> ${flag}\n\n` +
          `💰 Amount: ${fmt(data.amount)}\n` +
          `💵 Balance Restored\n` +
          `⏰ Time: ${timestamp}`
        break

      case 'balance_update':
        merchantMessage = `💰 <b>Balance Updated</b> ${flag}\n\n` +
          `💵 New Balance: ${fmt(data.newBalance)}\n` +
          `🔄 Change: ${data.change > 0 ? '+' : ''}${fmt(data.change)}\n` +
          `📋 Reason: ${data.reason || 'N/A'}\n` +
          `⏰ Time: ${timestamp}`
        break

      case 'large_payin_alert':
        adminMessage = `🚨 <b>LARGE PAY-IN ALERT</b> ${flag} 🚨\n\n` +
          `💎 Amount: ${fmt(data.amount)}\n` +
          `💱 Currency: ${cur || 'INR'}\n` +
          `👤 Merchant: ${merchantName} (${accountNumber})\n` +
          `📋 Order: ${data.orderNo}\n` +
          `🔖 Merchant Order: ${data.merchantOrderNo || 'N/A'}\n` +
          `📊 Status: Pending\n` +
          `⏰ Time: ${timestamp}\n\n` +
          `<i>⚠️ This transaction exceeds the large payin threshold</i>`
        break

      case 'large_payout_alert':
        adminMessage = `🚨 <b>LARGE PAYOUT ALERT</b> ${flag} 🚨\n\n` +
          `💎 Amount: ${fmt(data.amount)}\n` +
          `💱 Currency: ${cur || 'INR'}\n` +
          `👤 Merchant: ${merchantName} (${accountNumber})\n` +
          `🏦 Bank: ${data.bankName || 'N/A'}\n` +
          `💳 Account: ${data.accountNumber || 'N/A'}\n` +
          `📋 Order: ${data.orderNo}\n` +
          `📊 Status: Pending Approval\n` +
          `⏰ Time: ${timestamp}\n\n` +
          `<i>⚠️ This transaction exceeds the large payout threshold</i>`
        break

      case 'large_payin_success':
        adminMessage = `✅🚨 <b>LARGE PAY-IN SUCCESS</b> ${flag}\n\n` +
          `💎 Amount: ${fmt(data.amount)}\n` +
          `💸 Fee: ${fmt(data.fee || 0)}\n` +
          `💵 Net: ${fmt(data.netAmount || data.amount)}\n` +
          `👤 Merchant: ${merchantName} (${accountNumber})\n` +
          `📋 Order: ${data.orderNo}\n` +
          `⏰ Time: ${timestamp}`
        
        merchantMessage = `✅🎉 <b>Large Pay-In Successful!</b> ${flag}\n\n` +
          `💎 Amount: ${fmt(data.amount)}\n` +
          `💸 Fee: ${fmt(data.fee || 0)}\n` +
          `💵 Net Credited: ${fmt(data.netAmount || data.amount)}\n` +
          `📋 Order: ${data.orderNo}\n` +
          `⏰ Time: ${timestamp}`
        break

      case 'large_payout_success':
        adminMessage = `✅🚨 <b>LARGE PAYOUT SUCCESS</b> ${flag}\n\n` +
          `💎 Amount: ${fmt(data.amount)}\n` +
          `👤 Merchant: ${merchantName} (${accountNumber})\n` +
          `🏦 Bank: ${data.bankName || 'N/A'}\n` +
          `📋 Order: ${data.orderNo}\n` +
          `⏰ Time: ${timestamp}`
        
        merchantMessage = `✅🎉 <b>Large Payout Successful!</b> ${flag}\n\n` +
          `💎 Amount: ${fmt(data.amount)}\n` +
          `🏦 Bank: ${data.bankName || 'N/A'}\n` +
          `📋 Order: ${data.orderNo}\n` +
          `⏰ Time: ${timestamp}`
        break

      default:
        console.log('Unknown notification type:', type)
    }

    // Send to admin if chat ID configured
    if (adminSettings?.admin_telegram_chat_id && adminMessage) {
      await sendTelegramMessage({
        chatId: adminSettings.admin_telegram_chat_id,
        message: adminMessage,
      })
    }

    // Send to merchant if chat ID configured
    if (merchantChatId && merchantMessage) {
      await sendTelegramMessage({
        chatId: merchantChatId,
        message: merchantMessage,
      })
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notifications sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Telegram notification error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})