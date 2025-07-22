const { createClient } = require('@supabase/supabase-js');
const config = require('../../config');
const { logger } = require('../utils/logger');

class SupabaseService {
  constructor() {
    this.client = createClient(
      config.database.url,
      config.database.anonKey,
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: {
            'x-application-name': 'litecat-api',
          },
        },
      }
    );
    
    this.adminClient = createClient(
      config.database.url,
      config.database.serviceKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
    
    this.cache = new Map();
    this.setupRealtimeSubscriptions();
  }

  setupRealtimeSubscriptions() {
    this.salesChannel = this.client
      .channel('sales-updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'purchases' 
        },
        (payload) => this.handlePurchaseUpdate(payload)
      )
      .subscribe((status) => {
        logger.info(`Sales channel subscription status: ${status}`);
      });

    this.gameChannel = this.client
      .channel('game-scores')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_scores'
        },
        (payload) => this.handleGameScoreUpdate(payload)
      )
      .subscribe();
  }

  async handlePurchaseUpdate(payload) {
    try {
      logger.info('Purchase update received:', payload);
      
      await this.invalidateCache('sales_stats');
      await this.invalidateCache('available_batches');
      
      if (this.purchaseUpdateCallback) {
        await this.purchaseUpdateCallback(payload);
      }
    } catch (error) {
      logger.error('Error handling purchase update:', error);
    }
  }

  async handleGameScoreUpdate(payload) {
    try {
      logger.info('Game score update received:', payload);
      
      await this.invalidateCache('leaderboard');
      
      if (this.gameScoreCallback) {
        await this.gameScoreCallback(payload);
      }
    } catch (error) {
      logger.error('Error handling game score update:', error);
    }
  }

  onPurchaseUpdate(callback) {
    this.purchaseUpdateCallback = callback;
  }

  onGameScoreUpdate(callback) {
    this.gameScoreCallback = callback;
  }

  async createPurchase(data) {
    try {
      const purchase = {
        wallet_address: data.wallet_address,
        batch_count: data.batch_count,
        total_tokens: data.batch_count * 700,
        total_satoshis: data.batch_count * 2000,
        game_tier: data.game_tier,
        payment_address: data.payment_address,
        coinpayments_id: data.coinpayments_id,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      };

      const { data: result, error } = await this.adminClient
        .from('purchases')
        .insert(purchase)
        .select()
        .single();

      if (error) {
        throw error;
      }

      await this.logAudit('purchases', result.id, 'CREATE', null, result);

      return result;
    } catch (error) {
      logger.error('Error creating purchase:', error);
      throw error;
    }
  }

  async updatePurchase(id, updates) {
    try {
      const { data: current, error: fetchError } = await this.adminClient
        .from('purchases')
        .select()
        .eq('id', id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      const { data: result, error: updateError } = await this.adminClient
        .from('purchases')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      await this.logAudit('purchases', id, 'UPDATE', current, result);

      return result;
    } catch (error) {
      logger.error('Error updating purchase:', error);
      throw error;
    }
  }

  async getPurchase(id) {
    try {
      const { data, error } = await this.client
        .from('purchases')
        .select()
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error getting purchase:', error);
      throw error;
    }
  }

  async getSalesStats() {
    const cacheKey = 'sales_stats';
    const cached = this.getCached(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await this.client
        .from('sales_stats')
        .select()
        .single();

      if (error) {
        throw error;
      }

      this.setCache(cacheKey, data, 30);
      return data;
    } catch (error) {
      logger.error('Error getting sales stats:', error);
      throw error;
    }
  }

  async getWalletStats(walletAddress) {
    try {
      const { data, error } = await this.client
        .from('wallet_stats')
        .select()
        .eq('wallet_address', walletAddress)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data || {
        wallet_address: walletAddress,
        total_purchases: 0,
        total_batches: 0,
        total_tokens: 0,
        highest_tier: 1,
      };
    } catch (error) {
      logger.error('Error getting wallet stats:', error);
      throw error;
    }
  }

  async getAvailableBatches() {
    const cacheKey = 'available_batches';
    const cached = this.getCached(cacheKey);
    
    if (cached !== null) {
      return cached;
    }

    try {
      const { data, error } = await this.client
        .rpc('get_available_batches');

      if (error) {
        throw error;
      }

      this.setCache(cacheKey, data, 30);
      return data;
    } catch (error) {
      logger.error('Error getting available batches:', error);
      throw error;
    }
  }

  async getWalletPurchaseLimit(walletAddress, gameTier) {
    try {
      const { data, error } = await this.client
        .rpc('get_wallet_purchase_limit', {
          p_wallet_address: walletAddress,
          p_game_tier: gameTier,
        });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error getting wallet purchase limit:', error);
      throw error;
    }
  }

  async saveGameScore(scoreData) {
    try {
      const { data, error } = await this.client
        .from('game_scores')
        .insert({
          wallet_address: scoreData.wallet_address,
          score: scoreData.score,
          tier_achieved: scoreData.tier_achieved,
          session_id: scoreData.session_id,
          ip_address: scoreData.ip_address,
          user_agent: scoreData.user_agent,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error saving game score:', error);
      throw error;
    }
  }

  async getLeaderboard(options = {}) {
    const { limit = 100, offset = 0, period = 'all' } = options;
    const cacheKey = `leaderboard:${period}:${limit}:${offset}`;
    const cached = this.getCached(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      let query = this.client
        .from('game_scores')
        .select('wallet_address, score, tier_achieved, created_at')
        .order('score', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1);

      if (period !== 'all') {
        const dateMap = {
          daily: 1,
          weekly: 7,
          monthly: 30,
        };
        
        const days = dateMap[period];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const result = {
        leaderboard: data,
        period,
        limit,
        offset,
        total: data.length,
      };

      this.setCache(cacheKey, result, 300);
      return result;
    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  async logAudit(tableName, recordId, action, oldValues, newValues) {
    try {
      await this.adminClient
        .from('audit_log')
        .insert({
          table_name: tableName,
          record_id: recordId,
          action,
          old_values: oldValues,
          new_values: newValues,
        });
    } catch (error) {
      logger.error('Error logging audit:', error);
    }
  }

  async recordMetric(name, value, unit = null, endpoint = null) {
    try {
      await this.client
        .from('performance_metrics')
        .insert({
          metric_name: name,
          metric_value: value,
          metric_unit: unit,
          endpoint,
        });
    } catch (error) {
      logger.error('Error recording metric:', error);
    }
  }

  getCached(key) {
    const cached = this.cache.get(key);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    
    this.cache.delete(key);
    return null;
  }

  setCache(key, data, ttlSeconds) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + (ttlSeconds * 1000),
    });
  }

  async invalidateCache(pattern) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  async cacheSet(key, value, ttlSeconds) {
    this.setCache(key, value, ttlSeconds);
  }

  async cacheGet(key) {
    return this.getCached(key);
  }

  async cleanup() {
    if (this.salesChannel) {
      await this.salesChannel.unsubscribe();
    }
    
    if (this.gameChannel) {
      await this.gameChannel.unsubscribe();
    }
    
    this.cache.clear();
  }
}

module.exports = new SupabaseService();