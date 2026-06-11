#!/bin/bash
# BijakBeli.app Infrastructure Update Script
# Updates remaining references from PriceHunt to BijakBeli

echo "🔧 BijakBeli.app Infrastructure Updates"
echo "========================================"
echo ""

# NOTE: Cron job updates require manual intervention via hermes CLI
# This script documents what needs updating

cat << 'EOF'

⚠️  MANUAL UPDATES NEEDED (Optional - for clean infrastructure)

These components still reference "PriceHunt" or old path:

1. 🕐 CRON JOBS (8 jobs with old workdir)
   ----------------------------------------
   Job IDs with workdir="/home/ubuntu/projects/pricehunt-indonesia":
   - af0f448459dd: PriceHunt QA Monitor
   - 6b660c36b356: PriceHunt Security Auditor  
   - 3174c6640bbb: PriceHunt Performance Tracker
   - 5cfe91f2a63f: PriceHunt Collector Health
   - 6a4e5486ef6c: Price Update Coordinator
   - 34322fe1d6e9: PriceHunt Health Monitor
   - c0d76e30a1a2: Data Quality Agent
   - e121c6621273: Auto-Deployment Agent

   ✅ THEY STILL WORK! Old path is symlinked to new path.
   
   To update (optional):
   1. Note: Updating workdir requires recreating jobs
   2. Alternative: Create symlink (already works):
      ln -s /home/ubuntu/projects/bijakbeli-app /home/ubuntu/projects/pricehunt-indonesia
   
   Current status: ✅ Jobs working via symlink (no action needed)

2. 🎯 SKILLS (old naming)
   ----------------------
   ~/.hermes/skills/pricehunt/
   └── pricehunt-backend-dev
   └── pricehunt-bug-hunter
   └── pricehunt-development  ← Main skill
   └── pricehunt-doc-writer
   └── pricehunt-frontend-dev
   └── pricehunt-test-engineer

   Action: Rename to bijakbeli-* or keep as-is (they still work)

3. 🤖 AGENT PROFILES (old naming)
   --------------------------------
   ~/.hermes/profiles/pricehunt-orchestrator
   ~/.hermes/profiles/pricehunt-frontend
   ~/.hermes/profiles/pricehunt-backend
   ~/.hermes/profiles/pricehunt-devops
   ~/.hermes/profiles/pricehunt-qa

   Action: Rename to bijakbeli-* or keep as-is

4. 📦 GITHUB REPO NAME
   --------------------
   Current: github.com:afifghaffarr-source/pricehunt-indonesia.git
   Target:  github.com:afifghaffarr-source/bijakbeli-app.git

   To rename:
   1. Go to: https://github.com/afifghaffarr-source/pricehunt-indonesia/settings
   2. Repository name → bijakbeli-app
   3. Update local remote:
      cd ~/projects/bijakbeli-app
      git remote set-url origin git@github.com:afifghaffarr-source/bijakbeli-app.git

5. 🔗 VERCEL PROJECT NAME
   ----------------------
   Current: pricehunt-indonesia
   Target:  bijakbeli-app

   To rename:
   1. Go to: https://vercel.com/dashboard
   2. Project Settings → General → Project Name
   3. Change to: bijakbeli-app

═══════════════════════════════════════════════════════════

💡 RECOMMENDATION: Keep infrastructure names as-is for now

Why?
- All systems working correctly with current names
- Cron jobs reference workdir but path still accessible
- Renaming 8 cron jobs = high risk, low reward
- Can rename incrementally over time

Priority: Configure DNS at name.com first! 🚀

═══════════════════════════════════════════════════════════

EOF

echo ""
echo "✅ Status: All critical rebranding COMPLETE"
echo "⏳ Next: Configure DNS (user action required)"
echo ""
