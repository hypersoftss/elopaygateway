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
    // Verify admin authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify caller is admin
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getUser(token)
    
    if (claimsError || !claimsData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', claimsData.user.id)
      .eq('role', 'admin')
      .limit(1)

    if (!roleData || roleData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { merchantName, email, password, payinFee, payoutFee, callbackUrl, gatewayId } = await req.json()

    // Validate required fields
    if (!merchantName || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate account number
    const { data: accountNumber, error: accountError } = await supabaseAdmin.rpc('generate_account_number')
    
    if (accountError) {
      console.error('Account number generation error:', accountError)
      return new Response(
        JSON.stringify({ error: 'Failed to generate account number' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create auth user for merchant
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = authData.user.id

    // Get default fees from admin settings
    const { data: settings } = await supabaseAdmin
      .from('admin_settings')
      .select('default_payin_fee, default_payout_fee')
      .limit(1)

    const defaultPayinFee = settings?.[0]?.default_payin_fee || 9.0
    const defaultPayoutFee = settings?.[0]?.default_payout_fee || 4.0

    // Get gateway info for response
    let gatewayInfo = null
    if (gatewayId) {
      const { data: gateway } = await supabaseAdmin
        .from('payment_gateways')
        .select('gateway_name, gateway_code, currency')
        .eq('id', gatewayId)
        .single()
      gatewayInfo = gateway
    }

    // Create merchant record with gateway
    const { data: merchantData, error: merchantError } = await supabaseAdmin
      .from('merchants')
      .insert({
        user_id: userId,
        account_number: accountNumber,
        merchant_name: merchantName,
        payin_fee: parseFloat(payinFee) || defaultPayinFee,
        payout_fee: parseFloat(payoutFee) || defaultPayoutFee,
        callback_url: callbackUrl || null,
        gateway_id: gatewayId || null,
        is_active: true,
        balance: 0,
        frozen_balance: 0,
      })
      .select('api_key, payout_key')
      .single()

    if (merchantError) {
      console.error('Merchant creation error:', merchantError)
      // Cleanup: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return new Response(
        JSON.stringify({ error: 'Failed to create merchant' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create merchant role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role: 'merchant' })

    if (roleError) {
      console.error('Role creation error:', roleError)
    }

    console.log('Merchant created successfully:', accountNumber)

    return new Response(
      JSON.stringify({ 
        success: true, 
        accountNumber,
        apiKey: merchantData?.api_key,
        payoutKey: merchantData?.payout_key,
        gateway: gatewayInfo,
        message: 'Merchant created successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Create merchant error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})