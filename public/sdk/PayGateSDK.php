<?php
/**
 * ELOPAY SDK - PHP
 * Simple integration for Pay-in and Pay-out APIs
 * Supports INR (India), PKR (Pakistan), BDT (Bangladesh)
 * 
 * Quick Start:
 *   $sdk = new PayGateSDK([
 *       'merchantId' => 'YOUR_MERCHANT_ID',
 *       'apiKey' => 'YOUR_API_KEY',
 *       'payoutKey' => 'YOUR_PAYOUT_KEY',
 *       'baseUrl' => 'https://your-gateway.com/functions/v1',
 *       'signatureType' => 'standard'  // 'standard' for INR, 'ascii' for PKR/BDT
 *   ]);
 * 
 *   // Collect Payment (Pay-in)
 *   $result = $sdk->createPayin([
 *       'amount' => '500.00',
 *       'orderNo' => 'ORDER_123',
 *       'callbackUrl' => 'https://your-site.com/callback',
 *       'tradeType' => 'easypaisa'  // For PKR/BDT only
 *   ]);
 *   
 *   // Redirect to payment page
 *   header('Location: ' . $result['data']['payment_url']);
 */

class PayGateSDK {
    private $merchantId;
    private $apiKey;
    private $payoutKey;
    private $baseUrl;
    private $signatureType;

    /**
     * Initialize SDK
     * @param array $config Configuration array
     */
    public function __construct(array $config) {
        if (empty($config['merchantId'])) throw new Exception('merchantId is required');
        if (empty($config['apiKey'])) throw new Exception('apiKey is required');
        if (empty($config['payoutKey'])) throw new Exception('payoutKey is required');
        if (empty($config['baseUrl'])) throw new Exception('baseUrl is required');

        $this->merchantId = $config['merchantId'];
        $this->apiKey = $config['apiKey'];
        $this->payoutKey = $config['payoutKey'];
        $this->baseUrl = rtrim($config['baseUrl'], '/');
        $this->signatureType = $config['signatureType'] ?? 'standard';
    }

    /**
     * Generate ASCII-sorted signature (for PKR/BDT)
     */
    private function generateAsciiSignature(array $params, string $secretKey): string {
        // Filter empty values and 'sign' key
        $filtered = array_filter($params, function($value, $key) {
            return $value !== '' && $value !== null && $key !== 'sign';
        }, ARRAY_FILTER_USE_BOTH);

        // Sort by key (ASCII order)
        ksort($filtered, SORT_STRING);

        // Create query string
        $queryString = http_build_query($filtered);

        // Append key and hash
        return strtoupper(md5($queryString . '&key=' . $secretKey));
    }

    /**
     * Create Pay-in Request (Collect Payment)
     * 
     * @param array $params [amount, orderNo, callbackUrl, tradeType?, extra?]
     * @return array Response data
     */
    public function createPayin(array $params): array {
        if (empty($params['amount'])) throw new Exception('amount is required');
        if (empty($params['orderNo'])) throw new Exception('orderNo is required');
        if (empty($params['callbackUrl'])) throw new Exception('callbackUrl is required');

        $amount = $params['amount'];
        $orderNo = $params['orderNo'];
        $callbackUrl = $params['callbackUrl'];
        $tradeType = $params['tradeType'] ?? '';
        $extra = $params['extra'] ?? '';

        if ($this->signatureType === 'ascii') {
            // PKR/BDT - ASCII sorted signature
            $signParams = [
                'merchant_id' => $this->merchantId,
                'amount' => $amount,
                'merchant_order_no' => $orderNo,
                'callback_url' => $callbackUrl,
            ];
            if ($tradeType) $signParams['trade_type'] = $tradeType;
            if ($extra) $signParams['extra'] = $extra;
            
            $sign = $this->generateAsciiSignature($signParams, $this->apiKey);
            $payload = array_merge($signParams, ['sign' => $sign]);
        } else {
            // INR - Standard concatenation
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
        }

        return $this->sendRequest('/payin', $payload);
    }

    /**
     * Create Pay-out Request (Send Payment)
     * 
     * @param array $params [amount, transactionId, accountNumber, name, ifsc?, bankName?, withdrawalMethod?, callbackUrl]
     * @return array Response data
     */
    public function createPayout(array $params): array {
        if (empty($params['amount'])) throw new Exception('amount is required');
        if (empty($params['transactionId'])) throw new Exception('transactionId is required');
        if (empty($params['accountNumber'])) throw new Exception('accountNumber is required');
        if (empty($params['name'])) throw new Exception('name is required');
        if (empty($params['callbackUrl'])) throw new Exception('callbackUrl is required');

        $amount = $params['amount'];
        $transactionId = $params['transactionId'];
        $accountNumber = $params['accountNumber'];
        $name = $params['name'];
        $ifsc = $params['ifsc'] ?? '';
        $bankName = $params['bankName'] ?? '';
        $withdrawalMethod = $params['withdrawalMethod'] ?? '';
        $callbackUrl = $params['callbackUrl'];

        if ($this->signatureType === 'ascii') {
            // PKR/BDT - ASCII sorted signature
            $signParams = [
                'merchant_id' => $this->merchantId,
                'amount' => $amount,
                'transaction_id' => $transactionId,
                'account_number' => $accountNumber,
                'name' => $name,
                'callback_url' => $callbackUrl,
            ];
            if ($withdrawalMethod) $signParams['withdrawal_method'] = $withdrawalMethod;
            
            $sign = $this->generateAsciiSignature($signParams, $this->payoutKey);
            $payload = array_merge($signParams, ['sign' => $sign]);
        } else {
            // INR - Standard concatenation (alphabetical order)
            if (empty($ifsc)) throw new Exception('ifsc is required for INR payout');
            if (empty($bankName)) throw new Exception('bankName is required for INR payout');

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
        }

        return $this->sendRequest('/payout', $payload);
    }

    /**
     * Verify Pay-in callback signature
     */
    public function verifyPayinCallback(array $callbackData, string $receivedSign): bool {
        if ($this->signatureType === 'ascii') {
            $expectedSign = $this->generateAsciiSignature($callbackData, $this->apiKey);
            return $expectedSign === $receivedSign;
        } else {
            $signString = $callbackData['merchant_id'] . $callbackData['amount'] . 
                          $callbackData['merchant_order_no'] . $this->apiKey . $callbackData['callback_url'];
            return md5($signString) === $receivedSign;
        }
    }

    /**
     * Verify Pay-out callback signature
     */
    public function verifyPayoutCallback(array $callbackData, string $receivedSign): bool {
        if ($this->signatureType === 'ascii') {
            $expectedSign = $this->generateAsciiSignature($callbackData, $this->payoutKey);
            return $expectedSign === $receivedSign;
        } else {
            $signString = $callbackData['account_number'] . $callbackData['amount'] . 
                          $callbackData['bank_name'] . $callbackData['callback_url'] . 
                          $callbackData['ifsc'] . $callbackData['merchant_id'] . 
                          $callbackData['name'] . $callbackData['transaction_id'] . $this->payoutKey;
            return md5($signString) === $receivedSign;
        }
    }

    /**
     * Send HTTP request to API
     */
    private function sendRequest(string $endpoint, array $payload): array {
        $ch = curl_init($this->baseUrl . $endpoint);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json'
            ],
            CURLOPT_TIMEOUT => 30
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception('Request failed: ' . $error);
        }

        $data = json_decode($response, true);
        if ($httpCode >= 400) {
            throw new Exception($data['message'] ?? 'Request failed with code ' . $httpCode);
        }

        return $data;
    }
}

// === USAGE EXAMPLES ===

/*
// 1. Initialize SDK (INR - India)
$sdk = new PayGateSDK([
    'merchantId' => 'YOUR_MERCHANT_ID',
    'apiKey' => 'YOUR_API_KEY',
    'payoutKey' => 'YOUR_PAYOUT_KEY',
    'baseUrl' => 'https://your-gateway.com/functions/v1',
    'signatureType' => 'standard'
]);

// 2. Initialize SDK (PKR/BDT - Pakistan/Bangladesh)
$sdk = new PayGateSDK([
    'merchantId' => 'YOUR_MERCHANT_ID',
    'apiKey' => 'YOUR_API_KEY',
    'payoutKey' => 'YOUR_PAYOUT_KEY',
    'baseUrl' => 'https://your-gateway.com/functions/v1',
    'signatureType' => 'ascii'  // Required for PKR/BDT
]);

// 3. Create Pay-in (INR)
try {
    $result = $sdk->createPayin([
        'amount' => '500.00',
        'orderNo' => 'ORDER_' . time(),
        'callbackUrl' => 'https://yoursite.com/callback'
    ]);
    
    if ($result['success']) {
        header('Location: ' . $result['data']['payment_url']);
        exit;
    }
} catch (Exception $e) {
    echo 'Error: ' . $e->getMessage();
}

// 4. Create Pay-in (PKR - Easypaisa)
$result = $sdk->createPayin([
    'amount' => '5000.00',
    'orderNo' => 'ORDER_' . time(),
    'callbackUrl' => 'https://yoursite.com/callback',
    'tradeType' => 'easypaisa'  // or 'jazzcash'
]);

// 5. Create Pay-in (BDT - Nagad)
$result = $sdk->createPayin([
    'amount' => '2000.00',
    'orderNo' => 'ORDER_' . time(),
    'callbackUrl' => 'https://yoursite.com/callback',
    'tradeType' => 'nagad'  // or 'bkash'
]);

// 6. Create Pay-out (INR - Bank Transfer)
$result = $sdk->createPayout([
    'amount' => 1500,
    'transactionId' => 'TXN_' . time(),
    'accountNumber' => '1234567890',
    'ifsc' => 'HDFC0001234',
    'name' => 'Rahul Sharma',
    'bankName' => 'HDFC Bank',
    'callbackUrl' => 'https://yoursite.com/payout-callback'
]);

// 7. Create Pay-out (PKR - Easypaisa)
$result = $sdk->createPayout([
    'amount' => 5000,
    'transactionId' => 'TXN_' . time(),
    'accountNumber' => '03001234567',
    'name' => 'Muhammad Ali',
    'withdrawalMethod' => 'easypaisa',
    'callbackUrl' => 'https://yoursite.com/payout-callback'
]);

// 8. Handle Callback
$callbackData = json_decode(file_get_contents('php://input'), true);
$sign = $callbackData['sign'];
unset($callbackData['sign']);

if ($sdk->verifyPayinCallback($callbackData, $sign)) {
    // Valid callback - process it
    if ($callbackData['status'] === 'success') {
        // Update order status in database
    }
    echo 'ok';
} else {
    http_response_code(400);
    echo 'Invalid signature';
}
*/
