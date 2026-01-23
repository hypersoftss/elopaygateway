/**
 * PayGate SDK - JavaScript
 * Simple integration for Payin and Payout APIs
 * 
 * Usage:
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

class PayGateSDK {
  constructor(config) {
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
   * Note: In Node.js, use crypto module. In browser, use a library like js-md5
   */
  async md5(str) {
    if (typeof window !== 'undefined') {
      // Browser environment - requires js-md5 library
      if (typeof md5 === 'function') {
        return md5(str);
      }
      // Fallback using SubtleCrypto (SHA-256 converted to hex)
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest('MD5', data).catch(() => null);
      
      if (!hashBuffer) {
        throw new Error('MD5 not available. Please include js-md5 library: <script src="https://cdn.jsdelivr.net/npm/js-md5@0.8.3/src/md5.min.js"></script>');
      }
      
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Node.js environment
      const crypto = require('crypto');
      return crypto.createHash('md5').update(str).digest('hex');
    }
  }

  /**
   * Create Payin Request
   * @param {Object} params
   * @param {string} params.amount - Payment amount (e.g., "500.00")
   * @param {string} params.orderNo - Your unique order number
   * @param {string} params.callbackUrl - URL to receive payment callback
   * @param {string} [params.extra] - Optional extra data
   * @returns {Promise<Object>} Payment response with payment_url
   */
  async createPayin({ amount, orderNo, callbackUrl, extra = '' }) {
    if (!amount) throw new Error('amount is required');
    if (!orderNo) throw new Error('orderNo is required');
    if (!callbackUrl) throw new Error('callbackUrl is required');

    // Generate signature: md5(merchant_id + amount + merchant_order_no + api_key + callback_url)
    const signString = this.merchantId + amount + orderNo + this.apiKey + callbackUrl;
    const sign = await this.md5(signString);

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

    return data;
  }

  /**
   * Create Payout Request
   * @param {Object} params
   * @param {number} params.amount - Payout amount
   * @param {string} params.transactionId - Your unique transaction ID
   * @param {string} params.accountNumber - Beneficiary bank account number
   * @param {string} params.ifsc - Bank IFSC code
   * @param {string} params.name - Account holder name
   * @param {string} params.bankName - Bank name
   * @param {string} params.callbackUrl - URL to receive payout callback
   * @returns {Promise<Object>} Payout response
   */
  async createPayout({ amount, transactionId, accountNumber, ifsc, name, bankName, callbackUrl }) {
    if (!amount) throw new Error('amount is required');
    if (!transactionId) throw new Error('transactionId is required');
    if (!accountNumber) throw new Error('accountNumber is required');
    if (!ifsc) throw new Error('ifsc is required');
    if (!name) throw new Error('name is required');
    if (!bankName) throw new Error('bankName is required');
    if (!callbackUrl) throw new Error('callbackUrl is required');

    // Generate signature: md5(account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payout_key)
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

    return data;
  }

  /**
   * Verify callback signature for Payin
   * @param {Object} callbackData - Callback data received
   * @param {string} receivedSign - Signature received in callback
   * @returns {Promise<boolean>} Whether signature is valid
   */
  async verifyPayinCallback(callbackData, receivedSign) {
    const { merchant_id, amount, merchant_order_no, callback_url } = callbackData;
    const signString = merchant_id + amount + merchant_order_no + this.apiKey + callback_url;
    const expectedSign = await this.md5(signString);
    return expectedSign === receivedSign;
  }

  /**
   * Verify callback signature for Payout
   * @param {Object} callbackData - Callback data received
   * @param {string} receivedSign - Signature received in callback
   * @returns {Promise<boolean>} Whether signature is valid
   */
  async verifyPayoutCallback(callbackData, receivedSign) {
    const { account_number, amount, bank_name, callback_url, ifsc, merchant_id, name, transaction_id } = callbackData;
    const signString = account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + this.payoutKey;
    const expectedSign = await this.md5(signString);
    return expectedSign === receivedSign;
  }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PayGateSDK;
} else if (typeof window !== 'undefined') {
  window.PayGateSDK = PayGateSDK;
}
