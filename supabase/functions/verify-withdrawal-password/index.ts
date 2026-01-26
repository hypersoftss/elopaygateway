import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple hash function for password verification (using SHA-256)
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

    // Get user from JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { merchantId, password, action } = body

    if (!merchantId || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the merchant belongs to this user OR user is admin
    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from('merchants')
      .select('id, user_id, withdrawal_password_hash, withdrawal_password')
      .eq('id', merchantId)
      .single()

    if (merchantError || !merchant) {
      return new Response(
        JSON.stringify({ success: false, error: 'Merchant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user owns the merchant or is admin
    const { data: adminRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    const isOwner = merchant.user_id === user.id
    const isAdmin = !!adminRole

    if (!isOwner && !isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle SET action - set a new password
    if (action === 'set') {
      if (password.length < 6) {
        return new Response(
          JSON.stringify({ success: false, error: 'Password must be at least 6 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const salt = generateSalt()
      const hashedPassword = await hashPassword(password, salt)
      const storedHash = `${salt}:${hashedPassword}`

      const { error: updateError } = await supabaseAdmin
        .from('merchants')
        .update({ 
          withdrawal_password_hash: storedHash,
          withdrawal_password: null // Clear plaintext password
        })
        .eq('id', merchantId)

      if (updateError) {
        console.error('Error setting password:', updateError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to set password' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`Withdrawal password set for merchant ${merchantId} by user ${user.id}`)

      return new Response(
        JSON.stringify({ success: true, message: 'Password set successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle VERIFY action - verify password
    // First check new hashed password
    if (merchant.withdrawal_password_hash) {
      const [salt, storedHash] = merchant.withdrawal_password_hash.split(':')
      const inputHash = await hashPassword(password, salt)
      
      if (inputHash === storedHash) {
        return new Response(
          JSON.stringify({ success: true, valid: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Fallback: check legacy plaintext password (for migration)
    if (merchant.withdrawal_password && merchant.withdrawal_password === password) {
      // Auto-migrate to hashed password
      const salt = generateSalt()
      const hashedPassword = await hashPassword(password, salt)
      const storedHash = `${salt}:${hashedPassword}`

      await supabaseAdmin
        .from('merchants')
        .update({ 
          withdrawal_password_hash: storedHash,
          withdrawal_password: null
        })
        .eq('id', merchantId)

      console.log(`Auto-migrated withdrawal password for merchant ${merchantId}`)

      return new Response(
        JSON.stringify({ success: true, valid: true, migrated: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // No password set
    if (!merchant.withdrawal_password_hash && !merchant.withdrawal_password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Withdrawal password not set', notSet: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, valid: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in verify-withdrawal-password:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
