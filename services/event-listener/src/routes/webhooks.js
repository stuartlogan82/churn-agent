const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { verifyWebhookSignature } = require('../utils/webhook-validator');
const salesforceClient = require('../salesforce-client');
const { sendToChurnPrediction } = require('../churn-forwarder');

// Salesforce webhook endpoint
router.post('/salesforce', async (req, res) => {
  try {
    logger.info('Received Salesforce webhook', { body: req.body });

    // Verify webhook signature if configured
    const signature = req.headers['x-salesforce-signature'];
    if (process.env.SALESFORCE_WEBHOOK_SECRET && signature) {
      const isValid = verifyWebhookSignature(req.body, signature, process.env.SALESFORCE_WEBHOOK_SECRET);
      if (!isValid) {
        logger.warn('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Extract event data
    const eventData = req.body;
    const eventType = eventData.eventType || eventData.type;
    const accountId = eventData.accountId || eventData.AccountId;

    if (!accountId) {
      logger.warn('No accountId found in webhook payload');
      return res.status(400).json({ error: 'Missing accountId' });
    }

    logger.info(`Processing ${eventType} event for account ${accountId}`);

    // Enrich customer data from Salesforce
    const enrichedData = await enrichCustomerData(accountId, eventData);

    // Send to churn prediction service
    await sendToChurnPrediction(enrichedData);

    // Acknowledge receipt
    res.json({
      status: 'received',
      accountId,
      eventType,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook', message: error.message });
  }
});

// Enrich customer data with Salesforce information
async function enrichCustomerData(accountId, eventData) {
  try {
    logger.info(`Enriching data for account ${accountId}`);

    // Query Salesforce for account details
    const account = await salesforceClient.getAccount(accountId);

    // Get related contacts
    const contacts = await salesforceClient.getAccountContacts(accountId);

    // Get recent cases (support tickets)
    const cases = await salesforceClient.getRecentCases(accountId, 30); // Last 30 days

    // Get opportunities (including renewals)
    const opportunities = await salesforceClient.getAccountOpportunities(accountId);

    // Get usage metrics if available (custom object)
    let usageMetrics = null;
    try {
      usageMetrics = await salesforceClient.getUsageMetrics(accountId);
    } catch (err) {
      logger.warn('Could not fetch usage metrics:', err.message);
    }

    // Build enriched payload
    const enrichedData = {
      event: {
        type: eventData.eventType || eventData.type,
        timestamp: eventData.timestamp || new Date().toISOString(),
        trigger: eventData.trigger || 'Unknown',
        details: eventData
      },
      account: {
        id: account.Id,
        name: account.Name,
        industry: account.Industry,
        annualRevenue: account.AnnualRevenue,
        contractValue: account.Annual_Contract_Value__c,
        contractStartDate: account.Contract_Start_Date__c,
        contractEndDate: account.Contract_End_Date__c,
        tenureMonths: calculateTenureMonths(account.Contract_Start_Date__c),
        status: account.Account_Status__c,
        type: account.Type
      },
      contacts: contacts.map(c => ({
        id: c.Id,
        name: c.Name,
        email: c.Email,
        phone: c.Phone,
        title: c.Title,
        isPrimary: c.Primary_Contact__c
      })),
      recentActivity: {
        supportTickets: {
          total: cases.length,
          open: cases.filter(c => !c.IsClosed).length,
          escalated: cases.filter(c => c.IsEscalated).length,
          cases: cases.map(c => ({
            id: c.Id,
            subject: c.Subject,
            status: c.Status,
            priority: c.Priority,
            createdDate: c.CreatedDate,
            isEscalated: c.IsEscalated
          }))
        },
        opportunities: opportunities.map(o => ({
          id: o.Id,
          name: o.Name,
          stage: o.StageName,
          amount: o.Amount,
          closeDate: o.CloseDate,
          probability: o.Probability,
          type: o.Type
        })),
        usageMetrics: usageMetrics ? {
          lastLoginDate: usageMetrics.Last_Login_Date__c,
          activeUsers: usageMetrics.Active_Users__c,
          totalUsers: usageMetrics.Total_Users__c,
          featureUsage: usageMetrics.Feature_Usage_Score__c,
          usageTrend: usageMetrics.Usage_Trend__c
        } : null
      },
      accountRep: {
        name: account.Owner?.Name,
        email: account.Owner?.Email,
        phone: account.Owner?.Phone
      }
    };

    logger.info(`Successfully enriched data for account ${accountId}`);
    return enrichedData;

  } catch (error) {
    logger.error(`Error enriching customer data for account ${accountId}:`, error);
    throw error;
  }
}

// Calculate tenure in months
function calculateTenureMonths(startDate) {
  if (!startDate) return null;
  const start = new Date(startDate);
  const now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return months;
}

module.exports = router;
