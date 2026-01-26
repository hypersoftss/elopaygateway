import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HealthCheckResult {
  status: 'online' | 'offline' | 'slow'
  responseTime: number | null
  message: string
  timestamp: string
  domain: string
}

// Store last alert time for 6-hour throttling
let lastAlertTime: number = 0
const ALERT_INTERVAL_MS = 6 * 60 * 60 * 1000 // 6 hours between alerts

async function sendTelegramAlert(
  result: HealthCheckResult,
  adminChatId: string,
  botToken: string,
  responseThreshold: number
) {
  const now = Date.now()
  const timeSinceLastAlert = now - lastAlertTime
  
  // Throttle ALL alerts to 6-hour intervals
  if (timeSinceLastAlert < ALERT_INTERVAL_MS) {
    const hoursRemaining = Math.round((ALERT_INTERVAL_MS - timeSinceLastAlert) / 1000 / 60 / 60 * 10) / 10
    console.log(`Skipping alert - next report in ${hoursRemaining} hours`)
    return
  }

  let emoji = ''
  let title = ''
  let details = ''

  if (result.status === 'offline') {
    emoji = '🔴'
    title = 'SERVER HEALTH REPORT - OFFLINE'
    details = `❌ Server is not responding!\n` +
      `🌐 Domain: ${result.domain}\n` +
      `📝 Error: ${result.message}`
  } else if (result.status === 'slow') {
    emoji = '🟡'
    title = 'SERVER HEALTH REPORT - SLOW'
    details = `⚠️ Server response time exceeded threshold!\n` +
      `🌐 Domain: ${result.domain}\n` +
      `⏱️ Response Time: ${result.responseTime}ms\n` +
      `📊 Threshold: ${responseThreshold}ms`
  } else {
    // Online status
    emoji = '📊'
    title = 'SERVER HEALTH REPORT'
    details = `✅ Server is running normally\n` +
      `🌐 Domain: ${result.domain}\n` +
      `⏱️ Response Time: ${result.responseTime}ms\n` +
      `📊 Threshold: ${responseThreshold}ms`
  }

  const message = `${emoji} <b>${title}</b>\n\n` +
    `${details}\n\n` +
    `⏰ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n` +
    `🔄 Next report in 6 hours`

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text: message,
        parse_mode: 'HTML',
      }),
    })

    if (response.ok) {
      console.log(`Health report sent: ${result.status}`)
      lastAlertTime = now
    } else {
      console.error('Failed to send Telegram alert:', await response.text())
    }
  } catch (error) {
    console.error('Error sending Telegram alert:', error)
  }
}

async function checkServerHealth(domain: string, timeout: number = 10000): Promise<HealthCheckResult> {
  const cleanDomain = domain.replace(/\/$/, '')
  const startTime = performance.now()

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(cleanDomain, {
      method: 'HEAD',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    const responseTime = Math.round(performance.now() - startTime)

    return {
      status: 'online',
      responseTime,
      message: `HTTP ${response.status}`,
      timestamp: new Date().toISOString(),
      domain: cleanDomain,
    }
  } catch (error: any) {
    const responseTime = Math.round(performance.now() - startTime)

    if (error.name === 'AbortError') {
      return {
        status: 'offline',
        responseTime: null,
        message: 'Connection timeout',
        timestamp: new Date().toISOString(),
        domain: cleanDomain,
      }
    }

    return {
      status: 'offline',
      responseTime: null,
      message: error.message || 'Connection failed',
      timestamp: new Date().toISOString(),
      domain: cleanDomain,
    }
  }
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
    const { data: adminSettings, error: settingsError } = await supabaseAdmin
      .from('admin_settings')
      .select('gateway_domain, admin_telegram_chat_id, response_time_threshold')
      .limit(1)
      .maybeSingle()

    if (settingsError) {
      throw new Error(`Failed to fetch settings: ${settingsError.message}`)
    }

    const gatewayDomain = adminSettings?.gateway_domain
    const adminChatId = adminSettings?.admin_telegram_chat_id
    const botToken = Deno.env.get('TG_BOT_TOKEN')
    // Default threshold is 3000ms (3 seconds)
    const responseThreshold = adminSettings?.response_time_threshold || 3000

    if (!gatewayDomain) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Gateway domain not configured',
          message: 'Please set gateway_domain in Admin Settings'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Checking health for: ${gatewayDomain}`)

    // Perform health check
    const result = await checkServerHealth(gatewayDomain)

    // Check if response time exceeds threshold
    if (result.status === 'online' && result.responseTime !== null && result.responseTime > responseThreshold) {
      result.status = 'slow'
      result.message = `Response time ${result.responseTime}ms exceeds threshold ${responseThreshold}ms`
    }

    console.log(`Health check result: ${result.status} - ${result.responseTime}ms`)

    // Calculate time until next report
    const now = Date.now()
    const timeSinceLastAlert = now - lastAlertTime
    const nextReportMinutes = Math.max(0, Math.round((ALERT_INTERVAL_MS - timeSinceLastAlert) / 1000 / 60))

    // Send Telegram alert if needed (throttled to 6-hour intervals)
    if (botToken && adminChatId) {
      await sendTelegramAlert(result, adminChatId, botToken, responseThreshold)
    } else {
      console.log('Telegram alerts not configured - missing bot token or admin chat ID')
    }

    return new Response(
      JSON.stringify({
        success: true,
        result,
        threshold: responseThreshold,
        telegram_configured: !!(botToken && adminChatId),
        next_report_minutes: nextReportMinutes,
        alert_interval_hours: 6,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Server health check error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
