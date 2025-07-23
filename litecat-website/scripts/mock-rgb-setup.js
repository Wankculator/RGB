#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔴 Setting up Mock RGB for Testing');
console.log('==================================\n');

// Generate a mock RGB asset ID
const mockAssetId = `rgb:2bFVTT-qGmxxPDh-X3Bq2Tw-xVbZZ1n-fxT3V7E-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

console.log('📍 Generated Mock RGB Asset ID:');
console.log(`   ${mockAssetId}`);

// Update .env file
const envPath = path.join(__dirname, '..', '.env');
let envContent = fs.readFileSync(envPath, 'utf8');

// Check if RGB_ASSET_ID already exists
if (envContent.includes('RGB_ASSET_ID=')) {
    // Update existing
    envContent = envContent.replace(/RGB_ASSET_ID=.*/, `RGB_ASSET_ID=${mockAssetId}`);
} else {
    // Add new
    envContent += `\n# Mock RGB Asset ID (for testing)\nRGB_ASSET_ID=${mockAssetId}\n`;
}

fs.writeFileSync(envPath, envContent);
console.log('\n✅ Updated .env with mock RGB_ASSET_ID');

// Create mock RGB service
const mockRgbService = `
const crypto = require('crypto');

class MockRGBService {
    constructor() {
        this.assetId = process.env.RGB_ASSET_ID || 'rgb:mock-asset-id';
        console.log('🔴 Using MOCK RGB Service (for testing)');
    }

    async generateConsignment(invoiceId, recipientAddress, amount) {
        console.log(\`Generating mock consignment for \${amount} tokens to \${recipientAddress}\`);
        
        // Simulate consignment generation
        const consignment = {
            version: 1,
            assetId: this.assetId,
            amount: amount,
            recipient: recipientAddress,
            invoiceId: invoiceId,
            timestamp: new Date().toISOString(),
            signature: crypto.randomBytes(64).toString('hex')
        };

        // Convert to base64 (simulating binary consignment file)
        const consignmentBuffer = Buffer.from(JSON.stringify(consignment));
        return consignmentBuffer.toString('base64');
    }

    async validateInvoice(rgbInvoice) {
        // Basic validation for mock
        return rgbInvoice.startsWith('rgb:') && rgbInvoice.includes('utxob:');
    }

    async getAssetInfo() {
        return {
            assetId: this.assetId,
            name: 'LIGHTCAT',
            ticker: 'LCAT',
            totalSupply: 21000000,
            decimals: 0,
            network: 'testnet'
        };
    }
}

module.exports = MockRGBService;
`;

fs.writeFileSync(
    path.join(__dirname, '..', 'server', 'services', 'mockRgbService.js'),
    mockRgbService
);

console.log('✅ Created mock RGB service');

// Update the main RGB service to use mock when RGB node not available
const rgbServiceUpdate = `
const MockRGBService = require('./mockRgbService');

// At the top of rgbService.js, add:
// If RGB node not available, use mock service
if (!process.env.RGB_NODE_URL || process.env.USE_MOCK_RGB === 'true') {
    console.log('⚠️  RGB node not configured, using mock service');
    module.exports = new MockRGBService();
    return;
}
`;

console.log('\n📝 Next Steps:');
console.log('1. The mock RGB service is now ready');
console.log('2. Your .env has been updated with a mock RGB_ASSET_ID');
console.log('3. The system will work with Lightning + mock RGB consignments');
console.log('\n⚠️  Note: This is for TESTING only. For production:');
console.log('   - Install real RGB node on a Linux server');
console.log('   - Generate real 21M LIGHTCAT tokens');
console.log('   - Update RGB_ASSET_ID with real asset ID');

console.log('\n✅ Mock RGB setup complete!');