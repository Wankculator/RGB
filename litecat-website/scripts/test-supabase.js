#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Colors for output
const colors = {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

console.log(`${colors.yellow}🧪 Testing Supabase Connection${colors.reset}`);
console.log('==============================\n');

// Create Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testTables() {
    console.log(`${colors.blue}📊 Checking Tables...${colors.reset}`);
    
    const tables = [
        'users',
        'game_scores',
        'rgb_invoices',
        'rgb_payments',
        'rgb_consignments',
        'rgb_sales_stats',
        'rgb_user_stats',
        'lightning_node_info',
        'rgb_audit_log'
    ];
    
    for (const table of tables) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
            
            if (!error) {
                console.log(`${colors.green}✅ Table '${table}' exists${colors.reset}`);
            } else {
                console.log(`${colors.red}❌ Table '${table}' error: ${error.message}${colors.reset}`);
            }
        } catch (err) {
            console.log(`${colors.red}❌ Error checking '${table}': ${err.message}${colors.reset}`);
        }
    }
    console.log('');
}

async function testGameScore() {
    console.log(`${colors.blue}🎮 Testing Game Score Insert...${colors.reset}`);
    
    const testScore = {
        wallet_address: 'test-wallet-' + Date.now(),
        score: Math.floor(Math.random() * 30) + 10,
        lightning_collected: Math.floor(Math.random() * 20),
        tier_unlocked: ['bronze', 'silver', 'gold'][Math.floor(Math.random() * 3)],
        game_duration: 30
    };
    
    const { data, error } = await supabase
        .from('game_scores')
        .insert(testScore)
        .select();
    
    if (error) {
        console.log(`${colors.red}❌ Failed to insert game score: ${error.message}${colors.reset}`);
    } else {
        console.log(`${colors.green}✅ Game score inserted successfully!${colors.reset}`);
        console.log(`   Score: ${data[0].score}, Tier: ${data[0].tier_unlocked}`);
    }
    console.log('');
}

async function testLeaderboard() {
    console.log(`${colors.blue}🏆 Testing Leaderboard...${colors.reset}`);
    
    const { data, error } = await supabase
        .from('game_scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(5);
    
    if (error) {
        console.log(`${colors.red}❌ Failed to fetch leaderboard: ${error.message}${colors.reset}`);
    } else {
        console.log(`${colors.green}✅ Top ${data.length} scores:${colors.reset}`);
        data.forEach((score, index) => {
            console.log(`   ${index + 1}. Score: ${score.score}, Tier: ${score.tier_unlocked}`);
        });
    }
    console.log('');
}

async function testRGBInvoice() {
    console.log(`${colors.blue}💰 Testing RGB Invoice Creation...${colors.reset}`);
    
    // First create a test user
    const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
            email: `test-${Date.now()}@example.com`
        })
        .select()
        .single();
    
    if (userError) {
        console.log(`${colors.red}❌ Failed to create user: ${userError.message}${colors.reset}`);
        return;
    }
    
    // Create test invoice
    const testInvoice = {
        user_id: userData.id,
        rgb_invoice: 'rgb:utxob:test-invoice-' + Date.now(),
        lightning_invoice: 'lnbc1000n1test',
        payment_hash: 'test-hash-' + Date.now(),
        token_amount: 700,
        batches: 1,
        btc_amount: 2000,
        price_per_batch: 2000,
        status: 'pending',
        expires_at: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    };
    
    const { data, error } = await supabase
        .from('rgb_invoices')
        .insert(testInvoice)
        .select();
    
    if (error) {
        console.log(`${colors.red}❌ Failed to create invoice: ${error.message}${colors.reset}`);
    } else {
        console.log(`${colors.green}✅ RGB invoice created successfully!${colors.reset}`);
        console.log(`   Invoice ID: ${data[0].id}`);
        console.log(`   Amount: ${data[0].token_amount} tokens`);
    }
    console.log('');
}

async function testStats() {
    console.log(`${colors.blue}📈 Testing Global Stats...${colors.reset}`);
    
    const { data, error } = await supabase
        .rpc('get_global_stats');
    
    if (error) {
        console.log(`${colors.red}❌ Failed to get stats: ${error.message}${colors.reset}`);
    } else {
        console.log(`${colors.green}✅ Global stats:${colors.reset}`);
        console.log(`   Total users: ${data.total_users}`);
        console.log(`   Total tokens sold: ${data.total_tokens_sold}`);
        console.log(`   Unique players: ${data.unique_players}`);
        console.log(`   Highest score: ${data.highest_score}`);
    }
    console.log('');
}

async function main() {
    try {
        await testTables();
        await testGameScore();
        await testLeaderboard();
        await testRGBInvoice();
        await testStats();
        
        console.log(`${colors.green}🎉 All tests completed!${colors.reset}`);
        console.log('\nYour Supabase database is ready for LIGHTCAT! 🚀');
        
    } catch (error) {
        console.error(`${colors.red}❌ Test failed: ${error.message}${colors.reset}`);
        process.exit(1);
    }
}

// Run tests
main();