<?php
/**
 * PayGate SDK - PHP
 * Simple integration for Payin and Payout APIs
 * 
 * Usage:
 *   require_once 'PayGateSDK.php';
 * 
 *   $sdk = new PayGateSDK([
 *       'merchantId' => 'YOUR_MERCHANT_ID',
 *       'apiKey' => 'YOUR_API_KEY',
 *       'payoutKey' => 'YOUR_PAYOUT_KEY',
 *       'baseUrl' => 'https://your-gateway-url/functions/v1'
 *   ]);
 * 
 *   // Payin
 *   $result = $sdk->createPayin([
 *       'amount' => '500.00',
 *       'orderNo' => 'ORDER_123',
 *       'callbackUrl' => 'https://your-site.com/callback'
 *   ]);
 * 
 *   // Payout
 *   $result = $sdk->createPayout([
 *       'amount' => 150,
 *       'transactionId' => 'TXN_123',
 *       'accountNumber' => '1234567890',
 *       'ifsc' => 'HDFC0001234',
 *       'name' => 'John Doe',
 *       'bankName' => 'HDFC Bank',
 *       'callbackUrl' => 'https://your-site.com/payout-callback'
 *   ]);
 */

class PayGateSDK {
    private $merchantId;
    private $apiKey;
    private $payoutKey;
    private $baseUrl;

    /**
     * Initialize the SDK
     * 
     * @param array $config Configuration array with merchantId, apiKey, payoutKey, baseUrl
     * @throws Exception If required config is missing
     */
    public function __construct(array $config) {
        if (empty($config['merchantId'])) {
            throw new Exception('merchantId is required');
        }
        if (empty($config['apiKey'])) {
            throw new Exception('apiKey is required');
        }
        if (empty($config['payoutKey'])) {
            throw new Exception('payoutKey is required');
        }
        if (empty($config['baseUrl'])) {
            throw new Exception('baseUrl is required');
        }

        $this->merchantId = $config['merchantId'];
        $this->apiKey = $config['apiKey'];
        $this->payoutKey = $config['payoutKey'];
        $this->baseUrl = rtrim($config['baseUrl'], '/');
    }

    /**
     * Create Payin Request
     * 
     * @param array $params [amount, orderNo, callbackUrl, extra (optional)]
     * @return array API response
     * @throws Exception On validation or request failure
     */
    public function createPayin(array $params) {
        if (empty($params['amount'])) {
            throw new Exception('amount is required');
        }
        if (empty($params['orderNo'])) {
            throw new Exception('orderNo is required');
        }
        if (empty($params['callbackUrl'])) {
            throw new Exception('callbackUrl is required');
        }

        $amount = $params['amount'];
        $orderNo = $params['orderNo'];
        $callbackUrl = $params['callbackUrl'];
        $extra = isset($params['extra']) ? $params['extra'] : '';

        // Generate signature: md5(merchant_id + amount + merchant_order_no + api_key + callback_url)
        $signString = $this->merchantId . $amount . $orderNo . $this->apiKey . $callbackUrl;
        $sign = md5($signString);

        $payload = [
            'merchant_id' => $this->merchantId,
            'amount' => $amount,
            'merchant_order_no' => $orderNo,
            'callback_url' => $callbackUrl,
            'extra' => $extra,
            'sign' => $sign
        ];

        return $this->request('/payin', $payload);
    }

    /**
     * Create Payout Request
     * 
     * @param array $params [amount, transactionId, accountNumber, ifsc, name, bankName, callbackUrl]
     * @return array API response
     * @throws Exception On validation or request failure
     */
    public function createPayout(array $params) {
        $required = ['amount', 'transactionId', 'accountNumber', 'ifsc', 'name', 'bankName', 'callbackUrl'];
        foreach ($required as $field) {
            if (empty($params[$field])) {
                throw new Exception("$field is required");
            }
        }

        $amount = $params['amount'];
        $transactionId = $params['transactionId'];
        $accountNumber = $params['accountNumber'];
        $ifsc = $params['ifsc'];
        $name = $params['name'];
        $bankName = $params['bankName'];
        $callbackUrl = $params['callbackUrl'];

        // Generate signature: md5(account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payout_key)
        $signString = $accountNumber . $amount . $bankName . $callbackUrl . $ifsc . $this->merchantId . $name . $transactionId . $this->payoutKey;
        $sign = md5($signString);

        $payload = [
            'merchant_id' => $this->merchantId,
            'amount' => $amount,
            'transaction_id' => $transactionId,
            'account_number' => $accountNumber,
            'ifsc' => $ifsc,
            'name' => $name,
            'bank_name' => $bankName,
            'callback_url' => $callbackUrl,
            'sign' => $sign
        ];

        return $this->request('/payout', $payload);
    }

    /**
     * Verify Payin callback signature
     * 
     * @param array $callbackData Callback data received
     * @param string $receivedSign Signature received in callback
     * @return bool Whether signature is valid
     */
    public function verifyPayinCallback(array $callbackData, string $receivedSign): bool {
        $signString = $callbackData['merchant_id'] 
            . $callbackData['amount'] 
            . $callbackData['merchant_order_no'] 
            . $this->apiKey 
            . $callbackData['callback_url'];
        
        $expectedSign = md5($signString);
        return $expectedSign === $receivedSign;
    }

    /**
     * Verify Payout callback signature
     * 
     * @param array $callbackData Callback data received
     * @param string $receivedSign Signature received in callback
     * @return bool Whether signature is valid
     */
    public function verifyPayoutCallback(array $callbackData, string $receivedSign): bool {
        $signString = $callbackData['account_number']
            . $callbackData['amount']
            . $callbackData['bank_name']
            . $callbackData['callback_url']
            . $callbackData['ifsc']
            . $callbackData['merchant_id']
            . $callbackData['name']
            . $callbackData['transaction_id']
            . $this->payoutKey;
        
        $expectedSign = md5($signString);
        return $expectedSign === $receivedSign;
    }

    /**
     * Make HTTP request to API
     * 
     * @param string $endpoint API endpoint
     * @param array $data Request payload
     * @return array Decoded response
     * @throws Exception On request failure
     */
    private function request(string $endpoint, array $data): array {
        $url = $this->baseUrl . $endpoint;
        
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json'
            ],
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => true
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception("Request failed: $error");
        }

        $decoded = json_decode($response, true);
        
        if ($httpCode >= 400) {
            $message = isset($decoded['message']) ? $decoded['message'] : 'Request failed';
            throw new Exception($message);
        }

        return $decoded;
    }
}

// ============= Example Usage =============
/*
try {
    $sdk = new PayGateSDK([
        'merchantId' => 'YOUR_MERCHANT_ID',
        'apiKey' => 'YOUR_API_KEY',
        'payoutKey' => 'YOUR_PAYOUT_KEY',
        'baseUrl' => 'https://your-gateway/functions/v1'
    ]);

    // Create Payin
    $payin = $sdk->createPayin([
        'amount' => '1000.00',
        'orderNo' => 'ORDER_' . time(),
        'callbackUrl' => 'https://yoursite.com/callback'
    ]);
    
    echo "Payment URL: " . $payin['data']['payment_url'];
    
    // Create Payout
    $payout = $sdk->createPayout([
        'amount' => 5000,
        'transactionId' => 'WD_' . time(),
        'accountNumber' => '1234567890',
        'ifsc' => 'HDFC0001234',
        'name' => 'John Doe',
        'bankName' => 'HDFC Bank',
        'callbackUrl' => 'https://yoursite.com/payout-callback'
    ]);
    
    echo "Order No: " . $payout['data']['order_no'];

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
*/

// ============= Callback Handler Example =============
/*
// callback.php
$sdk = new PayGateSDK([...]);

$input = json_decode(file_get_contents('php://input'), true);
$sign = $input['sign'];
unset($input['sign']);

if ($sdk->verifyPayinCallback($input, $sign)) {
    // Valid callback
    if ($input['status'] === 'success') {
        // Payment successful - fulfill order
        echo "OK";
    }
} else {
    http_response_code(400);
    echo "Invalid signature";
}
*/
