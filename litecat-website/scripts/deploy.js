#!/usr/bin/env node

/**
 * LITECAT DEPLOYMENT SCRIPT
 * Handles environment setup and deployment to Vercel
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class LitecatDeployer {
  constructor() {
    this.projectRoot = process.cwd();
    this.envFile = path.join(this.projectRoot, '.env');
    this.requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'COINPAYMENTS_PUBLIC_KEY',
      'COINPAYMENTS_PRIVATE_KEY',
      'JWT_SECRET'
    ];
  }

  async deploy() {
    console.log('🐱⚡ Starting Litecat deployment process...\n');

    try {
      await this.validateEnvironment();
      await this.runTests();
      await this.buildProject();
      await this.deployToVercel();
      
      console.log('\n🎉 Deployment completed successfully!');
      console.log('🌐 Visit your live site and start selling LITECAT tokens!');
      
    } catch (error) {
      console.error('\n❌ Deployment failed:', error.message);
      process.exit(1);
    }
  }

  async validateEnvironment() {
    console.log('🔍 Validating environment...');

    // Check if .env exists
    if (!fs.existsSync(this.envFile)) {
      throw new Error('.env file not found. Please copy .env.example to .env and configure it.');
    }

    // Load environment variables
    require('dotenv').config();

    // Check required variables
    const missing = this.requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate Supabase connection
    await this.validateSupabase();
    
    // Validate CoinPayments configuration
    await this.validateCoinPayments();

    console.log('✅ Environment validation passed');
  }

  async validateSupabase() {
    console.log('  📊 Testing Supabase connection...');
    
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );

      // Test connection with a simple query
      const { data, error } = await supabase
        .from('purchases')
        .select('count')
        .limit(1);

      if (error && !error.message.includes('permission denied')) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }

      console.log('  ✅ Supabase connection successful');
    } catch (error) {
      throw new Error(`Supabase validation failed: ${error.message}`);
    }
  }

  async validateCoinPayments() {
    console.log('  💰 Validating CoinPayments configuration...');
    
    if (!process.env.COINPAYMENTS_PUBLIC_KEY || !process.env.COINPAYMENTS_PRIVATE_KEY) {
      throw new Error('CoinPayments API keys are required');
    }

    // Basic format validation
    if (process.env.COINPAYMENTS_PUBLIC_KEY.length < 32) {
      throw new Error('CoinPayments public key appears to be invalid');
    }

    if (process.env.COINPAYMENTS_PRIVATE_KEY.length < 32) {
      throw new Error('CoinPayments private key appears to be invalid');
    }

    console.log('  ✅ CoinPayments configuration valid');
  }

  async runTests() {
    console.log('🧪 Running tests...');

    try {
      // Run unit tests
      execSync('npm test', { stdio: 'inherit', cwd: this.projectRoot });
      console.log('✅ All tests passed');
    } catch (error) {
      throw new Error('Tests failed. Fix issues before deploying.');
    }
  }

  async buildProject() {
    console.log('🔨 Building project...');

    try {
      // Install dependencies
      execSync('npm ci', { stdio: 'inherit', cwd: this.projectRoot });
      
      // Run build process
      execSync('npm run build', { stdio: 'inherit', cwd: this.projectRoot });
      
      console.log('✅ Build completed successfully');
    } catch (error) {
      throw new Error('Build failed: ' + error.message);
    }
  }

  async deployToVercel() {
    console.log('🚀 Deploying to Vercel...');

    try {
      // Check if Vercel CLI is installed
      try {
        execSync('vercel --version', { stdio: 'ignore' });
      } catch {
        console.log('  📦 Installing Vercel CLI...');
        execSync('npm install -g vercel', { stdio: 'inherit' });
      }

      // Deploy to production
      execSync('vercel --prod --yes', { 
        stdio: 'inherit', 
        cwd: this.projectRoot,
        env: { ...process.env, CI: '1' }
      });

      console.log('✅ Deployment to Vercel completed');
    } catch (error) {
      throw new Error('Vercel deployment failed: ' + error.message);
    }
  }

  async setupDatabase() {
    console.log('🗄️  Setting up database...');

    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Read and execute schema
      const schemaPath = path.join(this.projectRoot, 'database', 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');

      // Note: In a real deployment, you'd run this through Supabase CLI
      // or execute the SQL directly in the Supabase dashboard
      console.log('  ⚠️  Please run the database schema manually in Supabase:');
      console.log('     1. Open your Supabase dashboard');
      console.log('     2. Go to SQL Editor');
      console.log('     3. Run the schema.sql file');

      console.log('✅ Database setup instructions provided');
    } catch (error) {
      console.warn('⚠️  Database setup could not be automated:', error.message);
    }
  }
}

// CLI usage
if (require.main === module) {
  const deployer = new LitecatDeployer();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'validate':
      deployer.validateEnvironment().catch(error => {
        console.error('❌ Validation failed:', error.message);
        process.exit(1);
      });
      break;
      
    case 'test':
      deployer.runTests().catch(error => {
        console.error('❌ Tests failed:', error.message);
        process.exit(1);
      });
      break;
      
    case 'build':
      deployer.buildProject().catch(error => {
        console.error('❌ Build failed:', error.message);
        process.exit(1);
      });
      break;
      
    case 'deploy':
    case undefined:
      deployer.deploy();
      break;
      
    default:
      console.log(`
🐱⚡ Litecat Deployment Tool

Usage:
  node scripts/deploy.js [command]

Commands:
  validate    - Validate environment configuration
  test        - Run tests only
  build       - Build project only
  deploy      - Full deployment (default)

Examples:
  node scripts/deploy.js validate
  node scripts/deploy.js deploy
      `);
  }
}

module.exports = LitecatDeployer;
