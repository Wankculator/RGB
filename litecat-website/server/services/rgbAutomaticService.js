// Fully Automatic RGB Service - No Manual Steps
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { logger } = require('../utils/logger');

class RGBAutomaticService {
    constructor() {
        this.network = process.env.RGB_NETWORK || 'testnet';
        this.walletName = process.env.RGB_WALLET_NAME || 'lightcat_auto';
        this.dataDir = process.env.RGB_DATA_DIR || '/root/.rgb';
        this.contractId = process.env.RGB_CONTRACT_ID || null;
        this.isInitialized = false;
        
        // Initialize on startup
        this.initialize();
    }

    async initialize() {
        try {
            // Check if RGB CLI is installed
            await this.checkRGBInstallation();
            
            // Check if wallet exists
            await this.ensureWalletExists();
            
            // Verify contract ID
            await this.verifyContract();
            
            this.isInitialized = true;
            logger.info('RGB Automatic Service initialized successfully');
            
        } catch (error) {
            logger.error('RGB Service initialization failed:', error);
            // Continue in mock mode if initialization fails
            this.isInitialized = false;
        }
    }

    async checkRGBInstallation() {
        return new Promise((resolve, reject) => {
            exec('rgb --version', (error, stdout) => {
                if (error) {
                    logger.warn('RGB CLI not installed, running in mock mode');
                    reject(new Error('RGB CLI not installed'));
                } else {
                    logger.info('RGB CLI version:', stdout.trim());
                    resolve(true);
                }
            });
        });
    }

    async ensureWalletExists() {
        try {
            // Check if wallet exists
            const walletPath = path.join(this.dataDir, 'wallets', this.walletName);
            await fs.access(walletPath);
            logger.info('RGB wallet found:', this.walletName);
            
        } catch (error) {
            // Wallet doesn't exist
            if (process.env.RGB_AUTO_CREATE_WALLET === 'true') {
                logger.info('Auto-creating RGB wallet...');
                await this.createWallet();
            } else {
                throw new Error('RGB wallet not found. Set RGB_AUTO_CREATE_WALLET=true to create automatically');
            }
        }
    }

    async createWallet() {
        // For automatic wallet creation, we use a deterministic approach
        // In production, this should use secure key management
        const command = `rgb --network ${this.network} wallet create --name ${this.walletName}`;
        
        return new Promise((resolve, reject) => {
            exec(command, { env: { ...process.env, RGB_DATA_DIR: this.dataDir } }, 
                (error, stdout, stderr) => {
                    if (error) {
                        logger.error('Wallet creation failed:', stderr);
                        reject(error);
                    } else {
                        logger.info('Wallet created successfully');
                        resolve(stdout);
                    }
                }
            );
        });
    }

    async verifyContract() {
        if (!this.contractId) {
            // For testnet, auto-issue tokens if configured
            if (this.network === 'testnet' && process.env.RGB_AUTO_ISSUE === 'true') {
                logger.info('Auto-issuing testnet tokens...');
                await this.issueTestnetTokens();
            } else {
                logger.warn('No RGB contract ID configured');
            }
        } else {
            logger.info('Using RGB contract:', this.contractId);
        }
    }

    async issueTestnetTokens() {
        const command = `rgb --network testnet issue \
            --wallet ${this.walletName} \
            --ticker TCAT \
            --name "TestCat Token" \
            --supply 21000000 \
            --precision 0`;
            
        return new Promise((resolve, reject) => {
            exec(command, { env: { ...process.env, RGB_DATA_DIR: this.dataDir } },
                (error, stdout, stderr) => {
                    if (error) {
                        logger.error('Token issuance failed:', stderr);
                        reject(error);
                    } else {
                        // Extract contract ID from output
                        const match = stdout.match(/Contract ID: ([a-zA-Z0-9]+)/);
                        if (match) {
                            this.contractId = match[1];
                            logger.info('Tokens issued! Contract ID:', this.contractId);
                            
                            // Save contract ID for future use
                            process.env.RGB_CONTRACT_ID = this.contractId;
                        }
                        resolve(stdout);
                    }
                }
            );
        });
    }

    /**
     * Generate RGB consignment automatically
     * This is the main function for automatic token distribution
     */
    async generateConsignment({ rgbInvoice, amount, invoiceId }) {
        try {
            // Validate RGB invoice
            if (!this.validateRGBInvoice(rgbInvoice)) {
                throw new Error('Invalid RGB invoice format');
            }

            // Check if service is initialized
            if (!this.isInitialized) {
                logger.warn('RGB service not initialized, using mock consignment');
                return this.generateMockConsignment(invoiceId, amount);
            }

            const tokenAmount = amount * 700; // 700 tokens per batch
            const outputPath = path.join('/tmp', `consignment_${invoiceId}.rgb`);
            
            logger.info('Generating automatic consignment', {
                invoiceId,
                tokenAmount,
                recipient: rgbInvoice
            });

            // RGB transfer command
            const command = `rgb --network ${this.network} transfer \
                --wallet ${this.walletName} \
                --contract ${this.contractId} \
                --amount ${tokenAmount} \
                --recipient "${rgbInvoice}" \
                --consignment ${outputPath}`;

            // Execute transfer
            await this.executeCommand(command);

            // Read consignment file
            const consignmentData = await fs.readFile(outputPath);
            const base64Consignment = consignmentData.toString('base64');

            // Clean up
            await fs.unlink(outputPath).catch(() => {});

            logger.info('Consignment generated successfully', {
                invoiceId,
                size: base64Consignment.length
            });

            return base64Consignment;

        } catch (error) {
            logger.error('Consignment generation failed:', error);
            
            // Fallback to mock in case of errors
            if (process.env.RGB_FALLBACK_TO_MOCK === 'true') {
                logger.warn('Falling back to mock consignment');
                return this.generateMockConsignment(invoiceId, amount);
            }
            
            throw error;
        }
    }

    /**
     * Check wallet balance
     */
    async getBalance() {
        if (!this.isInitialized) {
            return { available: 0, pending: 0, total: 0 };
        }

        const command = `rgb --network ${this.network} wallet balance \
            --name ${this.walletName} \
            --contract ${this.contractId}`;

        try {
            const output = await this.executeCommand(command);
            
            // Parse balance from output
            const match = output.match(/Available: (\d+)/);
            const available = match ? parseInt(match[1]) : 0;
            
            return {
                available,
                pending: 0,
                total: available,
                contract: this.contractId
            };
            
        } catch (error) {
            logger.error('Failed to get balance:', error);
            return { available: 0, pending: 0, total: 0 };
        }
    }

    /**
     * Get recent transfers
     */
    async getRecentTransfers(limit = 10) {
        if (!this.isInitialized) {
            return [];
        }

        const command = `rgb --network ${this.network} wallet history \
            --name ${this.walletName} \
            --contract ${this.contractId} \
            --limit ${limit}`;

        try {
            const output = await this.executeCommand(command);
            // Parse transfer history
            return this.parseTransferHistory(output);
            
        } catch (error) {
            logger.error('Failed to get transfer history:', error);
            return [];
        }
    }

    /**
     * Validate RGB invoice format
     */
    validateRGBInvoice(invoice) {
        return invoice && 
               typeof invoice === 'string' &&
               invoice.startsWith('rgb:') && 
               invoice.includes('utxob:') &&
               invoice.length >= 20 &&
               invoice.length <= 500;
    }

    /**
     * Execute RGB command with proper error handling
     */
    async executeCommand(command) {
        return new Promise((resolve, reject) => {
            const env = {
                ...process.env,
                RGB_DATA_DIR: this.dataDir,
                RGB_NETWORK: this.network
            };

            exec(command, { env, timeout: 30000 }, (error, stdout, stderr) => {
                if (error) {
                    logger.error('Command failed:', { command, error: stderr });
                    reject(new Error(stderr || error.message));
                } else {
                    resolve(stdout);
                }
            });
        });
    }

    /**
     * Generate mock consignment for testing/fallback
     */
    generateMockConsignment(invoiceId, amount) {
        const mockData = {
            version: 1,
            network: this.network,
            invoiceId,
            amount: amount * 700,
            timestamp: new Date().toISOString(),
            contractId: this.contractId || 'mock-contract',
            type: 'mock-consignment',
            hash: crypto.createHash('sha256')
                .update(`${invoiceId}-${amount}`)
                .digest('hex')
        };
        
        return Buffer.from(JSON.stringify(mockData)).toString('base64');
    }

    /**
     * Parse transfer history output
     */
    parseTransferHistory(output) {
        // This would parse the actual RGB CLI output
        // For now, return empty array
        return [];
    }

    /**
     * Health check for monitoring
     */
    async healthCheck() {
        const checks = {
            initialized: this.isInitialized,
            network: this.network,
            wallet: this.walletName,
            contract: this.contractId,
            rgbCli: false,
            walletExists: false,
            hasBalance: false
        };

        try {
            // Check RGB CLI
            await this.checkRGBInstallation();
            checks.rgbCli = true;

            // Check wallet
            await this.ensureWalletExists();
            checks.walletExists = true;

            // Check balance
            const balance = await this.getBalance();
            checks.hasBalance = balance.available > 0;
            checks.balance = balance;

        } catch (error) {
            // Errors already logged
        }

        return checks;
    }
}

// Export singleton instance
module.exports = new RGBAutomaticService();