# Litecat Token Sale - Production Setup Guide

## Required Information

Please provide the following information to make your site live:

### 1. Bitcoin Wallet Address
```
BTC_WALLET_ADDRESS=your_bitcoin_wallet_address_here
```
This is where all Bitcoin payments will be sent.

### 2. Supabase Configuration
Sign up at https://supabase.com and create a new project, then provide:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

### 3. CoinPayments Configuration
Sign up at https://www.coinpayments.net and get your API credentials:
```
COINPAYMENTS_PUBLIC_KEY=your-public-key
COINPAYMENTS_PRIVATE_KEY=your-private-key
COINPAYMENTS_IPN_SECRET=your-ipn-secret
```

### 4. Email Service (Optional but Recommended)
For SendGrid (https://sendgrid.com):
```
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
```

### 5. RGB Wallet Configuration
```
RGB_NODE_HOST=your-rgb-node-host
RGB_NODE_PORT=your-rgb-node-port
```

## Setup Instructions

1. **Create .env file**:
   Copy `.env.example` to `.env` and fill in all the values above.

2. **Initialize Database**:
   ```bash
   npm run db:setup
   ```

3. **Test Configuration**:
   ```bash
   npm run test:config
   ```

4. **Start Production Server**:
   ```bash
   npm run start:production
   ```

## What Each Service Does

- **BTC Wallet**: Receives all payments from token buyers
- **Supabase**: Stores purchase records, wallet addresses for airdrops, game scores
- **CoinPayments**: Processes Bitcoin payments and handles invoices
- **Email Service**: Sends purchase confirmations and updates
- **RGB Node**: Used for the airdrop after the sale ends

## Security Notes

- Never commit the .env file to git
- Use environment variables in production
- Enable 2FA on all service accounts
- Regularly backup your database
- Monitor the BTC wallet for incoming payments

## Need Help?

Contact support or check the documentation for each service.