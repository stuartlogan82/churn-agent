const crypto = require('crypto');

// Verify Salesforce webhook signature
function verifyWebhookSignature(payload, signature, secret) {
  try {
    const hmac = crypto.createHmac('sha256', secret);
    const payloadString = JSON.stringify(payload);
    hmac.update(payloadString);
    const expectedSignature = hmac.digest('base64');

    return signature === expectedSignature;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

module.exports = {
  verifyWebhookSignature
};
