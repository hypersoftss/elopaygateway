import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Copy, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useGatewaySettings } from '@/hooks/useGatewaySettings';

const HyperPayINRDocs = () => {
  const { settings } = useGatewaySettings();
  const gatewayName = 'ELOPAYGATEWAY_INR';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const payinSignatureCode = `// ELOPAYGATEWAY_INR Payin Signature (MD5)
const crypto = require('crypto');

function generatePayinSignature(merchantId, amount, orderNo, apiKey, callbackUrl) {
  const signString = merchantId + amount + orderNo + apiKey + callbackUrl;
  return crypto.createHash('md5').update(signString).digest('hex');
}

// Example
const sign = generatePayinSignature(
  'YOUR_MERCHANT_ID',      // merchant_id
  '1000',                  // amount (INR)
  'PI1234567890',          // order_no
  'YOUR_API_KEY',          // api_key
  'https://yoursite.com/callback'
);`;

  const payoutSignatureCode = `// ELOPAYGATEWAY_INR Payout Signature (MD5)
const crypto = require('crypto');

function generatePayoutSignature(params, payoutKey) {
  const { account_number, amount, bank_name, callback_url, ifsc, merchant_id, name, transaction_id } = params;
  const signString = account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payoutKey;
  return crypto.createHash('md5').update(signString).digest('hex');
}

// Example
const sign = generatePayoutSignature({
  account_number: '1234567890',
  amount: '1000',
  bank_name: 'HDFC Bank',
  callback_url: 'https://yoursite.com/callback',
  ifsc: 'HDFC0001234',
  merchant_id: 'YOUR_MERCHANT_ID',
  name: 'John Doe',
  transaction_id: 'PO1234567890'
}, 'YOUR_PAYOUT_KEY');`;

  const payinRequest = `// Payin Request
POST {GATEWAY_BASE_URL}/v1/create

Content-Type: application/json

{
  "merchant_id": "YOUR_MERCHANT_ID",
  "amount": "1000",
  "order_no": "PI1234567890",
  "callback_url": "https://yoursite.com/callback",
  "sign": "generated_md5_signature"
}`;

  const payoutRequest = `// Payout Request  
POST {GATEWAY_BASE_URL}/payout/payment.php

Content-Type: application/json

{
  "merchant_id": "YOUR_MERCHANT_ID",
  "amount": "1000",
  "transaction_id": "PO1234567890",
  "name": "Account Holder Name",
  "account_number": "1234567890",
  "ifsc": "HDFC0001234",
  "bank_name": "HDFC Bank",
  "callback_url": "https://yoursite.com/callback",
  "sign": "generated_md5_signature"
}`;

  const callbackExample = `// Callback Response (POST to your callback_url)
{
  "merchant_id": "YOUR_MERCHANT_ID",
  "order_no": "PI1234567890",
  "amount": "1000",
  "status": "success",
  "transaction_id": "TXN123456",
  "sign": "callback_signature"
}

// Verify callback signature before processing
// Return "ok" to acknowledge receipt`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">ELOPAYGATEWAY_INR</h1>
            <p className="text-muted-foreground">ELOPAY GATEWAY India - Payment Gateway Integration</p>
          </div>
          <Badge variant="default" className="bg-orange-500">🇮🇳 India Only</Badge>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <CardTitle className="text-sm">Signature Algorithm</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">MD5 Concatenation</Badge>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="payin" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="payin">Pay-In</TabsTrigger>
            <TabsTrigger value="payout">Pay-Out</TabsTrigger>
            <TabsTrigger value="signature">Signature</TabsTrigger>
            <TabsTrigger value="callback">Callback</TabsTrigger>
          </TabsList>

          <TabsContent value="payin">
            <Card>
              <CardHeader>
                <CardTitle>Create Pay-In Order</CardTitle>
                <CardDescription>Collect payments from customers in INR</CardDescription>
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
                      <tr className="border-t"><td className="p-3">merchant_id</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">Your merchant ID</td></tr>
                      <tr className="border-t"><td className="p-3">amount</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">Amount in INR</td></tr>
                      <tr className="border-t"><td className="p-3">order_no</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">Unique order number</td></tr>
                      <tr className="border-t"><td className="p-3">callback_url</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">Callback URL for payment notifications</td></tr>
                      <tr className="border-t"><td className="p-3">sign</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">MD5 signature</td></tr>
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
                <CardDescription>Send payments to bank accounts in INR</CardDescription>
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
                      <tr className="border-t"><td className="p-3">merchant_id</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">Your merchant ID</td></tr>
                      <tr className="border-t"><td className="p-3">amount</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">Amount in INR</td></tr>
                      <tr className="border-t"><td className="p-3">transaction_id</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">Unique transaction ID</td></tr>
                      <tr className="border-t"><td className="p-3">name</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">Account holder name</td></tr>
                      <tr className="border-t"><td className="p-3">account_number</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">Bank account number</td></tr>
                      <tr className="border-t"><td className="p-3">ifsc</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">IFSC code</td></tr>
                      <tr className="border-t"><td className="p-3">bank_name</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">Bank name</td></tr>
                      <tr className="border-t"><td className="p-3">callback_url</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">Callback URL</td></tr>
                      <tr className="border-t"><td className="p-3">sign</td><td className="p-3">String</td><td className="p-3">✓</td><td className="p-3">MD5 signature</td></tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signature">
            <Card>
              <CardHeader>
                <CardTitle>Signature Generation</CardTitle>
                <CardDescription>MD5 concatenation method</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Payin Signature</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Formula: <code className="bg-muted px-1 rounded">md5(merchant_id + amount + order_no + api_key + callback_url)</code>
                  </p>
                  <div className="flex justify-end mb-2">
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(payinSignatureCode, 'Payin signature code')}>
                      <Copy className="h-4 w-4 mr-2" /> Copy
                    </Button>
                  </div>
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                    {payinSignatureCode}
                  </pre>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Payout Signature</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Formula: <code className="bg-muted px-1 rounded">md5(account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payout_key)</code>
                  </p>
                  <div className="flex justify-end mb-2">
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(payoutSignatureCode, 'Payout signature code')}>
                      <Copy className="h-4 w-4 mr-2" /> Copy
                    </Button>
                  </div>
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                    {payoutSignatureCode}
                  </pre>
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

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-600 dark:text-yellow-400">Important Notes</h4>
                  <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                    <li>Always verify the signature before processing callbacks</li>
                    <li>Return "ok" (plain text) to acknowledge successful receipt</li>
                    <li>Gateway will retry callbacks up to 5 times if no "ok" is received</li>
                    <li>Process callbacks idempotently to handle retries</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default HyperPayINRDocs;
