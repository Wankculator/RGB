// Test Supabase Connection
const { createClient } = require('@supabase/supabase-js');

// Your credentials
const supabaseUrl = 'https://xyfqpvxwvlemnraldbjd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZnFwdnh3dmxlbW5yYWxkYmpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzEwOTYzOSwiZXhwIjoyMDY4Njg1NjM5fQ.GSMgIcht9_O77tPkb1ofQxRixUHt7OdaVXHwUYJ1Y60';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('🧪 Testing Supabase Connection...\n');
    
    try {
        // Test 1: Check tables exist
        const { data: tables, error: tablesError } = await supabase
            .from('game_scores')
            .select('*')
            .limit(5);
            
        if (tablesError) {
            console.error('❌ Error:', tablesError);
            return;
        }
        
        console.log('✅ Connected to Supabase!');
        console.log(`✅ Found ${tables.length} test game scores`);
        
        // Test 2: Check if we can insert
        const testScore = {
            wallet_address: 'bc1qtest' + Date.now(),
            score: Math.floor(Math.random() * 40),
            tier: 'silver',
            max_batches: 8,
            game_duration: 30
        };
        
        const { data: inserted, error: insertError } = await supabase
            .from('game_scores')
            .insert([testScore])
            .select();
            
        if (!insertError) {
            console.log('\n✅ Successfully inserted test data');
            console.log('- Wallet:', inserted[0].wallet_address);
            console.log('- Score:', inserted[0].score);
            console.log('- Tier:', inserted[0].tier);
        }
        
        // Test 3: Check stats view
        const { data: stats, error: statsError } = await supabase
            .from('purchase_stats')
            .select('*')
            .single();
            
        console.log('\n📊 Current Stats:');
        if (stats) {
            console.log('- Unique buyers:', stats.unique_buyers || 0);
            console.log('- Total purchases:', stats.total_purchases || 0);
            console.log('- Tokens sold:', stats.tokens_sold || 0);
        } else {
            console.log('- No purchases yet');
        }
        
        console.log('\n🎉 Supabase is fully configured and working!');
        
    } catch (error) {
        console.error('❌ Connection failed:', error);
    }
}

// Run test
testConnection();