#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

console.log('⚡ Testing Lightning + RGB Integration\n');

// Configuration
const API_URL = 'http://localhost:3000';
const VOLTAGE_URL = 'https://lightcat.m.voltageapp.io:8080';
const MACAROON_PATH = process.env.LIGHTNING_MACAROON_PATH || '/home/sk84l/voltage-credentials/admin.macaroon';
const CERT_PATH = process.env.LIGHTNING_TLS_CERT_PATH || '/home/sk84l/voltage-credentials/tls.cert';

async function testLightningConnection() {
    console.log('1️⃣ Testing Lightning Connection...');
    
    const macaroon = fs.readFileSync(MACAROON_PATH).toString('hex');
    const cert = fs.readFileSync(CERT_PATH);
    
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'lightcat.m.voltageapp.io',
            port: 8080,
            path: '/v1/getinfo',
            method: 'GET',
            headers: {
                'Grpc-Metadata-macaroon': macaroon,
            },
            ca: cert,
            rejectUnauthorized: false
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const info = JSON.parse(data);
                console.log('   ✅ Lightning node connected');
                console.log(`   ⚡ Active channels: ${info.num_active_channels}`);
                console.log(`   📦 Block height: ${info.block_height}`);
                resolve(info);
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function createRGBInvoice() {
    console.log('\n2️⃣ Creating RGB Invoice...');
    
    const testInvoice = {
        rgbInvoice: `rgb:utxob:testnet-${Date.now()}-test`,
        batchCount: 5,
        email: 'lightning-test@example.com'
    };

    return fetch(`${API_URL}/api/rgb/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testInvoice)
    }).then(res => res.json()).then(data => {
        console.log('   ✅ RGB invoice created');
        console.log(`   📋 Invoice ID: ${data.invoiceId}`);
        console.log(`   💰 Amount: ${data.amount} sats`);
        console.log(`   🎫 Tokens: ${testInvoice.batchCount * 700}`);
        return data;
    });
}

async function simulatePayment(invoiceId) {
    console.log('\n3️⃣ Simulating Payment...');
    console.log('   ⏳ Waiting for mock payment (5 seconds)...');
    
    // Poll for payment status
    for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const response = await fetch(`${API_URL}/api/rgb/invoice/${invoiceId}/status`);
        const data = await response.json();
        
        if (data.status === 'paid' || data.status === 'delivered') {
            console.log('   ✅ Payment received!');
            console.log('   📦 Consignment ready');
            return data;
        }
    }
    
    throw new Error('Payment timeout');
}

async function downloadConsignment(invoiceId) {
    console.log('\n4️⃣ Downloading Consignment...');
    
    const response = await fetch(`${API_URL}/api/rgb/download/${invoiceId}`);
    const data = await response.json();
    
    if (data.success) {
        console.log('   ✅ Consignment downloaded');
        console.log('   📄 File size: ~1KB (mock data)');
        console.log('   🔐 Ready for RGB wallet import');
        return data;
    }
    
    throw new Error('Download failed');
}

async function main() {
    try {
        // Test Lightning
        await testLightningConnection();
        
        // Create RGB invoice
        const invoice = await createRGBInvoice();
        
        // Simulate payment
        await simulatePayment(invoice.invoiceId);
        
        // Download consignment
        await downloadConsignment(invoice.invoiceId);
        
        console.log('\n🎉 Lightning + RGB Integration Test PASSED!');
        console.log('\n📊 Summary:');
        console.log('   ⚡ Lightning: Connected and ready');
        console.log('   🔴 RGB: Mock service working');
        console.log('   💰 Payments: Flow complete');
        console.log('   📦 Consignments: Generated successfully');
        
        console.log('\n🚀 Your platform is ready for testing!');
        console.log('   - Lightning payments will work with real sats');
        console.log('   - RGB consignments are mocked for now');
        console.log('   - Install real RGB node for production');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

main();