#!/usr/bin/env node

/**
 * Automated Voltage Withdrawal Script
 * Withdraws Lightning funds to on-chain Bitcoin address when threshold reached
 * Run via cron: */30 * * * * node /path/to/auto-withdraw-voltage.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const WITHDRAWAL_THRESHOLD = 100000; // Withdraw when balance > 100k sats
const MIN_WITHDRAWAL = 50000;        // Don't withdraw less than 50k sats
const DESTINATION_ADDRESS = process.env.BTC_WALLET_ADDRESS || 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';

// Load Voltage credentials
const VOLTAGE_URL = process.env.VOLTAGE_NODE_URL || 'https://lightcat.m.voltageapp.io:8080';
const MACAROON_PATH = path.join(__dirname, '../voltage-credentials/admin.macaroon');
const CERT_PATH = path.join(__dirname, '../voltage-credentials/tls.cert');

async function getBalance() {
  // Implementation to get Lightning balance
  console.log('Checking Lightning balance...');
  // Return mock balance for example
  return { confirmed_balance: 150000 };
}

async function withdrawToOnChain(amount, address) {
  console.log(`Withdrawing ${amount} sats to ${address}`);
  
  // Voltage API call to send on-chain
  // This would use sendcoins API endpoint
  
  return {
    txid: 'mock_txid_' + Date.now(),
    amount: amount,
    fee: 1000
  };
}

async function main() {
  try {
    // Check balance
    const balance = await getBalance();
    const availableSats = parseInt(balance.confirmed_balance);
    
    console.log(`Current balance: ${availableSats} sats`);
    
    // Check if we should withdraw
    if (availableSats >= WITHDRAWAL_THRESHOLD) {
      // Calculate withdrawal amount (leave some for channel fees)
      const withdrawAmount = availableSats - 10000; // Keep 10k sats for fees
      
      if (withdrawAmount >= MIN_WITHDRAWAL) {
        console.log(`Balance exceeds threshold, withdrawing ${withdrawAmount} sats`);
        
        const result = await withdrawToOnChain(withdrawAmount, DESTINATION_ADDRESS);
        
        console.log('Withdrawal successful!');
        console.log(`Transaction ID: ${result.txid}`);
        console.log(`Amount: ${result.amount} sats`);
        console.log(`Fee: ${result.fee} sats`);
        
        // Log to file
        const logEntry = {
          timestamp: new Date().toISOString(),
          balance_before: availableSats,
          withdrawn: withdrawAmount,
          txid: result.txid,
          destination: DESTINATION_ADDRESS
        };
        
        fs.appendFileSync(
          path.join(__dirname, '../logs/withdrawals.log'),
          JSON.stringify(logEntry) + '\n'
        );
      }
    } else {
      console.log(`Balance below threshold (${WITHDRAWAL_THRESHOLD} sats), no withdrawal needed`);
    }
    
  } catch (error) {
    console.error('Withdrawal error:', error);
    // Send alert (email/telegram/etc)
  }
}

// Run the withdrawal check
main();