# 🗄️ Supabase Database Setup Instructions

## Step 1: Create Tables in Supabase

1. **Open your Supabase Dashboard**
   - Go to: https://xyfqpvxwvlemnraldbjd.supabase.co/dashboard
   - Click on "SQL Editor" in the left sidebar

2. **Run the Production Schema**
   - Click "New query"
   - Copy ALL the contents from `database/production-schema.sql`
   - Paste into the SQL editor
   - Click "Run" button
   - You should see "Success. No rows returned"

## Step 2: Verify Tables Were Created

1. **Check Tables**
   - Go to "Table Editor" in the left sidebar
   - You should see these tables:
     - `users`
     - `game_scores`
     - `lightning_payments`
     - `purchases`
     - `rgb_transfers`

2. **Check Views**
   - You should also see these views:
     - `purchase_stats`
     - `tier_stats`

## Step 3: Test the Connection

```bash
# Run the simple test
node scripts/test-supabase-simple.js

# If successful, you'll see:
# ✅ Connected to Supabase!
# ✅ Status: 200
```

## Step 4: Update Your Services

The following files need to use Supabase instead of mock data:

### 1. **server/services/supabaseService.js**
```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Service methods for database operations
module.exports = {
    // Save game score
    async saveGameScore(walletAddress, score, tier, maxBatches) {
        const { data, error } = await supabase
            .from('game_scores')
            .insert([{
                wallet_address: walletAddress,
                score,
                tier,
                max_batches: maxBatches,
                game_duration: 30
            }])
            .select();
        
        if (error) throw error;
        return data[0];
    },

    // Create purchase record
    async createPurchase(purchaseData) {
        const { data, error } = await supabase
            .from('purchases')
            .insert([purchaseData])
            .select();
        
        if (error) throw error;
        return data[0];
    },

    // Get purchase stats
    async getPurchaseStats() {
        const { data, error } = await supabase
            .from('purchase_stats')
            .select('*')
            .single();
        
        if (error) return null;
        return data;
    }
};
```

### 2. **Update Payment Controller**

Replace mock data calls with Supabase service calls in:
- `server/controllers/btcpayController.js`
- `server/controllers/gameController.js`

## Step 5: Enable Real-Time Features (Optional)

If you want real-time updates for purchases:

```javascript
// Subscribe to purchase updates
const subscription = supabase
    .channel('purchases')
    .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'purchases'
    }, (payload) => {
        console.log('New purchase:', payload.new);
        // Update UI or send WebSocket event
    })
    .subscribe();
```

## Step 6: Test Everything

```bash
# 1. Test game score saving
curl -X POST http://localhost:3000/api/game/score \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "bc1qtest123",
    "score": 25,
    "gameId": "test-game-1"
  }'

# 2. Check if score was saved
# Go to Supabase Table Editor > game_scores
# You should see the new score

# 3. Test stats endpoint
curl http://localhost:3000/api/stats
```

## 🔐 Security Notes

1. **Never expose SERVICE_KEY in frontend**
   - Only use in backend/server code
   - Frontend should use ANON_KEY

2. **Row Level Security is enabled**
   - Tables are protected by default
   - Service role bypasses RLS
   - Anon role follows RLS policies

3. **Backup your data regularly**
   - Supabase has automatic backups
   - You can also export manually

## 🚨 Common Issues

### "Permission denied for table"
- Make sure you're using SERVICE_KEY in backend
- Check RLS policies are correctly set

### "Failed to fetch"
- Verify your Supabase URL is correct
- Check if project is not paused
- Ensure API keys are valid

### "No rows returned"
- This is normal when creating tables
- Check Table Editor to verify tables exist

## ✅ Success Checklist

- [ ] All tables created in Supabase
- [ ] Connection test passes
- [ ] Game scores can be saved
- [ ] Purchase stats endpoint works
- [ ] No errors in console

## 📞 Need Help?

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Our Support: support@lightcat.io

---

Once Supabase is set up, your platform will have:
- ✅ Real database for production
- ✅ Automatic backups
- ✅ Real-time capabilities
- ✅ Secure data storage
- ✅ Analytics ready

Next step after this: **Import RGB seed phrase**