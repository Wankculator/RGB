const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function closeMint() {
  console.log('🔒 CLOSING LIGHTCAT TOKEN MINT...\n');
  
  try {
    // 1. Check current sales
    const { data: stats } = await supabase
      .from('sales_stats')
      .select('*')
      .single();
    
    const totalBatches = 27900;
    const soldBatches = stats?.total_batches_sold || 0;
    const remaining = totalBatches - soldBatches;
    
    console.log(`📊 Current Status:`);
    console.log(`   Total Supply: ${totalBatches} batches`);
    console.log(`   Sold: ${soldBatches} batches`);
    console.log(`   Remaining: ${remaining} batches`);
    console.log(`   Progress: ${((soldBatches / totalBatches) * 100).toFixed(2)}%\n`);
    
    if (remaining > 0) {
      console.log('⚠️  WARNING: Sale is not complete!');
      console.log(`   ${remaining} batches still available`);
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        readline.question('\nDo you want to close the mint anyway? (yes/NO): ', resolve);
      });
      readline.close();
      
      if (answer.toLowerCase() !== 'yes') {
        console.log('\n❌ Mint closure cancelled.');
        return;
      }
    }
    
    // 2. Export final data
    console.log('\n📁 Exporting final sale data...');
    
    // Get all completed purchases
    const { data: purchases } = await supabase
      .from('purchases')
      .select('*')
      .eq('status', 'completed')
      .order('completed_at');
    
    // Create final report
    const timestamp = new Date().toISOString();
    const reportDir = path.join(__dirname, '../mint-closure');
    await fs.mkdir(reportDir, { recursive: true });
    
    // Group by wallet
    const walletData = {};
    for (const purchase of purchases) {
      if (!walletData[purchase.wallet_address]) {
        walletData[purchase.wallet_address] = {
          address: purchase.wallet_address,
          batches: 0,
          tokens: 0,
          btc_paid: 0,
          transactions: []
        };
      }
      
      walletData[purchase.wallet_address].batches += purchase.batches;
      walletData[purchase.wallet_address].tokens += purchase.tokens;
      walletData[purchase.wallet_address].btc_paid += parseFloat(purchase.amount_btc);
      walletData[purchase.wallet_address].transactions.push({
        invoice_id: purchase.invoice_id,
        tx_hash: purchase.tx_hash,
        amount: purchase.amount_btc,
        date: purchase.completed_at
      });
    }
    
    // Save final allocation file
    const allocations = Object.values(walletData);
    const allocationPath = path.join(reportDir, 'final_token_allocation.json');
    await fs.writeFile(allocationPath, JSON.stringify(allocations, null, 2));
    console.log(`✅ Token allocations saved: ${allocationPath}`);
    
    // Save CSV for easy import
    let csvContent = 'wallet_address,tokens\n';
    for (const wallet of allocations) {
      csvContent += `${wallet.address},${wallet.tokens}\n`;
    }
    const csvPath = path.join(reportDir, 'airdrop_list.csv');
    await fs.writeFile(csvPath, csvContent);
    console.log(`✅ Airdrop CSV saved: ${csvPath}`);
    
    // Create closure certificate
    const certificate = {
      mint_closed_at: timestamp,
      total_supply: totalBatches * 700, // Total tokens
      tokens_sold: stats.total_tokens_sold,
      batches_sold: stats.total_batches_sold,
      btc_raised: stats.total_btc_raised,
      unique_holders: allocations.length,
      final_allocations: allocations,
      certificate_hash: null // Will be computed
    };
    
    // Compute hash of the allocation data
    const crypto = require('crypto');
    const dataToHash = JSON.stringify(allocations);
    certificate.certificate_hash = crypto.createHash('sha256').update(dataToHash).digest('hex');
    
    const certPath = path.join(reportDir, 'mint_closure_certificate.json');
    await fs.writeFile(certPath, JSON.stringify(certificate, null, 2));
    console.log(`✅ Closure certificate saved: ${certPath}`);
    
    // 3. Update database to prevent new purchases
    await supabase
      .from('sales_stats')
      .update({ mint_closed: true, closed_at: timestamp })
      .eq('id', 1);
    
    // 4. Create summary report
    let summary = `LIGHTCAT TOKEN MINT CLOSURE REPORT\n`;
    summary += `=====================================\n\n`;
    summary += `Closure Date: ${timestamp}\n`;
    summary += `Final Statistics:\n`;
    summary += `  - Total Token Supply: ${totalBatches * 700} LIGHTCAT\n`;
    summary += `  - Tokens Sold: ${stats.total_tokens_sold}\n`;
    summary += `  - Batches Sold: ${stats.total_batches_sold}/${totalBatches}\n`;
    summary += `  - BTC Raised: ${stats.total_btc_raised} BTC\n`;
    summary += `  - Unique Holders: ${allocations.length}\n`;
    summary += `  - Certificate Hash: ${certificate.certificate_hash}\n\n`;
    summary += `Files Generated:\n`;
    summary += `  - Token Allocations: final_token_allocation.json\n`;
    summary += `  - Airdrop List: airdrop_list.csv\n`;
    summary += `  - Closure Certificate: mint_closure_certificate.json\n\n`;
    summary += `Next Steps:\n`;
    summary += `  1. Verify all payments are confirmed\n`;
    summary += `  2. Use airdrop_list.csv for token distribution\n`;
    summary += `  3. Publish certificate hash for transparency\n`;
    summary += `  4. Begin RGB token minting process\n`;
    
    const summaryPath = path.join(reportDir, 'CLOSURE_SUMMARY.txt');
    await fs.writeFile(summaryPath, summary);
    console.log(`✅ Summary report saved: ${summaryPath}`);
    
    console.log('\n' + summary);
    
    console.log('\n🎉 MINT SUCCESSFULLY CLOSED!');
    console.log('📁 All files saved in: mint-closure/');
    console.log('🔐 Certificate hash:', certificate.certificate_hash);
    
  } catch (error) {
    console.error('\n❌ Error closing mint:', error);
    process.exit(1);
  }
}

// Run with confirmation
if (process.argv.includes('--confirm')) {
  closeMint();
} else {
  console.log('⚠️  This will permanently close the LIGHTCAT token mint.');
  console.log('   Run with --confirm flag to proceed:');
  console.log('   node scripts/close-mint.js --confirm\n');
}