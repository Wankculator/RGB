# Release Notes - RGB Lightning Integration v2

## Date: January 22, 2025

## Overview
Major update implementing RGB Protocol with Lightning Network payment system, UI/UX improvements, and Bitcoin Tribe wallet integration.

## Major Features

### 1. RGB Protocol Payment System
- **Complete Payment Flow Redesign**: Replaced Bitcoin-based payments with RGB Protocol + Lightning Network
- **Lightning Invoice Generation**: Users now pay via Lightning invoices for instant, low-fee transactions
- **RGB Consignment System**: Automatic generation and delivery of RGB consignments after payment
- **Email Notifications**: Optional email delivery of consignment download links

### 2. Backend Infrastructure
- **New Controllers**: 
  - `rgbPaymentController.js` - Handles Lightning invoice creation and payment monitoring
- **New Services**:
  - `lightningService.js` - Lightning Network integration (mock mode for development)
  - Enhanced `rgbService.js` - RGB consignment generation and token transfers
- **New Routes**: `/api/rgb/*` endpoints for invoice creation and payment verification
- **Rate Limiting**: Added protection against API abuse
- **Database Schema**: New tables for RGB invoices, payments, and consignments

### 3. Frontend Updates
- **Purchase Form**: 
  - Changed from Bitcoin address to RGB invoice input
  - Added comprehensive RGB wallet instructions
  - Bitcoin Tribe wallet prominently recommended
- **Payment Modal**: 
  - Shows Lightning invoice QR code instead of Bitcoin address
  - Real-time payment status monitoring
  - Automatic consignment download on payment completion

### 4. UI/UX Improvements
- **Stat Cards**: Fixed "1,470,000 Tokens Sold" overflow issue
- **Game Integration**:
  - Fixed iframe redirect issue for tier unlocks
  - Improved game over screen layout (fits without scrolling)
  - Removed overlapping X logo from game UI
  - Added "Thank You for Playing!" message
  - Professional tier allocation messaging
- **Twitter/X Branding**: 
  - Updated all references from @LIGHTCAT to @RGBLightCat
  - Added yellow X logos to navigation (main site only, not in game)

### 5. Bitcoin Tribe Wallet Integration
- **Primary Recommendation**: Bitcoin Tribe featured as the recommended RGB wallet
- **Step-by-Step Instructions**: Clear guide for getting RGB invoices
- **Direct Download Links**: Website and Google Play store links
- **Wallet Alternatives**: Still lists Iris, MyCitadel, BitMask as options

## Technical Details

### Database Changes
```sql
-- New tables added:
- rgb_invoices (stores Lightning invoice data)
- rgb_payments (tracks payment status)
- rgb_consignments (stores generated consignments)
- rgb_sales_stats (aggregated sales data)
```

### API Endpoints
```
POST /api/rgb/invoice - Create Lightning invoice
GET /api/rgb/invoice/:id/status - Check payment status
GET /api/rgb/consignment/:paymentId - Download consignment
```

### Environment Variables
```
LIGHTNING_NODE_URL - Lightning node endpoint
LIGHTNING_MACAROON - Authentication token
RGB_NODE_URL - RGB node endpoint
RGB_API_KEY - RGB API authentication
```

## Bug Fixes
- Fixed stat card number overflow on mobile devices
- Resolved game tier unlock opening in nested iframe
- Corrected Twitter handle references throughout the site
- Improved mobile responsiveness for game over screen
- Removed emojis from RGB protocol benefit cards

## Breaking Changes
- Payment system completely changed from Bitcoin to Lightning
- Users must have RGB-compatible wallets (Bitcoin Tribe recommended)
- Old Bitcoin payment addresses no longer accepted

## Migration Notes
- Existing Bitcoin-based purchases remain valid
- New purchases must use RGB invoices
- Database migration required for new tables

## Testing Notes
- Lightning service runs in mock mode for development
- Test RGB invoices can be generated without real Lightning node
- Payment verification simulated with 5-second polling

## Future Considerations
- Production Lightning node integration required
- Real RGB node connection needed for mainnet
- Consider adding more RGB wallet options as ecosystem grows

---

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>