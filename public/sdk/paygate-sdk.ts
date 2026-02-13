/**
 * ELOPAY SDK - TypeScript
 * Type-safe integration for Pay-in and Pay-out APIs
 * Supports INR (India), PKR (Pakistan), BDT (Bangladesh)
 * 
 * Quick Start:
 *   import PayGateSDK from './paygate-sdk';
 * 
 *   const sdk = new PayGateSDK({
 *     merchantId: 'YOUR_MERCHANT_ID',    // Your Account Number from dashboard
 *     apiKey: 'YOUR_API_KEY',            // Your API Key from dashboard
 *     payoutKey: 'YOUR_PAYOUT_KEY',      // Your Payout Key from dashboard
 *     baseUrl: 'https://elopaygateway.in' // Gateway domain
 *   });
 * 
 *   // Pay-in (Collect Payment)
 *   const result = await sdk.createPayin({
 *     amount: '500.00',
 *     orderNo: 'ORDER_123',
 *     callbackUrl: 'https://your-site.com/callback',
 *     tradeType: 'easypaisa'  // Optional: easypaisa/jazzcash for PKR, nagad/bkash for BDT
 *   });
 * 
 *   // Pay-out (Send Payment)
 *   const payout = await sdk.createPayout({
 *     amount: 1500,
 *     transactionId: 'TXN_123',
 *     accountNumber: '1234567890',
 *     ifsc: 'HDFC0001234',
 *     name: 'John Doe',
 *     bankName: 'HDFC Bank',
 *     callbackUrl: 'https://your-site.com/payout-callback'
 *   });
 * 
 * Signature Formula:
 *   Payin:  md5(merchant_id + amount + merchant_order_no + api_key + callback_url)
 *   Payout: md5(account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payout_key)
 */

import { createHash } from 'crypto';

// ============= Types =============

export interface SDKConfig {
  merchantId: string;    // Your Account Number from dashboard
  apiKey: string;        // Your API Key from dashboard
  payoutKey: string;     // Your Payout Key from dashboard
  baseUrl: string;       // Gateway domain (e.g. https://elopaygateway.in)
}

export interface PayinParams {
  amount: string;
  orderNo: string;
  callbackUrl: string;
  tradeType?: string;  // Optional: easypaisa/jazzcash for PKR, nagad/bkash for BDT
  extra?: string;
}

export interface PayoutParams {
  amount: number;
  transactionId: string;
  accountNumber: string;
  name: string;
  ifsc?: string;
  bankName?: string;
  callbackUrl: string;
}

export interface PayinResponse {
  code: number;
  message?: string;
  success: boolean;
  data?: {
    order_no: string;
    merchant_order_no: string;
    amount: number;
    fee: number;
    net_amount: number;
    payment_url: string;
    status: 'pending' | 'success' | 'failed';
  };
}

export interface PayoutResponse {
  code: number;
  message?: string;
  success: boolean;
  data?: {
    order_no: string;
    fee: number;
    total_amount: number;
    status: 'pending' | 'success' | 'failed';
  };
}

export interface CallbackData {
  order_no: string;
  merchant_order_no?: string;
  amount: string;
  status: 'pending' | 'success' | 'failed';
  [key: string]: any;
}

// ============= SDK Class =============

class PayGateSDK {
  private merchantId: string;
  private apiKey: string;
  private payoutKey: string;
  private baseUrl: string;

  constructor(config: SDKConfig) {
    if (!config.merchantId) throw new Error('merchantId is required');
    if (!config.apiKey) throw new Error('apiKey is required');
    if (!config.payoutKey) throw new Error('payoutKey is required');
    if (!config.baseUrl) throw new Error('baseUrl is required');

    this.merchantId = config.merchantId;
    this.apiKey = config.apiKey;
    this.payoutKey = config.payoutKey;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  /** Generate MD5 hash */
  private md5(str: string): string {
    return createHash('md5').update(str).digest('hex');
  }

  /**
   * Create Pay-in Request (Collect Payment)
   * Signature: md5(merchant_id + amount + merchant_order_no + api_key + callback_url)
   */
  async createPayin(params: PayinParams): Promise<PayinResponse> {
    const { amount, orderNo, callbackUrl, tradeType = '', extra = '' } = params;

    if (!amount) throw new Error('amount is required');
    if (!orderNo) throw new Error('orderNo is required');
    if (!callbackUrl) throw new Error('callbackUrl is required');

    const signString = this.merchantId + amount + orderNo + this.apiKey + callbackUrl;
    const sign = this.md5(signString);

    const payload: Record<string, any> = {
      merchant_id: this.merchantId,
      amount,
      merchant_order_no: orderNo,
      callback_url: callbackUrl,
      sign,
      ...(tradeType && { trade_type: tradeType }),
      ...(extra && { extra })
    };

    const response = await fetch(`${this.baseUrl}/api/payin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json() as PayinResponse;
    if (!response.ok) throw new Error(data.message || 'Payin request failed');
    return data;
  }

  /**
   * Create Pay-out Request (Send Payment)
   * Signature: md5(account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payout_key)
   */
  async createPayout(params: PayoutParams): Promise<PayoutResponse> {
    const { amount, transactionId, accountNumber, name, ifsc = '', bankName = '', callbackUrl } = params;

    if (!amount) throw new Error('amount is required');
    if (!transactionId) throw new Error('transactionId is required');
    if (!accountNumber) throw new Error('accountNumber is required');
    if (!name) throw new Error('name is required');
    if (!callbackUrl) throw new Error('callbackUrl is required');

    const signString = accountNumber + amount + bankName + callbackUrl + ifsc + this.merchantId + name + transactionId + this.payoutKey;
    const sign = this.md5(signString);

    const payload = {
      merchant_id: this.merchantId,
      amount,
      transaction_id: transactionId,
      account_number: accountNumber,
      ifsc,
      name,
      bank_name: bankName,
      callback_url: callbackUrl,
      sign
    };

    const response = await fetch(`${this.baseUrl}/api/payout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json() as PayoutResponse;
    if (!response.ok) throw new Error(data.message || 'Payout request failed');
    return data;
  }

  /** Verify Pay-in callback signature */
  verifyPayinCallback(callbackData: Record<string, any>, receivedSign: string): boolean {
    const { merchant_id, amount, merchant_order_no, callback_url } = callbackData;
    const signString = merchant_id + amount + merchant_order_no + this.apiKey + callback_url;
    return this.md5(signString) === receivedSign;
  }

  /** Verify Pay-out callback signature */
  verifyPayoutCallback(callbackData: Record<string, any>, receivedSign: string): boolean {
    const { account_number, amount, bank_name, callback_url, ifsc, merchant_id, name, transaction_id } = callbackData;
    const signString = account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + this.payoutKey;
    return this.md5(signString) === receivedSign;
  }
}

export default PayGateSDK;
