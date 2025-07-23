# 🔧 Supabase Migration Fix

## ❌ Error You Encountered:
```
ERROR: 42703: column "user_id" does not exist
```

## ✅ Solution:

The issue was that the `game_scores` table was trying to reference `user_id` before it was created. I've fixed this by:

1. Creating the table first without `user_id`
2. Adding `user_id` column after all tables exist
3. Making the column optional so game scores can work with just wallet addresses

## 📋 Steps to Fix:

### Option 1: Drop Everything and Start Fresh (Recommended)

1. **Drop existing tables** (if any were partially created):
   ```sql
   -- Run this in SQL Editor first
   DROP TABLE IF EXISTS rgb_audit_log CASCADE;
   DROP TABLE IF EXISTS lightning_node_info CASCADE;
   DROP TABLE IF EXISTS rgb_user_stats CASCADE;
   DROP TABLE IF EXISTS rgb_sales_stats CASCADE;
   DROP TABLE IF EXISTS rgb_consignments CASCADE;
   DROP TABLE IF EXISTS rgb_payments CASCADE;
   DROP TABLE IF EXISTS rgb_invoices CASCADE;
   DROP TABLE IF EXISTS game_scores CASCADE;
   DROP TABLE IF EXISTS users CASCADE;
   DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
   DROP FUNCTION IF EXISTS get_global_stats() CASCADE;
   DROP FUNCTION IF EXISTS get_game_leaderboard(INTEGER) CASCADE;
   ```

2. **Run the fixed migration**:
   - Copy ALL contents from: `database/supabase-complete-migration-fixed.sql`
   - Paste into SQL Editor
   - Click Run

### Option 2: Just Add Missing Columns

If some tables were created successfully, just run this:

```sql
-- Add user_id to game_scores if it doesn't exist
ALTER TABLE game_scores ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_game_scores_user ON game_scores(user_id);

-- Create the stats functions
CREATE OR REPLACE FUNCTION get_global_stats()
RETURNS TABLE (
    total_users INTEGER,
    total_tokens_sold BIGINT,
    total_batches_sold INTEGER,
    total_revenue_sats BIGINT,
    unique_players INTEGER,
    highest_score INTEGER,
    avg_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT users.id)::INTEGER as total_users,
        COALESCE(SUM(rgb_invoices.token_amount), 0) as total_tokens_sold,
        COALESCE(SUM(rgb_invoices.batches), 0) as total_batches_sold,
        COALESCE(SUM(rgb_invoices.btc_amount), 0) as total_revenue_sats,
        COUNT(DISTINCT COALESCE(game_scores.user_id, game_scores.wallet_address::uuid))::INTEGER as unique_players,
        COALESCE(MAX(game_scores.score), 0) as highest_score,
        COALESCE(AVG(game_scores.score), 0) as avg_score
    FROM users
    LEFT JOIN rgb_invoices ON users.id = rgb_invoices.user_id AND rgb_invoices.status = 'delivered'
    LEFT JOIN game_scores ON users.id = game_scores.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_global_stats() TO anon, authenticated;
```

## 🧪 Test After Fix:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Test game score insert (should work now)
INSERT INTO game_scores (wallet_address, score, lightning_collected, tier_unlocked, game_duration)
VALUES ('test-wallet-123', 25, 15, 'silver', 30);

-- Check it worked
SELECT * FROM game_scores;

-- Test global stats
SELECT * FROM get_global_stats();
```

## 💡 What Changed:

1. **Game scores table** now creates without `user_id` initially
2. **user_id** is added after all tables exist
3. **Both wallet_address and user_id** can be used
4. **Stats function** handles both cases gracefully

The migration will now work whether you have existing data or starting fresh!