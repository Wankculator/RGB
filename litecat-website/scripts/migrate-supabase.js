#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Colors for output
const colors = {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

console.log(`${colors.yellow}🗄️ LIGHTCAT Supabase Migration${colors.reset}`);
console.log('================================\n');

// Check environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error(`${colors.red}❌ Missing Supabase credentials in .env${colors.reset}`);
    process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

async function testConnection() {
    console.log(`${colors.blue}🧪 Testing Database Connection...${colors.reset}`);
    
    try {
        const { data, error } = await supabase
            .from('_prisma_migrations')
            .select('id')
            .limit(1);
        
        if (!error || error.code === '42P01') { // Table doesn't exist is OK
            console.log(`${colors.green}✅ Database connection successful${colors.reset}\n`);
            return true;
        } else {
            throw error;
        }
    } catch (error) {
        console.error(`${colors.red}❌ Failed to connect to database${colors.reset}`);
        console.error(error.message);
        return false;
    }
}

async function runMigrations() {
    console.log(`${colors.blue}🔄 Running Database Migrations...${colors.reset}`);
    
    // Read schema file
    const schemaPath = path.join(__dirname, '..', 'database', 'rgb-schema.sql');
    if (!fs.existsSync(schemaPath)) {
        console.error(`${colors.red}❌ Schema file not found: ${schemaPath}${colors.reset}`);
        return false;
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
        try {
            // Extract table name for logging
            const tableMatch = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i);
            const tableName = tableMatch ? tableMatch[1] : 'unknown';
            
            console.log(`Creating table: ${tableName}...`);
            
            // Execute SQL directly using Supabase RPC
            const { error } = await supabase.rpc('exec_sql', {
                sql_query: statement + ';'
            }).single();
            
            if (error) {
                // If exec_sql doesn't exist, we need to create tables differently
                if (error.code === '42883') {
                    console.log(`${colors.yellow}⚠️  Direct SQL execution not available, using alternative method${colors.reset}`);
                    // For now, we'll skip and provide manual instructions
                    throw new Error('Manual migration required');
                }
                throw error;
            }
            
            console.log(`${colors.green}✅ ${tableName} created${colors.reset}`);
            successCount++;
        } catch (error) {
            console.error(`${colors.red}❌ Failed: ${error.message}${colors.reset}`);
            errorCount++;
        }
    }
    
    console.log(`\n${colors.green}✅ Migrations completed: ${successCount} successful, ${errorCount} failed${colors.reset}`);
    return errorCount === 0;
}

async function checkTables() {
    console.log(`\n${colors.blue}📊 Checking Tables...${colors.reset}`);
    
    const expectedTables = [
        'users',
        'rgb_invoices', 
        'rgb_payments',
        'rgb_consignments',
        'game_scores'
    ];
    
    for (const table of expectedTables) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
            
            if (!error) {
                console.log(`${colors.green}✅ Table '${table}' exists${colors.reset}`);
            } else {
                console.log(`${colors.red}❌ Table '${table}' not found${colors.reset}`);
            }
        } catch (error) {
            console.log(`${colors.red}❌ Error checking table '${table}': ${error.message}${colors.reset}`);
        }
    }
}

async function createManualMigrationInstructions() {
    console.log(`\n${colors.yellow}📋 Manual Migration Instructions:${colors.reset}`);
    console.log('====================================\n');
    
    console.log('Since direct SQL execution is not available, please follow these steps:\n');
    
    console.log('1. Go to your Supabase Dashboard:');
    console.log(`   ${colors.blue}${process.env.SUPABASE_URL}${colors.reset}\n`);
    
    console.log('2. Navigate to SQL Editor\n');
    
    console.log('3. Copy and paste the contents of:');
    console.log(`   ${colors.blue}database/rgb-schema.sql${colors.reset}\n`);
    
    console.log('4. Click "Run" to execute the schema\n');
    
    console.log('5. After running, verify all tables are created in the Table Editor\n');
    
    console.log(`${colors.yellow}⚠️  Important: Make sure to enable Row Level Security (RLS) on all tables!${colors.reset}`);
    
    // Create a simplified schema file for easy copying
    const schemaPath = path.join(__dirname, '..', 'database', 'rgb-schema.sql');
    const outputPath = path.join(__dirname, '..', 'database', 'supabase-migration.sql');
    
    if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Add RLS policies to the schema
        const schemaWithRLS = schema + `

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rgb_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE rgb_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rgb_consignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;

-- Create basic policies (customize as needed)
CREATE POLICY "Enable read access for all users" ON users FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON rgb_invoices FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON rgb_payments FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON game_scores FOR SELECT USING (true);

-- Service role can do everything
CREATE POLICY "Service role full access" ON users FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON rgb_invoices FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON rgb_payments FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON rgb_consignments FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON game_scores FOR ALL USING (auth.role() = 'service_role');
`;
        
        fs.writeFileSync(outputPath, schemaWithRLS);
        console.log(`\n${colors.green}✅ Migration file created: database/supabase-migration.sql${colors.reset}`);
    }
}

async function main() {
    try {
        // Test connection
        const connected = await testConnection();
        if (!connected) {
            process.exit(1);
        }
        
        // Check existing tables
        await checkTables();
        
        // Try to run migrations
        const migrationSuccess = await runMigrations();
        
        if (!migrationSuccess) {
            // Provide manual instructions
            await createManualMigrationInstructions();
        }
        
        console.log(`\n${colors.green}🎉 Setup complete!${colors.reset}`);
        console.log('\nNext steps:');
        console.log('1. Run the migration in Supabase SQL Editor if needed');
        console.log('2. Test the API endpoints');
        console.log('3. Start the development server: npm run dev');
        
    } catch (error) {
        console.error(`\n${colors.red}❌ Error: ${error.message}${colors.reset}`);
        process.exit(1);
    }
}

// Run the migration
main();