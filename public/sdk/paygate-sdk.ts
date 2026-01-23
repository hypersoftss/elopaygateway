/**
 * PayGate SDK - TypeScript
 * Simple integration for Payin and Payout APIs
 * 
 * Usage:
 *   import PayGateSDK from './paygate-sdk';
 * 
 *   const sdk = new PayGateSDK({
 *     merchantId: 'YOUR_MERCHANT_ID',
 *     apiKey: 'YOUR_API_KEY',
 *     payoutKey: 'YOUR_PAYOUT_KEY',
 *     baseUrl: 'https://your-gateway-url/functions/v1'
 *   });
 * 
 *   // Payin
 *   const payinResult = await sdk.createPayin({
 *     amount: '500.00',
 *     orderNo: 'ORDER_123',
 *     callbackUrl: 'https://your-site.com/callback'
 *   });
 * 
 *   // Payout
 *   const payoutResult = await sdk.createPayout({
 *     amount: 150,
 *     transactionId: 'TXN_123',
 *     accountNumber: '1234567890',
 *     ifsc: 'HDFC0001234',
 *     name: 'John Doe',
 *     bankName: 'HDFC Bank',
 *     callbackUrl: 'https://your-site.com/payout-callback'
 *   });
 */

import { createHash } from 'crypto';

// ============= Types =============

export interface SDKConfig {
  merchantId: string;
  apiKey: string;
  payoutKey: string;
  baseUrl: string;
}

export interface PayinParams {
  amount: string;
  orderNo: string;
  callbackUrl: string;
  extra?: string;
}

export interface PayoutParams {
  amount: number;
  transactionId: string;
  accountNumber: string;
  ifsc: string;
  name: string;
  bankName: string;
  callbackUrl: string;
}

export interface PayinResponse {
  code: number;
  message: string;
  success: boolean;
  data: {
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
  message: string;
  success: boolean;
  data: {
    order_no: string;
    fee: number;
    total_amount: number;
    status: 'pending' | 'success' | 'failed';
  };
}

export interface PayinCallbackData {
  merchant_id: string;
  order_no: string;
  merchant_order_no: string;
  amount: number;
  status: 'success' | 'failed';
  callback_url: string;
}

export interface PayoutCallbackData {
  merchant_id: string;
  order_no: string;
  transaction_id: string;
  amount: number;
  account_number: string;
  ifsc: string;
  name: string;
  bank_name: string;
  callback_url: string;
  status: 'success' | 'failed';
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
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Generate MD5 hash
   */
  private md5(str: string): string {
    return createHash('md5').update(str).digest('hex');
  }

  /**
   * Create Payin Request
   */
  async createPayin(params: PayinParams): Promise<PayinResponse> {
    const { amount, orderNo, callbackUrl, extra = '' } = params;

    if (!amount) throw new Error('amount is required');
    if (!orderNo) throw new Error('orderNo is required');
    if (!callbackUrl) throw new Error('callbackUrl is required');

    // Generate signature: md5(merchant_id + amount + merchant_order_no + api_key + callback_url)
    const signString = this.merchantId + amount + orderNo + this.apiKey + callbackUrl;
    const sign = this.md5(signString);

    const payload = {
      merchant_id: this.merchantId,
      amount: amount,
      merchant_order_no: orderNo,
      callback_url: callbackUrl,
      extra: extra,
      sign: sign
    };

    const response = await fetch(`${this.baseUrl}/payin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Payin request failed');
    }

    return data as PayinResponse;
  }

  /**
   * Create Payout Request
   */
  async createPayout(params: PayoutParams): Promise<PayoutResponse> {
    const { amount, transactionId, accountNumber, ifsc, name, bankName, callbackUrl } = params;

    if (!amount) throw new Error('amount is required');
    if (!transactionId) throw new Error('transactionId is required');
    if (!accountNumber) throw new Error('accountNumber is required');
    if (!ifsc) throw new Error('ifsc is required');
    if (!name) throw new Error('name is required');
    if (!bankName) throw new Error('bankName is required');
    if (!callbackUrl) throw new Error('callbackUrl is required');

    // Generate signature: md5(account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payout_key)
    const signString = accountNumber + amount + bankName + callbackUrl + ifsc + this.merchantId + name + transactionId + this.payoutKey;
    const sign = this.md5(signString);

    const payload = {
      merchant_id: this.merchantId,
      amount: amount,
      transaction_id: transactionId,
      account_number: accountNumber,
      ifsc: ifsc,
      name: name,
      bank_name: bankName,
      callback_url: callbackUrl,
      sign: sign
    };

    const response = await fetch(`${this.baseUrl}/payout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Payout request failed');
    }

    return data as PayoutResponse;
  }

  /**
   * Verify callback signature for Payin
   */
  verifyPayinCallback(callbackData: PayinCallbackData, receivedSign: string): boolean {
    const { merchant_id, amount, merchant_order_no, callback_url } = callbackData;
    const signString = merchant_id + amount + merchant_order_no + this.apiKey + callback_url;
    const expectedSign = this.md5(signString);
    return expectedSign === receivedSign;
  }

  /**
   * Verify callback signature for Payout
   */
  verifyPayoutCallback(callbackData: PayoutCallbackData, receivedSign: string): boolean {
    const { account_number, amount, bank_name, callback_url, ifsc, merchant_id, name, transaction_id } = callbackData;
    const signString = account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + this.payoutKey;
    const expectedSign = this.md5(signString);
    return expectedSign === receivedSign;
  }
}

export default PayGateSDK;
