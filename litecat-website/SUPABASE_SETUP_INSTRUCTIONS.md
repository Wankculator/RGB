# 🗄️ LIGHTCAT Supabase Database Setup Instructions

## ✅ Your Supabase Credentials Are Already Configured!

Your `.env` file already contains the correct Supabase credentials:
- **Project URL**: `https://xyfqpvxwvlemnraldbj.supabase.co`
- **Anon Key**: Already in `.env`
- **Service Key**: Already in `.env`

## 📋 Steps to Set Up Your Database

### 1. Access Supabase Dashboard
Go to your Supabase project dashboard:
```
https://xyfqpvxwvlemnraldbj.supabase.co
```

### 2. Navigate to SQL Editor
1. Click on **SQL Editor** in the left sidebar
2. Click **New query** button

### 3. Run the Migration
1. Copy ALL contents from this file:
   ```
   database/supabase-complete-migration.sql
   ```

2. Paste into the SQL Editor

3. Click **Run** (or press Ctrl+Enter)

### 4. Verify Tables Were Created
1. Go to **Table Editor** in the left sidebar
2. You should see these tables:
   - `users`
   - `game_scores`
   - `rgb_invoices`
   - `rgb_payments`
   - `rgb_consignments`
   - `rgb_sales_stats`
   - `rgb_user_stats`
   - `lightning_node_info`
   - `rgb_audit_log`

### 5. Check Row Level Security (RLS)
1. Click on each table
2. Go to **RLS** tab
3. Verify RLS is **Enabled** (green toggle)
4. Verify policies are created

## 🧪 Test Your Setup

### Test Connection from Application
```bash
cd /mnt/c/Users/sk84l/Downloads/RGB\ LIGHT\ CAT/litecat-website

# Start the development server
npm run dev

# In another terminal, test the API
curl http://localhost:3000/api/health
```

### Test Database Query
In Supabase SQL Editor, run:
```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check global stats function
SELECT * FROM get_global_stats();

-- Insert test game score
INSERT INTO game_scores (score, lightning_collected, tier_unlocked, game_duration)
VALUES (25, 15, 'silver', 30);

-- Check if it worked
SELECT * FROM game_scores;
```

## 🔧 Troubleshooting

### If Tables Don't Create:
1. Check for error messages in SQL Editor output
2. Try running the migration in smaller chunks
3. Make sure you're in the correct project

### If RLS Policies Fail:
1. The policies use `auth.uid()` and `auth.role()`
2. For testing, we've made some policies more permissive
3. Tighten security before production!

### If Connection Fails from App:
1. Verify `.env` file has correct credentials
2. Check if service key matches exactly
3. Make sure no extra spaces in keys

## 🚀 Next Steps

1. **Test Payment Flow**:
   ```bash
   # With mock API server running
   npm run dev
   ```

2. **Monitor Database**:
   - Check **Database** tab for usage
   - Set up **Database Webhooks** if needed
   - Enable **Realtime** for live updates

3. **Before Production**:
   - Review and tighten RLS policies
   - Set up database backups
   - Configure connection pooling

## 📊 Useful Queries

```sql
-- Check token sales
SELECT * FROM rgb_invoices WHERE status = 'delivered';

-- Top game scores
SELECT * FROM game_scores ORDER BY score DESC LIMIT 10;

-- Sales statistics
SELECT * FROM rgb_sales_stats;

-- Recent activity
SELECT * FROM rgb_audit_log ORDER BY created_at DESC LIMIT 20;
```

## 🔐 Security Notes

1. **Service Key**: Never expose in frontend code
2. **RLS Policies**: Currently permissive for testing
3. **Audit Log**: Tracks all important actions
4. **Backups**: Enable in Supabase dashboard

## 💡 Tips

- Use Supabase Table Editor for quick data viewing
- SQL Editor saves query history
- Database tab shows real-time metrics
- Logs tab helps debug issues

---

**Your database is ready to use once you run the migration!** 🎉