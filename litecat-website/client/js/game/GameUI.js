export class GameUI {
    constructor(game) {
        this.game = game;
        this.tiers = {
            bronze: { min: 11, tokens: 5000 },
            silver: { min: 18, tokens: 15000 },
            gold: { min: 28, tokens: 50000 }
        };
        this.unlockedTiers = new Set();
    }

    showGameOver(score) {
        const gameOverEl = document.getElementById('game-over');
        const finalScoreEl = document.getElementById('final-score');
        const tierUnlockedEl = document.getElementById('tier-unlocked');
        const twitterVerifyEl = document.getElementById('twitter-verify');
        const unlockTierBtn = document.getElementById('unlock-tier');
        const verifyBtn = document.getElementById('verify-follow');
        const verifySuccessEl = document.getElementById('verify-success');
        const allocationMessageEl = document.getElementById('allocation-message');
        
        // Reset verify button state
        verifyBtn.textContent = 'Verify Follow';
        verifyBtn.disabled = false;
        verifyBtn.style.opacity = '1';
        verifyBtn.style.borderColor = 'var(--primary-yellow)';
        verifyBtn.style.color = 'var(--primary-yellow)';
        unlockTierBtn.style.display = 'none';
        verifySuccessEl.style.display = 'none';
        allocationMessageEl.style.display = 'none';
        
        // Show final score
        finalScoreEl.textContent = score;
        
        // Determine unlocked tier
        const tier = this.getTierForScore(score);
        
        if (tier) {
            tierUnlockedEl.textContent = `${tier.toUpperCase()} TIER UNLOCKED!`;
            tierUnlockedEl.style.color = this.getTierColor(tier);
            
            // Show Twitter verification
            twitterVerifyEl.style.display = 'block';
            
            // Store tier data
            this.unlockedTier = tier;
            
            // Set allocation message based on tier - UPDATED LIMITS
            const tierBatches = {
                bronze: 10,   // Updated from 3
                silver: 20,   // Updated from 5
                gold: 30      // Updated from 10
            };
            const tierTokens = {
                bronze: '7,000',    // 10 batches * 700 tokens
                silver: '14,000',   // 20 batches * 700 tokens
                gold: '21,000'      // 30 batches * 700 tokens
            };
            
            allocationMessageEl.innerHTML = `
                <strong style="color: ${this.getTierColor(tier)};">${tier.toUpperCase()}</strong>: ${tierBatches[tier]} batches (${tierTokens[tier]} tokens)
            `;
        } else {
            tierUnlockedEl.textContent = 'No Tier Unlocked - Try Again!';
            tierUnlockedEl.style.color = '#888';
            twitterVerifyEl.style.display = 'none';
        }
        
        // Show game over screen with fade in
        gameOverEl.style.display = 'block';
        gameOverEl.style.opacity = '0';
        
        setTimeout(() => {
            gameOverEl.style.transition = 'opacity 0.5s ease-out';
            gameOverEl.style.opacity = '1';
            
            // Reset gallery to first page
            if (window.resetGameOverGallery) {
                window.resetGameOverGallery();
            }
        }, 100);
        
        // Clear previous follow tracking
        localStorage.removeItem('twitterFollowClicked');
        localStorage.removeItem('followClickTime');
    }

    getTierForScore(score) {
        if (score >= this.tiers.gold.min) return 'gold';
        if (score >= this.tiers.silver.min) return 'silver';
        if (score >= this.tiers.bronze.min) return 'bronze';
        return null;
    }
    
    getTierColor(tier) {
        const colors = {
            bronze: '#CD7F32',
            silver: '#C0C0C0',
            gold: '#FFD700'
        };
        return colors[tier] || '#FFFF00';
    }

    updateScore(score) {
        document.getElementById('score').textContent = score;
        
        // Add pulse effect
        const scoreEl = document.getElementById('score');
        scoreEl.style.transform = 'scale(1.2)';
        setTimeout(() => {
            scoreEl.style.transform = 'scale(1)';
        }, 200);
        
        // Check for tier unlocks
        this.checkTierUnlock(score);
    }

    updateTimer(time) {
        document.getElementById('timer').textContent = time;
        
        // Add warning color when time is low
        const timerEl = document.getElementById('timer');
        if (time <= 10) {
            timerEl.style.color = '#ff5252';
            if (time <= 5) {
                timerEl.style.animation = 'pulse 0.5s infinite';
            }
        }
    }

    showMessage(message, duration = 3000) {
        const messageEl = document.createElement('div');
        messageEl.className = 'game-message';
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: var(--primary);
            padding: 20px 40px;
            border-radius: 10px;
            font-size: 24px;
            font-weight: bold;
            z-index: 1000;
            pointer-events: none;
            animation: fadeInOut ${duration}ms ease-out;
        `;
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.remove();
        }, duration);
    }

    showCombo(combo) {
        if (combo > 1) {
            this.showMessage(`${combo}x COMBO!`, 1000);
        }
    }
    
    checkTierUnlock(score) {
        // Check each tier
        for (const [tierName, tierData] of Object.entries(this.tiers)) {
            if (score >= tierData.min && !this.unlockedTiers.has(tierName)) {
                this.unlockedTiers.add(tierName);
                this.showTierNotification(tierName);
            }
        }
    }
    
    showTierNotification(tier) {
        const notification = document.getElementById('tier-notification');
        const notificationText = document.getElementById('tier-notification-text');
        
        if (!notification || !notificationText) return;
        
        // Set tier text and color
        notificationText.textContent = `${tier.toUpperCase()} TIER UNLOCKED!`;
        notification.style.borderColor = this.getTierColor(tier);
        notificationText.style.color = this.getTierColor(tier);
        
        // Show notification
        notification.style.display = 'block';
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Hide after 2 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.style.display = 'none';
            }, 300);
        }, 2000);
    }

    showTierProgress(score) {
        let nextTier = null;
        let progress = 0;
        
        for (const [tierName, tierData] of Object.entries(this.tiers)) {
            if (score < tierData.min) {
                nextTier = tierName;
                progress = (score / tierData.min) * 100;
                break;
            }
        }
        
        if (nextTier) {
            const progressEl = document.createElement('div');
            progressEl.style.cssText = `
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                padding: 10px 20px;
                border-radius: 20px;
                border: 1px solid var(--primary);
                z-index: 100;
            `;
            
            progressEl.innerHTML = `
                <div style="text-align: center; margin-bottom: 5px;">
                    Next: ${nextTier.toUpperCase()} TIER
                </div>
                <div style="width: 200px; height: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; overflow: hidden;">
                    <div style="width: ${progress}%; height: 100%; background: var(--primary); transition: width 0.3s;"></div>
                </div>
            `;
            
            document.body.appendChild(progressEl);
            
            setTimeout(() => {
                progressEl.remove();
            }, 3000);
        }
    }
}