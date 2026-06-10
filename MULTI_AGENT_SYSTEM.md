# 🤖 PriceHunt Multi-Agent System

Sistem multi-agent untuk autonomous monitoring dan parallel development PriceHunt Indonesia.

---

## 🏗️ Architecture

### **Phase 1: Autonomous Monitoring Agents** (Cron Jobs)
Background monitoring yang jalan otomatis sesuai schedule.

### **Phase 2: On-Demand Specialists** (Delegation)
Specialized agents yang di-spawn saat dibutuhkan untuk development tasks.

---

## 🔄 Autonomous Agents (Cron)

### 1. **QA Monitor**
- **Schedule:** Daily at 7:00 AM
- **Job ID:** af0f448459dd
- **Tasks:**
  - Run full test suite (59 tests)
  - Check TypeScript errors
  - Run ESLint
  - Generate health report

**Report Format:**
```
🧪 PriceHunt QA Report - {date}
├─ Test Results: X passed, Y failed
├─ TypeScript: Clean / Errors
├─ Linting: Clean / Warnings
└─ Status: ✅ Healthy / ⚠️ Needs Attention
```

### 2. **Security Auditor**
- **Schedule:** Weekly Sunday at 8:00 AM
- **Job ID:** 6b660c36b356
- **Tasks:**
  - Check outdated dependencies
  - Scan for exposed secrets
  - Verify .env.local security
  - Review suspicious dependencies

**Report Format:**
```
🔒 PriceHunt Security Audit - {date}
├─ Outdated packages: X found
├─ Exposed secrets: None / Found
├─ Risk Level: 🟢 Low / 🟡 Medium / 🔴 High
└─ Recommendations
```

### 3. **Collector Health Monitor**
- **Schedule:** Every 6 hours
- **Job ID:** 5cfe91f2a63f
- **Tasks:**
  - Check Python environment
  - Verify dependencies installed
  - Check Playwright browsers
  - Validate collector scripts

**Report Format:**
```
🐍 PriceHunt Collectors Health - {date}
├─ Python: version X.X.X
├─ Dependencies: ✅ All installed
├─ Collectors: X found
└─ Status: 🟢 Ready / 🟡 Needs Setup
```

### 4. **Performance Tracker**
- **Schedule:** Daily at 6:00 AM
- **Job ID:** 3174c6640bbb
- **Tasks:**
  - Build production bundle
  - Measure bundle sizes
  - Track code metrics
  - Analyze First Load JS

**Report Format:**
```
📊 PriceHunt Performance Report - {date}
├─ Build: ✅ Success (X seconds)
├─ Bundle Size: X MB
├─ First Load JS: X kB
└─ Score: 🟢 Optimal / 🟡 Needs Optimization
```

---

## 👥 On-Demand Specialists (Delegation)

### 1. **Backend Developer**
- **Skill:** pricehunt-backend-dev
- **Expertise:**
  - API routes & server actions
  - Supabase database operations
  - Business logic (deal score, fake discount)
  - Rate limiting & job logging
- **Toolsets:** terminal, file, web

**Example Usage:**
```
Delegate task ke backend specialist:
"Add new API endpoint untuk product comparison with side-by-side display"
```

### 2. **Frontend Developer**
- **Skill:** pricehunt-frontend-dev
- **Expertise:**
  - React components (Server & Client)
  - shadcn/ui integration
  - Tailwind CSS styling
  - Mobile-first responsive design
- **Toolsets:** terminal, file

**Example Usage:**
```
Delegate task ke frontend specialist:
"Create new product comparison component dengan 4 products side-by-side"
```

### 3. **Test Engineer**
- **Skill:** pricehunt-test-engineer
- **Expertise:**
  - Vitest unit testing
  - Business logic tests
  - Test coverage analysis
  - Integration testing
- **Toolsets:** terminal, file

**Example Usage:**
```
Delegate task ke test engineer:
"Write tests untuk new product comparison feature"
```

### 4. **Bug Hunter**
- **Skill:** pricehunt-bug-hunter
- **Expertise:**
  - Systematic debugging
  - Root cause analysis
  - TypeScript error diagnosis
  - Runtime error tracking
- **Toolsets:** terminal, file

**Example Usage:**
```
Delegate task ke bug hunter:
"Debug why product prices not updating after API call"
```

### 5. **Documentation Writer**
- **Skill:** pricehunt-doc-writer
- **Expertise:**
  - API documentation
  - Code comments & JSDoc
  - README updates
  - User guides (Indonesian)
- **Toolsets:** file

**Example Usage:**
```
Delegate task ke doc writer:
"Update README dengan new product comparison feature"
```

---

## 🚀 How to Use

### Managing Cron Jobs

**List all jobs:**
```
hermes cron list
```

**Pause a job:**
```
hermes cron pause <job_id>
```

**Resume a job:**
```
hermes cron resume <job_id>
```

**Run job manually:**
```
hermes cron run <job_id>
```

**Remove a job:**
```
hermes cron remove <job_id>
```

### Delegating to Specialists

**Single task delegation:**
```
Hey Kiro, delegate to backend specialist:
"Add new endpoint /api/products/compare that accepts array of product IDs and returns comparison data"

Context: User wants to compare multiple products side-by-side
```

**Parallel tasks (max 3 concurrent):**
```
Hey Kiro, delegate these tasks in parallel:

1. Backend: Add comparison API endpoint
2. Frontend: Create comparison UI component
3. Test: Write tests for comparison feature
```

**Via Chat:**
Simply describe the task dan mention specialist type:
- "Backend specialist tolong add endpoint X"
- "Frontend specialist buat component Y"
- "Test engineer tulis tests untuk Z"

---

## 📋 Agent Coordination

### Typical Development Flow

**1. Feature Planning**
You → Kiro: "Saya mau add product comparison feature"
Kiro: Breaks down into subtasks

**2. Parallel Development**
- Backend specialist: API endpoint
- Frontend specialist: UI component
- Test engineer: Test coverage

**3. Quality Check**
- Bug hunter: Debug any issues
- QA Monitor: Nightly test run
- Doc writer: Update documentation

**4. Deployment**
You: Review & merge
Autonomous agents: Monitor post-deployment

---

## 🎯 Best Practices

### When to Use Autonomous Agents
- ✅ Regular monitoring (QA, security, performance)
- ✅ Scheduled maintenance tasks
- ✅ Background health checks
- ✅ Nightly/weekly reports

### When to Use Delegation
- ✅ Feature development (backend + frontend parallel)
- ✅ Bug investigation & fixing
- ✅ Writing tests for new code
- ✅ Documentation updates
- ✅ Code reviews & refactoring

### Coordination Tips
1. **Break down tasks** - One specialist per focused task
2. **Run in parallel** - Independent tasks (max 3)
3. **Sequence dependent** - Backend → Frontend → Tests
4. **Use context** - Pass file paths, error messages, requirements
5. **Review output** - Agents report back, you decide

---

## 📊 Monitoring & Reports

### Daily Reports (7:00 AM)
- ✅ QA status
- 📊 Performance metrics

### Weekly Reports (Sunday 8:00 AM)
- 🔒 Security audit
- 📦 Dependency updates

### Every 6 Hours
- 🐍 Collector health

### All Reports Delivered To
- Telegram (current chat)
- Can configure different channels per job

---

## 🛠️ Management Commands

### View Agent Status
```bash
# List all cron jobs
hermes cron list

# Check specific job
hermes cron status <job_id>

# View job logs
hermes cron logs <job_id>
```

### Modify Agents
```bash
# Update schedule
hermes cron update <job_id> --schedule "0 8 * * *"

# Change delivery target
hermes cron update <job_id> --deliver telegram

# Pause temporarily
hermes cron pause <job_id>
```

---

## 🔍 Troubleshooting

### Cron Job Not Running
1. Check if enabled: `hermes cron list`
2. Verify schedule syntax (cron format)
3. Check last run status
4. Review error logs

### Delegation Not Working
1. Verify skill exists: `hermes skills list pricehunt`
2. Check toolsets enabled
3. Ensure context is clear
4. Try simpler task first

### Agent Conflicts
- Max 3 concurrent delegations
- Cron jobs run sequentially if same workdir
- Avoid delegating during cron build (6 AM)

---

## 📈 Metrics & Insights

Track agent effectiveness:
- Bugs caught by QA Monitor
- Security issues found
- Performance improvements
- Test coverage increase
- Documentation completeness

Review weekly and adjust:
- Schedule timing
- Report format
- Specialist skills
- Coordination flow

---

## 🎓 Skills Reference

All specialist skills located at:
```
~/.hermes/skills/pricehunt/
├── pricehunt-backend-dev/
├── pricehunt-frontend-dev/
├── pricehunt-test-engineer/
├── pricehunt-bug-hunter/
└── pricehunt-doc-writer/
```

Inspect skill:
```bash
hermes skills inspect pricehunt-backend-dev
```

---

**System Status: ✅ Active**
- 4 Autonomous Agents Running
- 5 Specialist Skills Ready
- Delivery: Telegram (@AGR)
