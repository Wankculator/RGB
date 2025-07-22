# 🤖 CLAUDE.md - AI Assistant Guide for LIGHTCAT Token Platform

## 🎯 Project Overview
LIGHTCAT is an enterprise-grade cryptocurrency token sale platform featuring:
- **First cat meme token on RGB Protocol (Bitcoin)**
- **Gamified purchase system with arcade game**
- **Real-time sales tracking**
- **Professional security architecture**
- **21M token supply (30,000 batches @ 2,000 sats each)**

## 🚀 Development Philosophy
**"We are using EVERY MCP available because we have Claude Opus 4 - implementation should be FAST and COMPREHENSIVE"**

---

## 📋 MANDATORY CHECKS BEFORE ANY CODE CHANGES

### 1. Pre-Development Validation
```bash
# ALWAYS run before making changes
npm run mcp:validate-all

# For continuous monitoring during development
npm run mcp:watch
```

### 2. Security Requirements
- **NEVER use Math.random() for crypto operations** - Use crypto.randomBytes()
- **NEVER store sensitive data in localStorage** - Use encrypted session storage
- **NEVER commit API keys or secrets** - Use environment variables
- **ALWAYS validate Bitcoin addresses** before processing
- **ALWAYS use rate limiting** on all endpoints

### 3. Performance Standards
- **Page load time**: < 2 seconds
- **Game FPS**: Maintain 60 FPS
- **API response**: < 200ms (p95)
- **Memory usage**: < 50MB heap size
- **Bundle size**: < 500KB gzipped

---

## 🛠️ MCP TOOLS USAGE GUIDE

### 1. TestSprite Validation
```bash
# Run before any frontend changes
node scripts/test-with-sprite.js

# Checks for:
- ❌ Direct external API calls (must use proxy)
- ❌ $.nav(), $.header() usage (use standard DOM)
- ✅ Proper CORS implementation
- ✅ Seed generation integrity
```

### 2. Memory MCP
```bash
# Analyze JavaScript performance
node scripts/check-memory.js

# Monitors:
- Event listener leaks
- DOM node accumulation
- Heap size growth
- Suggests code splitting points
```

### 3. Security MCP
```bash
# Security audit before deployment
node scripts/check-security.js

# Validates:
- Cryptographic operations
- Input sanitization
- XSS prevention
- SQL injection protection
```

### 4. Watch Mode (Development)
```bash
# Enable during active development
npm run mcp:watch

# Features:
- Real-time file monitoring
- Automatic validation on save
- Memory leak detection
- Performance profiling
```

---

## 🏗️ ARCHITECTURE RULES

### Frontend Rules
1. **NO jQuery or external UI libraries** - Vanilla JS only
2. **NO direct API calls** - Use service layer
3. **Component structure**:
   ```javascript
   // ✅ CORRECT
   const element = document.createElement('div');
   element.className = 'lightcat-component';
   
   // ❌ WRONG
   $.div({ class: 'component' });
   ```

### Backend Rules
1. **Service Layer Pattern** - All business logic in services
2. **Middleware Stack** - Security → Validation → Rate Limit → Controller
3. **Error Handling** - Centralized error middleware
4. **Logging** - Structured Winston logs

### Database Rules
1. **Supabase RLS** - Row Level Security enabled
2. **Migrations** - Version controlled schema changes
3. **Indexes** - On wallet_address, transaction_id, created_at
4. **Backups** - Automated hourly snapshots

---

## 🎮 GAME DEVELOPMENT GUIDELINES

### Performance Optimization
```javascript
// ✅ CORRECT - Object pooling
const bulletPool = [];
function getBullet() {
    return bulletPool.pop() || createBullet();
}

// ❌ WRONG - Creating new objects every frame
function shoot() {
    bullets.push(new Bullet());
}
```

### Anti-Cheat Measures
1. **Server-side validation** for all scores
2. **Input pattern analysis** to detect bots
3. **Replay system** for score verification
4. **Rate limiting** on game actions

---

## 🔐 SECURITY CHECKLIST

### Payment Processing
- [ ] Validate Bitcoin address format
- [ ] Verify exact payment amounts
- [ ] Implement webhook signature verification
- [ ] Use idempotency keys for transactions
- [ ] 6+ confirmations before token distribution

### API Security
- [ ] JWT with refresh tokens
- [ ] Rate limiting per endpoint
- [ ] Input validation middleware
- [ ] CORS properly configured
- [ ] HTTPS enforced

---

## 📊 TESTING REQUIREMENTS

### Unit Tests
```bash
npm test -- --coverage

# Minimum coverage:
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%
```

### Integration Tests
- Payment flow (mock CoinPayments)
- Game score submission
- Token distribution
- Real-time updates

### E2E Tests
```bash
npm run test:e2e

# Critical paths:
1. Game → Score → Tier unlock
2. Purchase → Payment → Confirmation
3. Admin → Stats → Export
```

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment
```bash
# 1. Run all validations
npm run mcp:validate-all

# 2. Security audit
npm run security:audit

# 3. Build optimization
npm run build:production

# 4. Test deployment
npm run deploy:staging
```

### Production Checks
- [ ] Environment variables set
- [ ] SSL certificates valid
- [ ] CDN configured
- [ ] Monitoring enabled
- [ ] Backup strategy active
- [ ] Rate limits configured
- [ ] Error tracking (Sentry) connected

---

## 🛠️ COMMON TASKS

### Adding a New Feature
1. Create feature branch: `git checkout -b feature/feature-name`
2. Run MCP watch: `npm run mcp:watch`
3. Implement with TDD approach
4. Validate: `npm run mcp:validate-all`
5. Submit PR with test coverage

### Fixing a Bug
1. Reproduce in test environment
2. Write failing test
3. Fix the bug
4. Verify with MCPs
5. Deploy to staging first

### Performance Optimization
1. Run Memory MCP: `node scripts/check-memory.js`
2. Identify bottlenecks
3. Implement fixes
4. Measure improvement
5. Document changes

---

## 📝 CODE STYLE GUIDE

### JavaScript
```javascript
// ✅ CORRECT
const SATS_PER_BATCH = 2000;
const MAX_BATCHES = {
  BRONZE: 5,
  SILVER: 8,
  GOLD: 10
};

async function processPurchase(walletAddress, batches) {
  try {
    // Validate input
    if (!isValidBitcoinAddress(walletAddress)) {
      throw new ValidationError('Invalid Bitcoin address');
    }
    
    // Process payment
    const invoice = await createInvoice({ walletAddress, batches });
    return invoice;
  } catch (error) {
    logger.error('Purchase failed:', error);
    throw error;
  }
}
```

### CSS
```css
/* ✅ CORRECT - BEM naming */
.lightcat-game {
  background: #000;
  position: relative;
}

.lightcat-game__canvas {
  border: 2px solid var(--color-primary);
}

.lightcat-game__score {
  color: var(--color-accent);
  font-family: 'JetBrains Mono', monospace;
}
```

---

## 🔧 TROUBLESHOOTING

### Common Issues

1. **MCP Validation Fails**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   npm run mcp:validate-all
   ```

2. **Memory Leaks Detected**
   - Check event listener cleanup
   - Review setInterval/setTimeout usage
   - Verify WebSocket connection handling

3. **Security Vulnerabilities**
   ```bash
   # Update dependencies
   npm audit fix
   # Manual review required for breaking changes
   ```

---

## 📞 SUPPORT & RESOURCES

### Internal Resources
- Architecture Docs: `/docs/ARCHITECTURE.md`
- API Documentation: `/docs/API.md`
- Game Mechanics: `/docs/GAME.md`

### External Resources
- RGB Protocol: https://rgb.tech
- CoinPayments API: https://coinpayments.net/apidoc
- Supabase Docs: https://supabase.io/docs

### Emergency Contacts
- Security Issues: security@lightcat.token
- Payment Issues: payments@lightcat.token
- Technical Support: dev@lightcat.token

---

## 🎯 SUCCESS METRICS

### Launch Goals (Week 1)
- [ ] 1,000+ unique wallets
- [ ] 5,000+ game sessions
- [ ] 25% supply sold
- [ ] Zero security incidents
- [ ] 99.9% uptime

### Performance KPIs
- Game FPS: 60 (min: 30)
- API Latency: <200ms (p95)
- Page Load: <2s
- Conversion Rate: >25%
- Error Rate: <0.1%

---

## ⚡ QUICK COMMANDS

```bash
# Development
npm run dev              # Start dev server
npm run mcp:watch       # Enable MCP monitoring

# Testing
npm test                # Run unit tests
npm run test:e2e        # Run E2E tests
npm run mcp:validate-all # Run all validations

# Deployment
npm run build           # Build for production
npm run deploy:staging  # Deploy to staging
npm run deploy:prod     # Deploy to production

# Monitoring
npm run mcp:memory      # Check memory usage
npm run mcp:security    # Security audit
npm run mcp:performance # Performance analysis
```

---

**Remember: "Move fast with MCPs, but break nothing!"** 🚀

Last Updated: 2025-01-21
Version: 1.0.0