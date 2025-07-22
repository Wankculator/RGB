const axios = require('axios');
const { supabase } = require('./supabaseService');
const { logger } = require('../utils/logger');

class BitcoinMonitor {
  constructor() {
    this.walletAddress = process.env.BTC_WALLET_ADDRESS;
    this.lastCheckedBlock = null;
    this.checkInterval = 60000; // Check every minute
  }

  // Start monitoring for payments
  async startMonitoring() {
    logger.info('Starting Bitcoin payment monitoring...');
    
    // Check immediately, then every minute
    this.checkPayments();
    setInterval(() => this.checkPayments(), this.checkInterval);
  }

  async checkPayments() {
    try {
      // Using blockchain.info API (free tier available)
      const response = await axios.get(
        `https://blockchain.info/rawaddr/${this.walletAddress}?limit=50`
      );

      const transactions = response.data.txs || [];

      for (const tx of transactions) {
        // Only process confirmed transactions
        if (tx.block_height) {
          await this.processTransaction(tx);
        }
      }
    } catch (error) {
      logger.error('Error checking payments:', error);
    }
  }

  async processTransaction(tx) {
    try {
      // Find outputs to our address
      for (const output of tx.out) {
        if (output.addr === this.walletAddress) {
          const amountBTC = output.value / 100000000;
          
          // Find matching invoice by amount
          const { data: invoice } = await supabase
            .from('purchases')
            .select('*')
            .eq('amount_btc', amountBTC)
            .eq('status', 'pending')
            .single();

          if (invoice) {
            // Update invoice as paid
            await supabase
              .from('purchases')
              .update({
                status: 'completed',
                tx_hash: tx.hash,
                confirmations: tx.confirmations || 1,
                completed_at: new Date()
              })
              .eq('invoice_id', invoice.invoice_id);

            logger.info(`Payment confirmed for invoice ${invoice.invoice_id}`);
            
            // Update sales stats
            await this.updateSalesStats(invoice);
          }
        }
      }
    } catch (error) {
      logger.error('Error processing transaction:', error);
    }
  }

  async updateSalesStats(invoice) {
    // Update sales statistics
    const { data: stats } = await supabase
      .from('sales_stats')
      .select('*')
      .eq('id', 1)
      .single();

    await supabase
      .from('sales_stats')
      .update({
        total_batches_sold: (stats?.total_batches_sold || 0) + invoice.batches,
        total_tokens_sold: (stats?.total_tokens_sold || 0) + invoice.tokens,
        total_btc_raised: (stats?.total_btc_raised || 0) + parseFloat(invoice.amount_btc),
        unique_buyers: (stats?.unique_buyers || 0) + 1,
        last_sale_at: new Date()
      })
      .eq('id', 1);
  }
}

module.exports = new BitcoinMonitor();