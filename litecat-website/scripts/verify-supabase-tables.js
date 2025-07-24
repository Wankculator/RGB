#!/usr/bin/env node

// Verify Supabase tables were created
const SUPABASE_URL = 'https://xyfqpvxwvlemnraldbjd.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZnFwdnh3dmxlbW5yYWxkYmpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzEwOTYzOSwiZXhwIjoyMDY4Njg1NjM5fQ.GSMgIcht9_O77tPkb1ofQxRixUHt7OdaVXHwUYJ1Y60';

console.log('🔍 Verifying Supabase Tables...\n');

async function checkTables() {
    const tables = ['users', 'game_scores', 'lightning_payments', 'purchases', 'rgb_transfers'];
    let allGood = true;
    
    for (const table of tables) {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?limit=1`, {
                headers: {
                    'apikey': SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                    'Prefer': 'count=exact'
                }
            });
            
            if (response.ok) {
                const count = response.headers.get('content-range');
                console.log(`✅ Table '${table}' exists`);
            } else {
                console.log(`❌ Table '${table}' not found`);
                allGood = false;
            }
        } catch (error) {
            console.log(`❌ Error checking table '${table}': ${error.message}`);
            allGood = false;
        }
    }
    
    console.log('\n📊 Checking views...');
    
    const views = ['purchase_stats', 'tier_stats'];
    for (const view of views) {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/${view}`, {
                headers: {
                    'apikey': SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
                }
            });
            
            if (response.ok) {
                console.log(`✅ View '${view}' exists`);
            } else {
                console.log(`❌ View '${view}' not found`);
                allGood = false;
            }
        } catch (error) {
            console.log(`❌ Error checking view '${view}': ${error.message}`);
            allGood = false;
        }
    }
    
    if (allGood) {
        console.log('\n🎉 All tables and views created successfully!');
        console.log('\n✅ Supabase is ready for production!');
        console.log('\n🚀 Next step: Import RGB seed phrase');
    } else {
        console.log('\n⚠️  Some tables/views are missing.');
        console.log('Please check the SQL Editor and run the schema again.');
    }
}

checkTables();