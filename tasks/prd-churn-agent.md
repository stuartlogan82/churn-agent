# Product Requirements Document: AI-Powered Churn Prediction & Retention System

## Introduction/Overview

The AI-Powered Churn Prediction & Retention System is an automated platform that detects at-risk customers in real-time, predicts churn likelihood using AI, and proactively intervenes through SMS notifications to account representatives and AI-powered outbound calls. The system integrates Salesforce CRM, OpenAI's GPT-4 for churn analysis, and 8x8's AI voice platform for retention conversations.

**Problem Statement:** Companies lose customers due to delayed detection of churn signals and lack of timely, personalized intervention. By the time account teams notice issues, it's often too late to retain the customer.

**Solution:** An automated system that monitors customer health signals, predicts churn risk using AI, and triggers immediate retention actions including SMS alerts to reps and AI-driven outbound calls to customers.

**Timeline:** Proof of Concept (POC) - 2-3 weeks with all phases implemented using sample data and test environments.

## Goals

1. **Real-time Churn Detection:** Detect churn signals within seconds of events occurring in Salesforce
2. **Accurate Churn Prediction:** Achieve 70%+ accuracy in identifying high-risk customers using AI analysis
3. **Immediate Intervention:** Notify account reps within 1 minute of high-risk detection
4. **Proactive Retention:** Initiate AI-powered outbound calls to critical-risk customers within 5 minutes
5. **Measurable Impact:** Track retention outcomes and demonstrate ROI through analytics dashboard
6. **Scalable Architecture:** Build system capable of handling 100+ churn events per day

## User Stories

### Account Executive/Sales Rep
- **As an** account executive, **I want to** receive immediate SMS alerts when my customers show churn signals, **so that** I can proactively reach out before they decide to leave
- **As an** account rep, **I want to** see the churn risk score and primary risk factors in Salesforce, **so that** I can prioritize my retention efforts
- **As a** sales rep, **I want to** receive a summary of AI agent calls with customers, **so that** I know what was discussed and what follow-up actions are needed

### Customer Success Manager
- **As a** customer success manager, **I want to** view a dashboard of all at-risk accounts, **so that** I can strategize retention campaigns
- **As a** CSM, **I want to** understand which factors contribute most to churn, **so that** I can address systemic issues
- **As a** CSM, **I want to** track retention success rates over time, **so that** I can measure the effectiveness of our interventions

### At-Risk Customer
- **As an** at-risk customer, **I want to** receive a proactive call addressing my concerns, **so that** I feel valued and my issues are resolved
- **As a** customer, **I want to** speak with an empathetic agent who understands my situation, **so that** I can explain my frustrations without being sold to

### System Administrator
- **As a** system administrator, **I want to** easily deploy and configure the system, **so that** setup takes minimal time
- **As an** admin, **I want to** monitor system health and API usage, **so that** I can ensure reliability and manage costs
- **As an** admin, **I want to** configure churn thresholds and routing rules, **so that** I can customize the system to our business needs

## Functional Requirements

### 1. Event Listener Service

**FR-1.1** The system MUST expose a webhook endpoint at `/webhooks/salesforce` to receive Salesforce events

**FR-1.2** The system MUST verify Salesforce webhook signatures using HMAC-SHA256 validation

**FR-1.3** The system MUST accept the following event types:
- Support case created/escalated
- Contract renewal approaching (within 90 days)
- Usage metrics dropped below threshold

**FR-1.4** The system MUST extract `accountId` from webhook payload and reject requests missing this field

**FR-1.5** Upon receiving an event, the system MUST query Salesforce for enriched customer data including:
- Account details (name, industry, ARR, contract dates, tenure)
- Primary contact information (name, phone, email)
- Recent support cases (last 30 days)
- Open opportunities (especially renewals)
- Usage metrics (if available)
- Account owner/rep details

**FR-1.6** The system MUST forward enriched customer data to the Churn Prediction Service within 5 seconds

**FR-1.7** The system MUST return a 200 OK response to Salesforce acknowledging receipt

**FR-1.8** The system MUST log all webhook events with timestamp, event type, and account ID

**FR-1.9** The system MUST handle Salesforce API connection failures gracefully with retry logic (3 attempts with exponential backoff)

### 2. Churn Prediction Service

**FR-2.1** The system MUST accept enriched customer data from the Event Listener Service

**FR-2.2** The system MUST format customer data into a structured prompt for OpenAI GPT-4

**FR-2.3** The prompt MUST include:
- Customer profile (company name, contract value, contract end date, tenure, industry)
- Recent activity (support ticket count, escalations, usage metrics, opportunities)
- Event trigger (what event caused this analysis)

**FR-2.4** The system MUST request the following from OpenAI:
- Churn risk score (0-100)
- Primary risk factors (list)
- Recommended retention approach
- Urgency level (low/medium/high/critical)

**FR-2.5** The system MUST parse OpenAI's response into structured JSON format

**FR-2.6** The system MUST handle OpenAI API failures with retry logic (2 attempts) and fallback to rule-based scoring if API unavailable

**FR-2.7** The system MUST forward churn prediction results to the Orchestration Service within 10 seconds

**FR-2.8** The system MUST log all predictions with account ID, score, and reasoning

### 3. Orchestration Service

**FR-3.1** The system MUST receive churn prediction results and route based on risk score:

**For scores >= 70 (Critical/High Risk):**
- Update Salesforce account with churn risk data
- Send SMS alert to account rep
- Trigger 8x8 AI agent for outbound call
- Create high-priority task in Salesforce

**For scores >= 40 (Medium Risk):**
- Update Salesforce account with churn risk data
- Send SMS alert to account rep
- Create standard-priority task in Salesforce

**For scores < 40 (Low Risk):**
- Update Salesforce account with churn risk data
- Log event for monitoring only

**FR-3.2** The system MUST update Salesforce Account object with:
- `Churn_Risk_Score__c` (number)
- `Churn_Risk_Level__c` (picklist: Low/Medium/High/Critical)
- `Churn_Risk_Factors__c` (text, semicolon-separated)
- `Last_Churn_Evaluation__c` (datetime)

**FR-3.3** SMS messages MUST include:
- Alert emoji (🚨 for critical, ⚠️ for medium)
- Company name
- Risk score
- Primary risk factor
- Action taken (call scheduled or manual review needed)
- Salesforce record link

**FR-3.4** The system MUST send SMS within 30 seconds of receiving prediction results

**FR-3.5** For critical-risk customers (score >= 70), the system MUST trigger 8x8 AI agent call within 1 minute

**FR-3.6** The system MUST create Salesforce tasks with:
- Subject: "Churn Risk: [Company Name] - [Score]"
- Description: Risk factors and recommended approach
- Priority: High for critical, Normal for medium
- Status: Open
- Owner: Account owner from Salesforce

**FR-3.7** The system MUST handle concurrent churn events (support up to 10 simultaneous predictions)

### 4. SMS Service (via 8x8)

**FR-4.1** The system MUST integrate with 8x8 SMS API for message delivery

**FR-4.2** The system MUST send SMS to the phone number stored in Salesforce Account Owner record

**FR-4.3** The system MUST handle SMS delivery failures and log errors

**FR-4.4** The system MUST not exceed 160 characters per SMS message (use URL shortener if needed)

**FR-4.5** The system MUST track SMS delivery status (sent/delivered/failed)

### 5. 8x8 AI Agent (Outbound Retention)

**FR-5.1** The system MUST configure an 8x8 AI Agent named "Retention Specialist" with OpenAI Realtime model

**FR-5.2** The agent MUST be configured with instructions to:
- Introduce themselves as calling from the company
- Express awareness of customer's specific concern
- Ask open-ended questions about customer experience
- Listen for pain points and dissatisfaction
- Offer solutions or escalation to account team
- Mention retention offers when appropriate
- Log conversation outcome

**FR-5.3** The system MUST populate 8x8 data store with customer context before initiating call:
- Account ID, company name, contact name, contact phone
- ARR, contract end date, tenure
- Churn score and risk factors
- Recent support tickets (last 5)
- Account rep details
- Available retention offers

**FR-5.4** The system MUST configure the following tools for the AI agent:
- `get_customer_details` - Query Salesforce for additional info
- `create_followup_task` - Create task in Salesforce
- `check_retention_offers` - View available offers from data store
- `transfer_to_account_rep` - Warm transfer to human rep

**FR-5.5** The system MUST connect Salesforce MCP to the 8x8 agent for real-time CRM access

**FR-5.6** The system MUST initiate outbound calls via 8x8 API with:
- Customer phone number
- Data store reference ID
- Agent ID

**FR-5.7** The system MUST handle call connection failures (busy, no answer, invalid number) and log results

**FR-5.8** The system MUST limit call attempts to 2 per customer per day

### 6. Post-Call Processing

**FR-6.1** The 8x8 agent MUST update Salesforce after each call with:
- Call summary (what was discussed)
- Customer sentiment (positive/neutral/negative)
- Concerns identified (list)
- Retention offer made (if any)
- Recommended next steps
- Call outcome (issue resolved, needs follow-up, customer declined)

**FR-6.2** The system MUST send follow-up SMS to account rep with:
- Call completion notification
- Customer sentiment
- Key takeaways
- Recommended action

**FR-6.3** If call outcome is negative or customer expressed strong dissatisfaction, the system MUST immediately alert rep via SMS with urgent priority

**FR-6.4** The system MUST update churn risk score based on call outcome:
- Positive outcome: Reduce score by 20-30 points
- Neutral outcome: No change
- Negative outcome: Increase score by 10 points

### 7. Salesforce Integration

**FR-7.1** The system MUST provide Salesforce metadata package including:

**Custom Fields on Account:**
- `Churn_Risk_Score__c` (Number, 0-100)
- `Churn_Risk_Level__c` (Picklist: Low, Medium, High, Critical)
- `Churn_Risk_Factors__c` (Long Text Area, 32,000 chars)
- `Last_Churn_Evaluation__c` (DateTime)
- `Retention_Actions_Taken__c` (Long Text Area)
- `Annual_Contract_Value__c` (Currency)
- `Contract_Start_Date__c` (Date)
- `Contract_End_Date__c` (Date)
- `Account_Status__c` (Picklist: Active, At Risk, Churned, Retained)

**Custom Object: Usage_Metrics__c**
- `Account__c` (Master-Detail to Account)
- `Last_Login_Date__c` (DateTime)
- `Active_Users__c` (Number)
- `Total_Users__c` (Number)
- `Feature_Usage_Score__c` (Number, 0-100)
- `Usage_Trend__c` (Picklist: Increasing, Stable, Declining)

**Custom Field on Contact:**
- `Primary_Contact__c` (Checkbox)

**FR-7.2** The system MUST provide Salesforce Flow templates for:
- Creating Platform Events when cases are escalated
- Sending webhooks when contracts are 90/60/30 days from renewal
- Detecting usage metric drops below threshold

**FR-7.3** The system MUST authenticate with Salesforce using OAuth 2.0 Connected App

**FR-7.4** The system MUST respect Salesforce API rate limits (max 100 calls per rolling 20 seconds)

### 8. Analytics Dashboard

**FR-8.1** The system MUST provide a web-based dashboard accessible at `/dashboard`

**FR-8.2** The dashboard MUST display:
- Total churn predictions today/this week/this month
- Churn risk distribution (pie chart: Low/Medium/High/Critical)
- SMS delivery rate (percentage)
- 8x8 call connection rate (percentage)
- Average call duration
- Retention success rate (customers whose risk score decreased after intervention)

**FR-8.3** The dashboard MUST show a list of recent high-risk customers with:
- Company name
- Risk score
- Time detected
- Actions taken
- Current status

**FR-8.4** The dashboard MUST refresh automatically every 30 seconds

**FR-8.5** The dashboard MUST be secured with basic authentication

### 9. Infrastructure & Deployment

**FR-9.1** The system MUST run on Digital Ocean Droplet using Docker Compose

**FR-9.2** The system MUST include the following containers:
- event-listener (Node.js, port 3000)
- churn-prediction (Node.js, port 3001)
- orchestration (Node.js, port 3002)
- postgresql (data persistence)
- redis (caching and job queues)
- nginx (reverse proxy, SSL termination)

**FR-9.3** The system MUST use environment variables for all configuration (no hardcoded credentials)

**FR-9.4** The system MUST provide a `.env.example` file documenting all required environment variables

**FR-9.5** The system MUST use Let's Encrypt for SSL certificate management

**FR-9.6** The system MUST expose only ports 443 (HTTPS), 80 (HTTP redirect), and 22 (SSH) to the internet

**FR-9.7** The system MUST include a `docker-compose.yml` for local development

**FR-9.8** The system MUST provide setup scripts for one-command deployment

### 10. Monitoring & Logging

**FR-10.1** All services MUST log to stdout in JSON format with:
- Timestamp
- Service name
- Log level (debug/info/warn/error)
- Message
- Context (account ID, event type, etc.)

**FR-10.2** The system MUST track the following metrics:
- Webhook events received per minute
- Churn prediction latency (time from event to prediction)
- OpenAI API response time
- SMS delivery success rate
- 8x8 call connection success rate
- Salesforce API error rate

**FR-10.3** The system MUST send alerts (via email or SMS) for:
- Webhook endpoint is down (5 minutes without heartbeat)
- OpenAI API failures (3 consecutive failures)
- SMS delivery failures (>20% failure rate in 1 hour)
- 8x8 call failures (>50% failure rate in 1 hour)
- Salesforce API rate limit exceeded

**FR-10.4** The system MUST retain logs for 30 days

### 11. Testing Requirements

**FR-11.1** Each service MUST have unit tests covering:
- Core business logic functions
- Data validation and transformation
- Error handling
- Edge cases

**FR-11.2** The system MUST have integration tests covering:
- Event Listener → Churn Prediction flow
- Churn Prediction → Orchestration flow
- Orchestration → Salesforce updates
- Orchestration → SMS sending
- Orchestration → 8x8 call triggering

**FR-11.3** The system MUST have 8x8 agent simulation tests covering:
- Data store loading with customer context
- Tool execution (Salesforce queries, task creation)
- Conversation flow scenarios (positive, neutral, negative outcomes)
- Call transfer to human rep

**FR-11.4** All external API calls (Salesforce, OpenAI, 8x8) MUST be mocked in tests

**FR-11.5** The system MUST achieve >80% code coverage on business logic

**FR-11.6** The system MUST include a test suite that can be run with `npm test`

**FR-11.7** The system MUST provide test data fixtures for:
- Sample Salesforce webhook payloads
- Sample customer data
- Sample OpenAI responses
- Sample 8x8 API responses

**FR-11.8** The system MUST include an end-to-end test script that simulates the full pipeline with test data

## Non-Goals (Out of Scope for POC)

1. **Production-scale load testing** - POC will test with sample data, not full production load
2. **Advanced AI model fine-tuning** - Will use OpenAI's pre-trained GPT-4, no custom training
3. **Multi-language support** - English only for POC
4. **Mobile app** - Dashboard is web-based only
5. **Historical churn analysis** - Focus is on real-time detection, not analyzing past churn
6. **Predictive lead scoring** - System focuses on existing customers, not prospects
7. **Automated discount application** - AI agent can suggest discounts but requires manual approval
8. **Integration with payment systems** - No direct integration with billing/payment platforms
9. **Custom CRM support** - Salesforce only, no other CRMs in POC
10. **Voice sentiment analysis** - Basic sentiment captured by AI agent, no advanced voice analytics
11. **Compliance certifications** - No HIPAA, SOC2, or other certifications for POC
12. **Multi-tenant architecture** - Single company deployment for POC

## Design Considerations

### User Interface (Dashboard)

- **Framework:** React with Chart.js for visualizations
- **Styling:** Tailwind CSS for clean, professional appearance
- **Layout:** Single-page dashboard with cards for key metrics
- **Color scheme:**
  - Critical risk: Red (#EF4444)
  - High risk: Orange (#F59E0B)
  - Medium risk: Yellow (#EAB308)
  - Low risk: Green (#10B981)
- **Responsiveness:** Desktop-first, mobile-friendly

### 8x8 Agent Voice & Tone

- **Voice persona:** Professional, empathetic, conversational
- **Tone:** Warm but not overly casual, helpful without being pushy
- **Speaking pace:** Moderate, with natural pauses
- **Approach:** Active listening, asking follow-up questions, summarizing concerns

### SMS Message Templates

**Critical Risk:**
```
🚨 Churn Alert: Acme Corp
Risk: 82/100
Reason: Multiple escalated support tickets
Action: AI call scheduled
Review: https://sf.link/abc123
```

**Medium Risk:**
```
⚠️ Churn Alert: Acme Corp
Risk: 55/100
Reason: Contract renewal in 45 days
Action: Review recommended
Details: https://sf.link/abc123
```

## Technical Considerations

### Architecture Decisions

1. **Microservices approach:** Three separate Node.js services for clear separation of concerns and independent scaling
2. **Event-driven communication:** Services communicate via HTTP APIs; future enhancement could add message queue (Redis/RabbitMQ)
3. **Stateless services:** All services are stateless for easy horizontal scaling
4. **API-first design:** Each service exposes RESTful APIs with clear contracts

### Technology Stack Rationale

- **Node.js + Express:** Fast development, strong async support, large ecosystem
- **jsforce library:** Mature Salesforce API client with OAuth support
- **OpenAI Node SDK:** Official SDK with streaming and retry logic
- **PostgreSQL:** Reliable data persistence for logs and analytics
- **Redis:** Fast caching and job queue for async tasks
- **Docker Compose:** Easy local development and consistent environments

### Security Implementation

1. **Environment variables:** Store all secrets in `.env` file (never committed)
2. **Webhook signature verification:** Validate all incoming Salesforce webhooks
3. **HTTPS only:** Enforce SSL/TLS for all external communication
4. **API key rotation:** Document process for rotating OpenAI and 8x8 keys
5. **Minimal permissions:** Salesforce Connected App uses least privilege principle
6. **Rate limiting:** Implement rate limiting on webhook endpoint (100 req/min)
7. **Input validation:** Sanitize all inputs before processing
8. **Logging:** Sanitize logs to avoid exposing PII or credentials

### Salesforce Integration Details

**Connected App Permissions Required:**
- Access and manage your data (api)
- Perform requests on your behalf at any time (refresh_token, offline_access)
- Access custom permissions (custom_permissions)

**API Usage Strategy:**
- Bulk queries where possible to minimize API calls
- Cache frequently accessed data (account details) in Redis for 5 minutes
- Use composite API for multi-object updates (reduce round trips)

### 8x8 Integration Details

**API Endpoints:**
- SMS: `POST /v1/sms/send`
- Voice Agent: `POST /v1/agents/{agentId}/calls`
- Data Store: `POST /v1/agents/{agentId}/datastore`
- Call Status: `GET /v1/calls/{callId}/status`

**Webhook Configuration:**
- 8x8 must send call completion webhooks to `https://[domain]/webhooks/8x8/call-complete`
- Include call ID, outcome, duration, transcript summary

### Error Handling Strategy

1. **Retry logic:** Exponential backoff for transient failures (network, rate limits)
2. **Circuit breaker:** After 5 consecutive failures, pause service and alert admin
3. **Graceful degradation:** If OpenAI is down, use simple rule-based scoring
4. **Dead letter queue:** Failed events stored in PostgreSQL for manual review
5. **Health checks:** Each service exposes `/health` endpoint for monitoring

### Performance Targets

- Webhook processing: <2 seconds
- Churn prediction: <10 seconds
- SMS delivery: <30 seconds
- 8x8 call initiation: <60 seconds
- Dashboard load time: <2 seconds
- Support 100 concurrent webhook events

## Success Metrics

### Primary Metrics (POC Completion)

1. **System Reliability:** 99% uptime over 2-week POC period
2. **End-to-End Latency:** <2 minutes from Salesforce event to SMS/call trigger
3. **Prediction Accuracy:** Manual review of 20 test cases shows reasonable churn scores
4. **Test Coverage:** >80% code coverage across all services
5. **Successful Demo:** Complete end-to-end demo with sample data works without errors

### Secondary Metrics (POC Success Indicators)

6. **OpenAI API Response Time:** <5 seconds average
7. **SMS Delivery Success:** >95% successful delivery
8. **8x8 Call Connection:** >70% successful connections (accounting for no-answer, busy)
9. **Salesforce Update Success:** >99% successful updates
10. **Zero Critical Security Issues:** No exposed credentials, validated inputs

### Long-Term Metrics (Post-POC)

11. **Retention Rate Improvement:** X% increase in retention for customers who received intervention vs. control group
12. **Revenue Saved:** $X ARR retained through successful interventions
13. **Rep Response Time:** Account reps respond to alerts X% faster
14. **Customer Satisfaction:** NPS increase among customers who received retention call
15. **Cost per Intervention:** <$5 per churn prediction and intervention

## Open Questions

1. **8x8 API Access:** Do we have beta access to 8x8 AI Agent platform? If not, what is the timeline?
2. **Salesforce Sandbox:** Do we have access to a Salesforce sandbox for testing webhook configuration?
3. **Customer Phone Numbers:** Are primary contact phone numbers reliably stored in Salesforce?
4. **Retention Offers:** What specific retention offers should the AI agent be authorized to mention? (discounts, upgrades, training, etc.)
5. **Call Hours:** What hours should the 8x8 AI agent be allowed to call customers? (business hours only, time zones?)
6. **Rep Availability:** Should the system check if account rep is available before offering warm transfer?
7. **Compliance:** Are there any TCPA or telemarketing compliance requirements for outbound calls?
8. **OpenAI Budget:** What is the monthly budget cap for OpenAI API usage?
9. **Data Retention:** How long should we store call transcripts and customer interaction data?
10. **Escalation Path:** If multiple high-risk customers trigger simultaneously, who should be notified (CSM manager, VP)?
11. **Success Definition:** How will we measure "successful retention" - customer renews? Increases contract? Just doesn't churn?
12. **Dashboard Users:** Who needs access to the analytics dashboard? (CSM team, sales leadership, execs?)

---

## Implementation Notes

This PRD describes all four phases of the system for POC demonstration purposes (2-3 week timeline). Given the aggressive timeline, the following implementation approach is recommended:

1. **Week 1:** Core pipeline (Event Listener + Churn Prediction + Orchestration with Salesforce updates)
2. **Week 2:** SMS notifications + 8x8 agent configuration + testing
3. **Week 3:** Dashboard, end-to-end testing, documentation, demo preparation

All features should use test/mock data and sandbox environments. Production-ready hardening would follow successful POC demonstration.
