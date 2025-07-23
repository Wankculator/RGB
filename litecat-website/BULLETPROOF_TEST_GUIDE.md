# 🛡️ LIGHTCAT Bulletproof Testing Guide

## 🚀 Quick Start
```bash
# 1. Ensure both servers are running
curl http://localhost:8082/          # UI Server (should see homepage)
curl http://localhost:3000/health    # API Server (should see {"status":"ok"})

# 2. Open browser
chrome http://localhost:8082/        # Or your preferred browser
```

## ✅ Complete Test Checklist

### 1️⃣ **RGB Invoice Validation Tests**

#### Test 1.1: Valid RGB Invoice Format
1. Navigate to http://localhost:8082/#purchase
2. Enter email: `test@example.com` (optional)
3. Enter RGB invoice: `rgb:utxob:2Uw5QH-hqGX93Rh-YU8EqpJP-fRcyJPor-EjBvdQgc-BiXWNgF`
4. **Expected**: ✅ No validation error
5. **Verify**: Form accepts the input

#### Test 1.2: Invalid RGB Invoice Format
1. Try these invalid formats:
   - `bitcoin:bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh` (Bitcoin address)
   - `lnbc100n1p3` (Lightning invoice)
   - `random text`
   - Empty field
2. **Expected**: ❌ Error message "Invalid RGB invoice format"
3. **Verify**: Cannot proceed to payment

#### Test 1.3: QR Code Scanner
1. Click "Scan QR" button
2. **Expected**: 
   - Camera permission prompt
   - Scanner interface appears
   - "Upload QR Image" button visible
3. **Test**: Upload a QR code image or use camera
4. **Verify**: Scanned data populates the RGB invoice field

---

### 2️⃣ **Lightning Payment Flow Tests**

#### Test 2.1: Create Lightning Invoice
1. Enter valid RGB invoice
2. Select 1 batch (default)
3. Click "CREATE LIGHTNING INVOICE"
4. **Expected**:
   - Loading state appears
   - Payment modal opens
   - Lightning invoice displayed
   - QR code generated
   - Amount shows: 2,000 sats
   - "Waiting for payment..." message

#### Test 2.2: Payment Auto-Complete (Mock)
1. After creating invoice, wait 5 seconds
2. **Expected**:
   - Status changes to "Payment confirmed!"
   - Green success message
   - "Tokens will be delivered shortly" text
3. **Verify**: No errors in console

#### Test 2.3: Multiple Batch Purchase
1. Use batch selector (+/-) buttons
2. Test amounts:
   - 1 batch = 700 tokens = 2,000 sats
   - 5 batches = 3,500 tokens = 10,000 sats
   - 10 batches = 7,000 tokens = 20,000 sats
3. **Verify**: Amounts calculate correctly

#### Test 2.4: Copy Invoice Function
1. Click "Copy Invoice" button
2. **Expected**: "Invoice copied to clipboard!" alert
3. **Verify**: Can paste the invoice elsewhere

---

### 3️⃣ **Game Mechanics Tests**

#### Test 3.1: Game Loading
1. Navigate to http://localhost:8082/#game
2. **Expected**:
   - Game loads within 3 seconds
   - No Three.js errors in console
   - Controls visible on screen

#### Test 3.2: Game Controls
1. Test keyboard controls:
   - W/↑ = Forward
   - S/↓ = Backward
   - A/← = Left
   - D/→ = Right
   - SPACE = Jump
   - SHIFT = Sprint
2. **Mobile**: Touch controls should appear
3. **Verify**: Character responds to all inputs

#### Test 3.3: Score and Tier Unlocks
1. Play game and collect lightning bolts
2. Test tier thresholds:
   - Score 0-10: No tier unlocked
   - Score 11-17: Bronze tier (5 batches max)
   - Score 18-27: Silver tier (8 batches max)
   - Score 28+: Gold tier (10 batches max)
3. **Verify**: Correct tier displayed on game over

#### Test 3.4: Game Redirect Fix
1. Complete a game with score 11+
2. Click "Claim Your Allocation"
3. **Expected**: 
   - Redirects to main page purchase section
   - NOT opening within game iframe
   - Tier parameter in URL (e.g., #purchase?tier=bronze)
4. **Verify**: Purchase limit matches unlocked tier

---

### 4️⃣ **Mobile Responsiveness Tests**

#### Test 4.1: Viewport Sizes
Test on these viewports (Chrome DevTools):
- iPhone SE (375x667) 
- iPhone 12 Pro (390x844)
- iPad (768x1024)
- Desktop (1920x1080)

#### Test 4.2: Touch Targets
1. On mobile viewport, check:
   - All buttons ≥ 44x44px
   - Batch selector buttons work
   - Game controls accessible
   - Modal close button tappable
2. **Verify**: No overlapping elements

#### Test 4.3: Text Overflow
1. Check stat cards:
   - "1,470,000 Tokens Sold" fits without overflow
   - Numbers don't hang outside cards
2. Long RGB invoice in input field:
   - Should show ellipsis
   - Full text visible on focus

#### Test 4.4: Mobile Menu
1. On mobile viewport (< 768px)
2. **Expected**: Hamburger menu visible
3. Click hamburger:
   - Smooth slide-in animation
   - All links accessible
   - Can close by clicking overlay or X

---

### 5️⃣ **Security Tests**

#### Test 5.1: Rate Limiting
1. Try creating 11 invoices within 5 minutes
2. **Expected**: After 10th, error "Too many requests"
3. **Verify**: Must wait 5 minutes to continue

#### Test 5.2: Input Validation
1. Try SQL injection in email field: `test@test.com'; DROP TABLE users;--`
2. Try XSS in RGB invoice: `<script>alert('xss')</script>`
3. **Expected**: Inputs sanitized, no execution
4. **Verify**: No alerts, no console errors

#### Test 5.3: CORS Headers
```bash
curl -I http://localhost:3000/api/rgb/stats
```
**Expected**: See `Access-Control-Allow-Origin: *`

---

### 6️⃣ **Error Handling Tests**

#### Test 6.1: Network Failure
1. Stop API server: `kill [PID]`
2. Try creating invoice
3. **Expected**: User-friendly error message
4. **Verify**: UI doesn't crash

#### Test 6.2: Invalid Data
1. Manually call API with bad data:
```bash
curl -X POST http://localhost:3000/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'
```
2. **Expected**: 400 error with message
3. **Verify**: Server doesn't crash

#### Test 6.3: Expired Invoice
1. Create invoice, wait 15+ minutes
2. Check status
3. **Expected**: Status shows "expired"
4. **Verify**: Cannot download consignment

---

### 7️⃣ **Performance Tests**

#### Test 7.1: Page Load Speed
```bash
# Using curl to measure
time curl -s http://localhost:8082/ > /dev/null
```
**Expected**: < 2 seconds

#### Test 7.2: API Response Times
```bash
# Stats endpoint
time curl -s http://localhost:3000/api/rgb/stats

# Invoice creation
time curl -X POST http://localhost:3000/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "rgb:utxob:test", "batchCount": 1}'
```
**Expected**: < 500ms for stats, < 1s for invoice

#### Test 7.3: Memory Usage
1. Open Chrome DevTools → Memory tab
2. Take heap snapshot
3. Create 10 invoices
4. Take another snapshot
5. **Verify**: No significant memory increase

---

### 8️⃣ **Cross-Browser Tests**

Test on:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile Safari (iOS)
- ✅ Chrome Mobile (Android)

Key areas:
1. Game loads and plays
2. QR scanner works
3. Payment flow completes
4. Animations smooth

---

## 🤖 Automated Test Commands

### Quick Smoke Test
```bash
# Run all critical path tests
npm run test:critical

# Or manually:
./scripts/smoke-test.sh
```

### Full Test Suite
```bash
# Complete test coverage
npm test

# With coverage report
npm run test:coverage
```

### API Tests Only
```bash
# Test all API endpoints
curl -X POST http://localhost:3000/api/test/suite
```

---

## 📊 Test Results Template

Copy and fill out after testing:

```
LIGHTCAT Test Results - [DATE]
================================

Environment:
- OS: [Windows/Mac/Linux]
- Browser: [Chrome/Firefox/Safari] [Version]
- Device: [Desktop/Mobile] [Model]
- Viewport: [Size]

Test Results:
1. RGB Invoice Validation: [PASS/FAIL]
2. Lightning Payment Flow: [PASS/FAIL]
3. Game Mechanics: [PASS/FAIL]
4. Mobile Responsiveness: [PASS/FAIL]
5. Security Tests: [PASS/FAIL]
6. Error Handling: [PASS/FAIL]
7. Performance: [PASS/FAIL]
8. Cross-Browser: [PASS/FAIL]

Issues Found:
- [ ] Issue 1: [Description]
- [ ] Issue 2: [Description]

Notes:
[Any additional observations]

Overall Status: [READY/NEEDS FIXES]
```

---

## 🚨 Common Issues & Solutions

### Issue: Camera doesn't work for QR scanner
**Solution**: 
1. Check HTTPS (camera requires secure context)
2. Clear browser permissions and re-allow
3. Try different browser

### Issue: Payment doesn't auto-complete
**Solution**:
1. Check API server is running
2. Verify no console errors
3. Check network tab for failed requests

### Issue: Game won't load
**Solution**:
1. Clear browser cache
2. Check Three.js CDN is accessible
3. Verify no content blockers active

### Issue: Mobile menu doesn't open
**Solution**:
1. Check viewport is < 768px
2. Verify JavaScript is enabled
3. Check for CSS conflicts

---

## 🎯 Final Validation

Before going live, ensure:

✅ All 8 test categories pass
✅ No console errors on any page
✅ Performance metrics within targets
✅ Mobile experience smooth
✅ Payment flow works end-to-end
✅ Game redirect issue fixed
✅ Security tests pass
✅ Error handling graceful

**When all tests pass, you're BULLETPROOF! 🛡️**