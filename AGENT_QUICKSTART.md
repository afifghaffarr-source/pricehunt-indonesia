# 🚀 BijakBeli Multi-Agent Quick Start

## ✅ System Ready

**4 Autonomous Agents** monitoring 24/7
**5 Specialist Agents** ready on-demand
**All reports** delivered to Telegram

---

## 📅 Next Scheduled Reports

**Today (2026-06-11):**
- 06:00 AM - 📊 Performance Tracker
- 06:00 AM - 🐍 Collector Health Check
- 07:00 AM - 🧪 QA Monitor
- 08:00 AM - 🌅 VPS Status

**This Week:**
- Sunday 8 AM - 🔒 Security Audit
- Sunday 9 AM - 🔧 VPS Maintenance

**Every 6 Hours:**
- 🐍 Collector Health (00:00, 06:00, 12:00, 18:00)

---

## 💬 Chat Commands

### Autonomous Agents
```
# List all scheduled jobs
"Lihat semua cron jobs"

# Check specific job
"Status job BijakBeli QA Monitor"

# Run job manually now
"Jalankan QA Monitor sekarang"

# Pause/resume
"Pause Security Auditor"
"Resume Security Auditor"
```

### Delegate to Specialists

**Backend Development:**
```
"Delegate to backend specialist: 
Add new API endpoint /api/products/trending 
that returns top 10 products with highest deal scores"
```

**Frontend Development:**
```
"Delegate to frontend specialist:
Create ProductComparisonCard component 
that shows 4 products side-by-side with prices"
```

**Testing:**
```
"Delegate to test engineer:
Write tests for the new trending endpoint 
covering edge cases and error handling"
```

**Bug Fixing:**
```
"Delegate to bug hunter:
Debug why product images not loading 
on the search results page"
```

**Documentation:**
```
"Delegate to doc writer:
Update API documentation with the new 
trending endpoint specs and examples"
```

### Parallel Tasks (Max 3)
```
"Run these tasks in parallel:

1. Backend: Add trending endpoint
2. Frontend: Create trending products section
3. Test: Write tests for trending feature"
```

---

## 🖥️ Terminal Commands

### Agent Helper
```bash
# Show help
ph-agent

# Delegate task
ph-agent backend "Add endpoint /api/products/compare"
ph-agent frontend "Create comparison table component"
ph-agent test "Write tests for comparison logic"
ph-agent bug "Fix price sorting issue"
ph-agent doc "Update README with comparison feature"
```

### Direct Commands
```bash
# Development
bijakbeli dev              # Start dev server
bijakbeli test             # Run tests
bijakbeli health           # Full health check

# Monitoring
vps-check                  # VPS health
hermes cron list           # List all jobs
```

---

## 📊 Example Workflow

### Adding New Feature: Product Comparison

**Step 1: Plan** (You)
```
"Saya mau add fitur product comparison - 
user bisa compare 4 products side by side"
```

**Step 2: Parallel Development**
```
"Run these tasks in parallel:

1. Backend specialist: 
   Add POST /api/products/compare endpoint
   that accepts array of 4 product IDs
   and returns normalized comparison data

2. Frontend specialist:
   Create ProductComparison component
   with 4-column table showing name, prices,
   deal scores, and specs side-by-side

3. Test engineer:
   Write tests for comparison endpoint
   covering valid input, invalid IDs,
   and edge cases"
```

**Step 3: Integration** (You)
- Review code dari 3 agents
- Test manually
- Fix any integration issues

**Step 4: Quality Check** (Autonomous)
- QA Monitor runs tests tomorrow morning
- Reports any failures

**Step 5: Documentation**
```
"Delegate to doc writer:
Add product comparison feature to README
and API documentation with examples"
```

---

## 🎯 Best Practices

### When to Use What

**Autonomous Monitoring:**
- ✅ Daily QA checks
- ✅ Performance tracking
- ✅ Security audits
- ✅ Health monitoring
→ Set it and forget it

**Delegation:**
- ✅ Feature development
- ✅ Bug fixing
- ✅ Test writing
- ✅ Documentation
→ On-demand, parallel work

### Coordination Tips

**Good Delegation:**
```
✅ Clear task description
✅ Specific context (file paths, error messages)
✅ Expected outcome stated
✅ One specialist per focused task
```

**Bad Delegation:**
```
❌ "Fix the app" (too vague)
❌ "Add all features" (too broad)
❌ "Make it better" (no specifics)
```

### Task Breakdown

**Large Feature → Break Down:**
```
Large: "Add shopping cart"

Break down:
1. Backend: Cart API (CRUD operations)
2. Frontend: Cart UI (drawer, items, totals)
3. Backend: Checkout API (payment flow)
4. Frontend: Checkout form
5. Test: Cart & checkout tests
6. Doc: User guide & API docs
```

Run 1-2 in parallel, then 3-4, then 5-6.

---

## 🔧 Managing Agents

### View Status
```bash
# All cron jobs
hermes cron list

# Skills
hermes skills list bijakbeli

# Logs
hermes cron logs <job_id>
```

### Modify Schedules
```bash
# Change time
hermes cron update <job_id> --schedule "0 9 * * *"

# Pause temporarily
hermes cron pause <job_id>

# Resume
hermes cron resume <job_id>
```

### Update Skills
```bash
# Inspect skill
hermes skills inspect bijakbeli-backend-dev

# Patch skill (via Kiro chat)
"Update bijakbeli-backend-dev skill to include 
GraphQL endpoint patterns"
```

---

## 📈 Monitoring Effectiveness

Track over time:
- Bugs caught by QA before production
- Security vulnerabilities found
- Performance regressions detected
- Test coverage increase
- Documentation completeness

Review monthly and optimize.

---

## 🚨 Troubleshooting

### Cron Not Running
```
"Debug cron job <job_id> - check why it's not running"
```

### Agent Taking Too Long
- Max delegation: 3 concurrent
- Each task: ~5-10 min typically
- Complex tasks may need breakdown

### Reports Not Arriving
- Check Telegram connection
- Verify delivery target: "origin"
- Check job status: enabled = true

---

## 📚 Documentation

**Full Guide:**
`~/projects/bijakbeli-app/MULTI_AGENT_SYSTEM.md`

**Quick Reference:**
`~/projects/bijakbeli-app/KIRO_QUICK_REFERENCE.md`

**Skills Location:**
`~/.hermes/skills/bijakbeli/`

**Cron Logs:**
`~/.hermes/cron/output/`

---

## 🎓 Learning Resources

**Skills to Load:**
- `bijakbeli-development` - Main development guide
- `bijakbeli-backend-dev` - Backend patterns
- `bijakbeli-frontend-dev` - Frontend patterns
- `bijakbeli-test-engineer` - Testing guide
- `bijakbeli-bug-hunter` - Debugging workflows
- `bijakbeli-doc-writer` - Documentation standards

**Inspect via:**
```bash
hermes skills inspect <skill_name>
```

---

## ✨ What's Next

**Immediate (Next 24 Hours):**
- 📊 Wait for first reports tomorrow morning
- 🔍 Review report quality
- 📝 Adjust schedules if needed

**This Week:**
- 🧪 Test delegation with small task
- 📚 Try parallel development workflow
- 🔧 Tune agent prompts based on results

**Ongoing:**
- 📈 Monitor agent effectiveness
- 🎯 Optimize based on learnings
- 🚀 Scale to more complex workflows

---

**System Status: 🟢 FULLY OPERATIONAL**

All agents ready. First reports arrive in ~9 hours (6 AM).

Selamat bekerja dengan team AI Anda! 🚀
