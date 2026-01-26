import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Copy, Building2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useGatewaySettings } from '@/hooks/useGatewaySettings';

const HyperSoftsINRDocs = () => {
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
  money: 100000, // 1000 INR * 100
  notify_url: 'https://yoursite.com/callback',
  trade_type: 'INRUPI'
}, 'YOUR_API_KEY');`;

  const payinRequest = `// Pay-In Request (INR)
POST {GATEWAY_BASE_URL}/api/order/create
Content-Type: application/x-www-form-urlencoded

app_id=YOUR_APP_ID
trade_type=INRUPI     // or "usdt"
order_sn=ORDER123456
money=100000          // Amount × 100 (1000 INR = 100000)
notify_url=https://yoursite.com/callback
ip=customer_ip        // or 0.0.0.0
remark=optional_note
sign=GENERATED_SIGNATURE`;

  const payoutRequest = `// Pay-Out Request (Bank Transfer)
POST {GATEWAY_BASE_URL}/api/deposit/create
Content-Type: application/x-www-form-urlencoded

app_id=YOUR_APP_ID
order_sn=PAYOUT123456
currency=INR
money=100000          // Amount × 100
notify_url=https://yoursite.com/callback
name=ACCOUNT_HOLDER_NAME    // Name at bank
bank_name=HDFC Bank         // Bank name
card_number=1234567890      // Bank account number
addon1=HDFC0001234          // IFSC Code
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
// status=0 means payout failed (check msg)
// status=5 means processing (wait for final status)`;

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
            <h1 className="text-2xl font-bold">{gatewayName} India (INR)</h1>
            <p className="text-muted-foreground">Bank Transfer & UPI Integration</p>
          </div>
          <Badge variant="default" className="bg-orange-500">🇮🇳 India</Badge>
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
              <Badge>INR (Indian Rupee)</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Trade Type</CardTitle>
            </CardHeader>
            <CardContent>
              <code className="text-xs bg-muted px-2 py-1 rounded">INRUPI / usdt</code>
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
              <Building2 className="h-5 w-5" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-blue-500">INRUPI</Badge>
                </div>
                <p className="text-sm text-muted-foreground">UPI Payment (Recommended)</p>
                <p className="text-xs mt-2"><strong>trade_type:</strong> <code>INRUPI</code></p>
                <p className="text-xs"><strong>Payout:</strong> Bank Transfer (IMPS/NEFT)</p>
              </div>
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500">USDT</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Crypto (TRC20)</p>
                <p className="text-xs mt-2"><strong>trade_type:</strong> <code>usdt</code></p>
                <p className="text-xs"><strong>Settlement:</strong> Auto-converted to INR</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="signature" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="signature">Signature</TabsTrigger>
            <TabsTrigger value="payin">Pay-In</TabsTrigger>
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

          <TabsContent value="payin">
            <Card>
              <CardHeader>
                <CardTitle>Create Pay-In Order</CardTitle>
                <CardDescription>Collect payments in INR via UPI or USDT</CardDescription>
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
                      <tr className="border-t"><td className="p-3">trade_type</td><td className="p-3">String</td><td className="p-3">-</td><td className="p-3">INRUPI or usdt</td></tr>
                      <tr className="border-t"><td className="p-3">order_sn</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">Unique order number</td></tr>
                      <tr className="border-t"><td className="p-3">money</td><td className="p-3">Integer</td><td className="p-3">✓</td><td className="p-3">Amount × 100</td></tr>
                      <tr className="border-t"><td className="p-3">notify_url</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">Callback URL</td></tr>
                      <tr className="border-t"><td className="p-3">ip</td><td className="p-3">String</td><td className="p-3">-</td><td className="p-3">Customer IP (or 0.0.0.0)</td></tr>
                      <tr className="border-t"><td className="p-3">sign</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">MD5 signature (uppercase)</td></tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payout">
            <Card>
              <CardHeader>
                <CardTitle>Create Pay-Out Order</CardTitle>
                <CardDescription>Send payments to Indian bank accounts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(payoutRequest, 'Payout request')}>
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
                      <tr className="border-t"><td className="p-3">currency</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">INR</td></tr>
                      <tr className="border-t"><td className="p-3">money</td><td className="p-3">Integer</td><td className="p-3">✓</td><td className="p-3">Amount × 100</td></tr>
                      <tr className="border-t"><td className="p-3">notify_url</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">Callback URL</td></tr>
                      <tr className="border-t"><td className="p-3">name</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">Account holder name</td></tr>
                      <tr className="border-t"><td className="p-3">bank_name</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">Bank name</td></tr>
                      <tr className="border-t"><td className="p-3">card_number</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">Bank account number</td></tr>
                      <tr className="border-t"><td className="p-3">addon1</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">IFSC Code</td></tr>
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

export default HyperSoftsINRDocs;
