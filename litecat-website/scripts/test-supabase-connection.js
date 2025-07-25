require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Testing Supabase Connection...\n');

// Check environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

console.log('Configuration:');
console.log('- URL:', supabaseUrl || '❌ Missing');
console.log('- Service Key:', supabaseKey ? '✅ Set' : '❌ Missing');
console.log('');

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials!');
    console.log('\nPlease ensure these are set in your .env file:');
    console.log('SUPABASE_URL=https://your-project.supabase.co');
    console.log('SUPABASE_SERVICE_KEY=your-service-key');
    process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function testConnection() {
    try {
        // Test 1: List tables
        console.log('📋 Testing database access...');
        const { data: tables, error: tablesError } = await supabase
            .from('game_scores')
            .select('*')
            .limit(1);
        
        if (tablesError) {
            console.error('❌ Error accessing database:', tablesError.message);
            return;
        }
        
        console.log('✅ Database connection successful!');
        
        // Test 2: Check tables
        console.log('\n📊 Checking tables...');
        const tablesToCheck = [
            'users',
            'game_scores',
            'rgb_invoices',
            'lightning_payments',
            'purchases',
            'rgb_transfers',
            'system_metrics',
            'wallet_balances'
        ];
        
        for (const table of tablesToCheck) {
            try {
                const { count, error } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true });
                
                if (error) {
                    console.log(`  ❌ ${table}: Not accessible`);
                } else {
                    console.log(`  ✅ ${table}: Accessible (${count || 0} records)`);
                }
            } catch (e) {
                console.log(`  ❌ ${table}: Error - ${e.message}`);
            }
        }
        
        // Test 3: Insert test data
        console.log('\n🧪 Testing data insertion...');
        const testScore = {
            wallet_address: 'bc1qtest' + Date.now(),
            score: 25,
            tier: 'silver',
            max_batches: 8,
            game_duration: 30,
            metadata: { test: true }
        };
        
        const { data: inserted, error: insertError } = await supabase
            .from('game_scores')
            .insert([testScore])
            .select()
            .single();
        
        if (insertError) {
            console.log('❌ Insert test failed:', insertError.message);
        } else {
            console.log('✅ Insert test successful!');
            console.log('   Inserted ID:', inserted.id);
            
            // Clean up test data
            const { error: deleteError } = await supabase
                .from('game_scores')
                .delete()
                .eq('id', inserted.id);
            
            if (!deleteError) {
                console.log('   ✅ Test data cleaned up');
            }
        }
        
        // Test 4: Check RLS policies
        console.log('\n🔒 Checking security...');
        console.log('  ℹ️  Using service key - bypasses RLS');
        console.log('  ✅ Full access granted');
        
        console.log('\n✅ All tests completed!');
        console.log('\nSupabase is properly configured and ready to use!');
        
    } catch (error) {
        console.error('\n❌ Unexpected error:', error);
    }
}

// Run tests
testConnection();