import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, password, setupKey } = await req.json()

    // Validate setup key
    const validSetupKey = Deno.env.get('ADMIN_SETUP_KEY') || 'PAYGATE2024'
    if (setupKey !== validSetupKey) {
      return new Response(
        JSON.stringify({ error: 'Invalid setup key' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Check if admin already exists
    const { data: existingRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)

    if (rolesError) {
      console.error('Error checking existing admin:', rolesError)
      return new Response(
        JSON.stringify({ error: 'Failed to check existing admin' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (existingRoles && existingRoles.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Admin already exists' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create auth user
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

    // Create admin role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role: 'admin' })

    if (roleError) {
      console.error('Role error:', roleError)
      // Cleanup: delete auth user if role creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return new Response(
        JSON.stringify({ error: 'Failed to create admin role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin profile
    const { error: profileError } = await supabaseAdmin
      .from('admin_profiles')
      .insert({ user_id: userId })

    if (profileError) {
      console.error('Profile error:', profileError)
    }

    // Create initial admin settings if not exist
    const { data: existingSettings } = await supabaseAdmin
      .from('admin_settings')
      .select('id')
      .limit(1)

    if (!existingSettings || existingSettings.length === 0) {
      await supabaseAdmin.from('admin_settings').insert({
        master_merchant_id: '100888140',
        master_api_key: 'ab76fe01039a5a5aff089d193da40a40',
        master_payout_key: 'D7EF0E76DE29CD13E6128D722C1F6270',
        bondpay_base_url: 'https://api.bond-pays.com',
        default_payin_fee: 9.0,
        default_payout_fee: 4.0,
        gateway_name: 'PayGate',
      })
    }

    console.log('Admin setup completed successfully for:', email)

    return new Response(
      JSON.stringify({ success: true, message: 'Admin created successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Setup admin error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
