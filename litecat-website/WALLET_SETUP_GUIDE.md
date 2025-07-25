# Enterprise Wallet Setup Guide

## Option 1: Hardware Security Module (Most Secure)
1. Connect HSM device
2. Import wallet to HSM
3. Configure API to use HSM

## Option 2: Encrypted Wallet (Recommended)
1. Run: `rgb --network testnet wallet import --name lightcat_enterprise`
2. Enter seed phrase when prompted
3. Create strong password
4. Store password in secure key management system

## Option 3: Cloud Key Management (AWS/Azure/GCP)
1. Create key in cloud KMS
2. Import wallet with cloud-managed password
3. Configure API with cloud credentials

## Security Configuration

Create `/opt/lightcat-rgb/config/secure.conf`:
```json
{
  "walletPassword": "encrypted-password-here",
  "apiKeys": {
    "monitoring": "random-api-key",
    "admin": "random-admin-key"
  },
  "limits": {
    "maxTokensPerTransaction": 7000,
    "maxTransactionsPerHour": 100
  }
}
```

Encrypt the file:
```bash
LIGHTCAT_MASTER_KEY=$(openssl rand -base64 32)
echo $LIGHTCAT_MASTER_KEY > /opt/lightcat-rgb/config/.master.key
chmod 600 /opt/lightcat-rgb/config/.master.key

# Use the enterprise service to encrypt config
node -e "
const service = require('./rgbEnterpriseService');
const config = require('./secure.conf');
service.security.encrypt(JSON.stringify(config), '$LIGHTCAT_MASTER_KEY')
  .then(encrypted => {
    require('fs').writeFileSync('secure.conf.enc', encrypted);
    console.log('Config encrypted');
  });
"
```
