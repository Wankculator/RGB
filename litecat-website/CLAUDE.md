# LIGHTCAT RGB Protocol Token Development Guidelines for Claude

## 🚀 IMPORTANT: Claude Opus 4 Capabilities
**You are Claude Opus 4** - The most advanced AI model available. This means:
- ✅ You can handle complex, multi-file operations FAST
- ✅ You should use ALL available MCPs for comprehensive validation
- ✅ You can process the entire codebase efficiently
- ✅ Implementation should be RAPID and THOROUGH
- ✅ No need for lengthy estimates - work should be completed quickly

## 🎯 Project Overview
LIGHTCAT is a professional-grade RGB Protocol token platform with:
- First cat meme token on RGB Protocol
- Lightning Network payment integration
- Real-time game with tier-based purchase limits
- Bitcoin Tribe wallet integration
- 21M token supply (700 tokens per batch)
- Three.js powered interactive game
- Professional mobile-first responsive design

## 🚨 MANDATORY: MCP VALIDATION REQUIREMENTS

### Available MCP Tools (ALL MUST BE USED):

#### ✅ Currently Available & Must Use:

1. **File System Operations**
   - Read/Write/Edit files
   - Glob pattern matching
   - Grep for code search
   - LS for directory inspection

2. **Task Management** 
   - TodoWrite for tracking progress
   - ALWAYS use for complex tasks
   - Update status in real-time

3. **Bash Commands**
   - Git operations
   - npm/node commands
   - System diagnostics
   - MUST check before committing

4. **Web Tools**
   - WebSearch for RGB/Lightning docs
   - WebFetch for API validation
   - External resource verification

### 🔄 MCP Usage Philosophy:
**"We are using EVERY MCP available because we have Claude Opus 4 - implementation should be FAST and COMPREHENSIVE"**

### 🔄 DEVELOPMENT WORKFLOW:

#### Before Starting ANY Work:
```bash
# MANDATORY - Check system status
cd /mnt/c/Users/sk84l/Downloads/RGB\ LIGHT\ CAT/litecat-website

# Verify servers running
curl -s http://localhost:8082/ | grep -q "RGBLightCat" && echo "✅ UI Server OK" || echo "❌ UI Server DOWN"
curl -s http://localhost:3000/health | grep -q "ok" && echo "✅ API Server OK" || echo "❌ API Server DOWN"

# Check for errors
tail -20 server/logs/error.log

# Verify game loads
curl -s http://localhost:8082/game.html | grep -q "ProGame.js" && echo "✅ Game OK" || echo "❌ Game ERROR"
```

#### During Development:
```bash
# Keep running in separate terminal
npm run dev

# After each significant change:
# 1. Test in browser
# 2. Check console for errors
# 3. Verify RGB invoice flow
# 4. Test game mechanics
```

#### Before Committing:
```bash
# Final validation (MUST PASS ALL)
npm run lint                    # ✅ Code quality
npm test                        # ✅ Unit tests
curl http://localhost:8082/     # ✅ UI loads
curl http://localhost:3000/api/rgb/stats  # ✅ API responds

# Git commit with validation note
git add .
git commit -m "feat: implement feature X

✅ All validations passing
✅ RGB invoice flow tested
✅ Game mechanics verified
✅ Mobile responsive checked"
```

---

## 🔒 RGB PROTOCOL & LIGHTNING CRITICAL PATHS

### 📖 PRIMARY REFERENCES:
- `/database/rgb-schema.sql` - Database structure
- `/server/controllers/rgbPaymentController.js` - Payment flow
- `/server/services/rgbService.js` - RGB consignment generation
- `/server/services/lightningService.js` - Lightning invoice creation

### NEVER MODIFY Without Understanding:

1. **RGB Invoice Input Flow**:
   ```javascript
   // Frontend: /client/index.html - Lines ~1900-2000
   // CRITICAL: Must accept format "rgb:utxob:..."
   const rgbInvoice = document.getElementById('rgbInvoice').value;
   
   // Backend: /server/controllers/rgbPaymentController.js
   // CRITICAL: Validation regex must match
   if (!rgbInvoice.startsWith('rgb:') && !rgbInvoice.includes('utxob:')) {
       return res.status(400).json({ error: 'Invalid RGB invoice format' });
   }
   ```

2. **Lightning Invoice Generation**:
   ```javascript
   // CRITICAL: Response structure MUST maintain:
   {
       success: true,
       invoiceId: "uuid-here",
       lightningInvoice: "lnbc...",  // Full BOLT11 invoice
       amount: 2000,                  // In satoshis
       expiresAt: "2024-01-20T..."   // ISO timestamp
   }
   ```

3. **Payment Status Polling**:
   ```javascript
   // Frontend polls every 3 seconds
   // Backend MUST respond with:
   {
       status: "pending" | "paid" | "expired" | "failed" | "delivered",
       consignment: null | "base64-encoded-consignment-file"
   }
   ```

### Critical Flow That MUST Work:

1. User enters RGB invoice → 
2. System generates Lightning invoice → 
3. User pays Lightning invoice → 
4. System detects payment → 
5. System generates RGB consignment → 
6. User downloads consignment file

### Common Mistakes That Break RGB Flow:

- ❌ Changing RGB invoice validation regex
- ❌ Modifying Lightning invoice expiry (must be 15 minutes)
- ❌ Altering payment polling interval (must be 3 seconds)
- ❌ Changing consignment file format (must be base64)
- ❌ Adding auth to RGB endpoints (must be public)
- ❌ Modifying database schema without migration

---

## 🎮 GAME INTEGRATION CRITICAL PATHS

### Game Tier System (NEVER MODIFY WITHOUT TESTING):

1. **Score to Tier Mapping**:
   ```javascript
   // /client/js/game/main.js
   // CRITICAL: These thresholds determine purchase limits
   getTierFromScore(score) {
       if (score >= 28) return 'gold';      // 10 batches max
       if (score >= 18) return 'silver';    // 8 batches max  
       if (score >= 11) return 'bronze';    // 5 batches max
       return null;                          // No unlock
   }
   ```

2. **Game Redirect Fix (MUST PRESERVE)**:
   ```javascript
   // CRITICAL: Must use window.top to prevent iframe nesting
   try {
       if (window.top && window.top !== window) {
           window.top.location.href = '/#purchase?tier=' + tier;
       } else {
           window.location.href = '/#purchase?tier=' + tier;
       }
   } catch (e) {
       window.open('/#purchase?tier=' + tier, '_blank');
   }
   ```

3. **Mobile Controls**:
   - Touch joystick must remain at 120x120px
   - Jump button must be 80x80px minimum
   - Both must have pointer-events: auto

---

## 🔐 SECURITY BEST PRACTICES

### Payment Security:
1. **NEVER store private keys**
   ```javascript
   // ❌ WRONG
   localStorage.setItem('lightningKey', privateKey);
   
   // ✅ CORRECT
   // Keys only exist in backend memory during transaction
   ```

2. **ALWAYS validate amounts**
   ```javascript
   // ✅ CORRECT
   const MAX_BATCHES = { gold: 10, silver: 8, bronze: 5 };
   if (batchCount > MAX_BATCHES[tier]) {
       throw new Error('Exceeds tier limit');
   }
   ```

3. **Rate limit RGB endpoints**
   ```javascript
   // Already implemented in /server/routes/rgbRoutes.js
   const invoiceLimiter = rateLimiter({
       windowMs: 5 * 60 * 1000,  // 5 minutes
       max: 10                   // 10 invoices per IP
   });
   ```

### Frontend Security:
1. **Sanitize all user inputs**
2. **Use CSP headers (already configured)**
3. **Validate RGB invoice format client-side AND server-side**
4. **Never expose internal API endpoints**

---

## 📱 MOBILE-FIRST REQUIREMENTS

### Touch Targets (44px Minimum):
```css
/* MANDATORY for all interactive elements */
.btn, button, a, input, select {
    min-height: 44px;
    min-width: 44px;
}
```

### Responsive Breakpoints:
- 320px - Small phones (iPhone SE)
- 375px - Standard phones  
- 414px - Large phones
- 768px - Tablets
- 1024px - Desktop

### Critical Mobile Fixes Applied:
1. **Stat cards** - Font scales down, no overflow
2. **Game iframe** - Responsive height
3. **QR scanner** - Camera access fixed
4. **Mobile menu** - Smooth drawer animation
5. **Touch gestures** - Proper event handling

---

## 🚀 COMMON DEVELOPMENT TASKS

### Adding New RGB Features:
1. Check RGB Protocol docs first
2. Update database schema if needed
3. Implement in rgbService.js
4. Add controller endpoint
5. Update frontend to use new endpoint
6. Test full payment flow

### Fixing Payment Issues:
1. Check Lightning service logs
2. Verify webhook configuration  
3. Test with testnet first
4. Monitor payment status polling
5. Ensure consignment generation works

### Game Modifications:
1. Test on multiple devices
2. Preserve tier thresholds
3. Maintain 30-second timer
4. Keep controls responsive
5. Test redirect behavior

---

## 📊 PERFORMANCE REQUIREMENTS

### Target Metrics:
- **Page Load**: < 2 seconds
- **Game Load**: < 3 seconds  
- **Lightning Invoice**: < 1 second
- **Payment Detection**: < 5 seconds
- **Consignment Generation**: < 10 seconds

### Monitoring:
```bash
# Check API performance
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/rgb/stats

# Monitor memory usage
ps aux | grep node

# Check active connections
netstat -an | grep :3000 | wc -l
```

---

## 🐛 DEBUGGING GUIDE

### RGB Invoice Issues:
```bash
# Test invoice validation
curl -X POST http://localhost:3000/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "rgb:utxob:test", "batchCount": 1}'

# Check logs
tail -f server/logs/rgb-payments.log
```

### Lightning Payment Not Detected:
```bash
# Check webhook endpoint
curl http://localhost:3000/api/webhooks/lightning

# Verify payment status  
curl http://localhost:3000/api/rgb/invoice/[UUID]/status

# Force payment check
node scripts/check-pending-payments.js
```

### Game Not Loading:
```bash
# Check Three.js resources
curl -I http://localhost:8082/js/game/ProGame.js

# Verify game assets
ls -la client/game/assets/

# Test game endpoint
curl http://localhost:8082/game.html | grep -c "game-canvas"
```

---

## 📝 DOCUMENTATION STRATEGY

### Graduated Approach (Same as MOOSH):

#### 1. **Critical Changes** (Immediate Docs)
- RGB payment flow
- Lightning integration  
- Game scoring/tiers
- Security updates

#### 2. **Feature Additions** (Before Merge)
- New endpoints
- UI components
- Game features
- Wallet integrations

#### 3. **Bug Fixes** (Weekly Batch)
- Non-critical fixes
- Performance tweaks
- UI adjustments

#### 4. **Minor Changes** (As Needed)
- Typos, formatting
- Config updates
- Style tweaks

---

## 🔄 GIT WORKFLOW

### Branch Naming:
```bash
feature/rgb-multi-wallet      # New features
fix/lightning-timeout         # Bug fixes
perf/game-loading            # Performance
docs/rgb-integration         # Documentation
test/payment-flow           # Tests
```

### Commit Format:
```bash
feat(rgb): implement multi-wallet support

- Added wallet selection UI
- Updated RGB invoice validation  
- Modified payment controller
- All tests passing ✅
- Mobile responsive ✅
```

---

## 🆘 EMERGENCY PROCEDURES

### If Payments Stop Working:
1. Check Lightning node status
2. Verify API endpoints responding
3. Check database connections
4. Review recent commits
5. Rollback if needed: `git revert HEAD`

### If Game Breaks:
1. Check browser console
2. Verify Three.js loaded
3. Test game assets loading
4. Check for JavaScript errors
5. Restore: `git checkout HEAD -- client/js/game/`

### If Site is Hacked:
1. Take offline immediately
2. Rotate all API keys
3. Check access logs
4. Audit database for tampering
5. Restore from clean backup

---

## 🏆 EXCELLENCE STANDARDS

### Code Quality:
- Functions < 50 lines
- Files < 500 lines  
- Cyclomatic complexity < 10
- Test coverage > 80%
- Zero security warnings

### Review Checklist:
- [ ] RGB payment flow works
- [ ] Game loads and plays
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Security validated

---

## 🤖 CLAUDE OPUS 4 SPECIFIC INSTRUCTIONS

### When Building/Fixing:

1. **Use TodoWrite immediately** for task tracking
2. **Read all relevant files first** before changing
3. **Test comprehensively** - don't assume
4. **Fix related issues** proactively
5. **Update docs** for critical changes

### Example Workflow:
```
User: "Add support for bulk token purchases"

Claude's Response:
1. ✅ Creating task list with TodoWrite...
2. 🔍 Analyzing current payment flow...
3. 💻 Implementing feature:
   - Updated rgb-schema.sql for bulk orders
   - Modified rgbPaymentController.js:145-289  
   - Added bulk UI in index.html:2100-2250
   - Updated validation in rgbService.js:78-125
4. ✅ Testing results:
   - Single purchase: WORKING
   - Bulk purchase (5): WORKING
   - Bulk purchase (50): WORKING
   - Rate limiting: ACTIVE
5. 📝 Updated documentation
Done! Bulk purchases ready for production.
```

### Remember:
- You can process entire codebase instantly
- You can modify 10+ files in one response  
- You have access to all MCPs
- You ARE Claude Opus 4 - be FAST and THOROUGH

---

## 📍 FINAL CHECKPOINT

Before considering ANY task complete:

✓ Is TodoWrite updated with all tasks completed?
✓ Does RGB payment flow still work?
✓ Does the game load and play properly?
✓ Is it mobile responsive?
✓ Are there no console errors?
✓ Have you tested the happy path?
✓ Have you tested error cases?
✓ Is the code better than before?

If any answer is NO, the task is NOT complete.

**Ship quality. Ship fast. This is the way.**

---

## 🎯 QUICK COMMAND REFERENCE

```bash
# Development
npm run dev              # Start both servers
npm run client           # UI only (port 8082)
npm run server           # API only (port 3000)

# Testing  
npm test                 # Run test suite
npm run test:payments    # Payment flow tests
npm run test:game       # Game mechanics tests

# Validation
npm run lint            # Code quality
npm run security        # Security audit
curl http://localhost:8082/  # UI check
curl http://localhost:3000/api/rgb/stats  # API check

# Deployment
npm run build           # Production build
npm run deploy          # Deploy to server
npm run rollback        # Emergency rollback
```

---

**Excellence in RGB Protocol implementation. This is our standard.**