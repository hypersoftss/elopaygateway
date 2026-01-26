import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Copy, Smartphone, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useGatewaySettings } from '@/hooks/useGatewaySettings';

const HyperSoftsBDTDocs = () => {
  const { settings } = useGatewaySettings();
  const gatewayName = settings.gatewayName || 'ELOPAY';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const signatureCode = `// ${gatewayName} Signature Algorithm (ASCII Sorted MD5)
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
  money: 100000, // 1000 BDT * 100
  notify_url: 'https://yoursite.com/callback',
  trade_type: 'Nagad'
}, 'YOUR_API_KEY');`;

  const payinNagad = `// Pay-In Request (Nagad)
POST {GATEWAY_BASE_URL}/api/order/create
Content-Type: application/x-www-form-urlencoded

app_id=YOUR_APP_ID
trade_type=Nagad
order_sn=ORDER123456
money=100000          // Amount × 100 (1000 BDT = 100000)
notify_url=https://yoursite.com/callback
user_id=01xxxxxxxxx   // 11-digit mobile number
remark=optional_note
sign=GENERATED_SIGNATURE`;

  const payinBkash = `// Pay-In Request (bKash)
POST {GATEWAY_BASE_URL}/api/order/create
Content-Type: application/x-www-form-urlencoded

app_id=YOUR_APP_ID
trade_type=bKash
order_sn=ORDER123456
money=100000          // Amount × 100 (1000 BDT = 100000)
notify_url=https://yoursite.com/callback
user_id=01xxxxxxxxx   // 11-digit mobile number
remark=optional_note
sign=GENERATED_SIGNATURE`;

  const payoutRequest = `// Pay-Out Request (bKash/Nagad)
POST {GATEWAY_BASE_URL}/api/deposit/create
Content-Type: application/x-www-form-urlencoded

app_id=YOUR_APP_ID
order_sn=PAYOUT123456
currency=BDT
money=100000          // Amount × 100
notify_url=https://yoursite.com/callback
name=Account Holder Name
card_number=01xxxxxxxxx  // bKash/Nagad phone number
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
          <div>
            <h1 className="text-2xl font-bold">{gatewayName} Bangladesh (BDT)</h1>
            <p className="text-muted-foreground">Nagad & bKash Integration</p>
          </div>
          <Badge variant="default" className="bg-emerald-600">🇧🇩 Bangladesh</Badge>
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
              <Badge>BDT (Bangladeshi Taka)</Badge>
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
                  <Badge className="bg-orange-600">Nagad</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Mobile wallet payments via Nagad</p>
                <p className="text-xs mt-2"><strong>trade_type:</strong> <code>Nagad</code></p>
                <p className="text-xs"><strong>Limits:</strong> 100 - 25,000 BDT</p>
              </div>
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-pink-600">bKash</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Mobile wallet payments via bKash</p>
                <p className="text-xs mt-2"><strong>trade_type:</strong> <code>bKash</code></p>
                <p className="text-xs"><strong>Limits:</strong> 100 - 25,000 BDT</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="signature" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="signature">Signature</TabsTrigger>
            <TabsTrigger value="payin-nagad">Pay-In Nagad</TabsTrigger>
            <TabsTrigger value="payin-bkash">Pay-In bKash</TabsTrigger>
            <TabsTrigger value="payout">Pay-Out</TabsTrigger>
            <TabsTrigger value="callback">Callback</TabsTrigger>
          </TabsList>

          <TabsContent value="signature">
            <Card>
              <CardHeader>
                <CardTitle>{gatewayName} Signature Algorithm</CardTitle>
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

          <TabsContent value="payin-nagad">
            <Card>
              <CardHeader>
                <CardTitle>Pay-In via Nagad</CardTitle>
                <CardDescription>Collect payments via Nagad mobile wallet</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(payinNagad, 'Nagad payin')}>
                    <Copy className="h-4 w-4 mr-2" /> Copy
                  </Button>
                </div>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  {payinNagad}
                </pre>
                
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-600 dark:text-orange-400">Nagad Requirements</h4>
                  <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                    <li><strong>user_id:</strong> 11-digit mobile number (01xxxxxxxxx)</li>
                    <li><strong>Limits:</strong> 100 - 25,000 BDT per transaction</li>
                    <li><strong>trade_type:</strong> Must be "Nagad" (case-sensitive)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payin-bkash">
            <Card>
              <CardHeader>
                <CardTitle>Pay-In via bKash</CardTitle>
                <CardDescription>Collect payments via bKash mobile wallet</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(payinBkash, 'bKash payin')}>
                    <Copy className="h-4 w-4 mr-2" /> Copy
                  </Button>
                </div>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  {payinBkash}
                </pre>
                
                <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-4">
                  <h4 className="font-semibold text-pink-600 dark:text-pink-400">bKash Requirements</h4>
                  <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                    <li><strong>user_id:</strong> 11-digit mobile number (01xxxxxxxxx)</li>
                    <li><strong>Limits:</strong> 100 - 25,000 BDT per transaction</li>
                    <li><strong>trade_type:</strong> Must be "bKash" (case-sensitive)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payout">
            <Card>
              <CardHeader>
                <CardTitle>Pay-Out (bKash/Nagad)</CardTitle>
                <CardDescription>Send money to Bangladesh mobile wallets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(payoutRequest, 'BDT payout')}>
                    <Copy className="h-4 w-4 mr-2" /> Copy
                  </Button>
                </div>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  {payoutRequest}
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
                      <tr className="border-t"><td className="p-3">order_sn</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">Unique order number</td></tr>
                      <tr className="border-t"><td className="p-3">currency</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">BDT</td></tr>
                      <tr className="border-t"><td className="p-3">money</td><td className="p-3">Integer</td><td className="p-3">✓</td><td className="p-3">Amount × 100</td></tr>
                      <tr className="border-t"><td className="p-3">notify_url</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">Callback URL</td></tr>
                      <tr className="border-t"><td className="p-3">name</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">Account holder name</td></tr>
                      <tr className="border-t"><td className="p-3">card_number</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">bKash/Nagad phone number</td></tr>
                      <tr className="border-t"><td className="p-3">sign</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">MD5 signature (uppercase)</td></tr>
                    </tbody>
                  </table>
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

export default HyperSoftsBDTDocs;
