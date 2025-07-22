const supabaseService = require('../../../server/services/supabaseService');
const { createClient } = require('@supabase/supabase-js');

jest.mock('@supabase/supabase-js');
jest.mock('../../../config', () => ({
  database: {
    url: 'https://test.supabase.co',
    anonKey: 'test-anon-key',
    serviceKey: 'test-service-key'
  }
}));

describe('SupabaseService', () => {
  let mockClient;
  let mockAdminClient;

  beforeEach(() => {
    mockClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      rpc: jest.fn(),
      channel: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn()
    };

    mockAdminClient = { ...mockClient };

    createClient.mockReturnValue(mockClient);
    
    jest.clearAllMocks();
  });

  describe('createPurchase', () => {
    it('should create a purchase successfully', async () => {
      const purchaseData = {
        wallet_address: 'bc1qtest123',
        batch_count: 5,
        game_tier: 2,
        payment_address: 'bc1qpayment456',
        coinpayments_id: 'CP123'
      };

      const expectedPurchase = {
        id: 'uuid-123',
        ...purchaseData,
        total_tokens: 3500,
        total_satoshis: 10000,
        status: 'pending'
      };

      mockAdminClient.single.mockResolvedValue({
        data: expectedPurchase,
        error: null
      });

      supabaseService.adminClient = mockAdminClient;

      const result = await supabaseService.createPurchase(purchaseData);

      expect(result).toEqual(expectedPurchase);
      expect(mockAdminClient.from).toHaveBeenCalledWith('purchases');
      expect(mockAdminClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          wallet_address: purchaseData.wallet_address,
          batch_count: purchaseData.batch_count,
          total_tokens: 3500,
          total_satoshis: 10000
        })
      );
    });

    it('should throw error when purchase creation fails', async () => {
      const error = new Error('Database error');
      
      mockAdminClient.single.mockResolvedValue({
        data: null,
        error
      });

      supabaseService.adminClient = mockAdminClient;

      await expect(
        supabaseService.createPurchase({ wallet_address: 'test' })
      ).rejects.toThrow('Database error');
    });
  });

  describe('getSalesStats', () => {
    it('should return cached sales stats if available', async () => {
      const cachedStats = {
        completed_sales: 100,
        total_sold: 1000,
        tokens_distributed: 700000
      };

      supabaseService.cache.set('sales_stats', {
        data: cachedStats,
        expiry: Date.now() + 30000
      });

      const result = await supabaseService.getSalesStats();

      expect(result).toEqual(cachedStats);
      expect(mockClient.from).not.toHaveBeenCalled();
    });

    it('should fetch from database when cache is empty', async () => {
      const dbStats = {
        completed_sales: 150,
        total_sold: 1500,
        tokens_distributed: 1050000
      };

      mockClient.single.mockResolvedValue({
        data: dbStats,
        error: null
      });

      supabaseService.client = mockClient;
      supabaseService.cache.clear();

      const result = await supabaseService.getSalesStats();

      expect(result).toEqual(dbStats);
      expect(mockClient.from).toHaveBeenCalledWith('sales_stats');
      expect(supabaseService.cache.has('sales_stats')).toBe(true);
    });
  });

  describe('getWalletPurchaseLimit', () => {
    it('should calculate correct purchase limit for tier 1', async () => {
      mockClient.rpc.mockResolvedValue({
        data: 3,
        error: null
      });

      supabaseService.client = mockClient;

      const result = await supabaseService.getWalletPurchaseLimit('bc1qtest', 1);

      expect(result).toBe(3);
      expect(mockClient.rpc).toHaveBeenCalledWith('get_wallet_purchase_limit', {
        p_wallet_address: 'bc1qtest',
        p_game_tier: 1
      });
    });

    it('should return 0 when limit is exceeded', async () => {
      mockClient.rpc.mockResolvedValue({
        data: 0,
        error: null
      });

      supabaseService.client = mockClient;

      const result = await supabaseService.getWalletPurchaseLimit('bc1qtest', 2);

      expect(result).toBe(0);
    });
  });

  describe('Real-time subscriptions', () => {
    it('should handle purchase updates', async () => {
      const mockCallback = jest.fn();
      const payload = {
        eventType: 'INSERT',
        new: { id: 'uuid-123', status: 'completed' }
      };

      supabaseService.onPurchaseUpdate(mockCallback);
      await supabaseService.handlePurchaseUpdate(payload);

      expect(mockCallback).toHaveBeenCalledWith(payload);
    });

    it('should invalidate cache on purchase update', async () => {
      supabaseService.cache.set('sales_stats', { data: {}, expiry: Date.now() + 30000 });
      supabaseService.cache.set('available_batches', { data: 1000, expiry: Date.now() + 30000 });

      await supabaseService.handlePurchaseUpdate({ eventType: 'UPDATE' });

      expect(supabaseService.cache.has('sales_stats')).toBe(false);
      expect(supabaseService.cache.has('available_batches')).toBe(false);
    });
  });

  describe('Cache management', () => {
    it('should set and get cached values correctly', () => {
      const testData = { test: 'data' };
      supabaseService.setCache('test_key', testData, 10);

      const cached = supabaseService.getCached('test_key');
      expect(cached).toEqual(testData);
    });

    it('should return null for expired cache', () => {
      supabaseService.cache.set('expired_key', {
        data: { test: 'data' },
        expiry: Date.now() - 1000
      });

      const cached = supabaseService.getCached('expired_key');
      expect(cached).toBeNull();
      expect(supabaseService.cache.has('expired_key')).toBe(false);
    });

    it('should invalidate cache by pattern', async () => {
      supabaseService.cache.set('user:123', { data: {}, expiry: Date.now() + 30000 });
      supabaseService.cache.set('user:456', { data: {}, expiry: Date.now() + 30000 });
      supabaseService.cache.set('other:789', { data: {}, expiry: Date.now() + 30000 });

      await supabaseService.invalidateCache('user:');

      expect(supabaseService.cache.has('user:123')).toBe(false);
      expect(supabaseService.cache.has('user:456')).toBe(false);
      expect(supabaseService.cache.has('other:789')).toBe(true);
    });
  });
});