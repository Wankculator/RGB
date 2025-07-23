// Mock RGB Implementation - Extracted from rgbService for testing
const crypto = require('crypto');
const { logger } = require('../utils/logger');

class MockRGBImplementation {
  constructor() {
    this.mockConsignments = new Map();
    this.mockAssets = new Map();
    this.initializeMockData();
  }

  initializeMockData() {
    // Initialize with some mock data
    this.mockAssets.set(process.env.RGB_ASSET_ID || 'rgb:mock-asset-id', {
      id: process.env.RGB_ASSET_ID || 'rgb:mock-asset-id',
      name: 'LIGHTCAT',
      ticker: 'LCAT',
      totalSupply: 21000000,
      decimals: 0,
      issued: 1470000,
      remaining: 19530000
    });
  }

  // Generate mock consignment
  async generateMockConsignment(rgbInvoice, amount, invoiceId) {
    try {
      logger.info('Generating mock RGB consignment', {
        rgbInvoice,
        amount,
        invoiceId
      });

      // Create mock consignment data
      const consignmentData = {
        version: '0.10',
        assetId: process.env.RGB_ASSET_ID || 'rgb:mock-asset-id',
        amount: amount,
        recipient: rgbInvoice,
        invoiceId: invoiceId,
        timestamp: new Date().toISOString(),
        mockData: true,
        signature: crypto.randomBytes(32).toString('hex')
      };

      // Convert to a mock binary format (base64)
      const consignmentString = JSON.stringify(consignmentData);
      const consignmentBuffer = Buffer.from(consignmentString);
      const consignmentBase64 = consignmentBuffer.toString('base64');

      // Store for retrieval
      this.mockConsignments.set(invoiceId, {
        data: consignmentData,
        base64: consignmentBase64,
        createdAt: new Date()
      });

      // Add some delay to simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      logger.info('Mock consignment generated successfully', {
        invoiceId,
        size: consignmentBase64.length
      });

      return consignmentBase64;

    } catch (error) {
      logger.error('Failed to generate mock consignment:', error);
      throw error;
    }
  }

  // Validate mock RGB invoice
  validateMockInvoice(rgbInvoice) {
    // Basic format validation for mock
    if (!rgbInvoice || typeof rgbInvoice !== 'string') {
      return { valid: false, error: 'Invalid invoice format' };
    }

    // Accept any string starting with 'rgb:' for mock
    if (!rgbInvoice.startsWith('rgb:')) {
      return { valid: false, error: 'Invoice must start with rgb:' };
    }

    if (rgbInvoice.length < 10) {
      return { valid: false, error: 'Invoice too short' };
    }

    return { valid: true };
  }

  // Get mock asset info
  getMockAssetInfo(assetId) {
    return this.mockAssets.get(assetId) || null;
  }

  // Get mock consignment
  getMockConsignment(invoiceId) {
    return this.mockConsignments.get(invoiceId) || null;
  }

  // Check mock node health
  async checkMockHealth() {
    return {
      status: 'healthy',
      mode: 'mock',
      message: 'Mock RGB service is running',
      assetCount: this.mockAssets.size,
      consignmentCount: this.mockConsignments.size
    };
  }

  // Mock asset creation
  async createMockAsset(name, ticker, supply) {
    const assetId = `rgb:mock-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    
    this.mockAssets.set(assetId, {
      id: assetId,
      name,
      ticker,
      totalSupply: supply,
      decimals: 0,
      issued: 0,
      remaining: supply,
      createdAt: new Date().toISOString()
    });

    return assetId;
  }

  // Mock transfer
  async createMockTransfer(assetId, amount, recipient) {
    const asset = this.mockAssets.get(assetId);
    if (!asset) {
      throw new Error('Asset not found');
    }

    if (asset.remaining < amount) {
      throw new Error('Insufficient asset balance');
    }

    // Update mock balances
    asset.issued += amount;
    asset.remaining -= amount;

    return {
      transferId: crypto.randomUUID(),
      assetId,
      amount,
      recipient,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };
  }

  // Clear mock data (for testing)
  clearMockData() {
    this.mockConsignments.clear();
    this.mockAssets.clear();
    this.initializeMockData();
  }

  // Get mock statistics
  getMockStats() {
    const assets = Array.from(this.mockAssets.values());
    const totalIssued = assets.reduce((sum, asset) => sum + asset.issued, 0);
    const totalRemaining = assets.reduce((sum, asset) => sum + asset.remaining, 0);

    return {
      assetsCount: this.mockAssets.size,
      consignmentsCount: this.mockConsignments.size,
      totalTokensIssued: totalIssued,
      totalTokensRemaining: totalRemaining,
      mockMode: true
    };
  }
}

module.exports = new MockRGBImplementation();