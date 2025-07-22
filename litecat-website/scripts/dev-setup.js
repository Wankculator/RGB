#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 LITECAT Development Setup\n');

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
if (majorVersion < 18) {
  console.error('❌ Node.js 18 or higher is required');
  process.exit(1);
}
console.log(`✅ Node.js ${nodeVersion}`);

// Check if .env exists
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env from example...');
  const envExample = path.join(__dirname, '..', '.env.example');
  if (fs.existsSync(envExample)) {
    fs.copyFileSync(envExample, envPath);
    console.log('✅ .env file created');
  } else {
    console.error('❌ .env.example not found');
    process.exit(1);
  }
}

// Check dependencies
console.log('\n📦 Checking dependencies...');
try {
  execSync('npm list --depth=0', { stdio: 'ignore' });
  console.log('✅ Dependencies installed');
} catch (error) {
  console.log('📥 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
}

// Check for secure configuration
const envSecurePath = path.join(__dirname, '..', '.env.secure');
if (!fs.existsSync(envSecurePath)) {
  console.log('\n🔐 Generating secure configuration...');
  execSync('node scripts/generate-secrets.js', { stdio: 'inherit' });
}

// Create required directories
const dirs = [
  'logs',
  'uploads',
  'temp',
  'server/templates/email'
];

console.log('\n📁 Creating directories...');
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created ${dir}/`);
  }
});

// Check database connection
console.log('\n🗄️  Checking database connection...');
try {
  const { supabase } = require('../server/services/supabaseService');
  console.log('✅ Supabase configured');
} catch (error) {
  console.warn('⚠️  Supabase not configured - check your .env file');
}

// Display next steps
console.log('\n✨ Setup complete!\n');
console.log('Next steps:');
console.log('1. Update .env with your API keys');
console.log('2. Run: npm run dev');
console.log('3. Visit: http://localhost:3000\n');

// Check for updates
console.log('💡 Tips:');
console.log('- Run "npm run mcp:validate-all" to validate your setup');
console.log('- Run "npm run test" to run tests');
console.log('- Check CLAUDE.md for development guidelines\n');