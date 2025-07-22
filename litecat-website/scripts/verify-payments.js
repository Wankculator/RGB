const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verifyPayments() {
  console.log('🔍 Checking Bitcoin payments...\n');
  
  const walletAddress = process.env.BTC_WALLET_ADDRESS;
  
  try {
    // Get all pending invoices
    const { data: pendingInvoices } = await supabase
      .from('purchases')
      .select('*')
      .eq('status', 'pending');
    
    console.log(`Found ${pendingInvoices.length} pending invoices\n`);
    
    // Get recent transactions from blockchain
    const response = await axios.get(
      `https://blockchain.info/rawaddr/${walletAddress}?limit=100`
    );
    
    const transactions = response.data.txs || [];
    console.log(`Found ${transactions.length} recent transactions\n`);
    
    // Match payments
    let matchedCount = 0;
    
    for (const invoice of pendingInvoices) {
      const expectedAmount = parseFloat(invoice.amount_btc);
      
      // Look for matching transaction
      for (const tx of transactions) {
        // Skip unconfirmed
        if (!tx.block_height) continue;
        
        // Check outputs to our address
        for (const output of tx.out) {
          if (output.addr === walletAddress) {
            const receivedAmount = output.value / 100000000;
            
            // Check if amounts match (with small tolerance for fees)
            if (Math.abs(receivedAmount - expectedAmount) < 0.00000010) {
              console.log(`✅ MATCH FOUND!`);
              console.log(`   Invoice: ${invoice.invoice_id}`);
              console.log(`   Wallet: ${invoice.wallet_address}`);
              console.log(`   Amount: ${receivedAmount} BTC`);
              console.log(`   TX: ${tx.hash}`);
              console.log(`   Confirmations: ${tx.confirmations || 1}\n`);
              
              // Update invoice
              await supabase
                .from('purchases')
                .update({
                  status: 'completed',
                  tx_hash: tx.hash,
                  confirmations: tx.confirmations || 1,
                  completed_at: new Date()
                })
                .eq('invoice_id', invoice.invoice_id);
              
              matchedCount++;
              break;
            }
          }
        }
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Matched payments: ${matchedCount}`);
    console.log(`   Still pending: ${pendingInvoices.length - matchedCount}`);
    
    // Show current sales stats
    const { data: stats } = await supabase
      .from('sales_stats')
      .select('*')
      .single();
    
    console.log(`\n💰 Total Sales:`);
    console.log(`   Batches sold: ${stats.total_batches_sold}`);
    console.log(`   BTC raised: ${stats.total_btc_raised}`);
    console.log(`   Unique buyers: ${stats.unique_buyers}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run verification
verifyPayments();

// Optional: Run continuously
if (process.argv.includes('--watch')) {
  console.log('\n👀 Watching for payments (checking every minute)...');
  setInterval(verifyPayments, 60000);
}