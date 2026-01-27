import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Hash password for secure storage (using SHA-256)
async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Generate a random salt
function generateSalt(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Hash and format password for storage
async function createPasswordHash(password: string): Promise<string> {
  const salt = generateSalt()
  const hashedPassword = await hashPassword(password, salt)
  return `${salt}:${hashedPassword}`
}

// Get bot token from DB or env
async function getBotToken(supabaseAdmin: any): Promise<string | null> {
  const { data: settings } = await supabaseAdmin
    .from('admin_settings')
    .select('telegram_bot_token')
    .limit(1)
    .maybeSingle()
  
  return settings?.telegram_bot_token || Deno.env.get('TG_BOT_TOKEN') || null
}

// Commands that should NOT trigger auto-delete (keep messages visible)
const NO_AUTO_DELETE_COMMANDS = [
  '/help',
  '/tg_id',
  '/id', 
  '/chatid',
  '/setmenu',
  '/create_merchant',
  '/broadcast',
]

// Global supabase client for the current request
let _supabaseAdmin: any = null

// Set the global supabase client
function setSupabaseAdmin(client: any) {
  _supabaseAdmin = client
}

// Check if command should skip auto-delete
function shouldSkipAutoDelete(command: string): boolean {
  const cmd = command.toLowerCase().split('@')[0]
  return NO_AUTO_DELETE_COMMANDS.includes(cmd)
}

// Get last bot message ID from database
async function getLastBotMessageId(chatId: string): Promise<number | null> {
  if (!_supabaseAdmin) return null
  try {
    const { data } = await _supabaseAdmin
      .from('telegram_bot_messages')
      .select('last_message_id')
      .eq('chat_id', chatId)
      .maybeSingle()
    return data?.last_message_id || null
  } catch (e) {
    return null
  }
}

// Save last bot message ID to database
async function saveLastBotMessageId(chatId: string, messageId: number) {
  if (!_supabaseAdmin) return
  try {
    await _supabaseAdmin
      .from('telegram_bot_messages')
      .upsert({ 
        chat_id: chatId, 
        last_message_id: messageId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'chat_id' })
  } catch (e) {
    // Ignore errors
  }
}

// Clear last bot message ID from database
async function clearLastBotMessageId(chatId: string) {
  if (!_supabaseAdmin) return
  try {
    await _supabaseAdmin
      .from('telegram_bot_messages')
      .delete()
      .eq('chat_id', chatId)
  } catch (e) {
    // Ignore errors
  }
}

// Delete a message
async function deleteMessage(botToken: string, chatId: string, messageId: number) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
    })
  } catch (e) {
    // Ignore delete errors (message may already be deleted or too old)
  }
}

// Helper to send Telegram message with optional keyboard (auto-deletes previous bot message)
async function sendMessage(botToken: string, chatId: string, text: string, parseMode: string = 'HTML', keyboard?: any, autoDelete: boolean = true) {
  if (!botToken) return

  // Delete previous bot message if exists (using database)
  if (autoDelete && _supabaseAdmin) {
    const lastMsgId = await getLastBotMessageId(chatId)
    if (lastMsgId) {
      await deleteMessage(botToken, chatId, lastMsgId)
    }
  }

  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
  }
  
  if (keyboard) {
    body.reply_markup = keyboard
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  // Track the new message ID in database for future auto-delete
  try {
    const result = await response.json()
    if (result.ok && result.result?.message_id && _supabaseAdmin) {
      if (autoDelete) {
        await saveLastBotMessageId(chatId, result.result.message_id)
      } else {
        // If not auto-deleting, clear the tracking so next message doesn't delete this one
        await clearLastBotMessageId(chatId)
      }
    }
  } catch (e) {
    // Ignore parsing errors
  }
}

// Send message with inline keyboard (auto-deletes previous bot message)
async function sendMessageWithButtons(botToken: string, chatId: string, text: string, buttons: { text: string; callback_data: string }[][], autoDelete: boolean = true) {
  if (!botToken) return

  // Delete previous bot message if exists (using database)
  if (autoDelete && _supabaseAdmin) {
    const lastMsgId = await getLastBotMessageId(chatId)
    if (lastMsgId) {
      await deleteMessage(botToken, chatId, lastMsgId)
    }
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: buttons,
      },
    }),
  })

  // Track the new message ID in database for future auto-delete
  try {
    const result = await response.json()
    if (result.ok && result.result?.message_id && _supabaseAdmin) {
      if (autoDelete) {
        await saveLastBotMessageId(chatId, result.result.message_id)
      } else {
        await clearLastBotMessageId(chatId)
      }
    }
  } catch (e) {
    // Ignore parsing errors
  }
}

// Answer callback query
async function answerCallbackQuery(botToken: string, callbackQueryId: string, text?: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text || '',
    }),
  })
}

// Edit message
async function editMessage(botToken: string, chatId: string, messageId: number, text: string, keyboard?: any) {
  const body: any = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
  }
  
  if (keyboard) {
    body.reply_markup = keyboard
  }

  await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Set bot commands menu
async function setMyCommands(botToken: string, commands: { command: string; description: string }[], scope?: any) {
  const body: any = { commands }
  if (scope) body.scope = scope
  
  await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Generate random password
function generatePassword(length: number = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// Format currency amount
function formatAmount(amount: number, currency: string = 'INR'): string {
  const symbols: Record<string, string> = { INR: '₹', PKR: 'Rs.', BDT: '৳', USDT: '$' }
  const symbol = symbols[currency] || '₹'
  return `${symbol}${amount.toLocaleString('en-IN')}`
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
}

// Generate random withdrawal password
function generateWithdrawalPassword(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase()
}

// Format date to IST
function formatDate(date: Date | string): string {
  return new Date(date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })
}

// Format time ago
function timeAgo(date: Date | string): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// Find merchant by telegram chat ID with gateway info
async function findMerchantByChatId(supabaseAdmin: any, chatId: string) {
  const { data: merchants } = await supabaseAdmin
    .from('merchants')
    .select('*, payment_gateways(gateway_code, gateway_name, currency)')
    .eq('telegram_chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(1)
  
  return merchants && merchants.length > 0 ? merchants[0] : null
}

// Get gateway health status
async function checkGatewayHealth(supabaseAdmin: any): Promise<{ total: number; active: number; details: any[] }> {
  const { data: gateways } = await supabaseAdmin
    .from('payment_gateways')
    .select('id, gateway_name, gateway_code, currency, is_active')
  
  const total = gateways?.length || 0
  const active = gateways?.filter((g: any) => g.is_active)?.length || 0
  
  return { total, active, details: gateways || [] }
}

// ============= ADVANCED ANALYTICS FUNCTIONS =============

// Get weekly stats for a merchant or all merchants
async function getWeeklyStats(supabaseAdmin: any, merchantId?: string) {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  
  let query = supabaseAdmin
    .from('transactions')
    .select('amount, fee, status, transaction_type, created_at')
    .gte('created_at', weekAgo.toISOString())
  
  if (merchantId) {
    query = query.eq('merchant_id', merchantId)
  }
  
  const { data: transactions } = await query
  
  const stats = {
    totalPayin: 0, successPayin: 0, failedPayin: 0, pendingPayin: 0,
    totalPayout: 0, successPayout: 0, failedPayout: 0, pendingPayout: 0,
    payinAmount: 0, payoutAmount: 0, feeCollected: 0,
    dailyData: {} as Record<string, { payin: number; payout: number; orders: number }>
  }
  
  transactions?.forEach((tx: any) => {
    const date = new Date(tx.created_at).toISOString().split('T')[0]
    if (!stats.dailyData[date]) {
      stats.dailyData[date] = { payin: 0, payout: 0, orders: 0 }
    }
    stats.dailyData[date].orders++
    
    if (tx.transaction_type === 'payin') {
      stats.totalPayin++
      if (tx.status === 'success') { stats.successPayin++; stats.payinAmount += tx.amount; stats.dailyData[date].payin += tx.amount }
      else if (tx.status === 'failed') stats.failedPayin++
      else stats.pendingPayin++
    } else {
      stats.totalPayout++
      if (tx.status === 'success') { stats.successPayout++; stats.payoutAmount += tx.amount; stats.dailyData[date].payout += tx.amount }
      else if (tx.status === 'failed') stats.failedPayout++
      else stats.pendingPayout++
    }
    if (tx.status === 'success' && tx.fee) stats.feeCollected += tx.fee
  })
  
  return stats
}

// Get monthly stats
async function getMonthlyStats(supabaseAdmin: any, merchantId?: string) {
  const monthAgo = new Date()
  monthAgo.setMonth(monthAgo.getMonth() - 1)
  
  let query = supabaseAdmin
    .from('transactions')
    .select('amount, fee, status, transaction_type, created_at')
    .gte('created_at', monthAgo.toISOString())
  
  if (merchantId) {
    query = query.eq('merchant_id', merchantId)
  }
  
  const { data: transactions } = await query
  
  let payinSuccess = 0, payinTotal = 0, payoutSuccess = 0, payoutTotal = 0
  let payinAmount = 0, payoutAmount = 0, feeCollected = 0
  const weeklyData: Record<string, { payin: number; payout: number }> = {}
  
  transactions?.forEach((tx: any) => {
    const week = `W${Math.ceil((new Date().getDate() - new Date(tx.created_at).getDate() + 1) / 7)}`
    if (!weeklyData[week]) weeklyData[week] = { payin: 0, payout: 0 }
    
    if (tx.transaction_type === 'payin') {
      payinTotal++
      if (tx.status === 'success') { payinSuccess++; payinAmount += tx.amount; weeklyData[week].payin += tx.amount }
    } else {
      payoutTotal++
      if (tx.status === 'success') { payoutSuccess++; payoutAmount += tx.amount; weeklyData[week].payout += tx.amount }
    }
    if (tx.status === 'success' && tx.fee) feeCollected += tx.fee
  })
  
  return { payinSuccess, payinTotal, payoutSuccess, payoutTotal, payinAmount, payoutAmount, feeCollected, weeklyData }
}

// Get peak hours analysis
async function getPeakHoursAnalysis(supabaseAdmin: any) {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  
  const { data: transactions } = await supabaseAdmin
    .from('transactions')
    .select('amount, status, transaction_type, created_at')
    .eq('status', 'success')
    .gte('created_at', weekAgo.toISOString())
  
  const hourlyData: Record<number, { count: number; amount: number }> = {}
  for (let i = 0; i < 24; i++) hourlyData[i] = { count: 0, amount: 0 }
  
  transactions?.forEach((tx: any) => {
    const hour = new Date(tx.created_at).getHours()
    hourlyData[hour].count++
    hourlyData[hour].amount += tx.amount
  })
  
  // Find peak hours
  const sorted = Object.entries(hourlyData)
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 5)
  
  return { hourlyData, peakHours: sorted }
}

// Get comparison stats (today vs yesterday, this week vs last week)
async function getComparisonStats(supabaseAdmin: any) {
  const now = new Date()
  const todayStart = new Date(now.setHours(0, 0, 0, 0))
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)
  const thisWeekStart = new Date(now.setDate(now.getDate() - now.getDay()))
  const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000)
  const lastWeekEnd = thisWeekStart
  
  const [todayTx, yesterdayTx, thisWeekTx, lastWeekTx] = await Promise.all([
    supabaseAdmin.from('transactions').select('amount, status, transaction_type').gte('created_at', todayStart.toISOString()),
    supabaseAdmin.from('transactions').select('amount, status, transaction_type').gte('created_at', yesterdayStart.toISOString()).lt('created_at', todayStart.toISOString()),
    supabaseAdmin.from('transactions').select('amount, status, transaction_type').gte('created_at', thisWeekStart.toISOString()),
    supabaseAdmin.from('transactions').select('amount, status, transaction_type').gte('created_at', lastWeekStart.toISOString()).lt('created_at', lastWeekEnd.toISOString()),
  ])
  
  const calcStats = (txs: any[]) => {
    let payin = 0, payout = 0, orders = 0
    txs?.forEach((tx: any) => {
      orders++
      if (tx.status === 'success') {
        if (tx.transaction_type === 'payin') payin += tx.amount
        else payout += tx.amount
      }
    })
    return { payin, payout, orders }
  }
  
  return {
    today: calcStats(todayTx.data || []),
    yesterday: calcStats(yesterdayTx.data || []),
    thisWeek: calcStats(thisWeekTx.data || []),
    lastWeek: calcStats(lastWeekTx.data || []),
  }
}

// ============= SECURITY & ALERT FUNCTIONS =============

// Check for suspicious activity
async function checkSuspiciousActivity(supabaseAdmin: any, merchantId: string) {
  const hourAgo = new Date()
  hourAgo.setHours(hourAgo.getHours() - 1)
  
  const { data: recentTx } = await supabaseAdmin
    .from('transactions')
    .select('amount, status, transaction_type, created_at')
    .eq('merchant_id', merchantId)
    .gte('created_at', hourAgo.toISOString())
  
  const alerts: string[] = []
  
  // Check for high failure rate
  const failedCount = recentTx?.filter((tx: any) => tx.status === 'failed').length || 0
  const totalCount = recentTx?.length || 0
  if (totalCount >= 5 && failedCount / totalCount > 0.5) {
    alerts.push(`⚠️ High failure rate: ${Math.round(failedCount / totalCount * 100)}% in last hour`)
  }
  
  // Check for unusual volume
  const totalAmount = recentTx?.filter((tx: any) => tx.status === 'success').reduce((sum: number, tx: any) => sum + tx.amount, 0) || 0
  if (totalAmount > 500000) {
    alerts.push(`⚠️ High volume: ${formatINR(totalAmount)} in last hour`)
  }
  
  // Check for rapid transactions
  if (totalCount > 50) {
    alerts.push(`⚠️ Rapid transactions: ${totalCount} in last hour`)
  }
  
  return alerts
}

// Check low balance alerts
async function checkLowBalanceAlerts(supabaseAdmin: any, adminSettings: any) {
  const { data: merchants } = await supabaseAdmin
    .from('merchants')
    .select('merchant_name, balance, telegram_chat_id, payment_gateways(currency)')
    .eq('is_active', true)
  
  const alerts: { merchant: string; balance: number; currency: string; chatId: string }[] = []
  
  const thresholds: Record<string, number> = {
    INR: adminSettings?.balance_threshold_inr || 10000,
    PKR: adminSettings?.balance_threshold_pkr || 50000,
    BDT: adminSettings?.balance_threshold_bdt || 50000,
  }
  
  merchants?.forEach((m: any) => {
    const currency = m.payment_gateways?.currency || 'INR'
    const threshold = thresholds[currency] || 10000
    if (m.balance < threshold) {
      alerts.push({
        merchant: m.merchant_name,
        balance: m.balance,
        currency,
        chatId: m.telegram_chat_id
      })
    }
  })
  
  return alerts
}

// Check for large transactions
async function getLargeTransactions(supabaseAdmin: any, adminSettings: any, hours: number = 24) {
  const since = new Date()
  since.setHours(since.getHours() - hours)
  
  const payinThreshold = adminSettings?.large_payin_threshold || 100000
  const payoutThreshold = adminSettings?.large_payout_threshold || 50000
  
  const { data: largePayins } = await supabaseAdmin
    .from('transactions')
    .select('order_no, amount, status, created_at, merchants(merchant_name)')
    .eq('transaction_type', 'payin')
    .gte('amount', payinThreshold)
    .gte('created_at', since.toISOString())
    .order('amount', { ascending: false })
    .limit(10)
  
  const { data: largePayouts } = await supabaseAdmin
    .from('transactions')
    .select('order_no, amount, status, created_at, merchants(merchant_name)')
    .eq('transaction_type', 'payout')
    .gte('amount', payoutThreshold)
    .gte('created_at', since.toISOString())
    .order('amount', { ascending: false })
    .limit(10)
  
  return { largePayins: largePayins || [], largePayouts: largePayouts || [] }
}

// Generate success rate chart (text-based)
function generateTextChart(data: Record<string, number>, title: string): string {
  const max = Math.max(...Object.values(data), 1)
  let chart = `📊 <b>${title}</b>\n\n`
  
  Object.entries(data).forEach(([key, value]) => {
    const barLength = Math.round((value / max) * 10)
    const bar = '█'.repeat(barLength) + '░'.repeat(10 - barLength)
    chart += `${key}: ${bar} ${value}\n`
  })
  
  return chart
}

// ============= MAIN HANDLER =============

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('Telegram webhook received:', JSON.stringify(body))

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    
    // Set the global supabase client for auto-delete functionality
    setSupabaseAdmin(supabaseAdmin)

    // Get bot token
    const botToken = await getBotToken(supabaseAdmin)
    if (!botToken) {
      console.error('No bot token configured')
      return new Response(JSON.stringify({ ok: false, error: 'No bot token' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Get admin settings
    const { data: adminSettings } = await supabaseAdmin
      .from('admin_settings')
      .select('*')
      .limit(1)
      .maybeSingle()

    const adminChatId = adminSettings?.admin_telegram_chat_id
    const gatewayName = adminSettings?.gateway_name || 'ELOPAY'
    const rawDomain = adminSettings?.gateway_domain || 'https://gateway.hyperdeveloper.store'
    const gatewayDomain = rawDomain.replace(/\/+$/, '')

    // ============ Handle Callback Query (Button clicks) ============
    if (body.callback_query) {
      const callbackQuery = body.callback_query
      const callbackData = callbackQuery.data
      const chatId = callbackQuery.message.chat.id.toString()
      const messageId = callbackQuery.message.message_id
      
      await answerCallbackQuery(botToken, callbackQuery.id)
      
      const [action, ...params] = callbackData.split(':')
      
      // ============ MERCHANT DETAIL CALLBACK ============
      if (action === 'merchant_detail') {
        const accountNo = params[0]
        const { data: merchant } = await supabaseAdmin
          .from('merchants')
          .select('*, payment_gateways(gateway_code, gateway_name, currency)')
          .eq('account_number', accountNo)
          .maybeSingle()
        
        if (merchant) {
          const status = merchant.is_active ? '✅ Active' : '❌ Inactive'
          const currency = merchant.payment_gateways?.currency || 'INR'
          const gatewayType = merchant.payment_gateways?.gateway_code?.startsWith('hypersofts') ? 'ELOPAY' : 'ELOPAY GATEWAY'
          
          const msg = `👤 <b>${merchant.merchant_name}</b>\n\n` +
            `🆔 ID: <code>${merchant.account_number}</code>\n` +
            `📊 Status: ${status}\n` +
            `🌐 Gateway: ${gatewayType} (${currency})\n\n` +
            `💰 Balance: ${formatAmount(merchant.balance || 0, currency)}\n` +
            `🧊 Frozen: ${formatAmount(merchant.frozen_balance || 0, currency)}\n\n` +
            `💳 Payin Fee: ${merchant.payin_fee}%\n` +
            `💸 Payout Fee: ${merchant.payout_fee}%`
          
          await editMessage(botToken, chatId, messageId, msg, {
            inline_keyboard: [
              [
                { text: '📊 Today', callback_data: `merchant_today:${accountNo}` },
                { text: '📈 Weekly', callback_data: `merchant_weekly:${accountNo}` },
              ],
              [
                { text: '📋 History', callback_data: `merchant_history:${accountNo}` },
                { text: '⚠️ Alerts', callback_data: `merchant_alerts:${accountNo}` },
              ],
              [
                { text: '🔐 Reset 2FA', callback_data: `reset_2fa:${accountNo}` },
                { text: '🔑 Reset Pass', callback_data: `reset_pass:${accountNo}` },
              ],
              [
                { text: merchant.is_active ? '🔴 Disable' : '🟢 Enable', callback_data: `toggle_merchant:${accountNo}` },
                { text: '🔒 Freeze', callback_data: `freeze_merchant:${accountNo}` },
              ],
              [{ text: '« Back to List', callback_data: 'merchants_list:0' }],
            ],
          })
        }
      }
      
      // ============ MERCHANT WEEKLY CALLBACK ============
      else if (action === 'merchant_weekly') {
        const accountNo = params[0]
        const { data: merchant } = await supabaseAdmin
          .from('merchants')
          .select('id, merchant_name, payment_gateways(currency)')
          .eq('account_number', accountNo)
          .maybeSingle()
        
        if (merchant) {
          const stats = await getWeeklyStats(supabaseAdmin, merchant.id)
          const gateway = merchant.payment_gateways as unknown as { currency: string } | null
          const currency = gateway?.currency || 'INR'
          
          const payinRate = stats.totalPayin ? Math.round(stats.successPayin / stats.totalPayin * 100) : 0
          const payoutRate = stats.totalPayout ? Math.round(stats.successPayout / stats.totalPayout * 100) : 0
          
          let msg = `📈 <b>${merchant.merchant_name} - Weekly</b>\n\n`
          msg += `━━━ 📥 PAY-IN ━━━\n`
          msg += `Orders: ${stats.totalPayin} | ✅ ${stats.successPayin} | ❌ ${stats.failedPayin}\n`
          msg += `Amount: ${formatAmount(stats.payinAmount, currency)}\n`
          msg += `Rate: ${payinRate}%\n\n`
          msg += `━━━ 📤 PAY-OUT ━━━\n`
          msg += `Orders: ${stats.totalPayout} | ✅ ${stats.successPayout} | ❌ ${stats.failedPayout}\n`
          msg += `Amount: ${formatAmount(stats.payoutAmount, currency)}\n`
          msg += `Rate: ${payoutRate}%\n\n`
          msg += `━━━ 💰 FEES ━━━\n`
          msg += `Collected: ${formatAmount(stats.feeCollected, currency)}`
          
          await editMessage(botToken, chatId, messageId, msg, {
            inline_keyboard: [
              [
                { text: '📅 Monthly', callback_data: `merchant_monthly:${accountNo}` },
              ],
              [{ text: '« Back', callback_data: `merchant_detail:${accountNo}` }],
            ],
          })
        }
      }
      
      // ============ MERCHANT MONTHLY CALLBACK ============
      else if (action === 'merchant_monthly') {
        const accountNo = params[0]
        const { data: merchant } = await supabaseAdmin
          .from('merchants')
          .select('id, merchant_name, payment_gateways(currency)')
          .eq('account_number', accountNo)
          .maybeSingle()
        
        if (merchant) {
          const stats = await getMonthlyStats(supabaseAdmin, merchant.id)
          const gateway = merchant.payment_gateways as unknown as { currency: string } | null
          const currency = gateway?.currency || 'INR'
          
          const payinRate = stats.payinTotal ? Math.round(stats.payinSuccess / stats.payinTotal * 100) : 0
          const payoutRate = stats.payoutTotal ? Math.round(stats.payoutSuccess / stats.payoutTotal * 100) : 0
          
          let msg = `📅 <b>${merchant.merchant_name} - Monthly</b>\n\n`
          msg += `━━━ 📥 PAY-IN ━━━\n`
          msg += `Success: ${stats.payinSuccess}/${stats.payinTotal}\n`
          msg += `Amount: ${formatAmount(stats.payinAmount, currency)}\n`
          msg += `Rate: ${payinRate}%\n\n`
          msg += `━━━ 📤 PAY-OUT ━━━\n`
          msg += `Success: ${stats.payoutSuccess}/${stats.payoutTotal}\n`
          msg += `Amount: ${formatAmount(stats.payoutAmount, currency)}\n`
          msg += `Rate: ${payoutRate}%\n\n`
          msg += `━━━ 💰 FEES ━━━\n`
          msg += `Collected: ${formatAmount(stats.feeCollected, currency)}`
          
          await editMessage(botToken, chatId, messageId, msg, {
            inline_keyboard: [[{ text: '« Back', callback_data: `merchant_weekly:${accountNo}` }]],
          })
        }
      }
      
      // ============ MERCHANT ALERTS CALLBACK ============
      else if (action === 'merchant_alerts') {
        const accountNo = params[0]
        const { data: merchant } = await supabaseAdmin
          .from('merchants')
          .select('id, merchant_name')
          .eq('account_number', accountNo)
          .maybeSingle()
        
        if (merchant) {
          const alerts = await checkSuspiciousActivity(supabaseAdmin, merchant.id)
          
          let msg = `⚠️ <b>${merchant.merchant_name} - Alerts</b>\n\n`
          if (alerts.length > 0) {
            alerts.forEach(alert => { msg += `${alert}\n` })
          } else {
            msg += `✅ No suspicious activity detected\n\n`
            msg += `<i>Monitoring: failure rate, volume, rapid transactions</i>`
          }
          
          await editMessage(botToken, chatId, messageId, msg, {
            inline_keyboard: [[{ text: '« Back', callback_data: `merchant_detail:${accountNo}` }]],
          })
        }
      }
      
      // ============ TOGGLE MERCHANT CALLBACK ============
      else if (action === 'toggle_merchant') {
        const accountNo = params[0]
        const { data: merchant } = await supabaseAdmin
          .from('merchants')
          .select('is_active, merchant_name, telegram_chat_id')
          .eq('account_number', accountNo)
          .maybeSingle()
        
        if (merchant) {
          const newStatus = !merchant.is_active
          await supabaseAdmin.from('merchants').update({ is_active: newStatus }).eq('account_number', accountNo)
          
          const statusText = newStatus ? '✅ Enabled' : '🔴 Disabled'
          await editMessage(botToken, chatId, messageId, `${statusText} <b>${merchant.merchant_name}</b>`, {
            inline_keyboard: [[{ text: '« Back', callback_data: `merchant_detail:${accountNo}` }]],
          })
          
          if (merchant.telegram_chat_id) {
            await sendMessage(botToken, merchant.telegram_chat_id, 
              `${statusText} by admin\n\n${newStatus ? 'You can now process transactions.' : 'Your account has been suspended.'}`)
          }
        }
      }
      
      // ============ FREEZE MERCHANT CALLBACK ============
      else if (action === 'freeze_merchant') {
        const accountNo = params[0]
        const { data: merchant } = await supabaseAdmin
          .from('merchants')
          .select('balance, frozen_balance, merchant_name, telegram_chat_id')
          .eq('account_number', accountNo)
          .maybeSingle()
        
        if (merchant) {
          const totalBalance = (merchant.balance || 0) + (merchant.frozen_balance || 0)
          await supabaseAdmin.from('merchants')
            .update({ balance: 0, frozen_balance: totalBalance })
            .eq('account_number', accountNo)
          
          await editMessage(botToken, chatId, messageId, 
            `🔒 <b>Balance Frozen</b>\n\n` +
            `Merchant: ${merchant.merchant_name}\n` +
            `Frozen: ${formatINR(totalBalance)}`, {
            inline_keyboard: [
              [{ text: '🔓 Unfreeze', callback_data: `unfreeze_merchant:${accountNo}` }],
              [{ text: '« Back', callback_data: `merchant_detail:${accountNo}` }],
            ],
          })
          
          if (merchant.telegram_chat_id) {
            await sendMessage(botToken, merchant.telegram_chat_id, 
              `🔒 <b>Balance Frozen</b>\n\nYour balance has been frozen by admin. Contact support for assistance.`)
          }
        }
      }
      
      // ============ UNFREEZE MERCHANT CALLBACK ============
      else if (action === 'unfreeze_merchant') {
        const accountNo = params[0]
        const { data: merchant } = await supabaseAdmin
          .from('merchants')
          .select('balance, frozen_balance, merchant_name, telegram_chat_id')
          .eq('account_number', accountNo)
          .maybeSingle()
        
        if (merchant) {
          const totalBalance = (merchant.balance || 0) + (merchant.frozen_balance || 0)
          await supabaseAdmin.from('merchants')
            .update({ balance: totalBalance, frozen_balance: 0 })
            .eq('account_number', accountNo)
          
          await editMessage(botToken, chatId, messageId, 
            `🔓 <b>Balance Unfrozen</b>\n\n` +
            `Merchant: ${merchant.merchant_name}\n` +
            `Available: ${formatINR(totalBalance)}`, {
            inline_keyboard: [[{ text: '« Back', callback_data: `merchant_detail:${accountNo}` }]],
          })
          
          if (merchant.telegram_chat_id) {
            await sendMessage(botToken, merchant.telegram_chat_id, 
              `🔓 <b>Balance Unfrozen</b>\n\nYour balance is now available for withdrawals.`)
          }
        }
      }
      
      // ============ MERCHANT TODAY CALLBACK ============
      else if (action === 'merchant_today') {
        const accountNo = params[0]
        const { data: merchant } = await supabaseAdmin
          .from('merchants')
          .select('id, merchant_name')
          .eq('account_number', accountNo)
          .maybeSingle()
        
        if (merchant) {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          
          const { data: transactions } = await supabaseAdmin
            .from('transactions')
            .select('amount, status, transaction_type')
            .eq('merchant_id', merchant.id)
            .gte('created_at', today.toISOString())
          
          let payinCount = 0, payinSuccess = 0, payinAmount = 0
          let payoutCount = 0, payoutSuccess = 0, payoutAmount = 0
          
          transactions?.forEach((tx: any) => {
            if (tx.transaction_type === 'payin') {
              payinCount++
              if (tx.status === 'success') { payinSuccess++; payinAmount += tx.amount }
            } else {
              payoutCount++
              if (tx.status === 'success') { payoutSuccess++; payoutAmount += tx.amount }
            }
          })
          
          const msg = `📊 <b>${merchant.merchant_name} - Today</b>\n\n` +
            `━━━ 📥 PAY-IN ━━━\n` +
            `Orders: ${payinCount} | Success: ${payinSuccess}\n` +
            `Amount: ${formatINR(payinAmount)}\n` +
            `Rate: ${payinCount ? Math.round(payinSuccess / payinCount * 100) : 0}%\n\n` +
            `━━━ 📤 PAY-OUT ━━━\n` +
            `Orders: ${payoutCount} | Success: ${payoutSuccess}\n` +
            `Amount: ${formatINR(payoutAmount)}\n` +
            `Rate: ${payoutCount ? Math.round(payoutSuccess / payoutCount * 100) : 0}%`
          
          await editMessage(botToken, chatId, messageId, msg, {
            inline_keyboard: [[{ text: '« Back', callback_data: `merchant_detail:${accountNo}` }]],
          })
        }
      }
      
      // ============ MERCHANT HISTORY CALLBACK ============
      else if (action === 'merchant_history') {
        const accountNo = params[0]
        const { data: merchant } = await supabaseAdmin
          .from('merchants')
          .select('id, merchant_name')
          .eq('account_number', accountNo)
          .maybeSingle()
        
        if (merchant) {
          const { data: transactions } = await supabaseAdmin
            .from('transactions')
            .select('order_no, amount, status, transaction_type, created_at')
            .eq('merchant_id', merchant.id)
            .order('created_at', { ascending: false })
            .limit(5)
          
          let msg = `📋 <b>${merchant.merchant_name} - Recent</b>\n\n`
          transactions?.forEach((tx: any, i: number) => {
            const icon = tx.transaction_type === 'payin' ? '📥' : '📤'
            const statusIcon = tx.status === 'success' ? '✅' : tx.status === 'failed' ? '❌' : '⏳'
            msg += `${i + 1}. ${icon}${statusIcon} ${formatINR(tx.amount)}\n`
            msg += `   <code>${tx.order_no}</code>\n`
            msg += `   ${timeAgo(tx.created_at)}\n\n`
          })
          
          await editMessage(botToken, chatId, messageId, msg, {
            inline_keyboard: [[{ text: '« Back', callback_data: `merchant_detail:${accountNo}` }]],
          })
        }
      }
      
      // ============ RESET 2FA CALLBACK ============
      else if (action === 'reset_2fa') {
        const accountNo = params[0]
        await supabaseAdmin
          .from('merchants')
          .update({ google_2fa_secret: null, is_2fa_enabled: false })
          .eq('account_number', accountNo)
        
        await editMessage(botToken, chatId, messageId, `✅ 2FA reset for merchant <code>${accountNo}</code>`, {
          inline_keyboard: [[{ text: '« Back', callback_data: `merchant_detail:${accountNo}` }]],
        })
      }
      
      // ============ RESET PASS CALLBACK ============
      else if (action === 'reset_pass') {
        const accountNo = params[0]
        const { data: merchant } = await supabaseAdmin
          .from('merchants')
          .select('user_id, merchant_name, telegram_chat_id')
          .eq('account_number', accountNo)
          .maybeSingle()
        
        if (merchant) {
          const newPassword = generatePassword()
          await supabaseAdmin.auth.admin.updateUserById(merchant.user_id, { password: newPassword })
          
          await editMessage(botToken, chatId, messageId, 
            `✅ Password reset for <b>${merchant.merchant_name}</b>\n\nNew: <code>${newPassword}</code>`, {
            inline_keyboard: [[{ text: '« Back', callback_data: `merchant_detail:${accountNo}` }]],
          })
          
          if (merchant.telegram_chat_id) {
            await sendMessage(botToken, merchant.telegram_chat_id, 
              `🔑 <b>Password Reset</b>\n\nNew Password: <code>${newPassword}</code>`)
          }
        }
      }
      
      // ============ MERCHANTS LIST CALLBACK ============
      else if (action === 'merchants_list') {
        const page = parseInt(params[0]) || 0
        const limit = 5
        const offset = page * limit
        
        const { data: merchants, count } = await supabaseAdmin
          .from('merchants')
          .select('account_number, merchant_name, balance, is_active', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)
        
        const totalPages = Math.ceil((count || 0) / limit)
        
        let msg = `📋 <b>Merchants</b> (Page ${page + 1}/${totalPages})\n\n`
        const buttons: { text: string; callback_data: string }[][] = []
        
        merchants?.forEach((m: any) => {
          const status = m.is_active ? '✅' : '❌'
          msg += `${status} <b>${m.merchant_name}</b>\n`
          msg += `   ID: <code>${m.account_number}</code> | ${formatINR(m.balance || 0)}\n\n`
          buttons.push([{ text: `👤 ${m.merchant_name}`, callback_data: `merchant_detail:${m.account_number}` }])
        })
        
        const navButtons: { text: string; callback_data: string }[] = []
        if (page > 0) navButtons.push({ text: '« Prev', callback_data: `merchants_list:${page - 1}` })
        if (page < totalPages - 1) navButtons.push({ text: 'Next »', callback_data: `merchants_list:${page + 1}` })
        if (navButtons.length) buttons.push(navButtons)
        
        await editMessage(botToken, chatId, messageId, msg, { inline_keyboard: buttons })
      }
      
      // ============ DASHBOARD CALLBACK ============
      else if (action === 'dashboard') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const { data: todayTx } = await supabaseAdmin
          .from('transactions')
          .select('amount, status, transaction_type')
          .gte('created_at', today.toISOString())
        
        const { data: merchants } = await supabaseAdmin
          .from('merchants')
          .select('balance, is_active')
        
        let payinTotal = 0, payinSuccess = 0, payoutTotal = 0, payoutSuccess = 0
        todayTx?.forEach((tx: any) => {
          if (tx.transaction_type === 'payin') {
            payinTotal++
            if (tx.status === 'success') payinSuccess += tx.amount
          } else {
            payoutTotal++
            if (tx.status === 'success') payoutSuccess += tx.amount
          }
        })
        
        const totalBalance = merchants?.reduce((sum: number, m: any) => sum + (m.balance || 0), 0) || 0
        const activeCount = merchants?.filter((m: any) => m.is_active)?.length || 0
        
        const msg = `📊 <b>Dashboard</b>\n\n` +
          `━━━ 📅 TODAY ━━━\n` +
          `📥 Pay-In: ${formatINR(payinSuccess)} (${payinTotal} orders)\n` +
          `📤 Pay-Out: ${formatINR(payoutSuccess)} (${payoutTotal} orders)\n\n` +
          `━━━ 💰 BALANCE ━━━\n` +
          `Total: ${formatINR(totalBalance)}\n\n` +
          `━━━ 👥 MERCHANTS ━━━\n` +
          `Active: ${activeCount}/${merchants?.length || 0}`
        
        await editMessage(botToken, chatId, messageId, msg, {
          inline_keyboard: [
            [
              { text: '📋 Merchants', callback_data: 'merchants_list:0' },
              { text: '⏳ Pending', callback_data: 'pending_all' },
            ],
            [
              { text: '📈 Analytics', callback_data: 'admin_analytics' },
              { text: '⚠️ Alerts', callback_data: 'admin_alerts' },
            ],
            [{ text: '🔄 Refresh', callback_data: 'dashboard' }],
          ],
        })
      }
      
      // ============ ADMIN ANALYTICS CALLBACK ============
      else if (action === 'admin_analytics') {
        const comparison = await getComparisonStats(supabaseAdmin)
        const todayChange = comparison.yesterday.payin ? Math.round((comparison.today.payin - comparison.yesterday.payin) / comparison.yesterday.payin * 100) : 0
        const weekChange = comparison.lastWeek.payin ? Math.round((comparison.thisWeek.payin - comparison.lastWeek.payin) / comparison.lastWeek.payin * 100) : 0
        
        const todayIcon = todayChange >= 0 ? '📈' : '📉'
        const weekIcon = weekChange >= 0 ? '📈' : '📉'
        
        let msg = `📈 <b>Analytics Dashboard</b>\n\n`
        msg += `━━━ 📅 TODAY vs YESTERDAY ━━━\n`
        msg += `Pay-In: ${formatINR(comparison.today.payin)} ${todayIcon} ${todayChange >= 0 ? '+' : ''}${todayChange}%\n`
        msg += `Pay-Out: ${formatINR(comparison.today.payout)}\n`
        msg += `Orders: ${comparison.today.orders}\n\n`
        msg += `━━━ 📆 THIS WEEK vs LAST ━━━\n`
        msg += `Pay-In: ${formatINR(comparison.thisWeek.payin)} ${weekIcon} ${weekChange >= 0 ? '+' : ''}${weekChange}%\n`
        msg += `Pay-Out: ${formatINR(comparison.thisWeek.payout)}\n`
        msg += `Orders: ${comparison.thisWeek.orders}`
        
        await editMessage(botToken, chatId, messageId, msg, {
          inline_keyboard: [
            [
              { text: '📊 Weekly Report', callback_data: 'weekly_report' },
              { text: '📅 Monthly', callback_data: 'monthly_report' },
            ],
            [
              { text: '⏰ Peak Hours', callback_data: 'peak_hours' },
              { text: '🏆 Top Merchants', callback_data: 'top_merchants' },
            ],
            [{ text: '« Back', callback_data: 'dashboard' }],
          ],
        })
      }
      
      // ============ WEEKLY REPORT CALLBACK ============
      else if (action === 'weekly_report') {
        const stats = await getWeeklyStats(supabaseAdmin)
        const payinRate = stats.totalPayin ? Math.round(stats.successPayin / stats.totalPayin * 100) : 0
        const payoutRate = stats.totalPayout ? Math.round(stats.successPayout / stats.totalPayout * 100) : 0
        
        let msg = `📊 <b>Weekly Report</b>\n\n`
        msg += `━━━ 📥 PAY-IN (7 days) ━━━\n`
        msg += `Total: ${stats.totalPayin} | ✅ ${stats.successPayin} | ❌ ${stats.failedPayin} | ⏳ ${stats.pendingPayin}\n`
        msg += `Amount: ${formatINR(stats.payinAmount)}\n`
        msg += `Success Rate: ${payinRate}%\n\n`
        msg += `━━━ 📤 PAY-OUT (7 days) ━━━\n`
        msg += `Total: ${stats.totalPayout} | ✅ ${stats.successPayout} | ❌ ${stats.failedPayout} | ⏳ ${stats.pendingPayout}\n`
        msg += `Amount: ${formatINR(stats.payoutAmount)}\n`
        msg += `Success Rate: ${payoutRate}%\n\n`
        msg += `━━━ 💰 REVENUE ━━━\n`
        msg += `Fees Collected: ${formatINR(stats.feeCollected)}`
        
        await editMessage(botToken, chatId, messageId, msg, {
          inline_keyboard: [[{ text: '« Back', callback_data: 'admin_analytics' }]],
        })
      }
      
      // ============ MONTHLY REPORT CALLBACK ============
      else if (action === 'monthly_report') {
        const stats = await getMonthlyStats(supabaseAdmin)
        const payinRate = stats.payinTotal ? Math.round(stats.payinSuccess / stats.payinTotal * 100) : 0
        const payoutRate = stats.payoutTotal ? Math.round(stats.payoutSuccess / stats.payoutTotal * 100) : 0
        
        let msg = `📅 <b>Monthly Report (30 days)</b>\n\n`
        msg += `━━━ 📥 PAY-IN ━━━\n`
        msg += `Success: ${stats.payinSuccess}/${stats.payinTotal} (${payinRate}%)\n`
        msg += `Amount: ${formatINR(stats.payinAmount)}\n\n`
        msg += `━━━ 📤 PAY-OUT ━━━\n`
        msg += `Success: ${stats.payoutSuccess}/${stats.payoutTotal} (${payoutRate}%)\n`
        msg += `Amount: ${formatINR(stats.payoutAmount)}\n\n`
        msg += `━━━ 💰 REVENUE ━━━\n`
        msg += `Fees Collected: ${formatINR(stats.feeCollected)}`
        
        await editMessage(botToken, chatId, messageId, msg, {
          inline_keyboard: [[{ text: '« Back', callback_data: 'admin_analytics' }]],
        })
      }
      
      // ============ PEAK HOURS CALLBACK ============
      else if (action === 'peak_hours') {
        const analysis = await getPeakHoursAnalysis(supabaseAdmin)
        
        let msg = `⏰ <b>Peak Hours (Last 7 Days)</b>\n\n`
        msg += `━━━ 🏆 TOP 5 HOURS ━━━\n`
        analysis.peakHours.forEach(([hour, data], i) => {
          msg += `${i + 1}. ${hour}:00 - ${parseInt(hour) + 1}:00\n`
          msg += `   ${(data as any).count} orders | ${formatINR((data as any).amount)}\n`
        })
        msg += `\n<i>💡 Schedule payouts during off-peak hours for better success rates</i>`
        
        await editMessage(botToken, chatId, messageId, msg, {
          inline_keyboard: [[{ text: '« Back', callback_data: 'admin_analytics' }]],
        })
      }
      
      // ============ TOP MERCHANTS CALLBACK ============
      else if (action === 'top_merchants') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        
        const { data: transactions } = await supabaseAdmin
          .from('transactions')
          .select('amount, merchant_id, merchants(merchant_name)')
          .eq('status', 'success')
          .gte('created_at', weekAgo.toISOString())
        
        const merchantVolumes: Record<string, { name: string; volume: number }> = {}
        transactions?.forEach((tx: any) => {
          const name = (tx.merchants as any)?.merchant_name || 'Unknown'
          if (!merchantVolumes[tx.merchant_id]) {
            merchantVolumes[tx.merchant_id] = { name, volume: 0 }
          }
          merchantVolumes[tx.merchant_id].volume += tx.amount
        })
        
        const sorted = Object.entries(merchantVolumes)
          .sort((a, b) => b[1].volume - a[1].volume)
          .slice(0, 10)
        
        let msg = `🏆 <b>Top Merchants (7 Days)</b>\n\n`
        sorted.forEach(([_, data], i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
          msg += `${medal} <b>${data.name}</b>\n`
          msg += `   Volume: ${formatINR(data.volume)}\n\n`
        })
        
        await editMessage(botToken, chatId, messageId, msg, {
          inline_keyboard: [[{ text: '« Back', callback_data: 'admin_analytics' }]],
        })
      }
      
      // ============ ADMIN ALERTS CALLBACK ============
      else if (action === 'admin_alerts') {
        const lowBalanceAlerts = await checkLowBalanceAlerts(supabaseAdmin, adminSettings)
        const largeTransactions = await getLargeTransactions(supabaseAdmin, adminSettings)
        
        let msg = `⚠️ <b>System Alerts</b>\n\n`
        
        // Low balance alerts
        msg += `━━━ 💰 LOW BALANCE ━━━\n`
        if (lowBalanceAlerts.length > 0) {
          lowBalanceAlerts.slice(0, 5).forEach(alert => {
            msg += `⚠️ ${alert.merchant}: ${formatAmount(alert.balance, alert.currency)}\n`
          })
          if (lowBalanceAlerts.length > 5) msg += `...and ${lowBalanceAlerts.length - 5} more\n`
        } else {
          msg += `✅ All merchants have sufficient balance\n`
        }
        
        // Large transactions
        msg += `\n━━━ 💎 LARGE TRANSACTIONS (24h) ━━━\n`
        if (largeTransactions.largePayins.length > 0 || largeTransactions.largePayouts.length > 0) {
          msg += `📥 Large Pay-Ins: ${largeTransactions.largePayins.length}\n`
          msg += `📤 Large Pay-Outs: ${largeTransactions.largePayouts.length}\n`
        } else {
          msg += `No large transactions in last 24 hours\n`
        }
        
        await editMessage(botToken, chatId, messageId, msg, {
          inline_keyboard: [
            [
              { text: '💎 Large Tx Details', callback_data: 'large_tx_details' },
            ],
            [
              { text: '🔄 Refresh', callback_data: 'admin_alerts' },
              { text: '« Back', callback_data: 'dashboard' },
            ],
          ],
        })
      }
      
      // ============ LARGE TX DETAILS CALLBACK ============
      else if (action === 'large_tx_details') {
        const largeTransactions = await getLargeTransactions(supabaseAdmin, adminSettings)
        
        let msg = `💎 <b>Large Transactions (24h)</b>\n\n`
        
        msg += `━━━ 📥 LARGE PAY-INS ━━━\n`
        if (largeTransactions.largePayins.length > 0) {
          largeTransactions.largePayins.slice(0, 5).forEach((tx: any, i: number) => {
            const statusIcon = tx.status === 'success' ? '✅' : tx.status === 'failed' ? '❌' : '⏳'
            msg += `${i + 1}. ${statusIcon} ${formatINR(tx.amount)}\n`
            msg += `   ${(tx.merchants as any)?.merchant_name || 'N/A'}\n`
            msg += `   ${timeAgo(tx.created_at)}\n\n`
          })
        } else {
          msg += `No large pay-ins\n\n`
        }
        
        msg += `━━━ 📤 LARGE PAY-OUTS ━━━\n`
        if (largeTransactions.largePayouts.length > 0) {
          largeTransactions.largePayouts.slice(0, 5).forEach((tx: any, i: number) => {
            const statusIcon = tx.status === 'success' ? '✅' : tx.status === 'failed' ? '❌' : '⏳'
            msg += `${i + 1}. ${statusIcon} ${formatINR(tx.amount)}\n`
            msg += `   ${(tx.merchants as any)?.merchant_name || 'N/A'}\n`
            msg += `   ${timeAgo(tx.created_at)}\n\n`
          })
        } else {
          msg += `No large pay-outs\n`
        }
        
        await editMessage(botToken, chatId, messageId, msg, {
          inline_keyboard: [[{ text: '« Back', callback_data: 'admin_alerts' }]],
        })
      }
      
      // ============ PENDING ALL CALLBACK ============
      else if (action === 'pending_all') {
        const { data: pendingTx } = await supabaseAdmin
          .from('transactions')
          .select('order_no, amount, transaction_type, created_at, merchants(merchant_name)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(10)
        
        let payinCount = 0, payoutCount = 0, payinAmount = 0, payoutAmount = 0
        pendingTx?.forEach((tx: any) => {
          if (tx.transaction_type === 'payin') {
            payinCount++; payinAmount += tx.amount
          } else {
            payoutCount++; payoutAmount += tx.amount
          }
        })
        
        let msg = `⏳ <b>Pending Transactions</b>\n\n`
        msg += `📥 Pay-In: ${payinCount} | ${formatINR(payinAmount)}\n`
        msg += `📤 Pay-Out: ${payoutCount} | ${formatINR(payoutAmount)}\n\n`
        msg += `━━━ RECENT ORDERS ━━━\n\n`
        
        pendingTx?.slice(0, 5).forEach((tx: any, i: number) => {
          const icon = tx.transaction_type === 'payin' ? '📥' : '📤'
          msg += `${i + 1}. ${icon} ${formatINR(tx.amount)}\n`
          msg += `   <code>${tx.order_no}</code>\n`
          msg += `   ${(tx.merchants as any)?.merchant_name || 'N/A'} | ${timeAgo(tx.created_at)}\n\n`
        })
        
        await editMessage(botToken, chatId, messageId, msg, {
          inline_keyboard: [[{ text: '« Back', callback_data: 'dashboard' }]],
        })
      }
      
      // ============ MY TODAY (MERCHANT) CALLBACK ============
      else if (action === 'my_today') {
        const merchantByChat = await findMerchantByChatId(supabaseAdmin, chatId)
        if (merchantByChat) {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const currency = merchantByChat.payment_gateways?.currency || 'INR'
          
          const { data: transactions } = await supabaseAdmin
            .from('transactions')
            .select('amount, status, transaction_type')
            .eq('merchant_id', merchantByChat.id)
            .gte('created_at', today.toISOString())
          
          let payinCount = 0, payinSuccess = 0, payinAmount = 0
          let payoutCount = 0, payoutSuccess = 0, payoutAmount = 0
          
          transactions?.forEach((tx: any) => {
            if (tx.transaction_type === 'payin') {
              payinCount++
              if (tx.status === 'success') { payinSuccess++; payinAmount += tx.amount }
            } else {
              payoutCount++
              if (tx.status === 'success') { payoutSuccess++; payoutAmount += tx.amount }
            }
          })
          
          const msg = `📊 <b>${merchantByChat.merchant_name} - Today</b>\n\n` +
            `━━━ 📥 PAY-IN ━━━\n` +
            `Orders: ${payinCount} | Success: ${payinSuccess}\n` +
            `Amount: ${formatAmount(payinAmount, currency)}\n\n` +
            `━━━ 📤 PAY-OUT ━━━\n` +
            `Orders: ${payoutCount} | Success: ${payoutSuccess}\n` +
            `Amount: ${formatAmount(payoutAmount, currency)}`
          
          await editMessage(botToken, chatId, messageId, msg, {
            inline_keyboard: [[{ text: '« Back', callback_data: 'my_dashboard' }]],
          })
        }
      }
      
      // ============ MY WITHDRAW CALLBACK ============
      else if (action === 'my_withdraw') {
        const merchantByChat = await findMerchantByChatId(supabaseAdmin, chatId)
        if (merchantByChat) {
          const currency = merchantByChat.payment_gateways?.currency || 'INR'
          
          await editMessage(botToken, chatId, messageId, 
            `💸 <b>Withdrawal</b>\n\n` +
            `Available: ${formatAmount(merchantByChat.balance || 0, currency)}\n\n` +
            `To request withdrawal:\n` +
            `1. Go to dashboard: ${gatewayDomain}/merchant\n` +
            `2. Navigate to Withdrawal page\n` +
            `3. Enter amount and withdrawal password\n\n` +
            `<i>⚠️ Minimum withdrawal: ${formatAmount(1000, currency)}</i>`, {
            inline_keyboard: [[{ text: '« Back', callback_data: 'my_dashboard' }]],
          })
        }
      }
      
      // ============ MY DASHBOARD CALLBACK ============
      else if (action === 'my_dashboard') {
        const merchantByChat = await findMerchantByChatId(supabaseAdmin, chatId)
        if (merchantByChat) {
          const currency = merchantByChat.payment_gateways?.currency || 'INR'
          const total = (merchantByChat.balance || 0) + (merchantByChat.frozen_balance || 0)
          
          await editMessage(botToken, chatId, messageId, 
            `💰 <b>${merchantByChat.merchant_name}</b>\n\n` +
            `💵 Available: ${formatAmount(merchantByChat.balance || 0, currency)}\n` +
            `🧊 Frozen: ${formatAmount(merchantByChat.frozen_balance || 0, currency)}\n` +
            `📊 Total: ${formatAmount(total, currency)}`, {
            inline_keyboard: [
              [
                { text: '📊 Today', callback_data: 'my_today' },
                { text: '💸 Withdraw', callback_data: 'my_withdraw' },
              ],
              [
                { text: '📈 Weekly', callback_data: 'my_weekly' },
                { text: '💳 Fees', callback_data: 'my_fees' },
              ],
            ],
          })
        }
      }
      
      // ============ MY WEEKLY CALLBACK ============
      else if (action === 'my_weekly') {
        const merchantByChat = await findMerchantByChatId(supabaseAdmin, chatId)
        if (merchantByChat) {
          const stats = await getWeeklyStats(supabaseAdmin, merchantByChat.id)
          const currency = merchantByChat.payment_gateways?.currency || 'INR'
          
          const payinRate = stats.totalPayin ? Math.round(stats.successPayin / stats.totalPayin * 100) : 0
          const payoutRate = stats.totalPayout ? Math.round(stats.successPayout / stats.totalPayout * 100) : 0
          
          let msg = `📈 <b>${merchantByChat.merchant_name} - Weekly</b>\n\n`
          msg += `━━━ 📥 PAY-IN ━━━\n`
          msg += `Orders: ${stats.totalPayin} | ✅ ${stats.successPayin}\n`
          msg += `Amount: ${formatAmount(stats.payinAmount, currency)}\n`
          msg += `Rate: ${payinRate}%\n\n`
          msg += `━━━ 📤 PAY-OUT ━━━\n`
          msg += `Orders: ${stats.totalPayout} | ✅ ${stats.successPayout}\n`
          msg += `Amount: ${formatAmount(stats.payoutAmount, currency)}\n`
          msg += `Rate: ${payoutRate}%`
          
          await editMessage(botToken, chatId, messageId, msg, {
            inline_keyboard: [[{ text: '« Back', callback_data: 'my_dashboard' }]],
          })
        }
      }
      
      // ============ MY FEES CALLBACK ============
      else if (action === 'my_fees') {
        const merchantByChat = await findMerchantByChatId(supabaseAdmin, chatId)
        if (merchantByChat) {
          const currency = merchantByChat.payment_gateways?.currency || 'INR'
          
          const msg = `💳 <b>${merchantByChat.merchant_name} - Fees</b>\n\n` +
            `📥 Payin Fee: <b>${merchantByChat.payin_fee}%</b>\n` +
            `📤 Payout Fee: <b>${merchantByChat.payout_fee}%</b>\n\n` +
            `━━━ EXAMPLE ━━━\n` +
            `For ${formatAmount(10000, currency)} payin:\n` +
            `• Fee: ${formatAmount(10000 * merchantByChat.payin_fee / 100, currency)}\n` +
            `• You receive: ${formatAmount(10000 - (10000 * merchantByChat.payin_fee / 100), currency)}`
          
          await editMessage(botToken, chatId, messageId, msg, {
            inline_keyboard: [[{ text: '« Back', callback_data: 'my_dashboard' }]],
          })
        }
      }
      
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Handle message
    const message = body.message
    if (!message?.text) {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const chatId = message.chat.id.toString()
    const text = message.text.trim()
    const chatType = message.chat.type
    const isAdmin = adminChatId && chatId === adminChatId
    const userMessageId = message.message_id

    // Parse command and arguments
    const parts = text.split(/\s+/)
    const command = parts[0].toLowerCase().split('@')[0]
    const args = parts.slice(1)
    
    // Check if this command should skip auto-delete
    const skipAutoDelete = shouldSkipAutoDelete(command)

    // Delete user's command message to keep chat clean (only for bot commands in groups, skip certain commands)
    if (text.startsWith('/') && chatType !== 'private' && !skipAutoDelete) {
      try {
        await deleteMessage(botToken, chatId, userMessageId)
      } catch (e) {
        // Ignore - bot may not have delete permission
      }
    }

    // ============ /tg_id - Get Chat ID (Works anywhere) ============
    if (command === '/tg_id' || command === '/id' || command === '/chatid') {
      const chatInfo = chatType === 'private' ? `👤 <b>Your Chat ID</b>` : `👥 <b>Group Chat ID</b>`
      
      await sendMessage(botToken, chatId, 
        `${chatInfo}\n\n` +
        `🆔 Chat ID: <code>${chatId}</code>\n` +
        `📝 Type: ${chatType}\n\n` +
        `<i>Copy this ID to use for notifications</i>`,
        'HTML', undefined, !skipAutoDelete
      )
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ /setmenu - Setup bot commands menu (ENHANCED) ============
    if (command === '/setmenu' && isAdmin) {
      const merchantCommands = [
        { command: 'me', description: '👤 My account info & balance' },
        { command: 'mybalance', description: '💰 Check my balance' },
        { command: 'today', description: '📊 Today\'s transaction summary' },
        { command: 'weekly', description: '📈 Weekly analytics report' },
        { command: 'history', description: '📋 Recent transactions' },
        { command: 'pending', description: '⏳ My pending transactions' },
        { command: 'status', description: '🔍 Check order status' },
        { command: 'withdraw', description: '💸 Request withdrawal' },
        { command: 'fees', description: '💳 View my fee rates' },
        { command: 'alerts', description: '⚠️ Check my account alerts' },
        { command: 'tg_id', description: '🆔 Get chat/group ID' },
        { command: 'help', description: '❓ Show help menu' },
      ]

      const adminCommands = [
        { command: 'dashboard', description: '📊 Quick dashboard view' },
        { command: 'analytics', description: '📈 Advanced analytics' },
        { command: 'weekly_report', description: '📊 Weekly stats report' },
        { command: 'monthly_report', description: '📅 Monthly stats report' },
        { command: 'peak_hours', description: '⏰ Peak transaction hours' },
        { command: 'alerts', description: '⚠️ System alerts & warnings' },
        { command: 'large_tx', description: '💎 Large transactions' },
        { command: 'create_merchant', description: '➕ Create new merchant' },
        { command: 'merchants', description: '📋 List all merchants' },
        { command: 'merchant', description: '👤 View merchant details' },
        { command: 'search', description: '🔍 Search merchant' },
        { command: 'balance', description: '💰 Check merchant balance' },
        { command: 'pending', description: '⏳ All pending transactions' },
        { command: 'today', description: '📊 Today\'s summary' },
        { command: 'history', description: '📋 Transaction history' },
        { command: 'status', description: '🔍 Order status' },
        { command: 'set_fee', description: '💳 Set merchant fees' },
        { command: 'set_gateway', description: '🌐 Assign gateway' },
        { command: 'set_telegram', description: '📱 Set Telegram group' },
        { command: 'toggle', description: '🔄 Enable/disable merchant' },
        { command: 'freeze', description: '🔒 Freeze merchant balance' },
        { command: 'add_balance', description: '➕ Add merchant balance' },
        { command: 'deduct_balance', description: '➖ Deduct merchant balance' },
        { command: 'reset_2fa', description: '🔐 Reset 2FA' },
        { command: 'reset_password', description: '🔑 Reset password' },
        { command: 'reset_withdrawal', description: '🔒 Reset withdrawal pass' },
        { command: 'stats', description: '📈 System statistics' },
        { command: 'gateways', description: '🌐 Gateway status' },
        { command: 'top', description: '🏆 Top merchants' },
        { command: 'broadcast', description: '📢 Broadcast message' },
        { command: 'tg_id', description: '🆔 Get chat ID' },
        { command: 'help', description: '❓ Show all commands' },
      ]

      await setMyCommands(botToken, merchantCommands, { type: 'all_group_chats' })
      if (adminChatId) {
        await setMyCommands(botToken, adminCommands, { type: 'chat', chat_id: parseInt(adminChatId) })
      }
      await setMyCommands(botToken, merchantCommands, { type: 'all_private_chats' })

      await sendMessage(botToken, chatId, 
        `✅ <b>Bot Menu Updated!</b>\n\n` +
        `• Merchant: ${merchantCommands.length} commands\n` +
        `• Admin: ${adminCommands.length} commands\n\n` +
        `<i>Type / to see command suggestions</i>`,
        'HTML', undefined, false // Don't auto-delete setmenu response
      )
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ Check if this is a merchant group ============
    const merchantByChat = await findMerchantByChatId(supabaseAdmin, chatId)
    const isMerchantGroup = !!merchantByChat

    // ============ MERCHANT COMMANDS ============
    if (isMerchantGroup && !isAdmin) {
      const m = merchantByChat
      const currency = m.payment_gateways?.currency || 'INR'
      
      // /me - My account info
      if (command === '/me' || command === '/myaccount') {
        const status = m.is_active ? '✅ Active' : '❌ Inactive'
        const twoFa = m.is_2fa_enabled ? '🔐 Enabled' : '🔓 Disabled'
        const total = (m.balance || 0) + (m.frozen_balance || 0)
        const gatewayType = m.payment_gateways?.gateway_code?.startsWith('hypersofts') ? 'ELOPAY' : 
                           m.payment_gateways?.gateway_code?.startsWith('hyperpay') ? 'ELOPAY GATEWAY' : 'Default'
        const gatewayDisplay = m.payment_gateways ? `${gatewayType} (${currency})` : 'Default'

        const msg = `👤 <b>My Account</b>\n\n` +
          `━━━ 📋 INFO ━━━\n` +
          `📛 Name: ${m.merchant_name}\n` +
          `🆔 ID: <code>${m.account_number}</code>\n` +
          `📊 Status: ${status}\n` +
          `🔐 2FA: ${twoFa}\n` +
          `🌐 Gateway: ${gatewayDisplay}\n\n` +
          `━━━ 💰 BALANCE (${currency}) ━━━\n` +
          `💵 Available: ${formatAmount(m.balance || 0, currency)}\n` +
          `🧊 Frozen: ${formatAmount(m.frozen_balance || 0, currency)}\n` +
          `📊 Total: ${formatAmount(total, currency)}\n\n` +
          `━━━ 💳 FEES ━━━\n` +
          `📥 Payin: ${m.payin_fee}%\n` +
          `📤 Payout: ${m.payout_fee}%\n\n` +
          `🌐 Dashboard: ${gatewayDomain}/merchant`

        await sendMessageWithButtons(botToken, chatId, msg, [
          [
            { text: '📊 Today', callback_data: 'my_today' },
            { text: '📈 Weekly', callback_data: 'my_weekly' },
          ],
          [
            { text: '💳 Fees', callback_data: 'my_fees' },
            { text: '💸 Withdraw', callback_data: 'my_withdraw' },
          ],
        ])
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // /mybalance - My balance
      if (command === '/mybalance' || command === '/bal') {
        const total = (m.balance || 0) + (m.frozen_balance || 0)
        
        await sendMessageWithButtons(botToken, chatId, 
          `💰 <b>${m.merchant_name}</b> (${currency})\n\n` +
          `💵 Available: ${formatAmount(m.balance || 0, currency)}\n` +
          `🧊 Frozen: ${formatAmount(m.frozen_balance || 0, currency)}\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `📊 Total: ${formatAmount(total, currency)}`,
          [
            [{ text: '📊 Today Stats', callback_data: 'my_today' }, { text: '💸 Withdraw', callback_data: 'my_withdraw' }],
            [{ text: '📈 Weekly', callback_data: 'my_weekly' }],
          ]
        )
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // /weekly - Merchant weekly stats
      if (command === '/weekly' || command === '/week') {
        const stats = await getWeeklyStats(supabaseAdmin, m.id)
        
        const payinRate = stats.totalPayin ? Math.round(stats.successPayin / stats.totalPayin * 100) : 0
        const payoutRate = stats.totalPayout ? Math.round(stats.successPayout / stats.totalPayout * 100) : 0
        
        let msg = `📈 <b>${m.merchant_name} - Weekly</b>\n\n`
        msg += `━━━ 📥 PAY-IN ━━━\n`
        msg += `Orders: ${stats.totalPayin} | ✅ ${stats.successPayin} | ❌ ${stats.failedPayin}\n`
        msg += `Amount: ${formatAmount(stats.payinAmount, currency)}\n`
        msg += `Rate: ${payinRate}%\n\n`
        msg += `━━━ 📤 PAY-OUT ━━━\n`
        msg += `Orders: ${stats.totalPayout} | ✅ ${stats.successPayout} | ❌ ${stats.failedPayout}\n`
        msg += `Amount: ${formatAmount(stats.payoutAmount, currency)}\n`
        msg += `Rate: ${payoutRate}%`
        
        await sendMessage(botToken, chatId, msg)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // /alerts - Merchant alerts
      if (command === '/alerts') {
        const alerts = await checkSuspiciousActivity(supabaseAdmin, m.id)
        
        let msg = `⚠️ <b>${m.merchant_name} - Alerts</b>\n\n`
        if (alerts.length > 0) {
          alerts.forEach(alert => { msg += `${alert}\n\n` })
        } else {
          msg += `✅ No alerts at this time\n\n`
          msg += `<i>We monitor:</i>\n`
          msg += `• Failure rates\n`
          msg += `• Unusual volume\n`
          msg += `• Rapid transactions`
        }
        
        await sendMessage(botToken, chatId, msg)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // /fees - View fee rates
      if (command === '/fees' || command === '/rate' || command === '/rates') {
        const msg = `💳 <b>${m.merchant_name} - Fees</b>\n\n` +
          `━━━ FEE STRUCTURE ━━━\n` +
          `📥 Payin Fee: <b>${m.payin_fee}%</b>\n` +
          `📤 Payout Fee: <b>${m.payout_fee}%</b>\n\n` +
          `━━━ EXAMPLE ━━━\n` +
          `For ${formatAmount(10000, currency)} payin:\n` +
          `• Fee: ${formatAmount(10000 * m.payin_fee / 100, currency)}\n` +
          `• You receive: ${formatAmount(10000 - (10000 * m.payin_fee / 100), currency)}`
        
        await sendMessage(botToken, chatId, msg)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // /today - Today's summary for merchant
      if (command === '/today' || command === '/summary') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        const { data: todayTx } = await supabaseAdmin
          .from('transactions')
          .select('amount, fee, status, transaction_type')
          .eq('merchant_id', m.id)
          .gte('created_at', today.toISOString())

        const { data: yesterdayTx } = await supabaseAdmin
          .from('transactions')
          .select('amount, fee, status, transaction_type')
          .eq('merchant_id', m.id)
          .gte('created_at', yesterday.toISOString())
          .lt('created_at', today.toISOString())

        let tPayinCount = 0, tPayinSuccess = 0, tPayinAmount = 0
        let tPayoutCount = 0, tPayoutSuccess = 0, tPayoutAmount = 0

        todayTx?.forEach((tx: any) => {
          if (tx.transaction_type === 'payin') {
            tPayinCount++
            if (tx.status === 'success') { tPayinSuccess++; tPayinAmount += tx.amount }
          } else {
            tPayoutCount++
            if (tx.status === 'success') { tPayoutSuccess++; tPayoutAmount += tx.amount }
          }
        })

        let yPayinAmount = 0, yPayoutAmount = 0
        yesterdayTx?.forEach((tx: any) => {
          if (tx.transaction_type === 'payin' && tx.status === 'success') yPayinAmount += tx.amount
          if (tx.transaction_type === 'payout' && tx.status === 'success') yPayoutAmount += tx.amount
        })

        const msg = `📊 <b>${m.merchant_name}</b>\n\n` +
          `━━━ 📅 TODAY ━━━\n` +
          `📥 Pay-In: ${tPayinCount} orders | ${tPayinSuccess} success\n` +
          `   Amount: ${formatAmount(tPayinAmount, currency)}\n` +
          `   Rate: ${tPayinCount ? Math.round(tPayinSuccess / tPayinCount * 100) : 0}%\n\n` +
          `📤 Pay-Out: ${tPayoutCount} orders | ${tPayoutSuccess} success\n` +
          `   Amount: ${formatAmount(tPayoutAmount, currency)}\n` +
          `   Rate: ${tPayoutCount ? Math.round(tPayoutSuccess / tPayoutCount * 100) : 0}%\n\n` +
          `━━━ 📅 YESTERDAY ━━━\n` +
          `📥 Pay-In: ${formatAmount(yPayinAmount, currency)}\n` +
          `📤 Pay-Out: ${formatAmount(yPayoutAmount, currency)}\n\n` +
          `━━━ 💰 BALANCE ━━━\n` +
          `Available: ${formatAmount(m.balance || 0, currency)}`

        await sendMessage(botToken, chatId, msg)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // /history - My transaction history
      if (command === '/history' || command === '/transactions' || command === '/tx') {
        const txType = args[0]?.toLowerCase()

        let query = supabaseAdmin
          .from('transactions')
          .select('order_no, amount, fee, status, transaction_type, created_at')
          .eq('merchant_id', m.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (txType === 'payin' || txType === 'in') {
          query = query.eq('transaction_type', 'payin')
        } else if (txType === 'payout' || txType === 'out') {
          query = query.eq('transaction_type', 'payout')
        }

        const { data: transactions } = await query

        if (!transactions?.length) {
          await sendMessage(botToken, chatId, '📋 No transactions found\n\n<i>Usage: /history [payin/payout]</i>')
          return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        let msg = `📊 <b>${m.merchant_name} - Recent</b>\n\n`
        transactions.forEach((tx: any, i: number) => {
          const icon = tx.transaction_type === 'payin' ? '📥' : '📤'
          const statusIcon = tx.status === 'success' ? '✅' : tx.status === 'failed' ? '❌' : '⏳'
          msg += `${i + 1}. ${icon} ${statusIcon} ${formatAmount(tx.amount, currency)}\n`
          msg += `   <code>${tx.order_no}</code>\n`
          msg += `   ${timeAgo(tx.created_at)}\n\n`
        })
        msg += `<i>Filter: /history payin or /history payout</i>`

        await sendMessage(botToken, chatId, msg)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // /status [order_no] - Check specific order
      if (command === '/status' || command === '/order') {
        if (!args[0]) {
          await sendMessage(botToken, chatId, '❌ Usage: <code>/status [order_no]</code>')
          return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const { data: tx } = await supabaseAdmin
          .from('transactions')
          .select('*')
          .eq('order_no', args[0])
          .eq('merchant_id', m.id)
          .maybeSingle()

        if (!tx) {
          await sendMessage(botToken, chatId, '❌ Order not found')
          return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const icon = tx.transaction_type === 'payin' ? '📥 Pay-In' : '📤 Pay-Out'
        const statusIcon = tx.status === 'success' ? '✅' : tx.status === 'failed' ? '❌' : '⏳'

        const msg = `🔍 <b>Order Status</b>\n\n` +
          `📋 Order: <code>${tx.order_no}</code>\n` +
          `🔖 Your Order: <code>${tx.merchant_order_no || 'N/A'}</code>\n` +
          `📊 Type: ${icon}\n` +
          `${statusIcon} Status: <b>${tx.status.toUpperCase()}</b>\n\n` +
          `💰 Amount: ${formatAmount(tx.amount, currency)}\n` +
          `💸 Fee: ${formatAmount(tx.fee || 0, currency)}\n` +
          `💵 Net: ${formatAmount(tx.net_amount || tx.amount, currency)}\n\n` +
          `⏰ Created: ${formatDate(tx.created_at)}`

        await sendMessage(botToken, chatId, msg)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // /pending - Merchant's pending transactions
      if (command === '/pending') {
        const { data: pendingTx } = await supabaseAdmin
          .from('transactions')
          .select('order_no, amount, transaction_type, created_at')
          .eq('merchant_id', m.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(15)

        if (!pendingTx?.length) {
          await sendMessage(botToken, chatId, `✅ <b>No Pending Transactions</b>\n\nAll your transactions are processed!`)
          return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        let payinPending = 0, payoutPending = 0, payinAmount = 0, payoutAmount = 0
        pendingTx.forEach((tx: any) => {
          if (tx.transaction_type === 'payin') { payinPending++; payinAmount += tx.amount }
          else { payoutPending++; payoutAmount += tx.amount }
        })

        let msg = `⏳ <b>${m.merchant_name} - Pending</b>\n\n`
        msg += `━━━ 📊 SUMMARY ━━━\n`
        msg += `📥 Pay-In: ${payinPending} | ${formatAmount(payinAmount, currency)}\n`
        msg += `📤 Pay-Out: ${payoutPending} | ${formatAmount(payoutAmount, currency)}\n\n`
        msg += `━━━ 📋 ORDERS ━━━\n`
        
        pendingTx.forEach((tx: any, i: number) => {
          const icon = tx.transaction_type === 'payin' ? '📥' : '📤'
          msg += `${i + 1}. ${icon} ⏳ ${formatAmount(tx.amount, currency)}\n`
          msg += `   <code>${tx.order_no}</code>\n`
          msg += `   ${timeAgo(tx.created_at)}\n\n`
        })

        await sendMessage(botToken, chatId, msg)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // /withdraw - Show withdrawal info
      if (command === '/withdraw') {
        await sendMessage(botToken, chatId, 
          `💸 <b>Withdrawal</b>\n\n` +
          `Available: ${formatAmount(m.balance || 0, currency)}\n\n` +
          `To request withdrawal:\n` +
          `1. Go to dashboard: ${gatewayDomain}/merchant\n` +
          `2. Navigate to Withdrawal page\n` +
          `3. Enter amount and withdrawal password\n\n` +
          `<i>⚠️ Minimum withdrawal: ${formatAmount(1000, currency)}</i>`
        )
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // /help - Merchant help
      if (command === '/help' || command === '/start') {
        const msg = `🤖 <b>${gatewayName} Bot</b>\n\n` +
          `━━━ 💰 BALANCE ━━━\n` +
          `/me - Full account info\n` +
          `/mybalance - Quick balance check\n` +
          `/fees - View fee structure\n\n` +
          `━━━ 📊 ANALYTICS ━━━\n` +
          `/today - Today's summary\n` +
          `/weekly - Weekly report\n` +
          `/history - Recent transactions\n` +
          `/alerts - Account alerts\n\n` +
          `━━━ 🔍 ORDERS ━━━\n` +
          `/pending - Pending orders\n` +
          `/status [order] - Check status\n\n` +
          `━━━ 💸 WITHDRAWAL ━━━\n` +
          `/withdraw - Withdrawal info\n\n` +
          `━━━ 🔧 UTILITY ━━━\n` +
          `/tg_id - Get chat ID\n\n` +
          `🌐 Dashboard: ${gatewayDomain}/merchant`

        await sendMessage(botToken, chatId, msg, 'HTML', undefined, false) // Don't auto-delete help
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // ============ ADMIN COMMANDS ============
    if (!isAdmin && !isMerchantGroup) {
      await sendMessage(botToken, chatId, 
        `❓ <b>Unknown Command</b>\n\n` +
        `This group is not registered.\n\n` +
        `Contact admin to link your merchant account.\n\n` +
        `/tg_id - Get this chat ID`
      )
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ /help - Admin help (ENHANCED) ============
    if (command === '/help' || command === '/start') {
      const msg = `🤖 <b>${gatewayName} Admin Bot</b>\n\n` +
        `━━━ 📊 DASHBOARD ━━━\n` +
        `/dashboard - Quick overview\n` +
        `/analytics - Advanced analytics\n` +
        `/weekly_report - Weekly stats\n` +
        `/monthly_report - Monthly stats\n` +
        `/peak_hours - Peak transaction hours\n` +
        `/stats - System statistics\n\n` +
        `━━━ ⚠️ MONITORING ━━━\n` +
        `/alerts - System alerts\n` +
        `/large_tx - Large transactions\n` +
        `/pending - Pending transactions\n\n` +
        `━━━ 👥 MERCHANTS ━━━\n` +
        `/create_merchant - Create new\n` +
        `/merchants - List all\n` +
        `/merchant [id] - View details\n` +
        `/search [name] - Search\n` +
        `/toggle [id] - Enable/disable\n` +
        `/freeze [id] - Freeze balance\n\n` +
        `━━━ 💰 BALANCE ━━━\n` +
        `/balance [id] - Check balance\n` +
        `/add_balance [id] [amt] - Add\n` +
        `/deduct_balance [id] [amt] - Deduct\n\n` +
        `━━━ ⚙️ SETTINGS ━━━\n` +
        `/set_fee [id] [in%] [out%] - Set fees\n` +
        `/set_gateway [id] [code] - Assign gateway\n` +
        `/set_telegram [id] [group] - Set TG group\n\n` +
        `━━━ 🔐 SECURITY ━━━\n` +
        `/reset_2fa [id] - Reset 2FA\n` +
        `/reset_password [id] - Reset password\n` +
        `/reset_withdrawal [id] - Reset withdrawal\n\n` +
        `━━━ 📢 COMMUNICATION ━━━\n` +
        `/broadcast [msg] - Send to all\n` +
        `/gateways - Gateway status\n` +
        `/top - Top merchants\n\n` +
        `━━━ 🔧 UTILITY ━━━\n` +
        `/setmenu - Update bot menu\n` +
        `/tg_id - Get chat ID`

      await sendMessage(botToken, chatId, msg, 'HTML', undefined, false) // Don't auto-delete help
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ /dashboard - Admin dashboard ============
    if (command === '/dashboard') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const { data: todayTx } = await supabaseAdmin
        .from('transactions')
        .select('amount, status, transaction_type')
        .gte('created_at', today.toISOString())
      
      const { data: merchants } = await supabaseAdmin
        .from('merchants')
        .select('balance, is_active')
      
      let payinTotal = 0, payinSuccess = 0, payoutTotal = 0, payoutSuccess = 0
      todayTx?.forEach((tx: any) => {
        if (tx.transaction_type === 'payin') {
          payinTotal++
          if (tx.status === 'success') payinSuccess += tx.amount
        } else {
          payoutTotal++
          if (tx.status === 'success') payoutSuccess += tx.amount
        }
      })
      
      const totalBalance = merchants?.reduce((sum: number, m: any) => sum + (m.balance || 0), 0) || 0
      const activeCount = merchants?.filter((m: any) => m.is_active)?.length || 0
      
      await sendMessageWithButtons(botToken, chatId,
        `📊 <b>Dashboard</b>\n\n` +
        `━━━ 📅 TODAY ━━━\n` +
        `📥 Pay-In: ${formatINR(payinSuccess)} (${payinTotal} orders)\n` +
        `📤 Pay-Out: ${formatINR(payoutSuccess)} (${payoutTotal} orders)\n\n` +
        `━━━ 💰 BALANCE ━━━\n` +
        `Total: ${formatINR(totalBalance)}\n\n` +
        `━━━ 👥 MERCHANTS ━━━\n` +
        `Active: ${activeCount}/${merchants?.length || 0}`,
        [
          [
            { text: '📋 Merchants', callback_data: 'merchants_list:0' },
            { text: '⏳ Pending', callback_data: 'pending_all' },
          ],
          [
            { text: '📈 Analytics', callback_data: 'admin_analytics' },
            { text: '⚠️ Alerts', callback_data: 'admin_alerts' },
          ],
          [{ text: '🔄 Refresh', callback_data: 'dashboard' }],
        ]
      )
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ /analytics - Advanced analytics ============
    if (command === '/analytics') {
      const comparison = await getComparisonStats(supabaseAdmin)
      const todayChange = comparison.yesterday.payin ? Math.round((comparison.today.payin - comparison.yesterday.payin) / comparison.yesterday.payin * 100) : 0
      const weekChange = comparison.lastWeek.payin ? Math.round((comparison.thisWeek.payin - comparison.lastWeek.payin) / comparison.lastWeek.payin * 100) : 0
      
      const todayIcon = todayChange >= 0 ? '📈' : '📉'
      const weekIcon = weekChange >= 0 ? '📈' : '📉'
      
      await sendMessageWithButtons(botToken, chatId,
        `📈 <b>Analytics Dashboard</b>\n\n` +
        `━━━ 📅 TODAY vs YESTERDAY ━━━\n` +
        `Pay-In: ${formatINR(comparison.today.payin)} ${todayIcon} ${todayChange >= 0 ? '+' : ''}${todayChange}%\n` +
        `Pay-Out: ${formatINR(comparison.today.payout)}\n` +
        `Orders: ${comparison.today.orders}\n\n` +
        `━━━ 📆 THIS WEEK vs LAST ━━━\n` +
        `Pay-In: ${formatINR(comparison.thisWeek.payin)} ${weekIcon} ${weekChange >= 0 ? '+' : ''}${weekChange}%\n` +
        `Pay-Out: ${formatINR(comparison.thisWeek.payout)}\n` +
        `Orders: ${comparison.thisWeek.orders}`,
        [
          [
            { text: '📊 Weekly Report', callback_data: 'weekly_report' },
            { text: '📅 Monthly', callback_data: 'monthly_report' },
          ],
          [
            { text: '⏰ Peak Hours', callback_data: 'peak_hours' },
            { text: '🏆 Top Merchants', callback_data: 'top_merchants' },
          ],
        ]
      )
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ /weekly_report - Weekly stats ============
    if (command === '/weekly_report' || command === '/weekly') {
      const stats = await getWeeklyStats(supabaseAdmin)
      const payinRate = stats.totalPayin ? Math.round(stats.successPayin / stats.totalPayin * 100) : 0
      const payoutRate = stats.totalPayout ? Math.round(stats.successPayout / stats.totalPayout * 100) : 0
      
      let msg = `📊 <b>Weekly Report</b>\n\n`
      msg += `━━━ 📥 PAY-IN (7 days) ━━━\n`
      msg += `Total: ${stats.totalPayin} | ✅ ${stats.successPayin} | ❌ ${stats.failedPayin} | ⏳ ${stats.pendingPayin}\n`
      msg += `Amount: ${formatINR(stats.payinAmount)}\n`
      msg += `Success Rate: ${payinRate}%\n\n`
      msg += `━━━ 📤 PAY-OUT (7 days) ━━━\n`
      msg += `Total: ${stats.totalPayout} | ✅ ${stats.successPayout} | ❌ ${stats.failedPayout} | ⏳ ${stats.pendingPayout}\n`
      msg += `Amount: ${formatINR(stats.payoutAmount)}\n`
      msg += `Success Rate: ${payoutRate}%\n\n`
      msg += `━━━ 💰 REVENUE ━━━\n`
      msg += `Fees Collected: ${formatINR(stats.feeCollected)}`
      
      await sendMessage(botToken, chatId, msg)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ /monthly_report - Monthly stats ============
    if (command === '/monthly_report' || command === '/monthly') {
      const stats = await getMonthlyStats(supabaseAdmin)
      const payinRate = stats.payinTotal ? Math.round(stats.payinSuccess / stats.payinTotal * 100) : 0
      const payoutRate = stats.payoutTotal ? Math.round(stats.payoutSuccess / stats.payoutTotal * 100) : 0
      
      let msg = `📅 <b>Monthly Report (30 days)</b>\n\n`
      msg += `━━━ 📥 PAY-IN ━━━\n`
      msg += `Success: ${stats.payinSuccess}/${stats.payinTotal} (${payinRate}%)\n`
      msg += `Amount: ${formatINR(stats.payinAmount)}\n\n`
      msg += `━━━ 📤 PAY-OUT ━━━\n`
      msg += `Success: ${stats.payoutSuccess}/${stats.payoutTotal} (${payoutRate}%)\n`
      msg += `Amount: ${formatINR(stats.payoutAmount)}\n\n`
      msg += `━━━ 💰 REVENUE ━━━\n`
      msg += `Fees Collected: ${formatINR(stats.feeCollected)}`
      
      await sendMessage(botToken, chatId, msg)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ /peak_hours - Peak hours analysis ============
    if (command === '/peak_hours' || command === '/peak') {
      const analysis = await getPeakHoursAnalysis(supabaseAdmin)
      
      let msg = `⏰ <b>Peak Hours (Last 7 Days)</b>\n\n`
      msg += `━━━ 🏆 TOP 5 HOURS ━━━\n`
      analysis.peakHours.forEach(([hour, data], i) => {
        msg += `${i + 1}. ${hour}:00 - ${parseInt(hour) + 1}:00\n`
        msg += `   ${(data as any).count} orders | ${formatINR((data as any).amount)}\n`
      })
      msg += `\n<i>💡 Schedule payouts during off-peak hours for better success rates</i>`
      
      await sendMessage(botToken, chatId, msg)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ /alerts - System alerts ============
    if (command === '/alerts') {
      const lowBalanceAlerts = await checkLowBalanceAlerts(supabaseAdmin, adminSettings)
      const largeTransactions = await getLargeTransactions(supabaseAdmin, adminSettings)
      
      let msg = `⚠️ <b>System Alerts</b>\n\n`
      
      msg += `━━━ 💰 LOW BALANCE ━━━\n`
      if (lowBalanceAlerts.length > 0) {
        lowBalanceAlerts.slice(0, 5).forEach(alert => {
          msg += `⚠️ ${alert.merchant}: ${formatAmount(alert.balance, alert.currency)}\n`
        })
        if (lowBalanceAlerts.length > 5) msg += `...and ${lowBalanceAlerts.length - 5} more\n`
      } else {
        msg += `✅ All merchants have sufficient balance\n`
      }
      
      msg += `\n━━━ 💎 LARGE TRANSACTIONS (24h) ━━━\n`
      if (largeTransactions.largePayins.length > 0 || largeTransactions.largePayouts.length > 0) {
        msg += `📥 Large Pay-Ins: ${largeTransactions.largePayins.length}\n`
        msg += `📤 Large Pay-Outs: ${largeTransactions.largePayouts.length}\n`
      } else {
        msg += `No large transactions in last 24 hours\n`
      }
      
      await sendMessageWithButtons(botToken, chatId, msg, [
        [{ text: '💎 View Large Tx', callback_data: 'large_tx_details' }],
      ])
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ /large_tx - Large transactions ============
    if (command === '/large_tx' || command === '/largetx') {
      const largeTransactions = await getLargeTransactions(supabaseAdmin, adminSettings)
      
      let msg = `💎 <b>Large Transactions (24h)</b>\n\n`
      
      msg += `━━━ 📥 LARGE PAY-INS ━━━\n`
      if (largeTransactions.largePayins.length > 0) {
        largeTransactions.largePayins.slice(0, 5).forEach((tx: any, i: number) => {
          const statusIcon = tx.status === 'success' ? '✅' : tx.status === 'failed' ? '❌' : '⏳'
          msg += `${i + 1}. ${statusIcon} ${formatINR(tx.amount)}\n`
          msg += `   ${(tx.merchants as any)?.merchant_name || 'N/A'}\n`
          msg += `   ${timeAgo(tx.created_at)}\n\n`
        })
      } else {
        msg += `No large pay-ins\n\n`
      }
      
      msg += `━━━ 📤 LARGE PAY-OUTS ━━━\n`
      if (largeTransactions.largePayouts.length > 0) {
        largeTransactions.largePayouts.slice(0, 5).forEach((tx: any, i: number) => {
          const statusIcon = tx.status === 'success' ? '✅' : tx.status === 'failed' ? '❌' : '⏳'
          msg += `${i + 1}. ${statusIcon} ${formatINR(tx.amount)}\n`
          msg += `   ${(tx.merchants as any)?.merchant_name || 'N/A'}\n`
          msg += `   ${timeAgo(tx.created_at)}\n\n`
        })
      } else {
        msg += `No large pay-outs\n`
      }
      
      await sendMessage(botToken, chatId, msg)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ /freeze [account_no] - Freeze merchant balance ============
    if (command === '/freeze') {
      if (!args[0]) {
        await sendMessage(botToken, chatId, '❌ Usage: <code>/freeze [account_no]</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: merchant } = await supabaseAdmin
        .from('merchants')
        .select('balance, frozen_balance, merchant_name, telegram_chat_id')
        .eq('account_number', args[0])
        .maybeSingle()
      
      if (!merchant) {
        await sendMessage(botToken, chatId, '❌ Merchant not found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const totalBalance = (merchant.balance || 0) + (merchant.frozen_balance || 0)
      await supabaseAdmin.from('merchants')
        .update({ balance: 0, frozen_balance: totalBalance })
        .eq('account_number', args[0])
      
      await sendMessage(botToken, chatId, 
        `🔒 <b>Balance Frozen</b>\n\n` +
        `Merchant: ${merchant.merchant_name}\n` +
        `Frozen: ${formatINR(totalBalance)}`
      )
      
      if (merchant.telegram_chat_id) {
        await sendMessage(botToken, merchant.telegram_chat_id, 
          `🔒 <b>Balance Frozen</b>\n\nYour balance has been frozen by admin. Contact support for assistance.`)
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ /unfreeze [account_no] - Unfreeze merchant balance ============
    if (command === '/unfreeze') {
      if (!args[0]) {
        await sendMessage(botToken, chatId, '❌ Usage: <code>/unfreeze [account_no]</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: merchant } = await supabaseAdmin
        .from('merchants')
        .select('balance, frozen_balance, merchant_name, telegram_chat_id')
        .eq('account_number', args[0])
        .maybeSingle()
      
      if (!merchant) {
        await sendMessage(botToken, chatId, '❌ Merchant not found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const totalBalance = (merchant.balance || 0) + (merchant.frozen_balance || 0)
      await supabaseAdmin.from('merchants')
        .update({ balance: totalBalance, frozen_balance: 0 })
        .eq('account_number', args[0])
      
      await sendMessage(botToken, chatId, 
        `🔓 <b>Balance Unfrozen</b>\n\n` +
        `Merchant: ${merchant.merchant_name}\n` +
        `Available: ${formatINR(totalBalance)}`
      )
      
      if (merchant.telegram_chat_id) {
        await sendMessage(botToken, merchant.telegram_chat_id, 
          `🔓 <b>Balance Unfrozen</b>\n\nYour balance is now available for withdrawals.`)
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ /toggle [account_no] ============
    if (command === '/toggle') {
      if (!args[0]) {
        await sendMessage(botToken, chatId, '❌ Usage: <code>/toggle [account_no]</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: merchant } = await supabaseAdmin
        .from('merchants')
        .select('is_active, merchant_name, telegram_chat_id')
        .eq('account_number', args[0])
        .maybeSingle()
      
      if (!merchant) {
        await sendMessage(botToken, chatId, '❌ Merchant not found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const newStatus = !merchant.is_active
      await supabaseAdmin
        .from('merchants')
        .update({ is_active: newStatus })
        .eq('account_number', args[0])
      
      const statusText = newStatus ? '✅ Enabled' : '❌ Disabled'
      await sendMessage(botToken, chatId, `${statusText} merchant <b>${merchant.merchant_name}</b>`)
      
      if (merchant.telegram_chat_id) {
        await sendMessage(botToken, merchant.telegram_chat_id, 
          `${statusText} by admin\n\n${newStatus ? 'You can now process transactions.' : 'Your account has been suspended.'}`)
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ /add_balance [account_no] [amount] ============
    if (command === '/add_balance' || command === '/addbal') {
      if (args.length < 2) {
        await sendMessage(botToken, chatId, '❌ Usage: <code>/add_balance [account_no] [amount]</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const amount = parseFloat(args[1])
      if (isNaN(amount) || amount <= 0) {
        await sendMessage(botToken, chatId, '❌ Invalid amount')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: merchant } = await supabaseAdmin
        .from('merchants')
        .select('balance, merchant_name, telegram_chat_id')
        .eq('account_number', args[0])
        .maybeSingle()
      
      if (!merchant) {
        await sendMessage(botToken, chatId, '❌ Merchant not found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const newBalance = (merchant.balance || 0) + amount
      await supabaseAdmin
        .from('merchants')
        .update({ balance: newBalance })
        .eq('account_number', args[0])
      
      await sendMessage(botToken, chatId, 
        `✅ Added ${formatINR(amount)} to <b>${merchant.merchant_name}</b>\n\n` +
        `Previous: ${formatINR(merchant.balance || 0)}\n` +
        `New: ${formatINR(newBalance)}`
      )
      
      if (merchant.telegram_chat_id) {
        await sendMessage(botToken, merchant.telegram_chat_id,
          `💰 <b>Balance Added</b>\n\n` +
          `Amount: +${formatINR(amount)}\n` +
          `New Balance: ${formatINR(newBalance)}`
        )
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ /deduct_balance [account_no] [amount] ============
    if (command === '/deduct_balance' || command === '/deductbal') {
      if (args.length < 2) {
        await sendMessage(botToken, chatId, '❌ Usage: <code>/deduct_balance [account_no] [amount]</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const amount = parseFloat(args[1])
      if (isNaN(amount) || amount <= 0) {
        await sendMessage(botToken, chatId, '❌ Invalid amount')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: merchant } = await supabaseAdmin
        .from('merchants')
        .select('balance, merchant_name, telegram_chat_id')
        .eq('account_number', args[0])
        .maybeSingle()
      
      if (!merchant) {
        await sendMessage(botToken, chatId, '❌ Merchant not found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      if ((merchant.balance || 0) < amount) {
        await sendMessage(botToken, chatId, `❌ Insufficient balance. Current: ${formatINR(merchant.balance || 0)}`)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const newBalance = (merchant.balance || 0) - amount
      await supabaseAdmin
        .from('merchants')
        .update({ balance: newBalance })
        .eq('account_number', args[0])
      
      await sendMessage(botToken, chatId, 
        `✅ Deducted ${formatINR(amount)} from <b>${merchant.merchant_name}</b>\n\n` +
        `Previous: ${formatINR(merchant.balance || 0)}\n` +
        `New: ${formatINR(newBalance)}`
      )
      
      if (merchant.telegram_chat_id) {
        await sendMessage(botToken, merchant.telegram_chat_id,
          `💰 <b>Balance Deducted</b>\n\n` +
          `Amount: -${formatINR(amount)}\n` +
          `New Balance: ${formatINR(newBalance)}`
        )
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ /set_fee [account_no] [payin%] [payout%] ============
    if (command === '/set_fee' || command === '/setfee') {
      if (args.length < 3) {
        await sendMessage(botToken, chatId, '❌ Usage: <code>/set_fee [account_no] [payin%] [payout%]</code>\n\nExample: /set_fee 100000001 8.5 3.5')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const payinFee = parseFloat(args[1])
      const payoutFee = parseFloat(args[2])
      
      if (isNaN(payinFee) || isNaN(payoutFee) || payinFee < 0 || payoutFee < 0) {
        await sendMessage(botToken, chatId, '❌ Invalid fee values')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: merchant, error } = await supabaseAdmin
        .from('merchants')
        .update({ payin_fee: payinFee, payout_fee: payoutFee })
        .eq('account_number', args[0])
        .select('merchant_name, telegram_chat_id')
        .maybeSingle()
      
      if (error || !merchant) {
        await sendMessage(botToken, chatId, '❌ Merchant not found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      await sendMessage(botToken, chatId, 
        `✅ Fees updated for <b>${merchant.merchant_name}</b>\n\n` +
        `📥 Payin: ${payinFee}%\n` +
        `📤 Payout: ${payoutFee}%`
      )
      
      if (merchant.telegram_chat_id) {
        await sendMessage(botToken, merchant.telegram_chat_id,
          `💳 <b>Fee Structure Updated</b>\n\n` +
          `📥 Payin Fee: ${payinFee}%\n` +
          `📤 Payout Fee: ${payoutFee}%`
        )
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ /set_gateway [account_no] [gateway_code] ============
    if (command === '/set_gateway' || command === '/setgateway') {
      if (args.length < 2) {
        const { data: gateways } = await supabaseAdmin
          .from('payment_gateways')
          .select('gateway_code, gateway_name, currency')
          .eq('is_active', true)
        
        let msg = '❌ Usage: <code>/set_gateway [account_no] [gateway_code]</code>\n\n<b>Available gateways:</b>\n'
        gateways?.forEach((g: any) => {
          msg += `• <code>${g.gateway_code}</code> - ${g.gateway_name} (${g.currency})\n`
        })
        
        await sendMessage(botToken, chatId, msg)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: gateway } = await supabaseAdmin
        .from('payment_gateways')
        .select('id, gateway_name, currency')
        .eq('gateway_code', args[1])
        .eq('is_active', true)
        .maybeSingle()
      
      if (!gateway) {
        await sendMessage(botToken, chatId, `❌ Gateway <code>${args[1]}</code> not found or inactive`)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: merchant, error } = await supabaseAdmin
        .from('merchants')
        .update({ gateway_id: gateway.id })
        .eq('account_number', args[0])
        .select('merchant_name')
        .maybeSingle()
      
      if (error || !merchant) {
        await sendMessage(botToken, chatId, '❌ Merchant not found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      await sendMessage(botToken, chatId, 
        `✅ Gateway updated for <b>${merchant.merchant_name}</b>\n\n` +
        `🌐 Gateway: ${gateway.gateway_name} (${gateway.currency})`
      )
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ /broadcast [message] ============
    if (command === '/broadcast' || command === '/msg') {
      const message = args.join(' ')
      if (!message) {
        await sendMessage(botToken, chatId, '❌ Usage: <code>/broadcast [message]</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: merchants } = await supabaseAdmin
        .from('merchants')
        .select('telegram_chat_id, merchant_name')
        .not('telegram_chat_id', 'is', null)
      
      let sent = 0
      for (const m of merchants || []) {
        try {
          await sendMessage(botToken, m.telegram_chat_id, 
            `📢 <b>Announcement from ${gatewayName}</b>\n\n${message}`
          )
          sent++
        } catch (e) {
          console.error('Failed to send to', m.merchant_name, e)
        }
      }
      
      await sendMessage(botToken, chatId, `✅ Broadcast sent to ${sent}/${merchants?.length || 0} merchants`)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ CREATE MERCHANT ============
    if (command === '/create_merchant') {
      const match = text.match(/\/create_merchant\s+"([^"]+)"\s+(\S+)\s+(-?\d+)(?:\s+(\S+))?(?:\s+([\d.]+))?(?:\s+([\d.]+))?(?:\s+(\S+))?/i)
      
      if (!match) {
        const { data: availableGateways } = await supabaseAdmin
          .from('payment_gateways')
          .select('gateway_code, currency')
          .eq('is_active', true)
        
        let gatewayList = ''
        availableGateways?.forEach((g: any) => {
          gatewayList += `• <code>${g.gateway_code}</code> (${g.currency})\n`
        })
        
        await sendMessage(botToken, chatId, 
          `❌ <b>Invalid Format</b>\n\n` +
          `<b>Usage:</b>\n` +
          `<code>/create_merchant "Name" email group_id gateway payin% payout%</code>\n\n` +
          `<b>Example:</b>\n` +
          `<code>/create_merchant "Test Shop" test@email.com -1001234 hypersofts_bdt 8.5 3.5</code>\n\n` +
          `<b>Gateways:</b>\n${gatewayList}`
        )
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const merchantName = match[1]
      const email = match[2]
      const groupId = match[3]
      const gatewayCode = match[4] || null
      const customPayinFee = match[5] ? parseFloat(match[5]) : null
      const customPayoutFee = match[6] ? parseFloat(match[6]) : null
      const callbackUrl = match[7] || null

      if (!email.includes('@') || !email.includes('.')) {
        await sendMessage(botToken, chatId, '❌ Invalid email format')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
      const emailExists = existingUser?.users?.some((u: any) => u.email?.toLowerCase() === email.toLowerCase())
      if (emailExists) {
        await sendMessage(botToken, chatId, '❌ Email already registered')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      await sendMessage(botToken, chatId, `⏳ Creating <b>${merchantName}</b>...`)

      let gatewayId = null, gatewayInfo = null
      if (gatewayCode) {
        const { data: gateway } = await supabaseAdmin
          .from('payment_gateways')
          .select('id, gateway_name, currency')
          .eq('gateway_code', gatewayCode)
          .eq('is_active', true)
          .maybeSingle()
        
        if (!gateway) {
          await sendMessage(botToken, chatId, `❌ Gateway <code>${gatewayCode}</code> not found`)
          return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        gatewayId = gateway.id
        gatewayInfo = gateway
      }

      const password = generatePassword()
      const withdrawalPassword = generateWithdrawalPassword()
      const { data: accountNum } = await supabaseAdmin.rpc('generate_account_number')
      
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (authError || !authData.user) {
        await sendMessage(botToken, chatId, '❌ Failed: ' + (authError?.message || 'Unknown error'))
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const finalPayinFee = customPayinFee ?? (adminSettings?.default_payin_fee || 9)
      const finalPayoutFee = customPayoutFee ?? (adminSettings?.default_payout_fee || 4)

      const withdrawalPasswordHash = await createPasswordHash(withdrawalPassword)

      const { data: merchant, error: merchantError } = await supabaseAdmin
        .from('merchants')
        .insert({
          user_id: authData.user.id,
          account_number: accountNum,
          merchant_name: merchantName,
          payin_fee: finalPayinFee,
          payout_fee: finalPayoutFee,
          telegram_chat_id: groupId,
          callback_url: callbackUrl,
          withdrawal_password_hash: withdrawalPasswordHash,
          gateway_id: gatewayId,
          is_active: true,
        })
        .select('*')
        .single()

      if (merchantError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        await sendMessage(botToken, chatId, '❌ Failed: ' + merchantError.message)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      await supabaseAdmin.from('user_roles').insert({ user_id: authData.user.id, role: 'merchant' })

      const gatewayLabel = gatewayInfo ? (gatewayCode?.startsWith('hypersofts') ? 'ELOPAY' : 'ELOPAY GATEWAY') : 'Default'
      
      await sendMessage(botToken, chatId,
        `✅ <b>Merchant Created!</b>\n\n` +
        `👤 ${merchantName}\n` +
        `📧 <code>${email}</code>\n` +
        `🆔 <code>${accountNum}</code>\n` +
        `🌐 ${gatewayLabel} (${gatewayInfo?.currency || 'INR'})\n` +
        `💳 ${merchant.payin_fee}% / ${merchant.payout_fee}%`
      )

      await sendMessage(botToken, groupId,
        `🎉 <b>Welcome to ${gatewayName}!</b>\n\n` +
        `━━━ 📋 ACCOUNT ━━━\n` +
        `👤 ${merchantName}\n` +
        `🆔 ID: <code>${accountNum}</code>\n` +
        `🌐 Gateway: ${gatewayLabel} (${gatewayInfo?.currency || 'INR'})\n\n` +
        `━━━ 🔐 LOGIN ━━━\n` +
        `📧 Email: <code>${email}</code>\n` +
        `🔑 Password: <code>${password}</code>\n\n` +
        `━━━ 🔒 WITHDRAWAL ━━━\n` +
        `🔐 Password: <code>${withdrawalPassword}</code>\n\n` +
        `━━━ 🔑 API ━━━\n` +
        `📥 API Key:\n<code>${merchant.api_key}</code>\n\n` +
        `📤 Payout Key:\n<code>${merchant.payout_key}</code>\n\n` +
        `━━━ 💳 FEES ━━━\n` +
        `📥 Payin: ${merchant.payin_fee}%\n` +
        `📤 Payout: ${merchant.payout_fee}%\n\n` +
        `━━━ 🌐 DASHBOARD ━━━\n` +
        `${gatewayDomain}/merchant\n\n` +
        `⚠️ Change password after first login!`
      )

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ REMAINING ADMIN COMMANDS ============
    
    // /search
    if (command === '/search') {
      if (!args[0]) {
        await sendMessage(botToken, chatId, '❌ Usage: <code>/search [name]</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const searchTerm = args.join(' ').toLowerCase()
      const { data: merchants } = await supabaseAdmin
        .from('merchants')
        .select('account_number, merchant_name, balance, is_active')
        .or(`merchant_name.ilike.%${searchTerm}%`)
        .limit(10)

      if (!merchants?.length) {
        await sendMessage(botToken, chatId, `🔍 No results for "<b>${searchTerm}</b>"`)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      let msg = `🔍 <b>Search Results</b>\n\n`
      const buttons: { text: string; callback_data: string }[][] = []
      
      merchants.forEach((m: any) => {
        const status = m.is_active ? '✅' : '❌'
        msg += `${status} <b>${m.merchant_name}</b>\n`
        msg += `   ID: <code>${m.account_number}</code> | ${formatINR(m.balance || 0)}\n\n`
        buttons.push([{ text: `👤 ${m.merchant_name}`, callback_data: `merchant_detail:${m.account_number}` }])
      })

      await sendMessageWithButtons(botToken, chatId, msg, buttons)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // /merchants
    if (command === '/merchants') {
      const { data: merchants } = await supabaseAdmin
        .from('merchants')
        .select('account_number, merchant_name, balance, is_active')
        .order('created_at', { ascending: false })
        .limit(10)

      if (!merchants?.length) {
        await sendMessage(botToken, chatId, '📋 No merchants found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      let msg = `📋 <b>Merchants</b>\n\n`
      const buttons: { text: string; callback_data: string }[][] = []
      
      merchants.forEach((m: any) => {
        const status = m.is_active ? '✅' : '❌'
        msg += `${status} <b>${m.merchant_name}</b>\n`
        msg += `   <code>${m.account_number}</code> | ${formatINR(m.balance || 0)}\n\n`
        buttons.push([{ text: `👤 ${m.merchant_name}`, callback_data: `merchant_detail:${m.account_number}` }])
      })
      
      buttons.push([{ text: 'View All »', callback_data: 'merchants_list:0' }])

      await sendMessageWithButtons(botToken, chatId, msg, buttons)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // /merchant [account_no]
    if (command === '/merchant') {
      if (!args[0]) {
        await sendMessage(botToken, chatId, '❌ Usage: <code>/merchant [account_no]</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: merchant } = await supabaseAdmin
        .from('merchants')
        .select('*, payment_gateways(gateway_code, gateway_name, currency)')
        .eq('account_number', args[0])
        .maybeSingle()

      if (!merchant) {
        await sendMessage(botToken, chatId, '❌ Merchant not found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const status = merchant.is_active ? '✅ Active' : '❌ Inactive'
      const twoFa = merchant.is_2fa_enabled ? '🔐' : '🔓'
      const currency = merchant.payment_gateways?.currency || 'INR'
      const gatewayType = merchant.payment_gateways?.gateway_code?.startsWith('hypersofts') ? 'ELOPAY' : 'ELOPAY GATEWAY'

      await sendMessageWithButtons(botToken, chatId,
        `👤 <b>${merchant.merchant_name}</b>\n\n` +
        `🆔 ID: <code>${merchant.account_number}</code>\n` +
        `📊 Status: ${status} | 2FA: ${twoFa}\n` +
        `🌐 Gateway: ${gatewayType} (${currency})\n\n` +
        `💰 Balance: ${formatAmount(merchant.balance || 0, currency)}\n` +
        `🧊 Frozen: ${formatAmount(merchant.frozen_balance || 0, currency)}\n\n` +
        `💳 Fees: ${merchant.payin_fee}% / ${merchant.payout_fee}%\n` +
        `📱 TG: <code>${merchant.telegram_chat_id || 'N/A'}</code>`,
        [
          [
            { text: '📊 Today', callback_data: `merchant_today:${args[0]}` },
            { text: '📈 Weekly', callback_data: `merchant_weekly:${args[0]}` },
          ],
          [
            { text: '📋 History', callback_data: `merchant_history:${args[0]}` },
            { text: '⚠️ Alerts', callback_data: `merchant_alerts:${args[0]}` },
          ],
          [
            { text: '🔐 Reset 2FA', callback_data: `reset_2fa:${args[0]}` },
            { text: '🔑 Reset Pass', callback_data: `reset_pass:${args[0]}` },
          ],
          [
            { text: merchant.is_active ? '🔴 Disable' : '🟢 Enable', callback_data: `toggle_merchant:${args[0]}` },
            { text: '🔒 Freeze', callback_data: `freeze_merchant:${args[0]}` },
          ],
        ]
      )
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // /balance, /pending, /today, /history, /status, /stats, /gateways, /top
    if (command === '/balance') {
      if (!args[0]) {
        await sendMessage(botToken, chatId, '❌ Usage: <code>/balance [account_no]</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const { data: merchant } = await supabaseAdmin.from('merchants').select('merchant_name, balance, frozen_balance').eq('account_number', args[0]).maybeSingle()
      if (!merchant) { await sendMessage(botToken, chatId, '❌ Merchant not found'); return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
      await sendMessage(botToken, chatId, `💰 <b>${merchant.merchant_name}</b>\n\n💵 Available: ${formatINR(merchant.balance || 0)}\n🧊 Frozen: ${formatINR(merchant.frozen_balance || 0)}\n📊 Total: ${formatINR((merchant.balance || 0) + (merchant.frozen_balance || 0))}`)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (command === '/pending') {
      const { data: pendingTx } = await supabaseAdmin.from('transactions').select('order_no, amount, transaction_type, created_at, merchants(merchant_name)').eq('status', 'pending').order('created_at', { ascending: false }).limit(10)
      let msg = `⏳ <b>Pending Transactions</b>\n\n`
      let payinAmt = 0, payoutAmt = 0
      pendingTx?.forEach((tx: any) => { if (tx.transaction_type === 'payin') payinAmt += tx.amount; else payoutAmt += tx.amount })
      msg += `📥 Pay-In: ${formatINR(payinAmt)}\n📤 Pay-Out: ${formatINR(payoutAmt)}\n\n`
      pendingTx?.forEach((tx: any, i: number) => {
        msg += `${i + 1}. ${tx.transaction_type === 'payin' ? '📥' : '📤'} ${formatINR(tx.amount)}\n   <code>${tx.order_no}</code>\n   ${(tx.merchants as any)?.merchant_name || 'N/A'}\n\n`
      })
      await sendMessage(botToken, chatId, msg)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (command === '/today') {
      if (!args[0]) { await sendMessage(botToken, chatId, '❌ Usage: <code>/today [account_no]</code>'); return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
      const { data: merchant } = await supabaseAdmin.from('merchants').select('id, merchant_name').eq('account_number', args[0]).maybeSingle()
      if (!merchant) { await sendMessage(botToken, chatId, '❌ Merchant not found'); return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const { data: transactions } = await supabaseAdmin.from('transactions').select('amount, status, transaction_type').eq('merchant_id', merchant.id).gte('created_at', today.toISOString())
      let payinCount = 0, payinSuccess = 0, payoutCount = 0, payoutSuccess = 0
      transactions?.forEach((tx: any) => { if (tx.transaction_type === 'payin') { payinCount++; if (tx.status === 'success') payinSuccess += tx.amount } else { payoutCount++; if (tx.status === 'success') payoutSuccess += tx.amount } })
      await sendMessage(botToken, chatId, `📊 <b>${merchant.merchant_name} - Today</b>\n\n📥 Pay-In: ${payinCount} orders | ${formatINR(payinSuccess)}\n📤 Pay-Out: ${payoutCount} orders | ${formatINR(payoutSuccess)}`)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (command === '/history') {
      if (!args[0]) { await sendMessage(botToken, chatId, '❌ Usage: <code>/history [account_no]</code>'); return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
      const { data: merchant } = await supabaseAdmin.from('merchants').select('id, merchant_name').eq('account_number', args[0]).maybeSingle()
      if (!merchant) { await sendMessage(botToken, chatId, '❌ Merchant not found'); return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
      const { data: transactions } = await supabaseAdmin.from('transactions').select('order_no, amount, status, transaction_type, created_at').eq('merchant_id', merchant.id).order('created_at', { ascending: false }).limit(10)
      let msg = `📋 <b>${merchant.merchant_name} - History</b>\n\n`
      transactions?.forEach((tx: any, i: number) => {
        const icon = tx.transaction_type === 'payin' ? '📥' : '📤'
        const statusIcon = tx.status === 'success' ? '✅' : tx.status === 'failed' ? '❌' : '⏳'
        msg += `${i + 1}. ${icon}${statusIcon} ${formatINR(tx.amount)}\n   <code>${tx.order_no}</code>\n   ${timeAgo(tx.created_at)}\n\n`
      })
      await sendMessage(botToken, chatId, msg)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (command === '/status') {
      if (!args[0]) { await sendMessage(botToken, chatId, '❌ Usage: <code>/status [order_no]</code>'); return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
      const { data: tx } = await supabaseAdmin.from('transactions').select('*, merchants(merchant_name)').eq('order_no', args[0]).maybeSingle()
      if (!tx) { await sendMessage(botToken, chatId, '❌ Order not found'); return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
      const statusIcon = tx.status === 'success' ? '✅' : tx.status === 'failed' ? '❌' : '⏳'
      await sendMessage(botToken, chatId, `🔍 <b>Order</b>\n\n📋 <code>${tx.order_no}</code>\n${tx.transaction_type === 'payin' ? '📥' : '📤'} ${tx.transaction_type.toUpperCase()}\n${statusIcon} ${tx.status.toUpperCase()}\n\n💰 ${formatINR(tx.amount)}\n💸 Fee: ${formatINR(tx.fee || 0)}\n\n👤 ${(tx.merchants as any)?.merchant_name || 'N/A'}`)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (command === '/stats') {
      const { data: merchants } = await supabaseAdmin.from('merchants').select('balance, frozen_balance, is_active')
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const { data: todayTx } = await supabaseAdmin.from('transactions').select('amount, status, transaction_type').gte('created_at', today.toISOString())
      let totalBalance = 0, totalFrozen = 0, activeCount = 0
      merchants?.forEach((m: any) => { totalBalance += m.balance || 0; totalFrozen += m.frozen_balance || 0; if (m.is_active) activeCount++ })
      let payinSuccess = 0, payoutSuccess = 0, payinOrders = 0, payoutOrders = 0
      todayTx?.forEach((tx: any) => { if (tx.transaction_type === 'payin') { payinOrders++; if (tx.status === 'success') payinSuccess += tx.amount } else { payoutOrders++; if (tx.status === 'success') payoutSuccess += tx.amount } })
      await sendMessage(botToken, chatId, `📈 <b>System Stats</b>\n\n━━━ 📅 TODAY ━━━\n📥 Pay-In: ${formatINR(payinSuccess)} (${payinOrders})\n📤 Pay-Out: ${formatINR(payoutSuccess)} (${payoutOrders})\n\n━━━ 💰 BALANCE ━━━\nTotal: ${formatINR(totalBalance)}\nFrozen: ${formatINR(totalFrozen)}\n\n━━━ 👥 MERCHANTS ━━━\nTotal: ${merchants?.length || 0}\nActive: ${activeCount}`)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (command === '/gateways') {
      const health = await checkGatewayHealth(supabaseAdmin)
      let msg = `🌐 <b>Gateway Status</b>\n\n`
      msg += `Active: ${health.active}/${health.total}\n\n`
      health.details.forEach((g: any) => {
        const status = g.is_active ? '✅' : '❌'
        msg += `${status} <b>${g.gateway_name}</b>\n`
        msg += `   Code: <code>${g.gateway_code}</code>\n`
        msg += `   Currency: ${g.currency}\n\n`
      })
      await sendMessage(botToken, chatId, msg)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (command === '/top') {
      const { data: merchants } = await supabaseAdmin.from('merchants').select('merchant_name, balance').order('balance', { ascending: false }).limit(10)
      let msg = `🏆 <b>Top Merchants</b>\n\n`
      merchants?.forEach((m: any, i: number) => { 
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
        msg += `${medal} <b>${m.merchant_name}</b>\n   ${formatINR(m.balance || 0)}\n\n` 
      })
      await sendMessage(botToken, chatId, msg)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Reset commands
    if (command === '/set_telegram') {
      if (args.length < 2) { await sendMessage(botToken, chatId, '❌ Usage: <code>/set_telegram [account_no] [group_id]</code>'); return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
      const { data: merchant } = await supabaseAdmin.from('merchants').update({ telegram_chat_id: args[1] }).eq('account_number', args[0]).select('merchant_name').maybeSingle()
      if (!merchant) { await sendMessage(botToken, chatId, '❌ Merchant not found'); return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
      await sendMessage(botToken, chatId, `✅ Updated TG group for <b>${merchant.merchant_name}</b>`)
      await sendMessage(botToken, args[1], `👋 Connected to <b>${merchant.merchant_name}</b>!\n\n/help for commands`)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (command === '/reset_2fa') {
      if (!args[0]) { await sendMessage(botToken, chatId, '❌ Usage: <code>/reset_2fa [account_no]</code>'); return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
      const { data: merchant } = await supabaseAdmin.from('merchants').update({ google_2fa_secret: null, is_2fa_enabled: false }).eq('account_number', args[0]).select('merchant_name, telegram_chat_id').maybeSingle()
      if (!merchant) { await sendMessage(botToken, chatId, '❌ Merchant not found'); return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
      await sendMessage(botToken, chatId, `✅ 2FA reset for <b>${merchant.merchant_name}</b>`)
      if (merchant.telegram_chat_id) await sendMessage(botToken, merchant.telegram_chat_id, `🔐 Your 2FA has been reset by admin.`)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (command === '/reset_password') {
      if (!args[0]) { await sendMessage(botToken, chatId, '❌ Usage: <code>/reset_password [account_no]</code>'); return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
      const { data: merchant } = await supabaseAdmin.from('merchants').select('user_id, merchant_name, telegram_chat_id').eq('account_number', args[0]).maybeSingle()
      if (!merchant) { await sendMessage(botToken, chatId, '❌ Merchant not found'); return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
      const newPassword = generatePassword()
      await supabaseAdmin.auth.admin.updateUserById(merchant.user_id, { password: newPassword })
      await sendMessage(botToken, chatId, `✅ Password reset for <b>${merchant.merchant_name}</b>\n\nNew: <code>${newPassword}</code>`)
      if (merchant.telegram_chat_id) await sendMessage(botToken, merchant.telegram_chat_id, `🔑 Password reset by admin.\n\nNew: <code>${newPassword}</code>`)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (command === '/reset_withdrawal') {
      if (!args[0]) { await sendMessage(botToken, chatId, '❌ Usage: <code>/reset_withdrawal [account_no]</code>'); return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
      const newPassword = generateWithdrawalPassword()
      const newPasswordHash = await createPasswordHash(newPassword)
      const { data: merchant } = await supabaseAdmin.from('merchants').update({ withdrawal_password_hash: newPasswordHash, withdrawal_password: null }).eq('account_number', args[0]).select('merchant_name, telegram_chat_id').maybeSingle()
      if (!merchant) { await sendMessage(botToken, chatId, '❌ Merchant not found'); return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
      await sendMessage(botToken, chatId, `✅ Withdrawal password reset for <b>${merchant.merchant_name}</b>\n\nNew: <code>${newPassword}</code>`)
      if (merchant.telegram_chat_id) await sendMessage(botToken, merchant.telegram_chat_id, `🔐 Withdrawal password reset.\n\nNew: <code>${newPassword}</code>`)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Unknown command
    await sendMessage(botToken, chatId, `❓ Unknown command.\n\nType /help for all commands.`)
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: unknown) {
    console.error('Telegram bot error:', error)
    return new Response(JSON.stringify({ ok: false, error: String(error) }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
