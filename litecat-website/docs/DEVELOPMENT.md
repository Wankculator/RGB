# 🐱⚡ Litecat Token Development Guide

## Quick Setup

### Prerequisites
- Node.js 18+ and npm 8+
- Git
- Supabase account
- CoinPayments account
- Vercel account (for deployment)

### Environment Setup

1. **Clone and Install**
   ```bash
   git clone <your-repo>
   cd litecat-website
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Database Setup**
   - Create new Supabase project
   - Run `database/schema.sql` in SQL Editor
   - Update .env with Supabase credentials

4. **Start Development**
   ```bash
   npm run dev
   ```

## Project Architecture

### Frontend (`/client`)
- **Vanilla JavaScript** - No framework dependencies
- **HTML5 Canvas** - Retro arcade game engine
- **CSS3** - Black/yellow theme with animations
- **Responsive Design** - Mobile-first approach

### Backend (`/server`) 
- **Express.js** - REST API server
- **Supabase** - PostgreSQL database
- **CoinPayments** - Bitcoin payment processing
- **JWT** - Authentication for admin routes

### Key Features
- **🎮 Arcade Game** - HTML5 Canvas lightning shooter
- **⚡ Bitcoin Payments** - CoinPayments integration
- **📊 Real-time Stats** - WebSocket updates
- **🔒 Security** - Rate limiting, validation, HTTPS

## Development Workflow

### Local Development
```bash
# Start all services
npm run dev

# Individual services
npm run server:dev    # Backend only
npm run client:dev    # Frontend only

# Testing
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Code Quality
```bash
npm run lint          # ESLint check
npm run lint:fix      # Auto-fix issues
```

### Database Operations
```bash
npm run db:migrate    # Run migrations
npm run db:seed       # Seed test data
```

## Key Components

### Game Engine (`/client/scripts/game/`)
- **gameEngine.js** - Main game loop and logic
- **gameEntities.js** - Player, enemies, bullets
- **gameAudio.js** - Sound effects and music

### Payment System (`/server/controllers/`)
- **paymentController.js** - Invoice creation/verification
- **coinpaymentsService.js** - CoinPayments API wrapper
- **rgbService.js** - RGB Protocol integration

### Security (`/server/middleware/`)
- **validation.js** - Input validation
- **auth.js** - JWT authentication
- **rateLimiter.js** - Request rate limiting

## API Endpoints

### Public Routes
```
POST /api/payments/create-invoice  # Create payment invoice
GET  /api/payments/invoice/:id     # Get invoice details
POST /api/payments/verify/:id      # Verify payment status
GET  /api/payments/stats           # Sales statistics
POST /api/game/score               # Submit game score
```

### Admin Routes (Authentication Required)
```
GET  /api/admin/dashboard          # Admin dashboard data
POST /api/admin/refund/:id         # Process refund
GET  /api/admin/users              # User management
```

### Webhook Routes
```
POST /api/webhooks/coinpayments    # CoinPayments IPN
POST /api/webhooks/payment-status  # Payment status updates
```

## Database Schema

### Core Tables
- **purchases** - Payment records and token allocations
- **game_scores** - Player scores and tier achievements
- **admin_users** - Admin authentication
- **audit_log** - All database changes

### Key Functions
```sql
get_wallet_purchase_limit(address, tier) -- Check purchase limits
get_available_batches()                  -- Remaining token supply
```

## Game Mechanics

### Scoring System
- **Tier 1** (0-9 points): Up to 5 batches
- **Tier 2** (10-19 points): Up to 8 batches  
- **Tier 3** (20+ points): Up to 10 batches

### Controls
- **Arrow Keys** - Move player
- **Spacebar** - Shoot lightning
- **Touch** - Mobile controls

### Enemies
- **Basic** - 1 HP, straight movement
- **Zigzag** - 2 HP, sine wave movement
- **Seeker** - 3 HP, follows player

## Token Economics

### Supply Distribution
- **Total Supply**: 21,000,000 LITECAT
- **Batch Size**: 700 tokens
- **Price**: 2,000 satoshis per batch
- **Public Sale**: 28,500 batches (95%)
- **Developer Reserve**: 1,500 batches (5%)

### Payment Flow
1. User plays game to unlock tier
2. Enters Bitcoin wallet address
3. Selects batch quantity (tier-limited)
4. Receives payment invoice with QR code
5. Sends exact Bitcoin amount
6. Payment verified on blockchain
7. RGB tokens distributed to wallet

## Security Measures

### Input Validation
- Bitcoin address format validation
- Batch quantity limits by tier
- Payment amount verification
- Rate limiting on API endpoints

### Payment Security
- Exact amount verification
- Timeout on payment invoices
- Webhook signature verification
- Encrypted sensitive data storage

### General Security
- HTTPS enforced
- CORS configuration
- Helmet security headers
- SQL injection prevention
- XSS protection

## Testing Strategy

### Unit Tests (`/tests/unit/`)
- Game engine logic
- Payment calculations
- Validation functions
- Database operations

### Integration Tests (`/tests/integration/`)
- API endpoint testing
- Database transactions
- Payment flow testing
- WebSocket connections

### E2E Tests (`/tests/e2e/`)
- Complete user journeys
- Game play testing
- Purchase flow testing
- Admin functions

## Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database schema deployed
- [ ] SSL certificates installed
- [ ] Domain configured
- [ ] CoinPayments webhooks set up
- [ ] RGB node configured
- [ ] Monitoring enabled

### Deployment Commands
```bash
# Validate environment
npm run deploy validate

# Deploy to production
npm run deploy

# Manual deployment steps
vercel --prod
```

### Environment Variables
```env
# Required for production
NODE_ENV=production
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
COINPAYMENTS_PUBLIC_KEY=your_public_key
COINPAYMENTS_PRIVATE_KEY=your_private_key
JWT_SECRET=your_jwt_secret
RGB_NODE_URL=your_rgb_node_url
```

## Monitoring & Analytics

### Performance Metrics
- API response times
- Database query performance
- Payment processing times
- Game session duration

### Business Metrics
- Token sales volume
- Conversion rates by tier
- Popular game scores
- User retention

### Error Tracking
- Payment failures
- Game crashes
- API errors
- Database issues

## Troubleshooting

### Common Issues

**Game not loading**
- Check browser JavaScript console
- Verify canvas support
- Clear browser cache

**Payment not confirming**
- Check CoinPayments webhook setup
- Verify exact payment amount
- Check Bitcoin network congestion

**Database connection errors**
- Verify Supabase credentials
- Check network connectivity
- Review connection pool settings

**High server load**
- Monitor API rate limits
- Check database query performance
- Scale server resources if needed

### Debug Tools
```bash
# Check logs
tail -f logs/combined.log
tail -f logs/error.log

# Database queries
npm run db:console

# Payment verification
node scripts/verify-payment.js <invoice_id>
```

## Contributing

### Code Style
- Use ESLint configuration
- Follow JavaScript Standard Style
- Write descriptive commit messages
- Add tests for new features

### Pull Request Process
1. Fork repository
2. Create feature branch
3. Add tests
4. Update documentation
5. Submit pull request
6. Address review feedback

---

**Built with ⚡ by the Litecat team**

*First cat meme token on RGB Protocol*
