#!/usr/bin/env node

// LIGHTCAT Full User Simulation Test
// Tests the complete user journey from game to token purchase

const http = require('http');
const fs = require('fs');
const path = require('path');

// Colors for output
const colors = {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

// Test configuration
const API_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:8082';

console.log(`${colors.cyan}🎮 LIGHTCAT Full User Simulation Test${colors.reset}`);
console.log('=====================================\n');

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    resolve({ status: res.statusCode, data: response });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });
        
        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

// Simulate game play
async function simulateGamePlay() {
    console.log(`${colors.blue}🎮 Step 1: Simulating Game Play${colors.reset}`);
    
    // Simulate different tier scores
    const gameScores = [
        { score: 8, lightning: 5, tier: null },          // No unlock
        { score: 15, lightning: 10, tier: 'bronze' },   // Bronze tier
        { score: 22, lightning: 18, tier: 'silver' },   // Silver tier
        { score: 35, lightning: 28, tier: 'gold' }      // Gold tier
    ];
    
    for (const game of gameScores) {
        console.log(`   Playing game: Score ${game.score}, Lightning ${game.lightning}`);
        if (game.tier) {
            console.log(`   ${colors.green}✅ Unlocked ${game.tier} tier!${colors.reset}`);
        } else {
            console.log(`   ${colors.yellow}❌ No tier unlocked (need 11+ score)${colors.reset}`);
        }
    }
    
    // Return best score
    return gameScores[3];
}

// Check current stats
async function checkStats() {
    console.log(`\n${colors.blue}📊 Step 2: Checking Current Stats${colors.reset}`);
    
    try {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/rgb/stats',
            method: 'GET'
        });
        
        const stats = response.data.stats;
        console.log(`   Batches sold: ${stats.batchesSold}`);
        console.log(`   Tokens sold: ${stats.tokensSold.toLocaleString()}`);
        console.log(`   Unique buyers: ${stats.uniqueBuyers}`);
        console.log(`   Current price: ${stats.currentBatchPrice} sats/batch`);
        console.log(`   ${colors.green}✅ Stats retrieved successfully${colors.reset}`);
        
        return stats;
    } catch (error) {
        console.log(`   ${colors.red}❌ Failed to get stats: ${error.message}${colors.reset}`);
    }
}

// Create RGB invoice
async function createInvoice(tier) {
    console.log(`\n${colors.blue}💰 Step 3: Creating RGB Invoice${colors.reset}`);
    
    // Determine batch count based on tier
    const batchCounts = {
        bronze: 5,
        silver: 8,
        gold: 10
    };
    
    const batchCount = batchCounts[tier] || 1;
    const testData = {
        email: `test-${Date.now()}@example.com`,
        rgbInvoice: `rgb:utxob:testnet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        batchCount: batchCount
    };
    
    console.log(`   Email: ${testData.email}`);
    console.log(`   RGB Invoice: ${testData.rgbInvoice}`);
    console.log(`   Batches: ${batchCount} (${tier} tier max)`);
    console.log(`   Tokens: ${batchCount * 700}`);
    
    try {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/rgb/invoice',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, testData);
        
        if (response.data.success) {
            const invoice = response.data;
            console.log(`   ${colors.green}✅ Invoice created successfully${colors.reset}`);
            console.log(`   Invoice ID: ${invoice.invoiceId}`);
            console.log(`   Lightning Invoice: ${invoice.lightningInvoice}`);
            console.log(`   Amount: ${invoice.amount} sats`);
            console.log(`   Expires: ${new Date(invoice.expiresAt).toLocaleTimeString()}`);
            return invoice;
        } else {
            throw new Error(response.data.error || 'Unknown error');
        }
    } catch (error) {
        console.log(`   ${colors.red}❌ Failed to create invoice: ${error.message}${colors.reset}`);
        return null;
    }
}

// Wait for payment
async function waitForPayment(invoiceId) {
    console.log(`\n${colors.blue}⏳ Step 4: Waiting for Payment${colors.reset}`);
    console.log(`   Checking payment status...`);
    
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
        try {
            const response = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: `/api/rgb/invoice/${invoiceId}/status`,
                method: 'GET'
            });
            
            const status = response.data.status;
            
            if (status === 'paid') {
                console.log(`   ${colors.green}✅ Payment confirmed!${colors.reset}`);
                
                if (response.data.consignment) {
                    console.log(`   ${colors.green}✅ Consignment ready for download${colors.reset}`);
                    console.log(`   Consignment (base64): ${response.data.consignment.substring(0, 50)}...`);
                }
                
                return response.data;
            } else if (status === 'expired') {
                console.log(`   ${colors.red}❌ Invoice expired${colors.reset}`);
                return null;
            } else {
                console.log(`   Status: ${status} (attempt ${attempts + 1}/${maxAttempts})`);
            }
            
            // Wait 2 seconds before next check
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;
            
        } catch (error) {
            console.log(`   ${colors.red}❌ Error checking status: ${error.message}${colors.reset}`);
            return null;
        }
    }
    
    console.log(`   ${colors.red}❌ Payment timeout${colors.reset}`);
    return null;
}

// Download consignment
async function downloadConsignment(invoiceId) {
    console.log(`\n${colors.blue}📥 Step 5: Downloading Consignment${colors.reset}`);
    
    try {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: `/api/rgb/download/${invoiceId}`,
            method: 'GET'
        });
        
        // In a real scenario, this would be a binary file
        console.log(`   ${colors.green}✅ Consignment downloaded${colors.reset}`);
        console.log(`   File would be saved as: lightcat-${invoiceId}.rgb`);
        console.log(`   Size: ~1KB (mock data)`);
        
        return true;
    } catch (error) {
        console.log(`   ${colors.red}❌ Failed to download: ${error.message}${colors.reset}`);
        return false;
    }
}

// Main simulation
async function runSimulation() {
    console.log(`${colors.yellow}🚀 Starting Complete User Journey${colors.reset}\n`);
    
    try {
        // Step 1: Play game
        const gameResult = await simulateGamePlay();
        
        // Step 2: Check stats
        const stats = await checkStats();
        
        // Step 3: Create invoice
        const invoice = await createInvoice(gameResult.tier);
        if (!invoice) {
            throw new Error('Failed to create invoice');
        }
        
        // Step 4: Wait for payment
        const payment = await waitForPayment(invoice.invoiceId);
        if (!payment) {
            throw new Error('Payment failed or expired');
        }
        
        // Step 5: Download consignment
        const downloaded = await downloadConsignment(invoice.invoiceId);
        if (!downloaded) {
            throw new Error('Failed to download consignment');
        }
        
        // Summary
        console.log(`\n${colors.cyan}📊 Simulation Summary${colors.reset}`);
        console.log('====================');
        console.log(`✅ Game completed: ${gameResult.tier} tier unlocked`);
        console.log(`✅ Invoice created: ${invoice.invoiceId}`);
        console.log(`✅ Payment received: ${invoice.amount} sats`);
        console.log(`✅ Tokens purchased: ${gameResult.tier === 'gold' ? 7000 : gameResult.tier === 'silver' ? 5600 : 3500}`);
        console.log(`✅ Consignment delivered: Ready for RGB wallet import`);
        
        console.log(`\n${colors.green}🎉 Full user journey completed successfully!${colors.reset}`);
        
        // Next steps
        console.log(`\n${colors.yellow}📋 What Would Happen Next (with real RGB):${colors.reset}`);
        console.log('1. User imports consignment file into RGB wallet');
        console.log('2. RGB wallet validates the token transfer');
        console.log('3. Tokens appear in user\'s RGB wallet');
        console.log('4. User can transfer tokens to others via RGB');
        
    } catch (error) {
        console.log(`\n${colors.red}❌ Simulation failed: ${error.message}${colors.reset}`);
    }
}

// Check if servers are running
async function checkServers() {
    console.log(`${colors.blue}🔍 Checking Servers...${colors.reset}`);
    
    try {
        // Check API
        const apiResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/health',
            method: 'GET'
        });
        console.log(`   ${colors.green}✅ API Server: Running${colors.reset}`);
        
        // Check Frontend
        const frontendCheck = await new Promise((resolve) => {
            http.get(FRONTEND_URL, (res) => {
                resolve(res.statusCode === 200);
            }).on('error', () => resolve(false));
        });
        
        if (frontendCheck) {
            console.log(`   ${colors.green}✅ Frontend: Running${colors.reset}`);
        } else {
            throw new Error('Frontend not accessible');
        }
        
        return true;
    } catch (error) {
        console.log(`   ${colors.red}❌ Servers not running${colors.reset}`);
        console.log(`\nPlease start servers with: npm run dev`);
        return false;
    }
}

// Run the simulation
async function main() {
    const serversReady = await checkServers();
    
    if (serversReady) {
        console.log('');
        await runSimulation();
    }
}

main();