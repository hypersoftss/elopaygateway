import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Copy, Smartphone, AlertTriangle, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useGatewaySettings } from '@/hooks/useGatewaySettings';

const EloPayPKRDocs = () => {
  const { settings } = useGatewaySettings();
  const gatewayName = 'ELOPAY_PKR';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const signatureCode = `// ELOPAY_PKR Signature Algorithm (ASCII Sorted MD5)
const crypto = require('crypto');

function generateSignature(params, secretKey) {
  // Step 1: Filter out empty values and 'sign' key
  const filteredParams = Object.entries(params)
    .filter(([key, value]) => value !== '' && value !== null && value !== undefined && key !== 'sign');
  
  // Step 2: Sort by ASCII (0-9, A-Z, a-z)
  filteredParams.sort(([a], [b]) => a.localeCompare(b));
  
  // Step 3: Create query string
  const queryString = filteredParams
    .map(([key, value]) => \`\${key}=\${value}\`)
    .join('&');
  
  // Step 4: Append secret key
  const signString = \`\${queryString}&key=\${secretKey}\`;
  
  // Step 5: MD5 hash and uppercase
  return crypto.createHash('md5').update(signString).digest('hex').toUpperCase();
}

// Example
const sign = generateSignature({
  app_id: 'YOUR_APP_ID',
  order_sn: 'ORDER123456',
  money: 100000, // 1000 PKR * 100
  notify_url: 'https://yoursite.com/callback',
  trade_type: 'easypaisa'
}, 'YOUR_API_KEY');`;

  const payinRequest = `// Pay-In Request (JazzCash / Easypaisa)
POST {GATEWAY_BASE_URL}/api/order/create
Content-Type: application/x-www-form-urlencoded

app_id=YOUR_APP_ID
trade_type=PKRPH           // JazzCash: PKRPH, Easypaisa: PKRPH-EASY
order_sn=ORDER123456
money=100000               // Amount × 100 (1000 PKR = 100000)
notify_url=https://yoursite.com/callback
user_id=03xxxxxxxxx        // 11-digit mobile number (optional)
remark=optional_note
sign=GENERATED_SIGNATURE`;

  const payoutEasypaisa = `// Pay-Out Request (Easypaisa)
POST {GATEWAY_BASE_URL}/api/deposit/create
Content-Type: application/x-www-form-urlencoded

app_id=YOUR_APP_ID
order_sn=PAYOUT123456
currency=PKR
money=100000          // Amount × 100
notify_url=https://yoursite.com/callback
name=Account Name
uid=CNIC_NUMBER       // Receiver's CNIC matching Easypaisa wallet
card_number=03xxxxxxxxx  // Easypaisa wallet number
addon1=easypaisa
sign=GENERATED_SIGNATURE`;

  const payoutJazzcash = `// Pay-Out Request (JazzCash)
POST {GATEWAY_BASE_URL}/api/deposit/create
Content-Type: application/x-www-form-urlencoded

app_id=YOUR_APP_ID
order_sn=PAYOUT123456
currency=PKR
money=100000          // Amount × 100
notify_url=https://yoursite.com/callback
name=Account Name
uid=CNIC_NUMBER       // Receiver's CNIC matching JazzCash wallet
card_number=03xxxxxxxxx  // JazzCash wallet number
addon1=jazzcash
sign=GENERATED_SIGNATURE`;

  const callbackExample = `// Callback Response (POST to your notify_url)
order_sn=ORDER123456
money=100000
status=1              // 1 = success, 0 = failed
pay_time=2024-01-23 12:00:00
msg=Payment successful
sign=CALLBACK_SIGNATURE

// Verify signature before processing
// Return plain text "ok" to acknowledge

// For Payout callbacks:
// status=1 means payout successful
// status=0 means payout failed (check msg)`;

  const testModeInfo = `// Test Mode Configuration
// For testing, use these trade_types:

// Pay-In Test:
trade_type: "test"

// Pay-Out Test:
currency: "TEST"
money: 1    // Will fail immediately with callback
money: 2    // Will succeed immediately with callback
money: X    // Will stay pending (no callback)`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {settings.logoUrl ? (
              <img 
                src={settings.logoUrl} 
                alt="ELOPAY" 
                className="w-14 h-14 rounded-xl object-contain shadow-lg ring-2 ring-green-500/30" 
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                <Zap className="h-7 w-7 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">ELOPAY_PKR</h1>
              <p className="text-muted-foreground">ELOPAY Pakistan - Easypaisa & JazzCash Integration</p>
            </div>
          </div>
          <Badge variant="default" className="bg-green-600">🇵🇰 Pakistan</Badge>
        </div>

        {/* Confidential Notice */}
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-700">Confidential Documentation</p>
              <p className="text-sm text-yellow-600">This documentation is for internal use only. Do not share gateway credentials or endpoints with unauthorized parties.</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Base URL</CardTitle>
            </CardHeader>
            <CardContent>
              <code className="text-xs bg-muted px-2 py-1 rounded">Configured in Gateway Settings</code>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Currency</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge>PKR (Pakistani Rupee)</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">App ID</CardTitle>
            </CardHeader>
            <CardContent>
              <code className="text-xs bg-muted px-2 py-1 rounded">From Gateway Config</code>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Signature</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">ASCII Sorted MD5</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Trade Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Available Trade Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-red-600">JazzCash</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Mobile wallet payments via JazzCash</p>
                <p className="text-xs mt-2"><strong>trade_type (payin):</strong> <code>PKRPH</code></p>
                <p className="text-xs"><strong>addon1 (payout):</strong> <code>jazzcash</code></p>
              </div>
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-600">Easypaisa</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Mobile wallet payments via Easypaisa</p>
                <p className="text-xs mt-2"><strong>trade_type (payin):</strong> <code>PKRPH-EASY</code></p>
                <p className="text-xs"><strong>addon1 (payout):</strong> <code>easypaisa</code></p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="signature" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="signature">Signature</TabsTrigger>
            <TabsTrigger value="payin">Pay-In</TabsTrigger>
            <TabsTrigger value="payout-easy">Payout Easypaisa</TabsTrigger>
            <TabsTrigger value="payout-jazz">Payout JazzCash</TabsTrigger>
            <TabsTrigger value="callback">Callback</TabsTrigger>
          </TabsList>

          <TabsContent value="signature">
            <Card>
              <CardHeader>
                <CardTitle>ELOPAY_PKR Signature Algorithm</CardTitle>
                <CardDescription>ASCII-sorted MD5 with uppercase output</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400">Signature Steps</h4>
                  <ol className="list-decimal list-inside text-sm mt-2 space-y-1">
                    <li>Remove empty values and 'sign' key from parameters</li>
                    <li>Sort parameters by ASCII (0→9, A→Z, a→z)</li>
                    <li>Create query string: <code>key1=value1&key2=value2...</code></li>
                    <li>Append secret key: <code>&key=your_secret_key</code></li>
                    <li>Calculate MD5 and convert to <strong>UPPERCASE</strong></li>
                  </ol>
                </div>
                
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(signatureCode, 'Signature code')}>
                    <Copy className="h-4 w-4 mr-2" /> Copy
                  </Button>
                </div>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  {signatureCode}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payin">
            <Card>
              <CardHeader>
                <CardTitle>Create Pay-In Order</CardTitle>
                <CardDescription>Collect payments via Easypaisa or JazzCash</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(payinRequest, 'Payin request')}>
                    <Copy className="h-4 w-4 mr-2" /> Copy
                  </Button>
                </div>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  {payinRequest}
                </pre>
                
                <h4 className="font-semibold mt-4">Request Parameters</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3">Field</th>
                        <th className="text-left p-3">Type</th>
                        <th className="text-left p-3">Required</th>
                        <th className="text-left p-3">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t"><td className="p-3">app_id</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">Your merchant app ID</td></tr>
                      <tr className="border-t"><td className="p-3">trade_type</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">easypaisa or jazzcash</td></tr>
                      <tr className="border-t"><td className="p-3">order_sn</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">Unique order number</td></tr>
                      <tr className="border-t"><td className="p-3">money</td><td className="p-3">Integer</td><td className="p-3">✓</td><td className="p-3">Amount × 100 (1000 PKR = 100000)</td></tr>
                      <tr className="border-t"><td className="p-3">notify_url</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">Callback URL</td></tr>
                      <tr className="border-t"><td className="p-3">user_id</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">11-digit mobile (03xxxxxxxxx)</td></tr>
                      <tr className="border-t"><td className="p-3">sign</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">MD5 signature (uppercase)</td></tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payout-easy">
            <Card>
              <CardHeader>
                <CardTitle>Payout via Easypaisa</CardTitle>
                <CardDescription>Send money to Easypaisa wallets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(payoutEasypaisa, 'Easypaisa payout')}>
                    <Copy className="h-4 w-4 mr-2" /> Copy
                  </Button>
                </div>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  {payoutEasypaisa}
                </pre>
                
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <h4 className="font-semibold text-green-600 dark:text-green-400">Easypaisa Requirements</h4>
                  <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                    <li><strong>uid:</strong> Receiver's CNIC number matching Easypaisa account</li>
                    <li><strong>card_number:</strong> Easypaisa wallet phone number</li>
                    <li><strong>addon1:</strong> Must be "easypaisa"</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payout-jazz">
            <Card>
              <CardHeader>
                <CardTitle>Payout via JazzCash</CardTitle>
                <CardDescription>Send money to JazzCash wallets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(payoutJazzcash, 'JazzCash payout')}>
                    <Copy className="h-4 w-4 mr-2" /> Copy
                  </Button>
                </div>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  {payoutJazzcash}
                </pre>
                
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <h4 className="font-semibold text-red-600 dark:text-red-400">JazzCash Requirements</h4>
                  <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                    <li><strong>uid:</strong> Receiver's CNIC number matching JazzCash account</li>
                    <li><strong>card_number:</strong> JazzCash wallet phone number</li>
                    <li><strong>addon1:</strong> Must be "jazzcash"</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="callback">
            <Card>
              <CardHeader>
                <CardTitle>Callback Handling</CardTitle>
                <CardDescription>Process payment notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(callbackExample, 'Callback example')}>
                    <Copy className="h-4 w-4 mr-2" /> Copy
                  </Button>
                </div>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  {callbackExample}
                </pre>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-4">
                  <h4 className="font-semibold text-yellow-600 dark:text-yellow-400">Test Mode</h4>
                  <pre className="bg-muted p-3 rounded text-xs mt-2 overflow-x-auto">
                    {testModeInfo}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default EloPayPKRDocs;
