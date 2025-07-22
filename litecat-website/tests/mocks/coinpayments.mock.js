// Mock CoinPayments API for testing

class MockCoinPaymentsAPI {
  constructor() {
    this.transactions = new Map();
    this.invoices = new Map();
  }

  async createTransaction(params) {
    const txId = `mock-tx-${Date.now()}`;
    const invoice = {
      txn_id: txId,
      address: 'bc1qmock' + Math.random().toString(36).substring(2, 15),
      amount: params.amount,
      currency: params.currency2,
      confirms_needed: 3,
      timeout: 3600,
      status_url: `https://mock.coinpayments.net/status/${txId}`,
      qrcode_url: `https://mock.coinpayments.net/qr/${txId}`,
      created_at: new Date().toISOString()
    };
    
    this.transactions.set(txId, {
      ...invoice,
      status: 0, // Waiting for payment
      custom: params.custom
    });
    
    return invoice;
  }

  async getTransactionInfo(txId) {
    const tx = this.transactions.get(txId);
    if (!tx) {
      throw new Error('Transaction not found');
    }
    return tx;
  }

  // Simulate payment confirmation
  async simulatePayment(txId, amount) {
    const tx = this.transactions.get(txId);
    if (!tx) {
      throw new Error('Transaction not found');
    }
    
    if (amount === tx.amount) {
      tx.status = 100; // Payment complete
      tx.received_amount = amount;
      tx.received_confirms = 6;
    } else {
      tx.status = -1; // Payment error
      tx.status_text = 'Incorrect amount received';
    }
    
    this.transactions.set(txId, tx);
    return tx;
  }

  // Mock IPN callback
  async sendIPN(txId, webhookUrl) {
    const tx = this.transactions.get(txId);
    if (!tx) {
      throw new Error('Transaction not found');
    }
    
    const ipnData = {
      txn_id: txId,
      status: tx.status,
      status_text: tx.status_text || 'Complete',
      amount1: tx.amount,
      amount2: tx.amount,
      currency1: 'BTC',
      currency2: 'BTC',
      custom: tx.custom
    };
    
    // In real implementation, this would make an HTTP POST
    return ipnData;
  }
}

module.exports = MockCoinPaymentsAPI;