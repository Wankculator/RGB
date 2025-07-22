# 🐱⚡ Litecat Token - RGB Protocol Meme Token

## The First Cat Meme Token on RGB Protocol

### 🚀 Features
- **Bitcoin Lightning Payments** via CoinPayments API
- **Retro Arcade Game** - Unlock purchase tiers by score
- **Real-time Sales Tracking** with Supabase
- **RGB Protocol Integration** for token distribution
- **Security-First Architecture** with rate limiting & validation
- **Responsive Design** with black/yellow aesthetic

### 🎮 Game Mechanics
- **Tier 1** (0-9 points): Up to 5 batches
- **Tier 2** (10-19 points): Up to 8 batches  
- **Tier 3** (20+ points): Up to 10 batches

### 💰 Token Economics
- **Total Supply**: 21,000,000 LITECAT tokens
- **Batch Size**: 700 tokens per batch
- **Price**: 2,000 satoshis per batch
- **Available**: 28,500 batches (5% dev reserve)

### 🛠 Tech Stack
- **Frontend**: Vanilla JS, HTML5 Canvas, CSS3
- **Backend**: Node.js, Express
- **Database**: Supabase (PostgreSQL)
- **Payments**: CoinPayments API
- **Blockchain**: RGB Protocol on Bitcoin
- **Deployment**: Vercel/Netlify

### 📁 Project Structure
```
litecat-website/
├── 🎨 client/                    # Frontend application
│   ├── assets/                   # Static assets
│   ├── components/               # Reusable UI components
│   ├── game/                     # Arcade game engine
│   ├── pages/                    # HTML pages
│   ├── styles/                   # CSS stylesheets
│   └── utils/                    # Client utilities
├── 🖥️ server/                     # Backend API
│   ├── controllers/              # Route handlers
│   ├── middleware/               # Express middleware
│   ├── models/                   # Data models
│   ├── services/                 # Business logic
│   └── routes/                   # API routes
├── 🗄️ database/                   # Database schemas & migrations
├── 🧪 tests/                      # Test suites
├── 📋 scripts/                    # Utility scripts
├── 🔧 config/                     # Configuration files
└── 📚 docs/                       # Documentation
```

### 🚦 Quick Start
```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Run development server
npm run dev

# Run tests
npm test

# Deploy to production
npm run deploy
```

### 🔐 Security Features
- Bitcoin wallet validation
- Exact payment verification
- Rate limiting & CAPTCHA
- Encrypted database connections
- Two-factor admin authentication

### 📊 Monitoring
- Real-time sales dashboard
- Transaction status tracking
- Performance metrics
- Error logging & alerts

---
*Built with ⚡ by the Litecat team*
