<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EloPayService
{
    protected string $apiUrl;
    protected string $merchantId;
    protected string $apiKey;
    protected string $payoutKey;
    protected string $tradeType;
    protected string $currency;
    protected string $callbackUrl;
    protected string $returnUrl;

    public function __construct(array $config)
    {
        $this->apiUrl      = rtrim($config['api_url'], '/');
        $this->merchantId  = $config['merchant_id'];
        $this->apiKey      = $config['api_key'];
        $this->payoutKey   = $config['payout_key'];
        $this->tradeType   = $config['trade_type'];
        $this->currency    = $config['currency'];
        $this->callbackUrl = $config['callback_url'];
        $this->returnUrl   = $config['return_url'];
    }

    /*
    |--------------------------------------------------------------------------
    | PAY-IN (Deposit / Collect Payment)
    |--------------------------------------------------------------------------
    */
    public function createPayin(string $orderNo, float $amount, ?string $tradeType = null, ?string $callbackUrl = null): array
    {
        $amount = number_format($amount, 2, '.', '');
        $callback = $callbackUrl ?: $this->callbackUrl;
        $trade = $tradeType ?: $this->tradeType;

        $sign = md5($this->merchantId . $amount . $orderNo . $this->apiKey . $callback);

        $payload = [
            'merchant_id'       => $this->merchantId,
            'amount'            => $amount,
            'merchant_order_no' => $orderNo,
            'callback_url'      => $callback,
            'success_url'       => $this->returnUrl,
            'trade_type'        => $trade,
            'currency'          => $this->currency,
            'sign'              => $sign,
        ];

        Log::info('[ELOPAY] Creating payin', ['order' => $orderNo, 'amount' => $amount]);

        try {
            $response = Http::timeout(30)
                ->withOptions(['allow_redirects' => true])
                ->post("{$this->apiUrl}/payin", $payload);

            $data = $response->json();

            // Extract payment URL from various response formats
            $paymentUrl = $data['data']['payment_url']
                ?? $data['payment_url']
                ?? null;

            if (!$paymentUrl && preg_match('/https?:\/\/[^\s"\'<>]+/', $response->body(), $m)) {
                $paymentUrl = $m[0];
            }

            return [
                'success'     => !empty($paymentUrl),
                'payment_url' => $paymentUrl,
                'order_no'    => $data['data']['order_no'] ?? $data['order_no'] ?? null,
                'raw'         => $data,
            ];
        } catch (\Exception $e) {
            Log::error('[ELOPAY] Payin error', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /*
    |--------------------------------------------------------------------------
    | PAY-OUT (Withdrawal / Send Payment)
    |--------------------------------------------------------------------------
    */
    public function createPayout(array $params): array
    {
        $required = ['amount', 'transaction_id', 'account_number', 'name', 'bank_name', 'ifsc'];
        foreach ($required as $field) {
            if (empty($params[$field])) {
                return ['success' => false, 'error' => "Missing required field: {$field}"];
            }
        }

        $callback = $params['callback_url'] ?? $this->callbackUrl;

        // Build signature: ASCII-sorted MD5
        $signData = [
            'account_number' => $params['account_number'],
            'amount'         => number_format((float)$params['amount'], 2, '.', ''),
            'bank_name'      => $params['bank_name'],
            'callback_url'   => $callback,
            'ifsc'           => $params['ifsc'],
            'merchant_id'    => $this->merchantId,
            'name'           => $params['name'],
            'transaction_id' => $params['transaction_id'],
        ];
        ksort($signData);
        $signStr = implode('&', array_map(fn($k, $v) => "{$k}={$v}", array_keys($signData), $signData));
        $sign = strtoupper(md5($signStr . '&key=' . $this->payoutKey));

        $payload = array_merge($signData, [
            'sign'     => $sign,
            'currency' => $this->currency,
        ]);

        Log::info('[ELOPAY] Creating payout', ['transaction_id' => $params['transaction_id']]);

        try {
            $response = Http::timeout(30)->post("{$this->apiUrl}/payout", $payload);
            $data = $response->json();

            return [
                'success' => ($data['code'] ?? '') === '200' || ($data['status'] ?? '') === 'success',
                'raw'     => $data,
            ];
        } catch (\Exception $e) {
            Log::error('[ELOPAY] Payout error', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /*
    |--------------------------------------------------------------------------
    | VERIFY CALLBACK SIGNATURE
    |--------------------------------------------------------------------------
    */
    public function verifyCallback(array $params, string $type = 'payin'): bool
    {
        $receivedSign = $params['sign'] ?? '';
        $secretKey = ($type === 'payout') ? $this->payoutKey : $this->apiKey;

        $filtered = array_filter($params, function ($v, $k) {
            return $k !== 'sign' && $v !== '' && $v !== null;
        }, ARRAY_FILTER_USE_BOTH);

        ksort($filtered);
        $parts = array_map(fn($k, $v) => "{$k}={$v}", array_keys($filtered), $filtered);
        $expectedSign = strtoupper(md5(implode('&', $parts) . '&key=' . $secretKey));

        return hash_equals($expectedSign, $receivedSign);
    }
}
