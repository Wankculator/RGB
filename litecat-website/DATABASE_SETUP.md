# LIGHTCAT Payment System Database Setup

## Overview
The LIGHTCAT payment system uses Supabase (PostgreSQL) to store payment data, track sales statistics, and manage user purchases.

## Prerequisites
- Supabase account (already configured in .env)
- Database credentials in your .env file

## Setup Instructions

### 1. Access Supabase Dashboard
Go to your Supabase project dashboard:
```
https://supabase.com/dashboard/project/xyfqpvxwvlemnraldbj
```

### 2. Run Database Migrations

1. Navigate to the **SQL Editor** in your Supabase dashboard
2. Click **New Query**
3. Copy the entire contents of `database/schema.sql`
4. Paste it into the SQL editor
5. Click **Run** to execute the migration

This will create:
- `purchases` table - Stores all payment invoices
- `sales_stats` table - Tracks overall sales metrics
- `wallet_stats` table - Tracks per-wallet statistics
- `game_scores` table - Stores game high scores
- `audit_log` table - Security and activity logging
- `performance_metrics` table - System performance tracking

### 3. Verify Setup

Run this query to verify tables were created:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see all 6 tables listed.

### 4. Initialize Sales Stats

The migration automatically initializes the sales_stats table. Verify with:
```sql
SELECT * FROM sales_stats;
```

## Testing the Setup

### 1. Start the Backend Server
```bash
cd /mnt/c/Users/sk84l/Downloads/RGB\ LIGHT\ CAT/litecat-website
npm run dev:server
```

### 2. Test Server Connection
In a new terminal:
```bash
node scripts/test-server.js
```

This will:
- Check health endpoint
- Fetch current sales stats (should show 0)
- Create a test invoice
- Verify the invoice status

### 3. Test Frontend Integration
Open your browser to `http://localhost:8000` and:
1. Click "BUY LIGHTCAT"
2. Enter any Bitcoin address
3. Click "GENERATE INVOICE"
4. You should see a QR code and payment details

## Production Considerations

### 1. Enable Row Level Security (RLS)
The schema includes RLS policies but they're not enforced until you enable RLS:

```sql
-- Enable RLS on all tables
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
```

### 2. Create Indexes for Performance
The schema already includes indexes, but monitor query performance and add more as needed.

### 3. Set Up Backups
Configure automatic backups in Supabase dashboard under Settings > Backups.

### 4. Monitor Usage
Use Supabase dashboard to monitor:
- Database size
- Query performance
- Connection pool usage

## Troubleshooting

### Cannot connect to database
- Verify SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
- Check Supabase dashboard for any service issues

### Tables not created
- Ensure you ran the entire schema.sql file
- Check for any error messages in SQL editor
- Verify you're in the correct project

### Permission errors
- Make sure you're using the service_role key (not anon key) for backend
- Check RLS policies if enabled

## Next Steps

Once database is set up:
1. Configure CoinPayments API for real Bitcoin payments
2. Set up webhook endpoints for payment notifications
3. Implement unique payment address generation
4. Enable production monitoring and alerts

## Support

For issues with:
- Database setup: Check Supabase documentation
- Payment system: Review server/controllers/paymentController.js
- Frontend integration: Check client/index.html payment functions