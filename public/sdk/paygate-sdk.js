/**
 * ELOPAY SDK - JavaScript
 * Simple integration for Pay-in and Pay-out APIs
 * Supports INR (India), PKR (Pakistan), BDT (Bangladesh)
 * 
 * Quick Start:
 *   const sdk = new PayGateSDK({
 *     merchantId: 'YOUR_MERCHANT_ID',    // Your Account Number from dashboard
 *     apiKey: 'YOUR_API_KEY',            // Your API Key from dashboard
 *     payoutKey: 'YOUR_PAYOUT_KEY',      // Your Payout Key from dashboard
 *     baseUrl: 'https://elopaygateway.in' // Gateway domain
 *   });
 * 
 *   // Collect Payment (Pay-in)
 *   const result = await sdk.createPayin({
 *     amount: '500.00',
 *     orderNo: 'ORDER_123',
 *     callbackUrl: 'https://your-site.com/callback',
 *     tradeType: 'easypaisa'  // Optional: easypaisa/jazzcash for PKR, nagad/bkash for BDT
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
 * 
 * Signature Formula:
 *   Payin:  md5(merchant_id + amount + merchant_order_no + api_key + callback_url)
 *   Payout: md5(account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payout_key)
 */

class PayGateSDK {
  /**
   * Initialize ELOPAY SDK
   * @param {Object} config
   * @param {string} config.merchantId - Your Merchant ID (Account Number from dashboard)
   * @param {string} config.apiKey - API Key from dashboard
   * @param {string} config.payoutKey - Payout Key from dashboard
   * @param {string} config.baseUrl - Gateway domain (e.g. https://elopaygateway.in)
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
  }

  /**
   * Generate MD5 hash
   * Browser: requires js-md5 library
   * Node.js: uses built-in crypto
   */
  async md5(str) {
    if (typeof window !== 'undefined') {
      if (typeof md5 === 'function') {
        return md5(str);
      }
      throw new Error('MD5 not available. Add: <script src="https://cdn.jsdelivr.net/npm/js-md5@0.8.3/src/md5.min.js"></script>');
    } else {
      const crypto = require('crypto');
      return crypto.createHash('md5').update(str).digest('hex');
    }
  }

  /**
   * Create Pay-in Request (Collect Payment)
   * Signature: md5(merchant_id + amount + merchant_order_no + api_key + callback_url)
   * @param {Object} params
   * @param {string} params.amount - Payment amount (e.g. '500.00')
   * @param {string} params.orderNo - Your unique order number
   * @param {string} params.callbackUrl - Callback URL for payment notifications
   * @param {string} [params.tradeType] - Optional: easypaisa/jazzcash (PKR), nagad/bkash (BDT)
   * @param {string} [params.extra] - Optional extra data
   * @returns {Promise<Object>} Payment response with payment_url
   */
  async createPayin({ amount, orderNo, callbackUrl, tradeType = '', extra = '' }) {
    if (!amount) throw new Error('amount is required');
    if (!orderNo) throw new Error('orderNo is required');
    if (!callbackUrl) throw new Error('callbackUrl is required');

    const signString = this.merchantId + amount + orderNo + this.apiKey + callbackUrl;
    const sign = await this.md5(signString);

    const payload = {
      merchant_id: this.merchantId,
      amount: amount,
      merchant_order_no: orderNo,
      callback_url: callbackUrl,
      sign: sign,
      ...(tradeType && { trade_type: tradeType }),
      ...(extra && { extra: extra })
    };

    const response = await fetch(`${this.baseUrl}/api/payin`, {
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
   * Signature: md5(account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payout_key)
   * @param {Object} params
   * @param {number} params.amount - Payout amount
   * @param {string} params.transactionId - Your unique transaction ID
   * @param {string} params.accountNumber - Beneficiary account/mobile number
   * @param {string} params.name - Account holder name
   * @param {string} [params.ifsc] - Bank IFSC code (required for INR)
   * @param {string} [params.bankName] - Bank name (required for INR)
   * @param {string} params.callbackUrl - Callback URL
   * @returns {Promise<Object>} Payout response
   */
  async createPayout({ amount, transactionId, accountNumber, name, ifsc = '', bankName = '', callbackUrl }) {
    if (!amount) throw new Error('amount is required');
    if (!transactionId) throw new Error('transactionId is required');
    if (!accountNumber) throw new Error('accountNumber is required');
    if (!name) throw new Error('name is required');
    if (!callbackUrl) throw new Error('callbackUrl is required');

    const signString = accountNumber + amount + bankName + callbackUrl + ifsc + this.merchantId + name + transactionId + this.payoutKey;
    const sign = await this.md5(signString);

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

    const response = await fetch(`${this.baseUrl}/api/payout`, {
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
   * @param {string} receivedSign - Signature received in callback
   * @returns {Promise<boolean>} True if valid
   */
  async verifyPayinCallback(callbackData, receivedSign) {
    const { merchant_id, amount, merchant_order_no, callback_url } = callbackData;
    const signString = merchant_id + amount + merchant_order_no + this.apiKey + callback_url;
    const expectedSign = await this.md5(signString);
    return expectedSign === receivedSign;
  }

  /**
   * Verify Pay-out callback signature
   * @param {Object} callbackData - Callback data received
   * @param {string} receivedSign - Signature received in callback
   * @returns {Promise<boolean>} True if valid
   */
  async verifyPayoutCallback(callbackData, receivedSign) {
    const { account_number, amount, bank_name, callback_url, ifsc, merchant_id, name, transaction_id } = callbackData;
    const signString = account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + this.payoutKey;
    const expectedSign = await this.md5(signString);
    return expectedSign === receivedSign;
  }
}

// Export for Node.js and Browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PayGateSDK;
} else if (typeof window !== 'undefined') {
  window.PayGateSDK = PayGateSDK;
}
