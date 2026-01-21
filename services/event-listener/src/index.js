require('dotenv').config({ path: '../../../.env' });
const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./utils/logger');
const webhookRoutes = require('./routes/webhooks');

const app = express();
const PORT = process.env.EVENT_LISTENER_PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    body: req.body,
    query: req.query
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'event-listener', timestamp: new Date().toISOString() });
});

// Webhook routes
app.use('/webhooks', webhookRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Event Listener service running on port ${PORT}`);
  logger.info('Waiting for Salesforce webhooks...');
});

module.exports = app;
