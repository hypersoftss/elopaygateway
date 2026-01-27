/**
 * ELOPAY SDK - JavaScript
 * Simple integration for Pay-in and Pay-out APIs
 * Supports INR (India), PKR (Pakistan), BDT (Bangladesh)
 * 
 * Quick Start:
 *   const sdk = new PayGateSDK({
 *     merchantId: 'YOUR_MERCHANT_ID',
 *     apiKey: 'YOUR_API_KEY',
 *     payoutKey: 'YOUR_PAYOUT_KEY',
 *     baseUrl: 'https://your-gateway.com/functions/v1'
 *   });
 * 
 *   // Collect Payment (Pay-in)
 *   const result = await sdk.createPayin({
 *     amount: '500.00',
 *     orderNo: 'ORDER_123',
 *     callbackUrl: 'https://your-site.com/callback',
 *     tradeType: 'easypaisa'  // For PKR: easypaisa/jazzcash, BDT: nagad/bkash
 *   });
 *   console.log(result.data.payment_url);
 * 
 *   // Send Payment (Pay-out)
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

class PayGateSDK {
  /**
   * Initialize ELOPAY SDK
   * @param {Object} config - Configuration object
   * @param {string} config.merchantId - Your Merchant ID (Account Number)
   * @param {string} config.apiKey - API Key for Pay-in requests
   * @param {string} config.payoutKey - Payout Key for Pay-out requests
   * @param {string} config.baseUrl - Gateway API base URL
   * @param {string} [config.signatureType='standard'] - 'standard' for INR, 'ascii' for PKR/BDT
   */
  constructor(config) {
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
   * Browser: requires js-md5 library
   * Node.js: uses built-in crypto
   */
  async md5(str) {
    if (typeof window !== 'undefined') {
      // Browser - check for md5 function
      if (typeof md5 === 'function') {
        return md5(str);
      }
      throw new Error('MD5 not available. Add: <script src="https://cdn.jsdelivr.net/npm/js-md5@0.8.3/src/md5.min.js"></script>');
    } else {
      // Node.js
      const crypto = require('crypto');
      return crypto.createHash('md5').update(str).digest('hex');
    }
  }

  /**
   * Generate ASCII-sorted signature (for PKR/BDT)
   * @param {Object} params - Request parameters
   * @param {string} secretKey - API key or Payout key
   * @returns {Promise<string>} Uppercase MD5 signature
   */
  async generateAsciiSignature(params, secretKey) {
    // Filter empty values and 'sign' key
    const filtered = Object.entries(params)
      .filter(([key, value]) => value !== '' && value !== null && value !== undefined && key !== 'sign');
    
    // Sort by ASCII
    filtered.sort(([a], [b]) => a.localeCompare(b));
    
    // Create query string
    const queryString = filtered.map(([k, v]) => `${k}=${v}`).join('&');
    
    // Append key and hash
    const hash = await this.md5(queryString + '&key=' + secretKey);
    return hash.toUpperCase();
  }

  /**
   * Generate standard signature (for INR)
   * @param {string} signString - Concatenated parameters
   * @returns {Promise<string>} MD5 hash
   */
  async generateStandardSignature(signString) {
    return await this.md5(signString);
  }

  /**
   * Create Pay-in Request (Collect Payment)
   * @param {Object} params
   * @param {string} params.amount - Payment amount
   * @param {string} params.orderNo - Your unique order number
   * @param {string} params.callbackUrl - Callback URL for notifications
   * @param {string} [params.tradeType] - Payment method (PKR: easypaisa/jazzcash, BDT: nagad/bkash)
   * @param {string} [params.extra] - Optional extra data
   * @returns {Promise<Object>} Payment response with payment_url
   */
  async createPayin({ amount, orderNo, callbackUrl, tradeType = '', extra = '' }) {
    if (!amount) throw new Error('amount is required');
    if (!orderNo) throw new Error('orderNo is required');
    if (!callbackUrl) throw new Error('callbackUrl is required');

    let sign;
    let payload;

    if (this.signatureType === 'ascii') {
      // PKR/BDT - ASCII sorted signature
      const params = {
        merchant_id: this.merchantId,
        amount: amount,
        merchant_order_no: orderNo,
        callback_url: callbackUrl,
        ...(tradeType && { trade_type: tradeType }),
        ...(extra && { extra: extra })
      };
      sign = await this.generateAsciiSignature(params, this.apiKey);
      payload = { ...params, sign };
    } else {
      // INR - Standard concatenation
      const signString = this.merchantId + amount + orderNo + this.apiKey + callbackUrl;
      sign = await this.generateStandardSignature(signString);
      payload = {
        merchant_id: this.merchantId,
        amount: amount,
        merchant_order_no: orderNo,
        callback_url: callbackUrl,
        extra: extra,
        sign: sign
      };
    }

    const response = await fetch(`${this.baseUrl}/payin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Payin request failed');
    return data;
  }

  /**
   * Create Pay-out Request (Send Payment)
   * @param {Object} params
   * @param {number} params.amount - Payout amount
   * @param {string} params.transactionId - Your unique transaction ID
   * @param {string} params.accountNumber - Beneficiary account/mobile number
   * @param {string} params.name - Account holder name
   * @param {string} [params.ifsc] - Bank IFSC code (required for INR)
   * @param {string} [params.bankName] - Bank name (required for INR)
   * @param {string} [params.withdrawalMethod] - Payment method (PKR: easypaisa/jazzcash)
   * @param {string} params.callbackUrl - Callback URL
   * @returns {Promise<Object>} Payout response
   */
  async createPayout({ amount, transactionId, accountNumber, name, ifsc = '', bankName = '', withdrawalMethod = '', callbackUrl }) {
    if (!amount) throw new Error('amount is required');
    if (!transactionId) throw new Error('transactionId is required');
    if (!accountNumber) throw new Error('accountNumber is required');
    if (!name) throw new Error('name is required');
    if (!callbackUrl) throw new Error('callbackUrl is required');

    let sign;
    let payload;

    if (this.signatureType === 'ascii') {
      // PKR/BDT - ASCII sorted signature
      const params = {
        merchant_id: this.merchantId,
        amount: amount,
        transaction_id: transactionId,
        account_number: accountNumber,
        name: name,
        callback_url: callbackUrl,
        ...(withdrawalMethod && { withdrawal_method: withdrawalMethod })
      };
      sign = await this.generateAsciiSignature(params, this.payoutKey);
      payload = { ...params, sign };
    } else {
      // INR - Standard concatenation (alphabetical order)
      if (!ifsc) throw new Error('ifsc is required for INR payout');
      if (!bankName) throw new Error('bankName is required for INR payout');
      
      const signString = accountNumber + amount + bankName + callbackUrl + ifsc + this.merchantId + name + transactionId + this.payoutKey;
      sign = await this.generateStandardSignature(signString);
      payload = {
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
    }

    const response = await fetch(`${this.baseUrl}/payout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Payout request failed');
    return data;
  }

  /**
   * Verify Pay-in callback signature
   * @param {Object} callbackData - Callback data received
   * @param {string} receivedSign - Signature received
   * @returns {Promise<boolean>} True if valid
   */
  async verifyPayinCallback(callbackData, receivedSign) {
    if (this.signatureType === 'ascii') {
      const expectedSign = await this.generateAsciiSignature(callbackData, this.apiKey);
      return expectedSign === receivedSign;
    } else {
      const { merchant_id, amount, merchant_order_no, callback_url } = callbackData;
      const signString = merchant_id + amount + merchant_order_no + this.apiKey + callback_url;
      const expectedSign = await this.generateStandardSignature(signString);
      return expectedSign === receivedSign;
    }
  }

  /**
   * Verify Pay-out callback signature
   * @param {Object} callbackData - Callback data received
   * @param {string} receivedSign - Signature received
   * @returns {Promise<boolean>} True if valid
   */
  async verifyPayoutCallback(callbackData, receivedSign) {
    if (this.signatureType === 'ascii') {
      const expectedSign = await this.generateAsciiSignature(callbackData, this.payoutKey);
      return expectedSign === receivedSign;
    } else {
      const { account_number, amount, bank_name, callback_url, ifsc, merchant_id, name, transaction_id } = callbackData;
      const signString = account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + this.payoutKey;
      const expectedSign = await this.generateStandardSignature(signString);
      return expectedSign === receivedSign;
    }
  }
}

// Export for Node.js and Browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PayGateSDK;
} else if (typeof window !== 'undefined') {
  window.PayGateSDK = PayGateSDK;
}
