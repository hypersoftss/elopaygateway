import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

// Helper to send Telegram message
async function sendMessage(botToken: string, chatId: string, text: string, parseMode: string = 'HTML') {
  if (!botToken) return

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    }),
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

// Format INR amount
function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
}

// Generate random withdrawal password
function generateWithdrawalPassword(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase()
}

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
      .select('admin_telegram_chat_id, gateway_name, gateway_domain, default_payin_fee, default_payout_fee')
      .limit(1)
      .maybeSingle()

    const adminChatId = adminSettings?.admin_telegram_chat_id
    const gatewayName = adminSettings?.gateway_name || 'PayGate'
    const gatewayDomain = adminSettings?.gateway_domain || 'https://your-gateway.com'

    // Handle message
    const message = body.message
    if (!message?.text) {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const chatId = message.chat.id.toString()
    const text = message.text.trim()
    const chatType = message.chat.type // 'private', 'group', 'supergroup'
    const isAdmin = adminChatId && chatId === adminChatId

    // Parse command and arguments
    const parts = text.split(/\s+/)
    const command = parts[0].toLowerCase().split('@')[0] // Remove bot username
    const args = parts.slice(1)

    // ============ /tg_id - Get Chat ID (Works anywhere) ============
    if (command === '/tg_id' || command === '/id' || command === '/chatid') {
      const chatInfo = chatType === 'private' 
        ? `👤 <b>Your Chat ID</b>` 
        : `👥 <b>Group Chat ID</b>`
      
      await sendMessage(botToken, chatId, 
        `${chatInfo}\n\n` +
        `🆔 Chat ID: <code>${chatId}</code>\n` +
        `📝 Type: ${chatType}\n\n` +
        `<i>Copy this ID to use for notifications</i>`
      )
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ /start or /help - Show all commands ============
    if (command === '/start' || command === '/help') {
      const helpText = `🤖 <b>${gatewayName} Admin Bot</b>\n\n` +
        `<b>━━━ 📋 GENERAL COMMANDS ━━━</b>\n` +
        `/tg_id - Get current chat/group ID\n` +
        `/help - Show this help menu\n\n` +
        
        `<b>━━━ 👤 MERCHANT MANAGEMENT ━━━</b>\n` +
        `<code>/create_merchant "Name" email group_id [callback_url]</code>\n` +
        `   Create new merchant with optional callback URL\n\n` +
        `<code>/merchants</code> - List all merchants\n\n` +
        `<code>/merchant [account_no]</code> - View merchant details\n\n` +
        `<code>/search [name/email]</code> - Search merchant\n\n` +
        
        `<b>━━━ 💰 BALANCE & TRANSACTIONS ━━━</b>\n` +
        `<code>/balance [account_no]</code> - Check balance\n\n` +
        `<code>/history [account_no] [payin/payout]</code>\n` +
        `   Transaction history\n\n` +
        `<code>/status [order_no]</code> - Check order status\n\n` +
        `<code>/today [account_no]</code> - Today's summary\n\n` +
        
        `<b>━━━ 🔧 ACCOUNT ACTIONS ━━━</b>\n` +
        `<code>/reset_2fa [account_no]</code> - Reset 2FA\n\n` +
        `<code>/reset_password [account_no]</code> - Reset login password\n\n` +
        `<code>/reset_withdrawal [account_no]</code> - Reset withdrawal password\n\n` +
        `<code>/set_fee [account_no] [payin/payout] [%]</code>\n` +
        `   Update merchant fee\n\n` +
        `<code>/set_callback [account_no] [url]</code>\n` +
        `   Set callback URL\n\n` +
        `<code>/set_telegram [account_no] [group_id]</code>\n` +
        `   Update Telegram group\n\n` +
        
        `<b>━━━ ⚡ STATUS CONTROL ━━━</b>\n` +
        `<code>/activate [account_no]</code> - Activate account\n\n` +
        `<code>/deactivate [account_no]</code> - Deactivate account\n\n` +
        
        `<b>━━━ 📊 REPORTS ━━━</b>\n` +
        `<code>/stats</code> - Overall system stats\n\n` +
        `<code>/top</code> - Top merchants by volume\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `<i>Admin Group: ${adminChatId ? '✅ Configured' : '❌ Not Set'}</i>\n` +
        `<i>Your Chat ID: <code>${chatId}</code></i>`
      
      await sendMessage(botToken, chatId, helpText)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Only allow admin commands from admin chat
    if (!isAdmin) {
      await sendMessage(botToken, chatId, 
        `⛔ <b>Access Denied</b>\n\n` +
        `This bot can only be controlled from the Admin group.\n\n` +
        `Your Chat ID: <code>${chatId}</code>\n\n` +
        `<i>Use /tg_id to get this group's ID</i>`
      )
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ CREATE MERCHANT (with callback_url support) ============
    if (command === '/create_merchant') {
      // Parse: /create_merchant "Name" email group_id [callback_url]
      const match = text.match(/\/create_merchant\s+"([^"]+)"\s+(\S+)\s+(-?\d+)(?:\s+(\S+))?/i)
      
      if (!match) {
        await sendMessage(botToken, chatId, 
          `❌ <b>Invalid Format</b>\n\n` +
          `Usage:\n` +
          `<code>/create_merchant "Merchant Name" email@example.com -1001234567890</code>\n\n` +
          `With callback URL:\n` +
          `<code>/create_merchant "Merchant Name" email@example.com -1001234567890 https://callback.url/api</code>\n\n` +
          `<b>Parameters:</b>\n` +
          `• Name: In quotes "..."\n` +
          `• Email: Valid email address\n` +
          `• Group ID: Telegram group ID (use /tg_id in group)\n` +
          `• Callback URL: Optional API callback endpoint`
        )
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const merchantName = match[1]
      const email = match[2]
      const groupId = match[3]
      const callbackUrl = match[4] || null

      // Validate email
      if (!email.includes('@') || !email.includes('.')) {
        await sendMessage(botToken, chatId, '❌ Invalid email format')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Check if email exists
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
      const emailExists = existingUser?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase())
      if (emailExists) {
        await sendMessage(botToken, chatId, '❌ Email already registered')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      await sendMessage(botToken, chatId, `⏳ Creating merchant <b>${merchantName}</b>...`)

      // Generate credentials
      const password = generatePassword()
      const withdrawalPassword = generateWithdrawalPassword()
      const { data: accountNum } = await supabaseAdmin.rpc('generate_account_number')
      
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (authError || !authData.user) {
        await sendMessage(botToken, chatId, '❌ Failed to create user: ' + (authError?.message || 'Unknown error'))
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Create merchant
      const { data: merchant, error: merchantError } = await supabaseAdmin
        .from('merchants')
        .insert({
          user_id: authData.user.id,
          account_number: accountNum,
          merchant_name: merchantName,
          payin_fee: adminSettings?.default_payin_fee || 9,
          payout_fee: adminSettings?.default_payout_fee || 4,
          telegram_chat_id: groupId,
          callback_url: callbackUrl,
          withdrawal_password: withdrawalPassword,
          is_active: true,
        })
        .select('*')
        .single()

      if (merchantError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        await sendMessage(botToken, chatId, '❌ Failed to create merchant: ' + merchantError.message)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Create user role
      await supabaseAdmin.from('user_roles').insert({
        user_id: authData.user.id,
        role: 'merchant',
      })

      // Send confirmation to admin
      const adminMsg = `✅ <b>Merchant Created Successfully!</b>\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `👤 Name: ${merchantName}\n` +
        `📧 Email: <code>${email}</code>\n` +
        `🆔 Account: <code>${accountNum}</code>\n` +
        `📱 Telegram: <code>${groupId}</code>\n` +
        `🔗 Callback: ${callbackUrl || 'Not Set'}\n` +
        `💳 Payin: ${merchant.payin_fee}%\n` +
        `💸 Payout: ${merchant.payout_fee}%\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `<i>Credentials sent to merchant group</i>`
      
      await sendMessage(botToken, chatId, adminMsg)

      // Send credentials to merchant's group
      const merchantMsg = `🎉 <b>Welcome to ${gatewayName}!</b>\n\n` +
        `Your merchant account has been created.\n\n` +
        `━━━ 📋 ACCOUNT DETAILS ━━━\n` +
        `👤 Name: ${merchantName}\n` +
        `🆔 Merchant ID: <code>${accountNum}</code>\n\n` +
        `━━━ 🔐 LOGIN CREDENTIALS ━━━\n` +
        `📧 Email: <code>${email}</code>\n` +
        `🔑 Password: <code>${password}</code>\n\n` +
        `━━━ 🔒 WITHDRAWAL PASSWORD ━━━\n` +
        `🔐 Password: <code>${withdrawalPassword}</code>\n\n` +
        `━━━ 🔑 API CREDENTIALS ━━━\n` +
        `📥 API Key (Payin): \n<code>${merchant.api_key}</code>\n\n` +
        `📤 Payout Key: \n<code>${merchant.payout_key}</code>\n\n` +
        `━━━ 💰 FEE STRUCTURE ━━━\n` +
        `📥 Payin Fee: ${merchant.payin_fee}%\n` +
        `📤 Payout Fee: ${merchant.payout_fee}%\n\n` +
        `━━━ 🌐 DASHBOARD ━━━\n` +
        `🔗 ${gatewayDomain}/merchant\n\n` +
        `⚠️ <b>IMPORTANT:</b>\n` +
        `• Change your password after first login\n` +
        `• Keep withdrawal password safe\n` +
        `• Never share API keys publicly`

      await sendMessage(botToken, groupId, merchantMsg)

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ SEARCH MERCHANT ============
    if (command === '/search') {
      if (!args[0]) {
        await sendMessage(botToken, chatId, '❌ Usage: <code>/search [name or email]</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const searchTerm = args.join(' ').toLowerCase()
      const { data: merchants } = await supabaseAdmin
        .from('merchants')
        .select('account_number, merchant_name, balance, is_active')
        .or(`merchant_name.ilike.%${searchTerm}%`)
        .limit(10)

      if (!merchants?.length) {
        await sendMessage(botToken, chatId, `🔍 No merchants found for "<b>${searchTerm}</b>"`)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      let msg = `🔍 <b>Search Results</b>\n\n`
      merchants.forEach((m, i) => {
        const status = m.is_active ? '✅' : '❌'
        msg += `${i + 1}. ${status} <b>${m.merchant_name}</b>\n`
        msg += `   ID: <code>${m.account_number}</code>\n`
        msg += `   Balance: ${formatINR(m.balance || 0)}\n\n`
      })

      await sendMessage(botToken, chatId, msg)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ LIST MERCHANTS ============
    if (command === '/merchants') {
      const { data: merchants, error } = await supabaseAdmin
        .from('merchants')
        .select('account_number, merchant_name, balance, is_active, created_at')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error || !merchants?.length) {
        await sendMessage(botToken, chatId, '📋 No merchants found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      let msg = `📋 <b>Merchants List</b> (${merchants.length})\n\n`
      merchants.forEach((m, i) => {
        const status = m.is_active ? '✅' : '❌'
        msg += `${i + 1}. ${status} <b>${m.merchant_name}</b>\n`
        msg += `   ID: <code>${m.account_number}</code>\n`
        msg += `   Balance: ${formatINR(m.balance || 0)}\n\n`
      })

      await sendMessage(botToken, chatId, msg)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ MERCHANT DETAILS ============
    if (command === '/merchant') {
      if (!args[0]) {
        await sendMessage(botToken, chatId, '❌ Usage: <code>/merchant [account_no]</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: merchant, error } = await supabaseAdmin
        .from('merchants')
        .select('*')
        .eq('account_number', args[0])
        .maybeSingle()

      if (error || !merchant) {
        await sendMessage(botToken, chatId, '❌ Merchant not found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const status = merchant.is_active ? '✅ Active' : '❌ Inactive'
      const twoFa = merchant.is_2fa_enabled ? '🔐 Enabled' : '🔓 Disabled'

      const msg = `👤 <b>Merchant Details</b>\n\n` +
        `━━━ 📋 INFO ━━━\n` +
        `📛 Name: ${merchant.merchant_name}\n` +
        `🆔 Account: <code>${merchant.account_number}</code>\n` +
        `📊 Status: ${status}\n` +
        `🔐 2FA: ${twoFa}\n\n` +
        `━━━ 💰 BALANCE ━━━\n` +
        `💵 Available: ${formatINR(merchant.balance || 0)}\n` +
        `🧊 Frozen: ${formatINR(merchant.frozen_balance || 0)}\n` +
        `📊 Total: ${formatINR((merchant.balance || 0) + (merchant.frozen_balance || 0))}\n\n` +
        `━━━ 💳 FEES ━━━\n` +
        `📥 Payin: ${merchant.payin_fee}%\n` +
        `📤 Payout: ${merchant.payout_fee}%\n\n` +
        `━━━ 🔑 API KEYS ━━━\n` +
        `API Key: <code>${merchant.api_key}</code>\n` +
        `Payout: <code>${merchant.payout_key}</code>\n\n` +
        `━━━ ⚙️ CONFIG ━━━\n` +
        `📱 TG Group: <code>${merchant.telegram_chat_id || 'Not Set'}</code>\n` +
        `🔗 Callback: ${merchant.callback_url || 'Not Set'}`

      await sendMessage(botToken, chatId, msg)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ CHECK BALANCE ============
    if (command === '/balance') {
      if (!args[0]) {
        await sendMessage(botToken, chatId, '❌ Usage: <code>/balance [account_no]</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: merchant, error } = await supabaseAdmin
        .from('merchants')
        .select('merchant_name, balance, frozen_balance')
        .eq('account_number', args[0])
        .maybeSingle()

      if (error || !merchant) {
        await sendMessage(botToken, chatId, '❌ Merchant not found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const total = (merchant.balance || 0) + (merchant.frozen_balance || 0)
      const msg = `💰 <b>${merchant.merchant_name}</b>\n\n` +
        `💵 Available: ${formatINR(merchant.balance || 0)}\n` +
        `🧊 Frozen: ${formatINR(merchant.frozen_balance || 0)}\n` +
        `📊 Total: ${formatINR(total)}`

      await sendMessage(botToken, chatId, msg)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ TODAY'S SUMMARY ============
    if (command === '/today') {
      if (!args[0]) {
        await sendMessage(botToken, chatId, '❌ Usage: <code>/today [account_no]</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: merchant } = await supabaseAdmin
        .from('merchants')
        .select('id, merchant_name')
        .eq('account_number', args[0])
        .maybeSingle()

      if (!merchant) {
        await sendMessage(botToken, chatId, '❌ Merchant not found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { data: transactions } = await supabaseAdmin
        .from('transactions')
        .select('amount, fee, status, transaction_type')
        .eq('merchant_id', merchant.id)
        .gte('created_at', today.toISOString())

      let payinCount = 0, payinSuccess = 0, payinAmount = 0
      let payoutCount = 0, payoutSuccess = 0, payoutAmount = 0

      transactions?.forEach(tx => {
        if (tx.transaction_type === 'payin') {
          payinCount++
          if (tx.status === 'success') {
            payinSuccess++
            payinAmount += tx.amount
          }
        } else {
          payoutCount++
          if (tx.status === 'success') {
            payoutSuccess++
            payoutAmount += tx.amount
          }
        }
      })

      const msg = `📊 <b>${merchant.merchant_name} - Today</b>\n\n` +
        `━━━ 📥 PAY-IN ━━━\n` +
        `Total: ${payinCount} | Success: ${payinSuccess}\n` +
        `Amount: ${formatINR(payinAmount)}\n` +
        `Rate: ${payinCount ? Math.round(payinSuccess / payinCount * 100) : 0}%\n\n` +
        `━━━ 📤 PAY-OUT ━━━\n` +
        `Total: ${payoutCount} | Success: ${payoutSuccess}\n` +
        `Amount: ${formatINR(payoutAmount)}\n` +
        `Rate: ${payoutCount ? Math.round(payoutSuccess / payoutCount * 100) : 0}%`

      await sendMessage(botToken, chatId, msg)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ TRANSACTION HISTORY ============
    if (command === '/history') {
      if (!args[0]) {
        await sendMessage(botToken, chatId, '❌ Usage: <code>/history [account_no] [payin/payout]</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: merchant } = await supabaseAdmin
        .from('merchants')
        .select('id, merchant_name')
        .eq('account_number', args[0])
        .maybeSingle()

      if (!merchant) {
        await sendMessage(botToken, chatId, '❌ Merchant not found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      let query = supabaseAdmin
        .from('transactions')
        .select('order_no, amount, fee, status, transaction_type, created_at')
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (args[1] === 'payin') {
        query = query.eq('transaction_type', 'payin')
      } else if (args[1] === 'payout') {
        query = query.eq('transaction_type', 'payout')
      }

      const { data: transactions } = await query

      if (!transactions?.length) {
        await sendMessage(botToken, chatId, '📋 No transactions found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      let msg = `📊 <b>${merchant.merchant_name} - History</b>\n\n`
      transactions.forEach((tx, i) => {
        const icon = tx.transaction_type === 'payin' ? '📥' : '📤'
        const statusIcon = tx.status === 'success' ? '✅' : tx.status === 'failed' ? '❌' : '⏳'
        const date = new Date(tx.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        msg += `${i + 1}. ${icon} ${statusIcon} ${formatINR(tx.amount)}\n`
        msg += `   <code>${tx.order_no}</code>\n`
        msg += `   ${date}\n\n`
      })

      await sendMessage(botToken, chatId, msg)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ CHECK ORDER STATUS ============
    if (command === '/status') {
      if (!args[0]) {
        await sendMessage(botToken, chatId, '❌ Usage: <code>/status [order_no]</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: tx, error } = await supabaseAdmin
        .from('transactions')
        .select('*, merchants(merchant_name, account_number)')
        .eq('order_no', args[0])
        .maybeSingle()

      if (error || !tx) {
        await sendMessage(botToken, chatId, '❌ Order not found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const icon = tx.transaction_type === 'payin' ? '📥 Pay-In' : '📤 Pay-Out'
      const statusIcon = tx.status === 'success' ? '✅' : tx.status === 'failed' ? '❌' : '⏳'
      const date = new Date(tx.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })

      const msg = `🔍 <b>Order Status</b>\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📋 Order: <code>${tx.order_no}</code>\n` +
        `🔖 Merchant Order: <code>${tx.merchant_order_no || 'N/A'}</code>\n` +
        `📊 Type: ${icon}\n` +
        `${statusIcon} Status: <b>${tx.status.toUpperCase()}</b>\n\n` +
        `💰 Amount: ${formatINR(tx.amount)}\n` +
        `💸 Fee: ${formatINR(tx.fee || 0)}\n` +
        `💵 Net: ${formatINR(tx.net_amount || tx.amount)}\n\n` +
        `👤 Merchant: ${(tx.merchants as any)?.merchant_name || 'N/A'}\n` +
        `🆔 Account: <code>${(tx.merchants as any)?.account_number || 'N/A'}</code>\n` +
        `⏰ Created: ${date}`

      await sendMessage(botToken, chatId, msg)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ SET FEE ============
    if (command === '/set_fee') {
      if (args.length < 3) {
        await sendMessage(botToken, chatId, '❌ Usage: <code>/set_fee [account_no] [payin/payout] [percentage]</code>\n\nExample: <code>/set_fee 100000001 payin 8.5</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const feeType = args[1].toLowerCase()
      const feeValue = parseFloat(args[2])

      if (feeType !== 'payin' && feeType !== 'payout') {
        await sendMessage(botToken, chatId, '❌ Fee type must be "payin" or "payout"')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      if (isNaN(feeValue) || feeValue < 0 || feeValue > 100) {
        await sendMessage(botToken, chatId, '❌ Invalid fee percentage (0-100)')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const updateField = feeType === 'payin' ? 'payin_fee' : 'payout_fee'
      const { data: merchant, error } = await supabaseAdmin
        .from('merchants')
        .update({ [updateField]: feeValue })
        .eq('account_number', args[0])
        .select('merchant_name, telegram_chat_id')
        .maybeSingle()

      if (error || !merchant) {
        await sendMessage(botToken, chatId, '❌ Merchant not found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      await sendMessage(botToken, chatId, `✅ <b>${merchant.merchant_name}</b>\n\n${feeType.toUpperCase()} fee updated to ${feeValue}%`)

      if (merchant.telegram_chat_id) {
        await sendMessage(botToken, merchant.telegram_chat_id, `💳 <b>Fee Update</b>\n\nYour ${feeType.toUpperCase()} fee has been updated to ${feeValue}%`)
      }

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ SET CALLBACK URL ============
    if (command === '/set_callback') {
      if (args.length < 2) {
        await sendMessage(botToken, chatId, '❌ Usage: <code>/set_callback [account_no] [url]</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: merchant, error } = await supabaseAdmin
        .from('merchants')
        .update({ callback_url: args[1] })
        .eq('account_number', args[0])
        .select('merchant_name')
        .maybeSingle()

      if (error || !merchant) {
        await sendMessage(botToken, chatId, '❌ Merchant not found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      await sendMessage(botToken, chatId, `✅ <b>${merchant.merchant_name}</b>\n\nCallback URL updated to:\n<code>${args[1]}</code>`)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ SET TELEGRAM GROUP ============
    if (command === '/set_telegram') {
      if (args.length < 2) {
        await sendMessage(botToken, chatId, '❌ Usage: <code>/set_telegram [account_no] [group_id]</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: merchant, error } = await supabaseAdmin
        .from('merchants')
        .update({ telegram_chat_id: args[1] })
        .eq('account_number', args[0])
        .select('merchant_name')
        .maybeSingle()

      if (error || !merchant) {
        await sendMessage(botToken, chatId, '❌ Merchant not found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      await sendMessage(botToken, chatId, `✅ <b>${merchant.merchant_name}</b>\n\nTelegram group updated to: <code>${args[1]}</code>`)
      await sendMessage(botToken, args[1], `👋 <b>Connected!</b>\n\nThis group is now linked to <b>${merchant.merchant_name}</b>.\n\nYou will receive all transaction notifications here.`)

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ RESET 2FA ============
    if (command === '/reset_2fa') {
      if (!args[0]) {
        await sendMessage(botToken, chatId, '❌ Usage: <code>/reset_2fa [account_no]</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: merchant, error } = await supabaseAdmin
        .from('merchants')
        .update({
          google_2fa_secret: null,
          is_2fa_enabled: false,
        })
        .eq('account_number', args[0])
        .select('merchant_name, telegram_chat_id')
        .maybeSingle()

      if (error || !merchant) {
        await sendMessage(botToken, chatId, '❌ Merchant not found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      await sendMessage(botToken, chatId, `✅ 2FA reset for <b>${merchant.merchant_name}</b>`)
      
      if (merchant.telegram_chat_id) {
        await sendMessage(botToken, merchant.telegram_chat_id, `🔐 <b>2FA Reset</b>\n\nYour two-factor authentication has been reset by admin.\n\nPlease set up 2FA again on next login.`)
      }

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ RESET PASSWORD ============
    if (command === '/reset_password') {
      if (!args[0]) {
        await sendMessage(botToken, chatId, '❌ Usage: <code>/reset_password [account_no]</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: merchant, error: fetchError } = await supabaseAdmin
        .from('merchants')
        .select('user_id, merchant_name, telegram_chat_id')
        .eq('account_number', args[0])
        .maybeSingle()

      if (fetchError || !merchant) {
        await sendMessage(botToken, chatId, '❌ Merchant not found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const newPassword = generatePassword()
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        merchant.user_id,
        { password: newPassword }
      )

      if (updateError) {
        await sendMessage(botToken, chatId, '❌ Failed to reset password: ' + updateError.message)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      await sendMessage(botToken, chatId, `✅ Password reset for <b>${merchant.merchant_name}</b>\n\nNew Password: <code>${newPassword}</code>`)
      
      if (merchant.telegram_chat_id) {
        await sendMessage(botToken, merchant.telegram_chat_id, `🔑 <b>Password Reset</b>\n\nYour login password has been reset by admin.\n\nNew Password: <code>${newPassword}</code>\n\n⚠️ Please change this password after login!`)
      }

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ RESET WITHDRAWAL PASSWORD ============
    if (command === '/reset_withdrawal') {
      if (!args[0]) {
        await sendMessage(botToken, chatId, '❌ Usage: <code>/reset_withdrawal [account_no]</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const newPassword = generateWithdrawalPassword()
      const { data: merchant, error } = await supabaseAdmin
        .from('merchants')
        .update({ withdrawal_password: newPassword })
        .eq('account_number', args[0])
        .select('merchant_name, telegram_chat_id')
        .maybeSingle()

      if (error || !merchant) {
        await sendMessage(botToken, chatId, '❌ Merchant not found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      await sendMessage(botToken, chatId, `✅ Withdrawal password reset for <b>${merchant.merchant_name}</b>\n\nNew Password: <code>${newPassword}</code>`)
      
      if (merchant.telegram_chat_id) {
        await sendMessage(botToken, merchant.telegram_chat_id, `🔐 <b>Withdrawal Password Reset</b>\n\nYour withdrawal password has been reset by admin.\n\nNew Password: <code>${newPassword}</code>\n\n⚠️ Keep this password safe!`)
      }

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ ACTIVATE/DEACTIVATE ============
    if (command === '/activate' || command === '/deactivate') {
      if (!args[0]) {
        await sendMessage(botToken, chatId, `❌ Usage: <code>${command} [account_no]</code>`)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const isActive = command === '/activate'
      const { data: merchant, error } = await supabaseAdmin
        .from('merchants')
        .update({ is_active: isActive })
        .eq('account_number', args[0])
        .select('merchant_name, telegram_chat_id')
        .maybeSingle()

      if (error || !merchant) {
        await sendMessage(botToken, chatId, '❌ Merchant not found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const status = isActive ? '✅ Activated' : '❌ Deactivated'
      await sendMessage(botToken, chatId, `${status}: <b>${merchant.merchant_name}</b>`)
      
      if (merchant.telegram_chat_id) {
        const merchantStatus = isActive 
          ? '✅ Your account has been activated by admin.'
          : '❌ Your account has been deactivated by admin. Contact support for more information.'
        await sendMessage(botToken, merchant.telegram_chat_id, `<b>Account Status Update</b>\n\n${merchantStatus}`)
      }

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ SYSTEM STATS ============
    if (command === '/stats') {
      const { data: merchants } = await supabaseAdmin
        .from('merchants')
        .select('balance, frozen_balance, is_active')

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { data: todayTx } = await supabaseAdmin
        .from('transactions')
        .select('amount, status, transaction_type')
        .gte('created_at', today.toISOString())

      let totalBalance = 0, totalFrozen = 0, activeCount = 0
      merchants?.forEach(m => {
        totalBalance += m.balance || 0
        totalFrozen += m.frozen_balance || 0
        if (m.is_active) activeCount++
      })

      let payinTotal = 0, payinSuccess = 0, payoutTotal = 0, payoutSuccess = 0
      todayTx?.forEach(tx => {
        if (tx.transaction_type === 'payin') {
          if (tx.status === 'success') payinSuccess += tx.amount
          payinTotal++
        } else {
          if (tx.status === 'success') payoutSuccess += tx.amount
          payoutTotal++
        }
      })

      const msg = `📊 <b>System Statistics</b>\n\n` +
        `━━━ 👥 MERCHANTS ━━━\n` +
        `Total: ${merchants?.length || 0}\n` +
        `Active: ${activeCount}\n\n` +
        `━━━ 💰 BALANCES ━━━\n` +
        `Available: ${formatINR(totalBalance)}\n` +
        `Frozen: ${formatINR(totalFrozen)}\n` +
        `Total: ${formatINR(totalBalance + totalFrozen)}\n\n` +
        `━━━ 📈 TODAY ━━━\n` +
        `Pay-In: ${payinTotal} orders | ${formatINR(payinSuccess)}\n` +
        `Pay-Out: ${payoutTotal} orders | ${formatINR(payoutSuccess)}`

      await sendMessage(botToken, chatId, msg)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ TOP MERCHANTS ============
    if (command === '/top') {
      const { data: merchants } = await supabaseAdmin
        .from('merchants')
        .select('merchant_name, account_number, balance')
        .order('balance', { ascending: false })
        .limit(10)

      if (!merchants?.length) {
        await sendMessage(botToken, chatId, '📊 No merchants found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      let msg = `🏆 <b>Top Merchants by Balance</b>\n\n`
      merchants.forEach((m, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
        msg += `${medal} <b>${m.merchant_name}</b>\n`
        msg += `   <code>${m.account_number}</code>\n`
        msg += `   ${formatINR(m.balance || 0)}\n\n`
      })

      await sendMessage(botToken, chatId, msg)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Unknown command
    await sendMessage(botToken, chatId, `❓ Unknown command.\n\nType /help for available commands.`)

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: unknown) {
    console.error('Telegram bot error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
