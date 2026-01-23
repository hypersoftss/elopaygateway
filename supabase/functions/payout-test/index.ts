// Temporary test function to generate payout signatures and test
import { Md5 } from 'https://deno.land/std@0.119.0/hash/md5.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestCase {
  merchantId: string;
  payoutKey: string;
  gateway: string;
  currency: string;
  amount: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Test cases for each gateway/currency combination
  const testCases: TestCase[] = [
    { merchantId: '100000001', payoutKey: 'f11d67de-19e4-451d-85b8-bb773f0c4aef', gateway: 'BondPay', currency: 'INR', amount: '100' },
    { merchantId: '100000003', payoutKey: 'ed5d0e13-cb50-4ba8-b7cb-2e0f4473becd', gateway: 'LG Pay INR (INRUPI)', currency: 'INR', amount: '100' },
    { merchantId: '100000008', payoutKey: 'd525c204-6ff2-4bc0-8e6f-fd84519be4ae', gateway: 'LG Pay INR (USDT)', currency: 'INR', amount: '100' },
    { merchantId: '100000004', payoutKey: '0a38d6db-6f3d-4d8e-ba45-56aec0243869', gateway: 'LG Pay PKR (Easypaisa)', currency: 'PKR', amount: '500' },
    { merchantId: '100000006', payoutKey: '80936d8f-da3b-4947-8c23-29a6cefa6693', gateway: 'LG Pay PKR (JazzCash)', currency: 'PKR', amount: '500' },
    { merchantId: '100000005', payoutKey: '0d8e25de-5848-4e6e-a77c-df9158578a84', gateway: 'LG Pay BDT (Nagad)', currency: 'BDT', amount: '500' },
    { merchantId: '100000007', payoutKey: '4fc236c0-3360-4aad-b206-15a4670d7d06', gateway: 'LG Pay BDT (bKash)', currency: 'BDT', amount: '500' },
  ]

  const results = []
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!

  for (const tc of testCases) {
    const timestamp = Date.now()
    const transactionId = `TEST_PAYOUT_${tc.merchantId}_${timestamp}`
    const accountNumber = '1234567890'
    const bankName = 'Test Bank'
    const callbackUrl = 'https://example.com/payout-callback'
    const ifsc = 'TEST0001234'
    const name = 'Test User'
    
    // Generate signature: MD5(account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payout_key)
    const signString = `${accountNumber}${tc.amount}${bankName}${callbackUrl}${ifsc}${tc.merchantId}${name}${transactionId}${tc.payoutKey}`
    const hash = new Md5()
    hash.update(signString)
    const signature = hash.toString()
    
    console.log(`Testing ${tc.gateway} (${tc.merchantId}):`, { signString, signature })
    
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: tc.merchantId,
          amount: tc.amount,
          transaction_id: transactionId,
          account_number: accountNumber,
          ifsc: ifsc,
          name: name,
          bank_name: bankName,
          callback_url: callbackUrl,
          sign: signature,
        }),
      })

      const responseData = await response.json()
      
      results.push({
        gateway: tc.gateway,
        merchantId: tc.merchantId,
        currency: tc.currency,
        status: response.ok ? 'SUCCESS' : 'FAILED',
        httpStatus: response.status,
        response: responseData,
        transactionId: transactionId,
      })
      
      console.log(`${tc.gateway} result:`, { status: response.status, data: responseData })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      results.push({
        gateway: tc.gateway,
        merchantId: tc.merchantId,
        currency: tc.currency,
        status: 'ERROR',
        error: errorMessage,
      })
    }
  }

  // Summary
  const passed = results.filter(r => r.status === 'SUCCESS').length
  const failed = results.filter(r => r.status !== 'SUCCESS').length

  return new Response(
    JSON.stringify({
      summary: {
        total: results.length,
        passed,
        failed,
      },
      tests: results,
    }, null, 2),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
