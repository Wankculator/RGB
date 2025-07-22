const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function exportAirdropData() {
  console.log('📊 Exporting airdrop data...\n');
  
  try {
    // Get all completed purchases grouped by wallet
    const { data: purchases } = await supabase
      .from('purchases')
      .select('*')
      .eq('status', 'completed')
      .order('completed_at', { ascending: true });
    
    // Group by wallet address
    const walletTotals = {};
    
    for (const purchase of purchases) {
      if (!walletTotals[purchase.wallet_address]) {
        walletTotals[purchase.wallet_address] = {
          wallet_address: purchase.wallet_address,
          total_batches: 0,
          total_tokens: 0,
          total_btc_paid: 0,
          transactions: []
        };
      }
      
      walletTotals[purchase.wallet_address].total_batches += purchase.batches;
      walletTotals[purchase.wallet_address].total_tokens += purchase.tokens;
      walletTotals[purchase.wallet_address].total_btc_paid += parseFloat(purchase.amount_btc);
      walletTotals[purchase.wallet_address].transactions.push({
        tx_hash: purchase.tx_hash,
        amount: purchase.amount_btc,
        date: purchase.completed_at
      });
    }
    
    // Convert to array and sort by tokens
    const airdropList = Object.values(walletTotals)
      .sort((a, b) => b.total_tokens - a.total_tokens);
    
    // Create CSV content
    let csvContent = 'wallet_address,total_tokens,total_batches,total_btc_paid,tx_count\n';
    let jsonData = [];
    
    console.log('📋 Airdrop Recipients:\n');
    console.log('Wallet Address                                    | Tokens    | Batches | BTC Paid     | TXs');
    console.log('-'.repeat(95));
    
    for (const wallet of airdropList) {
      // Console output
      console.log(
        `${wallet.wallet_address.padEnd(48)} | ${
          wallet.total_tokens.toString().padStart(9)
        } | ${
          wallet.total_batches.toString().padStart(7)
        } | ${
          wallet.total_btc_paid.toFixed(8).padStart(12)
        } | ${
          wallet.transactions.length.toString().padStart(3)
        }`
      );
      
      // CSV data
      csvContent += `${wallet.wallet_address},${wallet.total_tokens},${wallet.total_batches},${wallet.total_btc_paid},${wallet.transactions.length}\n`;
      
      // JSON data
      jsonData.push({
        address: wallet.wallet_address,
        tokens: wallet.total_tokens,
        batches: wallet.total_batches,
        btc_paid: wallet.total_btc_paid,
        transactions: wallet.transactions
      });
    }
    
    // Summary
    const totalTokens = airdropList.reduce((sum, w) => sum + w.total_tokens, 0);
    const totalBTC = airdropList.reduce((sum, w) => sum + w.total_btc_paid, 0);
    
    console.log('-'.repeat(95));
    console.log(`TOTAL: ${airdropList.length} wallets | ${totalTokens} tokens | ${totalBTC.toFixed(8)} BTC\n`);
    
    // Save files
    const timestamp = new Date().toISOString().slice(0, 10);
    const exportDir = path.join(__dirname, '../exports');
    
    // Create exports directory
    await fs.mkdir(exportDir, { recursive: true });
    
    // Save CSV
    const csvPath = path.join(exportDir, `airdrop_${timestamp}.csv`);
    await fs.writeFile(csvPath, csvContent);
    console.log(`✅ CSV saved: ${csvPath}`);
    
    // Save JSON
    const jsonPath = path.join(exportDir, `airdrop_${timestamp}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(jsonData, null, 2));
    console.log(`✅ JSON saved: ${jsonPath}`);
    
    // Save detailed report
    const reportPath = path.join(exportDir, `airdrop_report_${timestamp}.txt`);
    let reportContent = `LIGHTCAT Token Airdrop Report\n`;
    reportContent += `Generated: ${new Date().toISOString()}\n\n`;
    reportContent += `Total Recipients: ${airdropList.length}\n`;
    reportContent += `Total Tokens: ${totalTokens}\n`;
    reportContent += `Total BTC Raised: ${totalBTC.toFixed(8)}\n\n`;
    reportContent += `Detailed Breakdown:\n`;
    
    for (const wallet of airdropList) {
      reportContent += `\nWallet: ${wallet.wallet_address}\n`;
      reportContent += `  Tokens: ${wallet.total_tokens}\n`;
      reportContent += `  Transactions:\n`;
      for (const tx of wallet.transactions) {
        reportContent += `    - ${tx.tx_hash} (${tx.amount} BTC)\n`;
      }
    }
    
    await fs.writeFile(reportPath, reportContent);
    console.log(`✅ Report saved: ${reportPath}\n`);
    
  } catch (error) {
    console.error('Error exporting data:', error);
  }
}

// Run export
exportAirdropData();