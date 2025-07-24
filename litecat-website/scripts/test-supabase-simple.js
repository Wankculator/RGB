#!/usr/bin/env node

// Simple Supabase connection test using fetch
const SUPABASE_URL = 'https://xyfqpvxwvlemnraldbjd.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZnFwdnh3dmxlbW5yYWxkYmpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzEwOTYzOSwiZXhwIjoyMDY4Njg1NjM5fQ.GSMgIcht9_O77tPkb1ofQxRixUHt7OdaVXHwUYJ1Y60';

console.log('🧪 Testing Supabase Connection...\n');

// Test basic API connectivity
fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
})
.then(response => {
    if (response.ok) {
        console.log('✅ Connected to Supabase!');
        console.log(`✅ Status: ${response.status}`);
        console.log('\n📊 Next Steps:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Copy and paste the contents of database/production-schema.sql');
        console.log('4. Click "Run" to create all tables');
        console.log('\n🔗 Direct link to SQL Editor:');
        console.log(`${SUPABASE_URL}/dashboard/project/xyfqpvxwvlemnraldbjd/sql`);
    } else {
        console.error('❌ Connection failed:', response.status, response.statusText);
    }
})
.catch(error => {
    console.error('❌ Connection error:', error.message);
});