
const crypto = require('crypto');

class MockRGBService {
    constructor() {
        this.assetId = process.env.RGB_ASSET_ID || 'rgb:mock-asset-id';
        console.log('🔴 Using MOCK RGB Service (for testing)');
    }

    async generateConsignment(invoiceId, recipientAddress, amount) {
        console.log(`Generating mock consignment for ${amount} tokens to ${recipientAddress}`);
        
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
