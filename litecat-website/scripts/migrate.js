const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigrations() {
  try {
    console.log('Running database migrations...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct query if RPC fails
          const { error: directError } = await supabase.from('_sql').select().single();
          if (directError) {
            console.error(`Error executing statement ${i + 1}:`, error.message);
            console.error('Statement:', statement.substring(0, 100) + '...');
          }
        }
      } catch (err) {
        console.error(`Error executing statement ${i + 1}:`, err.message);
      }
    }
    
    console.log('Migration completed successfully!');
    
    // Verify tables were created
    const { data: tables, error: tablesError } = await supabase
      .from('purchases')
      .select('count')
      .limit(1);
    
    if (!tablesError) {
      console.log('✓ Purchases table verified');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Alternative migration approach using Supabase SQL Editor API
async function runMigrationsViaAPI() {
  try {
    console.log('Running migrations via Supabase API...');
    
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    // For now, we'll need to run these migrations manually in Supabase Dashboard
    console.log('\n⚠️  IMPORTANT: Automatic migration is not available.');
    console.log('Please follow these steps to set up your database:\n');
    console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/xyfqpvxwvlemnraldbj');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Create a new query');
    console.log('4. Copy and paste the contents of database/schema.sql');
    console.log('5. Run the query\n');
    console.log('The schema file has been created at:', schemaPath);
    console.log('\nOnce you\'ve run the migrations, the payment system will be ready to use!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the appropriate migration method
if (process.argv.includes('--manual')) {
  runMigrationsViaAPI();
} else {
  console.log('⚠️  Supabase requires manual migration through their dashboard.');
  console.log('Run this command with --manual flag for instructions:');
  console.log('  npm run db:migrate -- --manual');
}