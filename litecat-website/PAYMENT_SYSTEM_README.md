# LIGHTCAT Payment System Documentation

## 🚀 Overview

The LIGHTCAT payment system is a complete Bitcoin payment solution for selling RGB protocol tokens. It includes:

- **Frontend**: Interactive UI with 3D game and payment modal
- **Backend**: Express.js API server with payment processing
- **Database**: Supabase (PostgreSQL) for data persistence
- **Bitcoin Integration**: QR code generation and payment verification
- **Email Notifications**: Purchase confirmations and updates

## 🔧 How It Works

### 1. User Flow
```
User clicks "BUY LIGHTCAT" → Enters wallet address → Generates invoice → 
Shows QR code → User pays with Bitcoin → System verifies payment → 
Tokens distributed → Email confirmation sent
```

### 2. Technical Flow

#### A. Invoice Creation
1. User submits wallet address and batch count
2. Frontend calls `/api/payments/create-invoice`
3. Backend:
   - Validates input (wallet limit, available supply)
   - Calculates BTC amount (0.00002 BTC per batch)
   - Generates unique invoice ID
   - Creates payment address (currently uses single address)
   - Stores in database with 30-minute expiry
   - Returns invoice details with QR code

#### B. Payment Verification
1. Frontend polls `/api/payments/verify/:invoiceId` every 5 seconds
2. Backend checks payment status:
   - **Demo Mode**: Simulates payment after 5 seconds
   - **Production**: Would check Bitcoin blockchain or CoinPayments
3. When payment confirmed:
   - Updates purchase status to "completed"
   - Updates sales statistics
   - Triggers email notification
   - (Future) Initiates RGB token distribution

#### C. Real-time Updates
1. Sales stats update automatically
2. WebSocket support for live notifications
3. Database triggers maintain consistency

## 📁 Project Structure

```
litecat-website/
├── client/                 # Frontend files
│   ├── index.html         # Main website with payment UI
│   └── assets/            # Images, sounds, styles
├── server/                # Backend API
│   ├── app.js            # Express server setup
│   ├── controllers/      # Business logic
│   │   └── paymentController.js
│   ├── routes/           # API endpoints
│   ├── services/         # External integrations
│   └── utils/            # Helpers and logging
├── database/             # Database schemas
│   └── schema.sql       # PostgreSQL tables
├── scripts/              # Utility scripts
│   ├── migrate.js       # Database migration
│   └── test-server.js   # API testing
├── .env                  # Environment configuration
└── config.js            # Application configuration
```

## 🔑 Key Components

### Frontend (client/index.html)
- **Payment Modal**: Clean UI for invoice generation
- **QR Code**: Bitcoin payment URI with amount
- **Status Polling**: Automatic payment verification
- **3D Game**: Unlock purchase tiers by playing

### Backend API Endpoints
- `POST /api/payments/create-invoice` - Generate payment invoice
- `GET /api/payments/verify/:invoiceId` - Check payment status
- `GET /api/payments/stats` - Get sales statistics
- `GET /api/payments/history/:wallet` - User purchase history

### Database Schema
- **purchases**: Payment invoices and transactions
- **sales_stats**: Aggregate sales metrics
- **wallet_stats**: Per-wallet purchase data
- **game_scores**: High scores for tier unlocking
- **audit_log**: Security and activity tracking

## 🛠️ Setup Instructions

### 1. Environment Setup
```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials
```

### 2. Database Setup
1. Go to Supabase dashboard
2. Run `database/schema.sql` in SQL editor
3. Verify tables created successfully

### 3. Start Development Server
```bash
# Terminal 1: Backend server
npm run dev:server

# Terminal 2: Frontend server
npm run dev:client

# Or run both:
npm run dev
```

### 4. Test Payment Flow
```bash
# Run API tests
node scripts/test-server.js

# Or test manually:
# 1. Open http://localhost:8000
# 2. Click "BUY LIGHTCAT"
# 3. Enter any Bitcoin address
# 4. Generate invoice
# 5. Wait 5 seconds for demo payment
```

## 🔐 Security Features

1. **Rate Limiting**: Prevents API abuse
2. **Input Validation**: Sanitizes all user input
3. **CORS Protection**: Restricts origins
4. **Helmet.js**: Security headers
5. **SQL Injection Prevention**: Parameterized queries
6. **Audit Logging**: Tracks all transactions

## 🚧 Production Checklist

### Required for Production
- [ ] CoinPayments API credentials
- [ ] Unique Bitcoin address generation
- [ ] SSL certificate for HTTPS
- [ ] Production database with backups
- [ ] Email service (SendGrid) configuration
- [ ] RGB node for token distribution
- [ ] Monitoring and alerts
- [ ] Load balancer for scaling

### Environment Variables Needed
```env
# Payment Processing
COINPAYMENTS_PUBLIC_KEY=your_public_key
COINPAYMENTS_PRIVATE_KEY=your_private_key
COINPAYMENTS_MERCHANT_ID=your_merchant_id
COINPAYMENTS_IPN_SECRET=your_ipn_secret

# Email Service
SENDGRID_API_KEY=your_sendgrid_key

# Security
JWT_SECRET=strong_random_secret
ADMIN_API_KEY=secure_admin_key

# Bitcoin
BTC_WALLET_XPUB=your_extended_public_key
```

## 📊 Current Status

### ✅ Completed
- Frontend payment UI with QR codes
- Backend API structure
- Database schema and migrations
- Demo payment simulation
- Sales statistics tracking
- Security middleware
- Error handling

### 🔄 In Progress
- CoinPayments integration
- Email notifications
- Admin dashboard

### 📋 TODO
- Unique payment addresses per invoice
- Real Bitcoin blockchain monitoring
- RGB token distribution
- Production deployment
- Comprehensive testing suite
- Documentation website

## 🧪 Testing

### Manual Testing
1. Create invoice with different batch counts
2. Test wallet limits (max 10 batches)
3. Verify QR code scanning
4. Check payment status updates
5. Confirm statistics update

### API Testing
```bash
# Test all endpoints
node scripts/test-server.js

# Test specific endpoint
curl http://localhost:3001/api/payments/stats
```

### Database Testing
```sql
-- Check recent purchases
SELECT * FROM purchases ORDER BY created_at DESC LIMIT 10;

-- Verify sales stats
SELECT * FROM sales_stats;

-- Check wallet history
SELECT * FROM wallet_stats WHERE wallet_address = 'your_address';
```

## 🤝 Support

### Common Issues

**Database connection failed**
- Check SUPABASE_URL and keys in .env
- Verify Supabase service is running

**Payment not confirming**
- In demo mode, wait 5+ seconds
- Check browser console for errors
- Verify API server is running

**QR code not scanning**
- Ensure proper lighting
- Try different QR scanner apps
- Verify Bitcoin URI format

### Getting Help
1. Check error logs in console
2. Review server logs
3. Test with `scripts/test-server.js`
4. Check Supabase dashboard for DB issues

## 📈 Future Enhancements

1. **Lightning Network Support**: Instant payments
2. **Multi-currency**: Accept other cryptocurrencies
3. **Referral System**: Rewards for sharing
4. **NFT Integration**: Special edition tokens
5. **Mobile App**: Native payment experience
6. **Analytics Dashboard**: Advanced metrics

---

**Remember**: This is currently in DEMO mode. Real Bitcoin payments require proper CoinPayments configuration and security measures. Always test thoroughly before going live!