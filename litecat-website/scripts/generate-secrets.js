const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate secure random strings
function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// Generate secure password
function generatePassword(length = 16) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  
  return password;
}

async function generateSecureConfig() {
  console.log('🔐 Generating secure configuration...\n');

  // Generate secrets
  const jwtSecret = generateSecret(32);
  const jwtRefreshSecret = generateSecret(32);
  const sessionSecret = generateSecret(32);
  const coinpaymentsIpnSecret = generateSecret(32);
  const adminPassword = generatePassword(16);
  // For development, we'll show how to generate the hash separately
  const adminPasswordHash = 'Run: npx bcryptjs-cli hash "' + adminPassword + '" 12';

  console.log('Generated secure secrets:');
  console.log('========================\n');
  
  console.log('JWT_SECRET=' + jwtSecret);
  console.log('JWT_REFRESH_SECRET=' + jwtRefreshSecret);
  console.log('SESSION_SECRET=' + sessionSecret);
  console.log('COINPAYMENTS_IPN_SECRET=' + coinpaymentsIpnSecret);
  console.log('\nAdmin Credentials:');
  console.log('ADMIN_PASSWORD=' + adminPassword + ' (save this securely!)');
  console.log('ADMIN_PASSWORD_HASH=' + adminPasswordHash + ' (use this in .env)');

  // Create .env.secure file
  const envSecureContent = `# Secure Configuration - Generated ${new Date().toISOString()}
# IMPORTANT: Keep this file secure and never commit to version control!

# JWT Configuration
JWT_SECRET=${jwtSecret}
JWT_REFRESH_SECRET=${jwtRefreshSecret}
SESSION_SECRET=${sessionSecret}

# Admin Configuration
ADMIN_EMAIL=admin@litecat.xyz
ADMIN_PASSWORD_HASH=${adminPasswordHash}
# Admin password: ${adminPassword} (save this securely and remove from file!)

# CoinPayments Security
COINPAYMENTS_IPN_SECRET=${coinpaymentsIpnSecret}

# Additional Security Settings
ENCRYPTION_KEY=${generateSecret(32)}
API_RATE_LIMIT_KEY=${generateSecret(16)}
`;

  // Write to file
  const envSecurePath = path.join(__dirname, '..', '.env.secure');
  fs.writeFileSync(envSecurePath, envSecureContent);
  
  console.log('\n✅ Secure configuration saved to .env.secure');
  console.log('⚠️  IMPORTANT: Save the admin password securely and remove it from the .env.secure file!');
  
  // Update .gitignore to exclude .env.secure
  const gitignorePath = path.join(__dirname, '..', '.gitignore');
  let gitignoreContent = '';
  
  try {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  } catch (e) {
    // File doesn't exist
  }
  
  if (!gitignoreContent.includes('.env.secure')) {
    gitignoreContent += '\n# Security files\n.env.secure\n.env.local\n*.key\n*.pem\n';
    fs.writeFileSync(gitignorePath, gitignoreContent);
    console.log('✅ Updated .gitignore to exclude security files');
  }

  // Create example secure config for production
  const prodConfigExample = `# Production Security Configuration Example
# Copy this to your secure environment and fill in the values

# SSL/TLS Configuration
SSL_CERT_PATH=/etc/ssl/certs/litecat.crt
SSL_KEY_PATH=/etc/ssl/private/litecat.key
SSL_CA_PATH=/etc/ssl/certs/ca-bundle.crt

# Database Encryption
DATABASE_ENCRYPTION_KEY=<generate-with-script>

# API Keys (Production)
COINPAYMENTS_PUBLIC_KEY=<your-production-key>
COINPAYMENTS_PRIVATE_KEY=<your-production-key>
SENDGRID_API_KEY=<your-production-key>

# Monitoring
SENTRY_DSN=<your-sentry-dsn>
DATADOG_API_KEY=<your-datadog-key>

# WAF Configuration
CLOUDFLARE_API_TOKEN=<your-cf-token>
CLOUDFLARE_ZONE_ID=<your-zone-id>

# Backup Encryption
BACKUP_ENCRYPTION_KEY=<generate-with-script>
`;

  fs.writeFileSync(path.join(__dirname, '..', '.env.production.example'), prodConfigExample);
  console.log('✅ Created .env.production.example template');
}

// Run the script
generateSecureConfig().catch(console.error);