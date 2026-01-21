# AI-Powered Churn Prediction & Retention System

An automated platform that detects at-risk customers in real-time, predicts churn likelihood using AI, and proactively intervenes through SMS notifications and AI-powered outbound calls.

## 🚀 Quick Links

- **Architecture Plan**: [plan.md](./plan.md)
- **Product Requirements**: [tasks/prd-churn-agent.md](./tasks/prd-churn-agent.md)
- **Development Guidelines**: [claude.md](./claude.md)
- **GitHub Repository**: https://github.com/stuartlogan82/churn-agent

## 📋 Overview

This system integrates:
- **Salesforce** - CRM and customer data
- **OpenAI GPT-4** - AI-powered churn prediction
- **8x8 Platform** - SMS alerts and AI voice agent for retention calls
- **Digital Ocean** - Infrastructure hosting

## 🏗️ Architecture

```
Salesforce Event → Event Listener → Churn Prediction (AI) → Orchestration
                                                               ↓
                                                    ┌──────────┴──────────┐
                                                    ↓                     ↓
                                              SMS to Rep            8x8 AI Agent Call
```

## 📁 Project Structure

```
churn-agent/
├── plan.md                          # Architecture plan
├── claude.md                        # TDD development guidelines
├── tasks/
│   └── prd-churn-agent.md          # Comprehensive PRD
├── services/
│   ├── event-listener/             # Salesforce webhook receiver
│   ├── churn-prediction/           # OpenAI churn analysis
│   └── orchestration/              # SMS & call routing
├── 8x8-agent-config/               # 8x8 AI agent configuration
├── salesforce/                     # Salesforce metadata & flows
└── docker-compose.yml              # Container orchestration
```

## 🚦 Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Salesforce account with API access
- OpenAI API key
- 8x8 platform access
- PostgreSQL & Redis (via Docker)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/stuartlogan82/churn-agent.git
   cd churn-agent
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and credentials
   ```

3. **Install dependencies**
   ```bash
   npm run install-all
   ```

4. **Start services (local development)**
   ```bash
   npm run dev:all
   ```

5. **Run tests**
   ```bash
   npm test
   ```

## 🧪 Development Approach

This project follows **Test Driven Development (TDD)**:
1. Write tests first
2. Run tests (they should fail)
3. Write minimal code to pass tests
4. Refactor
5. Repeat

See [claude.md](./claude.md) for detailed guidelines.

## 📊 Implementation Phases

### Phase 1: Core Pipeline (Week 1)
- ✅ Event Listener service
- ✅ Churn Prediction service
- ✅ Orchestration service
- ✅ Salesforce integration

### Phase 2: Rep Notifications (Week 2)
- [ ] 8x8 SMS integration
- [ ] SMS templates
- [ ] End-to-end testing

### Phase 3: 8x8 AI Agent (Week 2-3)
- [ ] Configure 8x8 AI Agent
- [ ] Set up data stores
- [ ] Salesforce MCP connector
- [ ] Call triggering logic

### Phase 4: Feedback Loop (Week 3)
- [ ] Post-call processing
- [ ] Analytics dashboard
- [ ] Monitoring & alerts

## 🔒 Security

- All secrets stored in environment variables
- Webhook signature verification
- HTTPS/TLS for all communications
- Rate limiting on endpoints
- Input validation and sanitization

## 📈 Success Metrics

- **System Reliability**: 99% uptime
- **End-to-End Latency**: <2 minutes from event to action
- **SMS Delivery**: >95% success rate
- **Call Connection**: >70% success rate
- **Test Coverage**: >80% on business logic

## 🤝 Contributing

This is a POC project. Follow TDD practices and ensure all tests pass before committing.

## 📝 License

MIT

## 🆘 Support

For questions or issues, see the [PRD](./tasks/prd-churn-agent.md) or [architecture plan](./plan.md).

---

**Timeline**: 2-3 week POC
**Status**: 🟡 In Development
**Last Updated**: 2026-01-21
