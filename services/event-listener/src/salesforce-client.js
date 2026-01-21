const jsforce = require('jsforce');
const logger = require('./utils/logger');

class SalesforceClient {
  constructor() {
    this.conn = null;
    this.isConnected = false;
  }

  // Initialize connection to Salesforce
  async connect() {
    try {
      logger.info('Connecting to Salesforce...');

      this.conn = new jsforce.Connection({
        loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
      });

      await this.conn.login(
        process.env.SALESFORCE_USERNAME,
        process.env.SALESFORCE_PASSWORD + process.env.SALESFORCE_SECURITY_TOKEN
      );

      this.isConnected = true;
      logger.info('Successfully connected to Salesforce');

    } catch (error) {
      logger.error('Failed to connect to Salesforce:', error);
      this.isConnected = false;
      throw error;
    }
  }

  // Ensure connection is active
  async ensureConnection() {
    if (!this.isConnected || !this.conn) {
      await this.connect();
    }
  }

  // Get account details
  async getAccount(accountId) {
    await this.ensureConnection();

    try {
      const account = await this.conn.sobject('Account')
        .select('Id, Name, Industry, AnnualRevenue, Annual_Contract_Value__c, Contract_Start_Date__c, Contract_End_Date__c, Account_Status__c, Type, OwnerId, Owner.Name, Owner.Email, Owner.Phone')
        .where({ Id: accountId })
        .execute();

      if (!account || account.length === 0) {
        throw new Error(`Account ${accountId} not found`);
      }

      return account[0];
    } catch (error) {
      logger.error(`Error fetching account ${accountId}:`, error);
      throw error;
    }
  }

  // Get account contacts
  async getAccountContacts(accountId) {
    await this.ensureConnection();

    try {
      const contacts = await this.conn.sobject('Contact')
        .select('Id, Name, Email, Phone, Title, Primary_Contact__c')
        .where({ AccountId: accountId })
        .execute();

      return contacts || [];
    } catch (error) {
      logger.error(`Error fetching contacts for account ${accountId}:`, error);
      return [];
    }
  }

  // Get recent cases (support tickets)
  async getRecentCases(accountId, days = 30) {
    await this.ensureConnection();

    try {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);
      const dateStr = dateThreshold.toISOString();

      const cases = await this.conn.sobject('Case')
        .select('Id, CaseNumber, Subject, Status, Priority, CreatedDate, IsClosed, IsEscalated')
        .where({
          AccountId: accountId,
          CreatedDate: { $gte: jsforce.Date.toLiteral(dateStr) }
        })
        .sort({ CreatedDate: -1 })
        .execute();

      return cases || [];
    } catch (error) {
      logger.error(`Error fetching cases for account ${accountId}:`, error);
      return [];
    }
  }

  // Get account opportunities
  async getAccountOpportunities(accountId) {
    await this.ensureConnection();

    try {
      const opportunities = await this.conn.sobject('Opportunity')
        .select('Id, Name, StageName, Amount, CloseDate, Probability, Type')
        .where({
          AccountId: accountId,
          IsClosed: false
        })
        .sort({ CloseDate: 1 })
        .execute();

      return opportunities || [];
    } catch (error) {
      logger.error(`Error fetching opportunities for account ${accountId}:`, error);
      return [];
    }
  }

  // Get usage metrics (custom object - may not exist in all orgs)
  async getUsageMetrics(accountId) {
    await this.ensureConnection();

    try {
      const metrics = await this.conn.sobject('Usage_Metrics__c')
        .select('Id, Last_Login_Date__c, Active_Users__c, Total_Users__c, Feature_Usage_Score__c, Usage_Trend__c')
        .where({ Account__c: accountId })
        .sort({ CreatedDate: -1 })
        .limit(1)
        .execute();

      return metrics && metrics.length > 0 ? metrics[0] : null;
    } catch (error) {
      // This object may not exist, so just log as info
      logger.info(`Usage metrics not available for account ${accountId}`);
      return null;
    }
  }

  // Update account with churn risk data
  async updateAccountChurnRisk(accountId, churnData) {
    await this.ensureConnection();

    try {
      await this.conn.sobject('Account').update({
        Id: accountId,
        Churn_Risk_Score__c: churnData.score,
        Churn_Risk_Level__c: churnData.level,
        Churn_Risk_Factors__c: churnData.factors.join('; '),
        Last_Churn_Evaluation__c: new Date().toISOString()
      });

      logger.info(`Updated churn risk for account ${accountId}: ${churnData.score}`);
    } catch (error) {
      logger.error(`Error updating churn risk for account ${accountId}:`, error);
      throw error;
    }
  }

  // Create a task for account rep
  async createTask(taskData) {
    await this.ensureConnection();

    try {
      const result = await this.conn.sobject('Task').create({
        Subject: taskData.subject,
        Description: taskData.description,
        WhatId: taskData.accountId,
        OwnerId: taskData.ownerId,
        Status: 'Open',
        Priority: taskData.priority || 'High',
        ActivityDate: taskData.dueDate || new Date().toISOString()
      });

      logger.info(`Created task ${result.id} for account ${taskData.accountId}`);
      return result;
    } catch (error) {
      logger.error('Error creating task:', error);
      throw error;
    }
  }
}

// Export singleton instance
const salesforceClient = new SalesforceClient();
module.exports = salesforceClient;
