#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

console.log('⚡ Testing Voltage Lightning Connection...\n');

// Configuration
const VOLTAGE_URL = 'https://lightcat.m.voltageapp.io:8080';
const MACAROON_PATH = process.env.LIGHTNING_MACAROON_PATH || './voltage-credentials/admin.macaroon';
const CERT_PATH = process.env.LIGHTNING_TLS_CERT_PATH || './voltage-credentials/tls.cert';

// Check if credentials exist
if (!fs.existsSync(MACAROON_PATH)) {
    console.error('❌ Macaroon file not found at:', MACAROON_PATH);
    console.log('\nPlease download admin.macaroon from Voltage and save it to:', MACAROON_PATH);
    process.exit(1);
}

if (!fs.existsSync(CERT_PATH)) {
    console.error('❌ TLS cert file not found at:', CERT_PATH);
    console.log('\nPlease download tls.cert from Voltage and save it to:', CERT_PATH);
    process.exit(1);
}

// Read credentials
const macaroon = fs.readFileSync(MACAROON_PATH).toString('hex');
const cert = fs.readFileSync(CERT_PATH);

// Test getinfo endpoint
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
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const info = JSON.parse(data);
            console.log('✅ Connected to Voltage Lightning Node!\n');
            console.log('Node Info:');
            console.log('- Alias:', info.alias || 'Not set');
            console.log('- Public Key:', info.identity_pubkey);
            console.log('- Testnet:', info.testnet ? 'Yes' : 'No');
            console.log('- Synced:', info.synced_to_chain ? 'Yes' : 'No');
            console.log('- Block Height:', info.block_height);
            console.log('- Active Channels:', info.num_active_channels);
            console.log('\n🎉 Your Lightning node is ready!');
            
            // Test invoice creation
            console.log('\n⚡ Testing invoice creation...');
            testInvoiceCreation();
            
        } catch (error) {
            console.error('❌ Error parsing response:', error.message);
            console.log('Response:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Connection failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure you downloaded both admin.macaroon and tls.cert');
    console.log('2. Check file paths are correct');
    console.log('3. Ensure your node is running on Voltage');
});

req.end();

// Test creating an invoice
function testInvoiceCreation() {
    const invoiceData = JSON.stringify({
        value: 1000, // 1000 sats
        memo: "LIGHTCAT test invoice"
    });
    
    const options = {
        hostname: 'lightcat.m.voltageapp.io',
        port: 8080,
        path: '/v1/invoices',
        method: 'POST',
        headers: {
            'Grpc-Metadata-macaroon': macaroon,
            'Content-Type': 'application/json',
            'Content-Length': invoiceData.length
        },
        ca: cert,
        rejectUnauthorized: false
    };
    
    const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            try {
                const invoice = JSON.parse(data);
                console.log('✅ Test invoice created!');
                console.log('- Payment Request:', invoice.payment_request.substring(0, 50) + '...');
                console.log('- Amount:', invoice.value, 'sats');
                console.log('\n🚀 Everything is working! You can now:');
                console.log('1. Receive Lightning payments');
                console.log('2. Generate invoices for LIGHTCAT purchases');
                console.log('3. Connect this to your RGB setup');
            } catch (error) {
                console.error('❌ Invoice creation failed:', error.message);
            }
        });
    });
    
    req.on('error', (error) => {
        console.error('❌ Invoice request failed:', error.message);
    });
    
    req.write(invoiceData);
    req.end();
}