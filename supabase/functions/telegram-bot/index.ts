import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to send Telegram message
async function sendMessage(chatId: string, text: string, parseMode: string = 'HTML') {
  const botToken = Deno.env.get('TG_BOT_TOKEN')
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

    // Get admin settings for verification
    const { data: adminSettings } = await supabaseAdmin
      .from('admin_settings')
      .select('admin_telegram_chat_id, gateway_name, default_payin_fee, default_payout_fee')
      .limit(1)
      .maybeSingle()

    const adminChatId = adminSettings?.admin_telegram_chat_id
    const gatewayName = adminSettings?.gateway_name || 'PayGate'

    // Handle message
    const message = body.message
    if (!message?.text) {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const chatId = message.chat.id.toString()
    const text = message.text.trim()
    const isAdmin = adminChatId && chatId === adminChatId

    // Parse command and arguments
    const parts = text.split(/\s+/)
    const command = parts[0].toLowerCase().replace('@' + (body.message?.from?.username || ''), '')
    const args = parts.slice(1)

    // ============ ADMIN COMMANDS ============
    if (command === '/start' || command === '/help') {
      const helpText = `🤖 <b>${gatewayName} Bot</b>\n\n` +
        `<b>Admin Commands:</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📝 <code>/create_merchant [name] [email] [group_id]</code>\n` +
        `   Create new merchant\n\n` +
        `📋 <code>/merchants</code>\n` +
        `   List all merchants\n\n` +
        `👤 <code>/merchant [account_no]</code>\n` +
        `   View merchant details\n\n` +
        `💰 <code>/balance [account_no]</code>\n` +
        `   Check merchant balance\n\n` +
        `📊 <code>/history [account_no] [payin/payout]</code>\n` +
        `   Transaction history\n\n` +
        `🔍 <code>/status [order_no]</code>\n` +
        `   Check order status\n\n` +
        `🔐 <code>/reset_2fa [account_no]</code>\n` +
        `   Reset merchant 2FA\n\n` +
        `🔄 <code>/reset_password [account_no]</code>\n` +
        `   Reset login password\n\n` +
        `✅ <code>/activate [account_no]</code>\n` +
        `❌ <code>/deactivate [account_no]</code>\n` +
        `   Toggle merchant status\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `<i>Admin Group ID: ${adminChatId || 'Not Set'}</i>`
      
      await sendMessage(chatId, helpText)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Only allow admin commands from admin chat
    if (!isAdmin) {
      await sendMessage(chatId, '⛔ This bot can only be used from the Admin group.\n\nYour Chat ID: <code>' + chatId + '</code>')
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ CREATE MERCHANT ============
    if (command === '/create_merchant') {
      if (args.length < 3) {
        await sendMessage(chatId, '❌ Usage: <code>/create_merchant [name] [email] [group_id]</code>\n\nExample:\n<code>/create_merchant "Shop Name" shop@email.com -1001234567890</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Parse name (can be in quotes)
      let merchantName = args[0]
      let email = args[1]
      let groupId = args[2]

      // Handle quoted name
      if (text.includes('"')) {
        const match = text.match(/"([^"]+)"/)
        if (match) {
          merchantName = match[1]
          const afterName = text.split('"')[2].trim().split(/\s+/)
          email = afterName[0]
          groupId = afterName[1]
        }
      }

      // Validate email
      if (!email.includes('@')) {
        await sendMessage(chatId, '❌ Invalid email format')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Check if email exists
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
      const emailExists = existingUser?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase())
      if (emailExists) {
        await sendMessage(chatId, '❌ Email already registered')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Generate password and account number
      const password = generatePassword()
      const { data: accountNum } = await supabaseAdmin.rpc('generate_account_number')
      
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (authError || !authData.user) {
        await sendMessage(chatId, '❌ Failed to create user: ' + (authError?.message || 'Unknown error'))
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
          is_active: true,
        })
        .select('*')
        .single()

      if (merchantError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        await sendMessage(chatId, '❌ Failed to create merchant: ' + merchantError.message)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Create user role
      await supabaseAdmin.from('user_roles').insert({
        user_id: authData.user.id,
        role: 'merchant',
      })

      // Send confirmation to admin
      const adminMsg = `✅ <b>Merchant Created Successfully!</b>\n\n` +
        `👤 Name: ${merchantName}\n` +
        `📧 Email: ${email}\n` +
        `🆔 Account: <code>${accountNum}</code>\n` +
        `📱 Telegram Group: <code>${groupId}</code>\n` +
        `💳 Payin Fee: ${merchant.payin_fee}%\n` +
        `💸 Payout Fee: ${merchant.payout_fee}%`
      
      await sendMessage(chatId, adminMsg)

      // Send credentials to merchant's group
      const merchantMsg = `🎉 <b>Welcome to ${gatewayName}!</b>\n\n` +
        `Your merchant account has been created.\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `<b>📋 Account Details</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `👤 Name: ${merchantName}\n` +
        `🆔 Merchant ID: <code>${accountNum}</code>\n` +
        `📧 Email: <code>${email}</code>\n` +
        `🔑 Password: <code>${password}</code>\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `<b>🔐 API Credentials</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🔑 API Key (Payin): <code>${merchant.api_key}</code>\n` +
        `🔑 Payout Key: <code>${merchant.payout_key}</code>\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `<b>💰 Fee Structure</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📥 Payin Fee: ${merchant.payin_fee}%\n` +
        `📤 Payout Fee: ${merchant.payout_fee}%\n\n` +
        `⚠️ <i>Please change your password after first login!</i>`

      await sendMessage(groupId, merchantMsg)

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
        await sendMessage(chatId, '📋 No merchants found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      let msg = `📋 <b>Merchants List</b>\n\n`
      merchants.forEach((m, i) => {
        const status = m.is_active ? '✅' : '❌'
        msg += `${i + 1}. ${status} <b>${m.merchant_name}</b>\n`
        msg += `   ID: <code>${m.account_number}</code>\n`
        msg += `   Balance: ${formatINR(m.balance || 0)}\n\n`
      })

      await sendMessage(chatId, msg)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ MERCHANT DETAILS ============
    if (command === '/merchant') {
      if (!args[0]) {
        await sendMessage(chatId, '❌ Usage: <code>/merchant [account_no]</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: merchant, error } = await supabaseAdmin
        .from('merchants')
        .select('*')
        .eq('account_number', args[0])
        .maybeSingle()

      if (error || !merchant) {
        await sendMessage(chatId, '❌ Merchant not found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const status = merchant.is_active ? '✅ Active' : '❌ Inactive'
      const twoFa = merchant.is_2fa_enabled ? '🔐 Enabled' : '🔓 Disabled'

      const msg = `👤 <b>Merchant Details</b>\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📛 Name: ${merchant.merchant_name}\n` +
        `🆔 Account: <code>${merchant.account_number}</code>\n` +
        `📊 Status: ${status}\n` +
        `🔐 2FA: ${twoFa}\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `<b>💰 Balance</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💵 Available: ${formatINR(merchant.balance || 0)}\n` +
        `🧊 Frozen: ${formatINR(merchant.frozen_balance || 0)}\n` +
        `📊 Total: ${formatINR((merchant.balance || 0) + (merchant.frozen_balance || 0))}\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `<b>💳 Fees</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📥 Payin: ${merchant.payin_fee}%\n` +
        `📤 Payout: ${merchant.payout_fee}%\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `<b>🔑 API Keys</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `API Key: <code>${merchant.api_key}</code>\n` +
        `Payout Key: <code>${merchant.payout_key}</code>\n\n` +
        `📱 TG Group: <code>${merchant.telegram_chat_id || 'Not Set'}</code>`

      await sendMessage(chatId, msg)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ CHECK BALANCE ============
    if (command === '/balance') {
      if (!args[0]) {
        await sendMessage(chatId, '❌ Usage: <code>/balance [account_no]</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: merchant, error } = await supabaseAdmin
        .from('merchants')
        .select('merchant_name, balance, frozen_balance')
        .eq('account_number', args[0])
        .maybeSingle()

      if (error || !merchant) {
        await sendMessage(chatId, '❌ Merchant not found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const total = (merchant.balance || 0) + (merchant.frozen_balance || 0)
      const msg = `💰 <b>${merchant.merchant_name}</b>\n\n` +
        `💵 Available: ${formatINR(merchant.balance || 0)}\n` +
        `🧊 Frozen: ${formatINR(merchant.frozen_balance || 0)}\n` +
        `📊 Total: ${formatINR(total)}`

      await sendMessage(chatId, msg)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ TRANSACTION HISTORY ============
    if (command === '/history') {
      if (!args[0]) {
        await sendMessage(chatId, '❌ Usage: <code>/history [account_no] [payin/payout]</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: merchant } = await supabaseAdmin
        .from('merchants')
        .select('id, merchant_name')
        .eq('account_number', args[0])
        .maybeSingle()

      if (!merchant) {
        await sendMessage(chatId, '❌ Merchant not found')
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
        await sendMessage(chatId, '📋 No transactions found')
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

      await sendMessage(chatId, msg)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ CHECK ORDER STATUS ============
    if (command === '/status') {
      if (!args[0]) {
        await sendMessage(chatId, '❌ Usage: <code>/status [order_no]</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: tx, error } = await supabaseAdmin
        .from('transactions')
        .select('*, merchants(merchant_name, account_number)')
        .eq('order_no', args[0])
        .maybeSingle()

      if (error || !tx) {
        await sendMessage(chatId, '❌ Order not found')
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

      await sendMessage(chatId, msg)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ RESET 2FA ============
    if (command === '/reset_2fa') {
      if (!args[0]) {
        await sendMessage(chatId, '❌ Usage: <code>/reset_2fa [account_no]</code>')
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
        await sendMessage(chatId, '❌ Merchant not found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      await sendMessage(chatId, `✅ 2FA reset for <b>${merchant.merchant_name}</b>`)
      
      // Notify merchant
      if (merchant.telegram_chat_id) {
        await sendMessage(merchant.telegram_chat_id, `🔐 <b>2FA Reset</b>\n\nYour two-factor authentication has been reset by admin. Please set up 2FA again on next login.`)
      }

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ RESET PASSWORD ============
    if (command === '/reset_password') {
      if (!args[0]) {
        await sendMessage(chatId, '❌ Usage: <code>/reset_password [account_no]</code>')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: merchant, error: fetchError } = await supabaseAdmin
        .from('merchants')
        .select('user_id, merchant_name, telegram_chat_id')
        .eq('account_number', args[0])
        .maybeSingle()

      if (fetchError || !merchant) {
        await sendMessage(chatId, '❌ Merchant not found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const newPassword = generatePassword()
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        merchant.user_id,
        { password: newPassword }
      )

      if (updateError) {
        await sendMessage(chatId, '❌ Failed to reset password: ' + updateError.message)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      await sendMessage(chatId, `✅ Password reset for <b>${merchant.merchant_name}</b>\n\nNew Password: <code>${newPassword}</code>`)
      
      // Notify merchant
      if (merchant.telegram_chat_id) {
        await sendMessage(merchant.telegram_chat_id, `🔑 <b>Password Reset</b>\n\nYour login password has been reset by admin.\n\nNew Password: <code>${newPassword}</code>\n\n⚠️ Please change this password after login!`)
      }

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ============ ACTIVATE/DEACTIVATE ============
    if (command === '/activate' || command === '/deactivate') {
      if (!args[0]) {
        await sendMessage(chatId, `❌ Usage: <code>${command} [account_no]</code>`)
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
        await sendMessage(chatId, '❌ Merchant not found')
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const status = isActive ? '✅ Activated' : '❌ Deactivated'
      await sendMessage(chatId, `${status}: <b>${merchant.merchant_name}</b>`)
      
      // Notify merchant
      if (merchant.telegram_chat_id) {
        const merchantStatus = isActive 
          ? '✅ Your account has been activated by admin.'
          : '❌ Your account has been deactivated by admin. Contact support for more information.'
        await sendMessage(merchant.telegram_chat_id, `<b>Account Status Update</b>\n\n${merchantStatus}`)
      }

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Unknown command
    await sendMessage(chatId, '❓ Unknown command. Type /help for available commands.')

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: unknown) {
    console.error('Telegram bot error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
