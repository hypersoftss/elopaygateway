<?php

namespace App\Http\Controllers;

use App\Services\EloPayService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class EloPayController extends Controller
{
    protected EloPayService $eloPay;

    public function __construct(EloPayService $eloPay)
    {
        $this->eloPay = $eloPay;
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE PAY-IN ORDER
    |--------------------------------------------------------------------------
    | POST /elopay/payin
    | Body: { amount: 500, order_no: "ORD_123" }
    */
    public function createPayin(Request $request)
    {
        $request->validate([
            'amount'   => 'required|numeric|min:1',
            'order_no' => 'required|string|max:64',
        ]);

        $result = $this->eloPay->createPayin(
            $request->input('order_no'),
            $request->input('amount'),
            $request->input('trade_type'),
            $request->input('callback_url')
        );

        if ($result['success']) {
            return redirect()->away($result['payment_url']);
        }

        return back()->withErrors(['payment' => 'Payment creation failed. Please try again.']);
    }

    /*
    |--------------------------------------------------------------------------
    | PAY-IN CALLBACK (Webhook)
    |--------------------------------------------------------------------------
    | POST /elopay/callback/payin
    */
    public function payinCallback(Request $request)
    {
        $params = $request->all();
        Log::info('[ELOPAY] Payin callback received', $params);

        // Verify signature
        if (!$this->eloPay->verifyCallback($params, 'payin')) {
            Log::warning('[ELOPAY] Invalid callback signature', $params);
            return response('FAIL', 400);
        }

        $orderNo = $params['merchant_order_no'] ?? '';
        $status  = strtolower($params['status'] ?? '');
        $amount  = $params['amount'] ?? 0;

        if (in_array($status, ['1', 'success', 'paid', 'completed'])) {
            // ✅ Payment successful - update your order here
            // Example:
            // Order::where('order_no', $orderNo)->update(['status' => 'paid', 'paid_amount' => $amount]);

            Log::info("[ELOPAY] Payment SUCCESS for {$orderNo} | Amount: {$amount}");
        } else {
            // ❌ Payment failed
            Log::info("[ELOPAY] Payment FAILED for {$orderNo} | Status: {$status}");
        }

        return response('SUCCESS');
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE PAYOUT ORDER
    |--------------------------------------------------------------------------
    | POST /elopay/payout
    */
    public function createPayout(Request $request)
    {
        $request->validate([
            'amount'         => 'required|numeric|min:1',
            'transaction_id' => 'required|string',
            'account_number' => 'required|string',
            'name'           => 'required|string',
            'bank_name'      => 'required|string',
            'ifsc'           => 'required|string',
        ]);

        $result = $this->eloPay->createPayout($request->all());

        return response()->json($result);
    }

    /*
    |--------------------------------------------------------------------------
    | PAYOUT CALLBACK (Webhook)
    |--------------------------------------------------------------------------
    | POST /elopay/callback/payout
    */
    public function payoutCallback(Request $request)
    {
        $params = $request->all();
        Log::info('[ELOPAY] Payout callback received', $params);

        if (!$this->eloPay->verifyCallback($params, 'payout')) {
            Log::warning('[ELOPAY] Invalid payout callback signature');
            return response('FAIL', 400);
        }

        $transactionId = $params['transaction_id'] ?? $params['merchant_order_no'] ?? '';
        $status = strtolower($params['status'] ?? '');

        if (in_array($status, ['1', 'success', 'completed'])) {
            // ✅ Payout successful
            Log::info("[ELOPAY] Payout SUCCESS: {$transactionId}");
        } else {
            // ❌ Payout failed
            Log::info("[ELOPAY] Payout FAILED: {$transactionId} | Status: {$status}");
        }

        return response('SUCCESS');
    }
}
