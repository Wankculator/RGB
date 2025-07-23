// RGB Node Service - Full Automation for LIGHTCAT Tokens
const { exec, spawn } = require('child_process');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;

class RGBNodeService {
  constructor() {
    this.assetId = process.env.RGB_ASSET_ID || 'rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po';
    this.rgbNodePath = process.env.RGB_NODE_PATH || path.join(process.env.HOME, 'rgb-node');
    this.network = process.env.RGB_NETWORK || 'mainnet';
    this.isInitialized = false;
    
    // Security: Never log sensitive data
    this.logger = {
      info: (msg, data = {}) => console.log(`[RGB Node] ${msg}`, this.sanitizeData(data)),
      error: (msg, error) => console.error(`[RGB Node] ERROR: ${msg}`, error.message || error),
      debug: (msg, data = {}) => {
        if (process.env.DEBUG_RGB === 'true') {
          console.log(`[RGB Node DEBUG] ${msg}`, this.sanitizeData(data));
        }
      }
    };
  }

  // Sanitize data to never log sensitive information
  sanitizeData(data) {
    const sanitized = { ...data };
    const sensitiveKeys = ['seed', 'phrase', 'private', 'key', 'password', 'secret'];
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  // Initialize RGB node (one-time setup with seed phrase)
  async initialize() {
    try {
      // Check if already initialized
      const walletExists = await this.checkWalletExists();
      if (walletExists) {
        this.isInitialized = true;
        this.logger.info('RGB node already initialized');
        return true;
      }

      // Import wallet will be done manually via script for security
      this.logger.info('RGB node needs wallet import. Run import-wallet.sh script.');
      return false;
    } catch (error) {
      this.logger.error('Failed to initialize RGB node', error);
      throw error;
    }
  }

  // Check if wallet exists
  async checkWalletExists() {
    return new Promise((resolve) => {
      exec('rgb-cli wallet list', (error, stdout) => {
        if (error) {
          resolve(false);
        } else {
          resolve(stdout.includes('lightcat-main'));
        }
      });
    });
  }

  // Execute RGB CLI command safely
  async executeCommand(command, args = []) {
    return new Promise((resolve, reject) => {
      const fullCommand = `rgb-cli ${command} ${args.join(' ')}`;
      
      this.logger.debug('Executing command', { command, args: args.length });
      
      exec(fullCommand, { 
        cwd: this.rgbNodePath,
        timeout: 30000 // 30 second timeout
      }, (error, stdout, stderr) => {
        if (error) {
          this.logger.error(`Command failed: ${command}`, error);
          reject(error);
          return;
        }
        
        if (stderr) {
          this.logger.error(`Command stderr: ${command}`, stderr);
        }
        
        resolve(stdout.trim());
      });
    });
  }

  // Get current balance
  async getBalance() {
    try {
      const balance = await this.executeCommand('asset', ['balance', this.assetId]);
      
      // Parse balance output
      const match = balance.match(/(\d+)/);
      const amount = match ? parseInt(match[1]) : 0;
      
      this.logger.info('Balance checked', { amount });
      return amount;
    } catch (error) {
      this.logger.error('Failed to get balance', error);
      throw error;
    }
  }

  // Validate RGB invoice format
  validateInvoice(invoice) {
    // Check basic format
    if (!invoice || typeof invoice !== 'string') {
      return { valid: false, error: 'Invalid invoice format' };
    }

    // Check RGB protocol
    if (!invoice.startsWith('rgb:')) {
      return { valid: false, error: 'Invoice must start with rgb:' };
    }

    // Check for required components
    if (!invoice.includes('utxob:')) {
      return { valid: false, error: 'Invalid RGB invoice structure' };
    }

    // Check for Iris proxy endpoint
    if (invoice.includes('proxy.iriswallet.com')) {
      return { valid: true, type: 'iris' };
    }

    return { valid: true, type: 'standard' };
  }

  // Create and execute transfer
  async transferTokens(recipientInvoice, amount, metadata = {}) {
    try {
      // Validate inputs
      const validation = this.validateInvoice(recipientInvoice);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      if (!amount || amount < 1) {
        throw new Error('Invalid amount');
      }

      // Check balance
      const balance = await this.getBalance();
      if (balance < amount) {
        throw new Error(`Insufficient balance. Have: ${balance}, Need: ${amount}`);
      }

      // Create unique transfer ID
      const transferId = crypto.randomBytes(16).toString('hex');
      
      this.logger.info('Creating transfer', {
        transferId,
        amount,
        recipientType: validation.type
      });

      // Execute transfer command
      const args = [
        'transfer', 'create',
        '--asset', this.assetId,
        '--amount', amount.toString(),
        '--recipient', recipientInvoice,
        '--fee-rate', '5'
      ];

      const consignment = await this.executeCommand('transfer', args);
      
      // Log successful transfer
      await this.logTransfer({
        transferId,
        recipientInvoice,
        amount,
        consignment,
        metadata,
        timestamp: new Date().toISOString()
      });

      this.logger.info('Transfer completed', { transferId, amount });

      return {
        success: true,
        transferId,
        consignment,
        amount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Transfer failed', error);
      throw error;
    }
  }

  // Log transfer for record keeping
  async logTransfer(transferData) {
    try {
      const logFile = path.join(this.rgbNodePath, 'logs', 'transfers.log');
      const logEntry = JSON.stringify({
        ...transferData,
        recipientInvoice: transferData.recipientInvoice.substring(0, 30) + '...' // Privacy
      }) + '\n';
      
      await fs.appendFile(logFile, logEntry);
    } catch (error) {
      this.logger.error('Failed to log transfer', error);
      // Don't throw - logging failure shouldn't stop transfer
    }
  }

  // Batch transfer for multiple recipients
  async batchTransfer(transfers) {
    const results = [];
    const successful = [];
    const failed = [];

    for (const transfer of transfers) {
      try {
        const result = await this.transferTokens(
          transfer.recipientInvoice,
          transfer.amount,
          transfer.metadata
        );
        
        successful.push({
          ...transfer,
          ...result
        });
      } catch (error) {
        failed.push({
          ...transfer,
          error: error.message
        });
      }
    }

    return {
      successful,
      failed,
      summary: {
        total: transfers.length,
        succeeded: successful.length,
        failed: failed.length
      }
    };
  }

  // Health check
  async checkHealth() {
    try {
      // Check RGB node is running
      const nodeStatus = await this.executeCommand('node', ['status']);
      
      // Check wallet
      const walletExists = await this.checkWalletExists();
      
      // Check balance
      const balance = await this.getBalance();
      
      return {
        healthy: true,
        node: 'running',
        wallet: walletExists ? 'ready' : 'not imported',
        balance: balance,
        network: this.network
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  // Sync wallet
  async syncWallet() {
    try {
      this.logger.info('Syncing wallet...');
      await this.executeCommand('wallet', ['sync']);
      this.logger.info('Wallet sync completed');
      return true;
    } catch (error) {
      this.logger.error('Wallet sync failed', error);
      throw error;
    }
  }

  // Get transfer history
  async getTransferHistory(limit = 100) {
    try {
      const history = await this.executeCommand('transfer', ['list', '--limit', limit.toString()]);
      
      // Parse history output
      const transfers = history.split('\n')
        .filter(line => line.trim())
        .map(line => {
          // Parse transfer line format
          const parts = line.split(/\s+/);
          return {
            id: parts[0],
            amount: parts[1],
            status: parts[2],
            timestamp: parts[3]
          };
        });
      
      return transfers;
    } catch (error) {
      this.logger.error('Failed to get transfer history', error);
      throw error;
    }
  }

  // Backup wallet data
  async backupWallet() {
    try {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const backupPath = path.join(this.rgbNodePath, 'backups', `wallet-${timestamp}.backup`);
      
      await this.executeCommand('wallet', ['export', '--output', backupPath]);
      
      this.logger.info('Wallet backed up', { backupPath });
      return backupPath;
    } catch (error) {
      this.logger.error('Wallet backup failed', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new RGBNodeService();