export class GameUI {
    constructor(game) {
        this.game = game;
        this.tiers = {
            bronze: { min: 10, tokens: 5000 },
            silver: { min: 25, tokens: 15000 },
            gold: { min: 50, tokens: 50000 },
            platinum: { min: 75, tokens: 100000 }
        };
    }

    showGameOver(score) {
        const gameOverEl = document.getElementById('game-over');
        const finalScoreEl = document.getElementById('final-score');
        const tierUnlockedEl = document.getElementById('tier-unlocked');
        const twitterVerifyEl = document.getElementById('twitter-verify');
        const unlockTierBtn = document.getElementById('unlock-tier');
        
        // Show final score
        finalScoreEl.textContent = score;
        
        // Determine unlocked tier
        const tier = this.getTierForScore(score);
        
        if (tier) {
            tierUnlockedEl.textContent = `${tier.toUpperCase()} TIER UNLOCKED!`;
            tierUnlockedEl.style.display = 'block';
            
            // Show Twitter verification
            twitterVerifyEl.style.display = 'block';
            
            // Setup Twitter share link
            const tweetText = encodeURIComponent(
                `🐱⚡ I just collected ${score} lightning bolts in LIGHTCAT Runner and unlocked the ${tier} tier! 

Join the first cat meme token on RGB Protocol: litecat.xyz

#LIGHTCAT #RGB #Bitcoin #Gaming`
            );
            
            const twitterShareBtn = document.getElementById('twitter-share');
            twitterShareBtn.href = `https://twitter.com/intent/tweet?text=${tweetText}`;
            
            // Store tier data
            this.unlockedTier = tier;
        } else {
            tierUnlockedEl.textContent = 'No Tier Unlocked - Try Again!';
            tierUnlockedEl.style.display = 'block';
            twitterVerifyEl.style.display = 'none';
        }
        
        // Show game over screen
        gameOverEl.style.display = 'block';
        
        // Animate in
        gameOverEl.style.opacity = '0';
        gameOverEl.style.transform = 'translate(-50%, -50%) scale(0.8)';
        
        setTimeout(() => {
            gameOverEl.style.transition = 'all 0.5s ease-out';
            gameOverEl.style.opacity = '1';
            gameOverEl.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 100);
    }

    getTierForScore(score) {
        if (score >= this.tiers.platinum.min) return 'platinum';
        if (score >= this.tiers.gold.min) return 'gold';
        if (score >= this.tiers.silver.min) return 'silver';
        if (score >= this.tiers.bronze.min) return 'bronze';
        return null;
    }

    updateScore(score) {
        document.getElementById('score').textContent = score;
        
        // Add pulse effect
        const scoreEl = document.getElementById('score');
        scoreEl.style.transform = 'scale(1.2)';
        setTimeout(() => {
            scoreEl.style.transform = 'scale(1)';
        }, 200);
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