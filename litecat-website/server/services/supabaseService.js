// Supabase Database Service
// Handles all database operations for LIGHTCAT platform

const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
    constructor() {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
            console.warn('⚠️  Supabase credentials not found - using mock mode');
            this.mockMode = true;
            return;
        }

        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );
        this.mockMode = false;
        console.log('✅ Supabase service initialized');
    }

    // Game Scores
    async saveGameScore(walletAddress, score, tier, maxBatches, metadata = {}) {
        if (this.mockMode) {
            return {
                id: `mock-${Date.now()}`,
                wallet_address: walletAddress,
                score,
                tier,
                max_batches: maxBatches,
                created_at: new Date().toISOString()
            };
        }

        const { data, error } = await this.supabase
            .from('game_scores')
            .insert([{
                wallet_address: walletAddress,
                score,
                tier,
                max_batches: maxBatches,
                game_duration: 30,
                ip_address: metadata.ipAddress,
                user_agent: metadata.userAgent,
                metadata: metadata.extra || {}
            }])
            .select()
            .single();
        
        if (error) {
            console.error('Error saving game score:', error);
            throw error;
        }
        
        return data;
    }

    async getTopScores(limit = 10) {
        if (this.mockMode) {
            return [
                { wallet_address: 'bc1qmock1', score: 35, tier: 'gold' },
                { wallet_address: 'bc1qmock2', score: 28, tier: 'gold' },
                { wallet_address: 'bc1qmock3', score: 22, tier: 'silver' }
            ];
        }

        const { data, error } = await this.supabase
            .from('game_scores')
            .select('wallet_address, score, tier, created_at')
            .order('score', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        return data;
    }

    // Lightning Payments
    async createLightningPayment(invoiceData) {
        if (this.mockMode) {
            return {
                id: `mock-${Date.now()}`,
                ...invoiceData,
                created_at: new Date().toISOString()
            };
        }

        const { data, error } = await this.supabase
            .from('lightning_payments')
            .insert([invoiceData])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    async updatePaymentStatus(invoiceId, status, paidAt = null) {
        if (this.mockMode) {
            return { status, paid_at: paidAt };
        }

        const updateData = { status };
        if (paidAt) updateData.paid_at = paidAt;

        const { data, error } = await this.supabase
            .from('lightning_payments')
            .update(updateData)
            .eq('invoice_id', invoiceId)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    // Purchases
    async createPurchase(purchaseData) {
        if (this.mockMode) {
            return {
                id: `mock-${Date.now()}`,
                ...purchaseData,
                created_at: new Date().toISOString()
            };
        }

        const { data, error } = await this.supabase
            .from('purchases')
            .insert([purchaseData])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    async updatePurchaseStatus(orderId, updates) {
        if (this.mockMode) {
            return { order_id: orderId, ...updates };
        }

        const { data, error } = await this.supabase
            .from('purchases')
            .update(updates)
            .eq('order_id', orderId)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    async getPurchaseByOrderId(orderId) {
        if (this.mockMode) {
            return null;
        }

        const { data, error } = await this.supabase
            .from('purchases')
            .select('*')
            .eq('order_id', orderId)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    // RGB Transfers
    async createRgbTransfer(transferData) {
        if (this.mockMode) {
            return {
                id: `mock-${Date.now()}`,
                ...transferData,
                created_at: new Date().toISOString()
            };
        }

        const { data, error } = await this.supabase
            .from('rgb_transfers')
            .insert([transferData])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    async updateRgbTransferStatus(consignmentId, updates) {
        if (this.mockMode) {
            return { consignment_id: consignmentId, ...updates };
        }

        const { data, error } = await this.supabase
            .from('rgb_transfers')
            .update(updates)
            .eq('consignment_id', consignmentId)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    // Stats
    async getPurchaseStats() {
        if (this.mockMode) {
            return {
                unique_buyers: 42,
                total_purchases: 156,
                batches_sold: 789,
                tokens_sold: 552300,
                total_sats_received: 1578000,
                last_sale_time: new Date().toISOString()
            };
        }

        const { data, error } = await this.supabase
            .from('purchase_stats')
            .select('*')
            .single();
        
        if (error && error.code !== 'PGRST116') {
            // No stats yet
            return {
                unique_buyers: 0,
                total_purchases: 0,
                batches_sold: 0,
                tokens_sold: 0,
                total_sats_received: 0,
                last_sale_time: null
            };
        }
        
        return data;
    }

    async getTierStats() {
        if (this.mockMode) {
            return [
                { tier: 'bronze', purchase_count: 50, batches_sold: 200, tokens_sold: 140000 },
                { tier: 'silver', purchase_count: 30, batches_sold: 200, tokens_sold: 140000 },
                { tier: 'gold', purchase_count: 20, batches_sold: 180, tokens_sold: 126000 }
            ];
        }

        const { data, error } = await this.supabase
            .from('tier_stats')
            .select('*')
            .order('tier');
        
        if (error) throw error;
        return data || [];
    }

    // Wallet checks
    async checkWalletPurchaseLimit(walletAddress, requestedBatches) {
        if (this.mockMode) return true;

        const { data, error } = await this.supabase
            .rpc('check_wallet_purchase_limit', {
                p_wallet_address: walletAddress,
                p_batch_count: requestedBatches
            });
        
        if (error) throw error;
        return data;
    }

    async getWalletPurchaseHistory(walletAddress) {
        if (this.mockMode) return [];

        const { data, error } = await this.supabase
            .from('purchases')
            .select('*')
            .eq('wallet_address', walletAddress)
            .in('status', ['paid', 'delivered'])
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    }

    // User management
    async findOrCreateUser(walletAddress) {
        if (this.mockMode) {
            return {
                id: `mock-user-${walletAddress}`,
                wallet_address: walletAddress,
                created_at: new Date().toISOString()
            };
        }

        // First try to find existing user
        const { data: existingUser, error: findError } = await this.supabase
            .from('users')
            .select('*')
            .eq('wallet_address', walletAddress)
            .single();
        
        if (existingUser) return existingUser;
        
        // Create new user if not found
        const { data: newUser, error: createError } = await this.supabase
            .from('users')
            .insert([{ wallet_address: walletAddress }])
            .select()
            .single();
        
        if (createError) throw createError;
        return newUser;
    }

    // Health check
    async healthCheck() {
        if (this.mockMode) {
            return { status: 'ok', mode: 'mock' };
        }

        try {
            const { count, error } = await this.supabase
                .from('users')
                .select('*', { count: 'exact', head: true });
            
            if (error) throw error;
            
            return { 
                status: 'ok', 
                mode: 'production',
                tablesAccessible: true
            };
        } catch (error) {
            return { 
                status: 'error', 
                mode: 'production',
                error: error.message 
            };
        }
    }
}

// Export singleton instance
module.exports = new SupabaseService();