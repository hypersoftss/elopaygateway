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

// Telegram notifications disabled - health reports only returned via API response

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

    // Telegram notifications disabled - only return API response
    return new Response(
      JSON.stringify({
        success: true,
        result,
        threshold: responseThreshold,
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
