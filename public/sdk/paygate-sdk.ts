/**
 * ELOPAY SDK - TypeScript
 * Type-safe integration for Pay-in and Pay-out APIs
 * Supports INR (India), PKR (Pakistan), BDT (Bangladesh)
 * 
 * Quick Start:
 *   import PayGateSDK from './paygate-sdk';
 * 
 *   const sdk = new PayGateSDK({
 *     merchantId: 'YOUR_MERCHANT_ID',
 *     apiKey: 'YOUR_API_KEY',
 *     payoutKey: 'YOUR_PAYOUT_KEY',
 *     baseUrl: 'https://your-gateway.com/functions/v1',
 *     signatureType: 'standard'  // 'standard' for INR, 'ascii' for PKR/BDT
 *   });
 * 
 *   // Pay-in (Collect Payment)
 *   const result = await sdk.createPayin({
 *     amount: '500.00',
 *     orderNo: 'ORDER_123',
 *     callbackUrl: 'https://your-site.com/callback',
 *     tradeType: 'easypaisa'  // For PKR: easypaisa/jazzcash, BDT: nagad/bkash
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
 */

import { createHash } from 'crypto';

// ============= Types =============

export interface SDKConfig {
  merchantId: string;
  apiKey: string;
  payoutKey: string;
  baseUrl: string;
  signatureType?: 'standard' | 'ascii';  // 'standard' for INR, 'ascii' for PKR/BDT
}

export interface PayinParams {
  amount: string;
  orderNo: string;
  callbackUrl: string;
  tradeType?: string;  // PKR: easypaisa/jazzcash, BDT: nagad/bkash
  extra?: string;
}

export interface PayoutParams {
  amount: number;
  transactionId: string;
  accountNumber: string;
  name: string;
  ifsc?: string;           // Required for INR
  bankName?: string;       // Required for INR
  withdrawalMethod?: string; // PKR: easypaisa/jazzcash
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
  private signatureType: 'standard' | 'ascii';

  constructor(config: SDKConfig) {
    if (!config.merchantId) throw new Error('merchantId is required');
    if (!config.apiKey) throw new Error('apiKey is required');
    if (!config.payoutKey) throw new Error('payoutKey is required');
    if (!config.baseUrl) throw new Error('baseUrl is required');

    this.merchantId = config.merchantId;
    this.apiKey = config.apiKey;
    this.payoutKey = config.payoutKey;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.signatureType = config.signatureType || 'standard';
  }

  /**
   * Generate MD5 hash
   */
  private md5(str: string): string {
    return createHash('md5').update(str).digest('hex');
  }

  /**
   * Generate ASCII-sorted signature (for PKR/BDT)
   */
  private generateAsciiSignature(params: Record<string, any>, secretKey: string): string {
    const filtered = Object.entries(params)
      .filter(([key, value]) => value !== '' && value !== null && value !== undefined && key !== 'sign');
    
    filtered.sort(([a], [b]) => a.localeCompare(b));
    
    const queryString = filtered.map(([k, v]) => `${k}=${v}`).join('&');
    return this.md5(queryString + '&key=' + secretKey).toUpperCase();
  }

  /**
   * Create Pay-in Request (Collect Payment)
   */
  async createPayin(params: PayinParams): Promise<PayinResponse> {
    const { amount, orderNo, callbackUrl, tradeType = '', extra = '' } = params;

    if (!amount) throw new Error('amount is required');
    if (!orderNo) throw new Error('orderNo is required');
    if (!callbackUrl) throw new Error('callbackUrl is required');

    let sign: string;
    let payload: Record<string, any>;

    if (this.signatureType === 'ascii') {
      // PKR/BDT - ASCII sorted signature
      const signParams: Record<string, any> = {
        merchant_id: this.merchantId,
        amount,
        merchant_order_no: orderNo,
        callback_url: callbackUrl,
        ...(tradeType && { trade_type: tradeType }),
        ...(extra && { extra })
      };
      sign = this.generateAsciiSignature(signParams, this.apiKey);
      payload = { ...signParams, sign };
    } else {
      // INR - Standard concatenation
      const signString = this.merchantId + amount + orderNo + this.apiKey + callbackUrl;
      sign = this.md5(signString);
      payload = {
        merchant_id: this.merchantId,
        amount,
        merchant_order_no: orderNo,
        callback_url: callbackUrl,
        extra,
        sign
      };
    }

    const response = await fetch(`${this.baseUrl}/payin`, {
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
   */
  async createPayout(params: PayoutParams): Promise<PayoutResponse> {
    const { amount, transactionId, accountNumber, name, ifsc = '', bankName = '', withdrawalMethod = '', callbackUrl } = params;

    if (!amount) throw new Error('amount is required');
    if (!transactionId) throw new Error('transactionId is required');
    if (!accountNumber) throw new Error('accountNumber is required');
    if (!name) throw new Error('name is required');
    if (!callbackUrl) throw new Error('callbackUrl is required');

    let sign: string;
    let payload: Record<string, any>;

    if (this.signatureType === 'ascii') {
      // PKR/BDT - ASCII sorted signature
      const signParams: Record<string, any> = {
        merchant_id: this.merchantId,
        amount,
        transaction_id: transactionId,
        account_number: accountNumber,
        name,
        callback_url: callbackUrl,
        ...(withdrawalMethod && { withdrawal_method: withdrawalMethod })
      };
      sign = this.generateAsciiSignature(signParams, this.payoutKey);
      payload = { ...signParams, sign };
    } else {
      // INR - Standard concatenation (alphabetical order)
      if (!ifsc) throw new Error('ifsc is required for INR payout');
      if (!bankName) throw new Error('bankName is required for INR payout');
      
      const signString = accountNumber + amount + bankName + callbackUrl + ifsc + this.merchantId + name + transactionId + this.payoutKey;
      sign = this.md5(signString);
      payload = {
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
    }

    const response = await fetch(`${this.baseUrl}/payout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json() as PayoutResponse;
    if (!response.ok) throw new Error(data.message || 'Payout request failed');
    return data;
  }

  /**
   * Verify Pay-in callback signature
   */
  verifyPayinCallback(callbackData: Record<string, any>, receivedSign: string): boolean {
    if (this.signatureType === 'ascii') {
      const expectedSign = this.generateAsciiSignature(callbackData, this.apiKey);
      return expectedSign === receivedSign;
    } else {
      const { merchant_id, amount, merchant_order_no, callback_url } = callbackData;
      const signString = merchant_id + amount + merchant_order_no + this.apiKey + callback_url;
      return this.md5(signString) === receivedSign;
    }
  }

  /**
   * Verify Pay-out callback signature
   */
  verifyPayoutCallback(callbackData: Record<string, any>, receivedSign: string): boolean {
    if (this.signatureType === 'ascii') {
      const expectedSign = this.generateAsciiSignature(callbackData, this.payoutKey);
      return expectedSign === receivedSign;
    } else {
      const { account_number, amount, bank_name, callback_url, ifsc, merchant_id, name, transaction_id } = callbackData;
      const signString = account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + this.payoutKey;
      return this.md5(signString) === receivedSign;
    }
  }
}

export default PayGateSDK;
