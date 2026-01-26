import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tables to export (in order to respect foreign key dependencies)
const TABLES_TO_EXPORT = [
  'admin_settings',
  'admin_profiles',
  'user_roles',
  'payment_gateways',
  'merchants',
  'transactions',
  'payment_links',
  'admin_notifications',
  'merchant_activity_logs',
  'gateway_balance_history',
];

// Helper to escape SQL string values
const escapeSqlValue = (value: any): string => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
};

// Generate INSERT statement for a row
const generateInsertStatement = (tableName: string, row: Record<string, any>): string => {
  const columns = Object.keys(row);
  const values = columns.map(col => escapeSqlValue(row[col]));
  return `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`;
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Starting database export for admin:', user.email);

    // Build SQL output
    const lines: string[] = [];
    const timestamp = new Date().toISOString();
    
    // Header
    lines.push('--');
    lines.push(`-- HYPER SOFTS Database Export`);
    lines.push(`-- Generated: ${timestamp}`);
    lines.push(`-- Admin: ${user.email}`);
    lines.push('--');
    lines.push('');
    lines.push('-- ================================================');
    lines.push('-- IMPORTANT: This export contains INSERT statements only.');
    lines.push('-- Run migrations first to create tables before importing.');
    lines.push('-- ================================================');
    lines.push('');

    let totalRows = 0;
    const tableStats: Record<string, number> = {};

    for (const tableName of TABLES_TO_EXPORT) {
      console.log(`Exporting table: ${tableName}`);
      
      // Fetch all rows from the table
      const { data: rows, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error(`Error fetching ${tableName}:`, error.message);
        lines.push(`-- Error exporting ${tableName}: ${error.message}`);
        lines.push('');
        continue;
      }

      const rowCount = rows?.length || 0;
      tableStats[tableName] = rowCount;
      totalRows += rowCount;

      lines.push('-- ------------------------------------------------');
      lines.push(`-- Table: ${tableName} (${rowCount} rows)`);
      lines.push('-- ------------------------------------------------');
      
      if (rows && rows.length > 0) {
        // Add DELETE statement for clean import
        lines.push(`DELETE FROM public.${tableName};`);
        lines.push('');
        
        for (const row of rows) {
          lines.push(generateInsertStatement(tableName, row));
        }
      } else {
        lines.push(`-- No data in ${tableName}`);
      }
      
      lines.push('');
    }

    // Summary
    lines.push('-- ================================================');
    lines.push('-- EXPORT SUMMARY');
    lines.push('-- ================================================');
    lines.push(`-- Total rows exported: ${totalRows}`);
    for (const [table, count] of Object.entries(tableStats)) {
      lines.push(`--   ${table}: ${count} rows`);
    }
    lines.push('-- ================================================');

    const sqlContent = lines.join('\n');
    const filename = `hyper_softs_backup_${timestamp.split('T')[0]}.sql`;

    console.log(`Export complete: ${totalRows} total rows`);

    return new Response(sqlContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/sql',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (err) {
    console.error('Export error:', err);
    const message = err instanceof Error ? err.message : 'Export failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
