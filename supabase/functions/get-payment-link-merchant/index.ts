import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { link_code, get_gateway_settings } = await req.json()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // If just requesting gateway settings
    if (get_gateway_settings) {
      const { data: settings } = await supabaseAdmin
        .from('admin_settings')
        .select('gateway_name, logo_url')
        .limit(1)

      return new Response(
        JSON.stringify({ 
          success: true, 
          gateway_settings: settings?.[0] || { gateway_name: 'PayGate', logo_url: null }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!link_code) {
      return new Response(
        JSON.stringify({ error: 'Link code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get payment link details with merchant and gateway info for currency
    const { data: linkData, error: linkError } = await supabaseAdmin
      .from('payment_links')
      .select(`
        id,
        link_code,
        amount,
        description,
        is_active,
        expires_at,
        trade_type,
        merchant_id,
        merchants (
          merchant_name,
          account_number,
          gateway_id,
          payment_gateways (
            currency,
            gateway_type
          )
        )
      `)
      .eq('link_code', link_code)
      .limit(1)

    if (linkError || !linkData || linkData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Payment link not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const link = linkData[0]

    // Check if link is active
    if (!link.is_active) {
      return new Response(
        JSON.stringify({ error: 'Payment link is inactive' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if link is expired
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Payment link has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get gateway settings
    const { data: settings } = await supabaseAdmin
      .from('admin_settings')
      .select('gateway_name, logo_url')
      .limit(1)

    const merchantData = link.merchants as unknown as { 
      merchant_name: string; 
      account_number: string;
      gateway_id: string | null;
      payment_gateways: { currency: string; gateway_type: string } | null;
    } | null

    // Get currency from merchant's gateway
    const currency = merchantData?.payment_gateways?.currency || 'INR'

    return new Response(
      JSON.stringify({
        success: true,
        payment_link: {
          id: link.id,
          link_code: link.link_code,
          amount: link.amount,
          description: link.description,
          is_active: link.is_active,
          expires_at: link.expires_at,
          trade_type: link.trade_type,
          merchant_name: merchantData?.merchant_name,
          currency: currency,
        },
        gateway_settings: settings?.[0] || { gateway_name: 'PayGate', logo_url: null }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Get payment link error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
