const axios = require('axios');
const logger = require('./utils/logger');

const CHURN_PREDICTION_URL = process.env.CHURN_PREDICTION_URL || 'http://localhost:3001';

// Send enriched data to churn prediction service
async function sendToChurnPrediction(enrichedData) {
  try {
    logger.info('Forwarding data to churn prediction service');

    const response = await axios.post(`${CHURN_PREDICTION_URL}/predict`, enrichedData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    logger.info('Successfully sent data to churn prediction service', {
      accountId: enrichedData.account.id,
      responseStatus: response.status
    });

    return response.data;

  } catch (error) {
    logger.error('Error forwarding to churn prediction service:', error.message);
    if (error.response) {
      logger.error('Response data:', error.response.data);
    }
    throw error;
  }
}

module.exports = {
  sendToChurnPrediction
};
