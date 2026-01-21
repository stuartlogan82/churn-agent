# Churn Bot Architecture Plan

## High-Level System Design

```
┌─────────────────┐
│   Salesforce    │ Customer data, events
└────────┬────────┘
         │ Webhooks/Platform Events
         ▼
┌─────────────────────────────┐
│  Event Listener Service     │ Node.js/Python webhook receiver
└────────┬────────────────────┘
         │ Customer data + event
         ▼
┌─────────────────────────────┐
│  Churn Prediction Service   │ OpenAI API for churn analysis
└────────┬────────────────────┘
         │ Churn score + reasoning
         ▼
┌─────────────────────────────┐
│   Orchestration Service     │ Routes based on risk level
└────┬────────────────────┬───┘
     │ High Risk          │ High Risk
     ▼                    ▼
┌──────────────┐    ┌─────────────────┐
│  SMS Service │    │  8x8 AI Agent   │ Outbound call
│  (to rep)    │    │  Orchestrator   │ for retention
└──────────────┘    └─────────────────┘
                            │
                            ▼
                    ┌───────────────────┐
                    │ Customer receives │
                    │ retention call    │
                    └───────────────────┘
```

## Component Breakdown

### 1. Salesforce Event Triggers
**Purpose**: Detect churn signals in real-time

**Implementation Options**:
- Salesforce Platform Events (push-based, best for real-time)
- Salesforce Webhooks via Flow
- Change Data Capture (CDC)

**Churn Signal Events**:
- Support ticket created/escalated
- Payment failure
- Usage metrics dropped below threshold
- Contract renewal approaching
- Negative NPS score submitted
- Feature downgrade
- Account owner change

### 2. Event Listener Service
**Purpose**: Receive Salesforce events and enrich customer data

**Technology**: Node.js + Express (or Python + FastAPI)

**Responsibilities**:
- Expose webhook endpoint for Salesforce
- Query Salesforce API for additional customer context:
  - Account history
  - Recent activity
  - Contract value
  - Past interactions
  - Support tickets
  - Product usage data
- Pass enriched data to churn prediction service

### 3. Churn Prediction Service
**Purpose**: Analyze customer data and predict churn likelihood using LLM

**Technology**: OpenAI API (GPT-4 or equivalent)

**Process**:
1. Receive enriched customer data
2. Format data into structured prompt
3. Send to OpenAI with instructions to:
   - Analyze churn risk (0-100 score)
   - Identify primary risk factors
   - Suggest retention strategies
   - Determine urgency level
4. Return structured prediction result

**Example Prompt Structure**:
```
Analyze this customer for churn risk:

Customer Profile:
- Account: [Company Name]
- Contract Value: $X/year
- Contract End: [Date]
- Tenure: X months
- Industry: [Industry]

Recent Activity:
- Support tickets: [Count] (X escalated)
- Product usage: [Metrics]
- Payment status: [Status]
- NPS score: [Score]

Event Trigger: [What happened]

Provide:
1. Churn risk score (0-100)
2. Primary risk factors
3. Recommended retention approach
4. Urgency (low/medium/high/critical)
```

### 4. Orchestration Service
**Purpose**: Route high-risk customers to appropriate retention actions

**Logic**:
```
if churn_score >= 70:
  - Send SMS to account rep
  - Trigger 8x8 AI agent for outbound call
  - Update Salesforce with churn risk field
  - Create retention task in Salesforce
elif churn_score >= 40:
  - Send SMS to account rep
  - Update Salesforce with churn risk field
else:
  - Log for monitoring only
```

### 5. SMS Service (Rep Alert)
**Purpose**: Notify account rep of at-risk customer

**Technology**: 8x8 SMS API (consolidated with voice platform)

**Message Format**:
```
🚨 Churn Alert: [Company Name]
Risk: [Score]/100
Reason: [Primary factor]
Action: Call scheduled via 8x8 AI
Review: [Salesforce link]
```

### 6. 8x8 AI Agent (Outbound Retention)
**Purpose**: Proactively call at-risk customers to understand concerns and offer retention

**8x8 Agent Configuration**:

**Agent Name**: "Retention Specialist"

**Model**: OpenAI Realtime

**Voice**: Professional, empathetic tone

**Instructions (Prompt)**:
```
You are a customer success specialist calling on behalf of [Company].
The customer you're calling may be at risk of churning based on [risk_factors].

Your goals:
1. Express that you've noticed [specific concern]
2. Ask open-ended questions to understand their experience
3. Listen for pain points and dissatisfaction
4. Offer relevant solutions or escalation to account team
5. If appropriate, mention retention offers or support resources
6. Log the outcome for follow-up

Be empathetic, professional, and genuinely helpful. Do not be pushy.
If they're busy, offer to schedule a better time.

Customer context: [Injected via data store]
```

**Tools/Capabilities Needed**:
- **MCP Connector**: Salesforce MCP to query/update customer records during call
- **Data Store**: Customer profile, churn prediction results, account history
- **Custom Tools**:
  - `create_salesforce_task` - Schedule follow-up
  - `apply_retention_discount` - If authorized within limits
  - `transfer_to_rep` - Warm transfer to human rep if needed
  - `schedule_callback` - Book specific time with account team

**Triggering the Call**:
- Orchestration service calls 8x8 API to initiate outbound call
- Passes customer phone number and context payload
- 8x8 agent loads customer data into data store before call
- Agent follows instructions and uses tools as needed

### 7. Post-Call Processing
**Purpose**: Record outcomes and trigger next steps

**Actions**:
- 8x8 agent updates Salesforce with:
  - Call summary and sentiment
  - Customer concerns identified
  - Retention offer made (if any)
  - Recommended next steps
- SMS follow-up to rep with call outcome
- If critical, immediately alert rep for human follow-up

## Technology Stack Recommendation

```
┌─────────────────────────────────────────┐
│ Infrastructure                          │
├─────────────────────────────────────────┤
│ Hosting: Digital Ocean Droplet          │
│ Container: Docker                       │
│ Orchestration: Docker Compose           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Event Listener & Orchestration          │
├─────────────────────────────────────────┤
│ Runtime: Node.js or Python              │
│ Framework: Express.js or FastAPI        │
│ Queue: Redis or AWS SQS (for async)     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ External Services                       │
├─────────────────────────────────────────┤
│ Churn Prediction: OpenAI API            │
│ SMS + Voice AI: 8x8 Platform            │
│ CRM: Salesforce (via REST/SOAP API)     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Data & Storage                          │
├─────────────────────────────────────────┤
│ Database: PostgreSQL (logs, history)    │
│ Cache: Redis (temp data, rate limiting) │
│ 8x8 Data Store: Customer context JSON   │
└─────────────────────────────────────────┘
```

## Key Salesforce Objects to Track

1. **Account** - Company information, ARR, contract dates
2. **Contact** - Key stakeholders, phone numbers
3. **Case** - Support tickets, escalations
4. **Opportunity** - Renewal opportunities, upsell potential
5. **Usage Metrics** (Custom Object) - Product engagement data
6. **Churn Risk** (Custom Field on Account):
   - Risk Score (0-100)
   - Risk Level (Low/Medium/High/Critical)
   - Last Evaluated Date
   - Primary Risk Factors
   - Retention Actions Taken

## Data Flow Example

1. **Trigger Event**: Customer submits support ticket marked "Cannot use feature X"
2. **Salesforce**: Fires Platform Event → Webhook to Event Listener
3. **Event Listener**:
   - Receives event
   - Queries Salesforce for customer context (ARR: $50K/yr, contract expires in 2 months, 3rd support ticket this month)
   - Sends to Churn Prediction Service
4. **Churn Prediction**:
   - Analyzes via OpenAI
   - Returns: 82% churn risk, "Product fit issues + renewal approaching", urgency: HIGH
5. **Orchestration**:
   - Updates Salesforce: Account.Churn_Risk__c = 82
   - Sends SMS to rep: "🚨 Acme Corp at 82% churn risk - feature issues, renewal in 60 days"
   - Triggers 8x8 call
6. **8x8 Agent**:
   - Loads customer context into data store
   - Initiates outbound call to customer
   - Conversation: "Hi, I noticed you've had trouble with Feature X. I'd like to understand what's happening and help..."
   - During call: Queries Salesforce via MCP to check feature entitlements
   - Outcome: Customer explains they need training; agent schedules onboarding session and creates task in Salesforce
7. **Post-Call**:
   - 8x8 updates Salesforce Case with call notes
   - SMS to rep: "✅ Acme call complete - scheduled training session, risk reduced"
   - Churn score updated to 45%

## 8x8 AI Agent Setup Details

### Data Store Schema
Store customer context as JSON:
```json
{
  "account_id": "001...",
  "company_name": "Acme Corp",
  "contact_name": "John Doe",
  "contact_phone": "+1234567890",
  "arr": 50000,
  "contract_end_date": "2026-03-21",
  "tenure_months": 18,
  "churn_score": 82,
  "risk_factors": ["Multiple support tickets", "Feature usage dropped 60%", "Renewal approaching"],
  "recent_support_tickets": [
    {"date": "2026-01-20", "subject": "Cannot use feature X", "status": "Open"}
  ],
  "account_rep": {
    "name": "Sarah Johnson",
    "email": "sarah@company.com",
    "phone": "+1987654321"
  },
  "retention_offers_available": [
    "10% discount for annual renewal",
    "Free advanced training session",
    "Priority support upgrade"
  ]
}
```

### MCP Connectors Needed
1. **Salesforce MCP** - Query/update records during call
2. **Custom Calendar MCP** (optional) - Schedule follow-ups

### Tools Configuration
```javascript
{
  "tools": [
    {
      "name": "get_customer_details",
      "description": "Retrieve additional customer information from Salesforce",
      "mcp_connector": "salesforce"
    },
    {
      "name": "create_followup_task",
      "description": "Create a task in Salesforce for the account rep",
      "mcp_connector": "salesforce"
    },
    {
      "name": "check_retention_offers",
      "description": "Check what retention offers are available for this customer",
      "source": "data_store"
    },
    {
      "name": "transfer_to_account_rep",
      "description": "Warm transfer call to the customer's account representative",
      "type": "call_transfer"
    }
  ]
}
```

## Digital Ocean Infrastructure Setup

**Existing Resources**: Pre-configured Digital Ocean Droplet

**Deployment Architecture**:
```
Digital Ocean Droplet
├── Docker Compose orchestration
├── Services running as containers:
│   ├── event-listener (port 3000)
│   ├── churn-prediction (port 3001)
│   └── orchestration (port 3002)
├── PostgreSQL container (data persistence)
├── Redis container (caching/queues)
└── Nginx reverse proxy (SSL termination, routing)
```

**Webhook Endpoint**: `https://[droplet-ip-or-domain]/webhooks/salesforce`

**Security**:
- SSL certificate via Let's Encrypt
- Salesforce webhook signature verification
- Environment variables for API keys
- Firewall rules (only 443, 80, 22 open)

## Implementation Phases

### Phase 1: Core Pipeline
- Set up Salesforce webhooks for key events
- Build Event Listener service to receive webhooks
- Integrate OpenAI for churn prediction
- Build Orchestration service for routing logic
- Update Salesforce with churn scores

### Phase 2: Rep Notifications
- Integrate 8x8 SMS API for alerts to reps
- Create notification templates
- Test end-to-end flow (event → prediction → SMS)

### Phase 3: 8x8 AI Agent
- Configure 8x8 AI Agent with retention instructions
- Set up data stores with customer context schema
- Build API integration to trigger outbound calls from Orchestration service
- Configure Salesforce MCP connector in 8x8
- Define custom tools (create task, transfer, etc.)

### Phase 4: Feedback Loop
- Capture call outcomes from 8x8
- Update Salesforce with conversation summaries
- Build analytics dashboard for churn metrics
- Refine AI prompts based on successful retention patterns

## Critical Files Structure

```
churn-agent/
├── services/
│   ├── event-listener/
│   │   ├── src/
│   │   │   ├── index.js              # Webhook receiver
│   │   │   ├── salesforce-client.js  # SF API integration
│   │   │   └── routes/
│   │   │       └── webhooks.js       # Webhook endpoints
│   │   └── package.json
│   │
│   ├── churn-prediction/
│   │   ├── src/
│   │   │   ├── index.js              # Main prediction service
│   │   │   ├── openai-client.js      # OpenAI integration
│   │   │   └── prompts.js            # Prompt templates
│   │   └── package.json
│   │
│   └── orchestration/
│       ├── src/
│       │   ├── index.js              # Main orchestrator
│       │   ├── eightbyeight-client.js # 8x8 API (SMS + Voice)
│       │   └── salesforce-updater.js  # Update SF records
│       └── package.json
│
├── 8x8-agent-config/
│   ├── agent-instructions.md         # Prompt for 8x8 agent
│   ├── data-store-schema.json       # Customer context schema
│   └── tools-config.json            # Tool definitions
│
├── salesforce/
│   ├── platform-events/             # Event definitions
│   ├── custom-fields/               # Churn risk fields
│   └── flows/                       # Automation flows
│
├── docker-compose.yml               # Local dev environment
└── README.md                        # Setup instructions
```

## Testing Strategy

### Unit Testing
- Each service has isolated tests
- Mock external API calls (Salesforce, OpenAI, 8x8)

### Integration Testing
1. **Event → Prediction**: Send test webhook, verify churn score calculation
2. **Prediction → Notifications**: Trigger high churn score, verify SMS sent
3. **Full Pipeline**: Simulate Salesforce event, verify:
   - Churn score calculated
   - SMS sent to rep
   - 8x8 call triggered
   - Salesforce updated

### 8x8 Agent Testing
- Use 8x8 test environment to simulate calls
- Verify data store loads correctly
- Test tool execution (Salesforce queries, task creation)
- Record sample conversations for quality review

## Security Considerations

1. **API Keys**: Store in environment variables, never commit
2. **Salesforce OAuth**: Use Connected App with minimal permissions
3. **Webhook Validation**: Verify Salesforce signature on incoming webhooks
4. **Data Privacy**:
   - Encrypt customer data in transit and at rest
   - Limit data stored in 8x8 data store to call duration
   - Comply with GDPR/CCPA for customer data handling
5. **Rate Limiting**: Implement on webhook endpoints
6. **8x8 Access Control**: Restrict agent capabilities to necessary tools only

## Monitoring & Observability

### Metrics to Track
- Churn predictions per day
- Churn score distribution
- SMS delivery rate
- 8x8 call connection rate
- Call duration and outcomes
- Retention success rate (before/after intervention)

### Logging
- All webhook events received
- Churn predictions with reasoning
- SMS delivery status
- 8x8 call triggers and outcomes
- Salesforce API errors

### Alerts
- Webhook failures
- OpenAI API errors
- SMS delivery failures
- 8x8 call failures
- Spike in high-risk customers

## Cost Estimates (Monthly) - POC

- **OpenAI API**: ~$50-200 (depends on volume, ~$0.01-0.05 per prediction)
- **8x8 Platform**: Pricing TBD (in beta - includes SMS + Voice AI)
- **Salesforce API Calls**: Included in SF license (monitor limits)
- **Digital Ocean Droplet**: $0 (already configured)

**Total**: ~$50-200/month for POC volume (primarily OpenAI costs)
