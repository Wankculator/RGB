import * as THREE from 'three';
import { ProGame } from './ProGame.js';
import { GameUI } from './GameUI.js';
import { SoundManager } from './SoundManager.js';
import { MobileWebGLFix } from './mobile-fix.js';

class LightcatGame {
    constructor() {
        this.proGame = null;
        this.ui = null;
        this.sound = null;
        
        this.gameState = 'loading'; // loading, menu, playing, gameover
        this.score = 0;
        this.timeRemaining = 30;
        
        this.init();
    }

    async init() {
        try {
            // Update loading progress
            this.updateProgress(10, 'Checking device compatibility...');
            
            // Get canvas
            const canvas = document.getElementById('game-canvas');
            if (!canvas) {
                throw new Error('Game canvas not found');
            }
            
            // Don't create a context here - just check support
            // The renderer will create its own context
            this.updateProgress(20, 'Creating game world...');
            
            // Initialize professional game
            this.proGame = new ProGame(canvas);
            
            this.updateProgress(50, 'Loading sounds...');
            
            // Setup sound
            this.sound = new SoundManager();
            await this.sound.loadSounds();
            
            this.updateProgress(80, 'Setting up UI...');
            
            // Setup UI
            this.ui = new GameUI(this);
            
            this.updateProgress(100, 'Ready!');
            
            // Auto-start the game with longer delay for mobile
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            setTimeout(() => {
                document.getElementById('loading-progress').style.display = 'none';
                this.gameState = 'menu';
                // Automatically start the game
                this.startGame();
            }, isMobile ? 1000 : 500);
            
            // Setup event listeners
            this.setupEventListeners();
        } catch (error) {
            console.error('Game initialization error:', error);
            console.error('Error stack:', error.stack);
            this.updateProgress(0, 'Error: ' + error.message);
        }
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            // ProGame handles resize internally
        });
        
        // Add event listeners only if elements exist
        const startGameBtn = document.getElementById('start-game');
        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => {
                this.startGame();
            });
        }
        
        const playAgainBtn = document.getElementById('play-again');
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => {
                this.resetGame();
            });
        }
        
        const verifyFollowBtn = document.getElementById('verify-follow');
        if (verifyFollowBtn) {
            verifyFollowBtn.addEventListener('click', () => {
                this.verifyFollow();
            });
        }
        
        const twitterFollowBtn = document.getElementById('twitter-follow');
        if (twitterFollowBtn) {
            twitterFollowBtn.addEventListener('click', () => {
                // Track that user clicked follow
                localStorage.setItem('twitterFollowClicked', 'true');
                localStorage.setItem('followClickTime', Date.now());
            });
        }
        
        const unlockTierBtn = document.getElementById('unlock-tier');
        if (unlockTierBtn) {
            unlockTierBtn.addEventListener('click', () => {
                this.proceedToPurchase();
            });
        }
    }

    startGame() {
        const startScreen = document.getElementById('start-screen');
        if (startScreen) startScreen.style.display = 'none';
        
        const gameUI = document.getElementById('game-ui');
        if (gameUI) gameUI.style.display = 'flex';
        
        const gameOver = document.getElementById('game-over');
        if (gameOver) gameOver.style.display = 'none';
        
        this.gameState = 'playing';
        this.score = 0;
        this.timeRemaining = 30;
        
        // Reset unlocked tiers
        this.ui.unlockedTiers.clear();
        
        // Update UI
        document.getElementById('timer').textContent = this.timeRemaining;
        document.getElementById('score').textContent = this.score;
        
        // Play background music
        this.sound.playBackgroundMusic();
        
        // Start the professional game
        this.proGame.start();
        
        // Monitor score updates
        this.scoreInterval = setInterval(() => {
            if (this.proGame.score !== this.score) {
                this.score = this.proGame.score;
                this.ui.updateScore(this.score);
            }
        }, 100);
    }

    endGame() {
        clearInterval(this.scoreInterval);
        this.gameState = 'gameover';
        
        // Stop background music
        this.sound.stopBackgroundMusic();
        this.sound.playGameOverSound();
        
        // Show game over screen
        this.ui.showGameOver(this.score);
    }

    resetGame() {
        document.getElementById('game-over').style.display = 'none';
        this.startGame();
    }

    verifyFollow() {
        // Check if user clicked the follow button
        const followClicked = localStorage.getItem('twitterFollowClicked');
        const clickTime = localStorage.getItem('followClickTime');
        
        if (!followClicked) {
            alert('Please click "Follow @RGBLightCat" first');
            return;
        }
        
        // Check if enough time has passed (at least 3 seconds to allow for Twitter page to load)
        const timePassed = Date.now() - parseInt(clickTime);
        if (timePassed < 3000) {
            alert('Please complete the follow action on X first');
            return;
        }
        
        // Simulate verification success
        setTimeout(() => {
            // Update verify button
            const verifyBtn = document.getElementById('verify-follow');
            verifyBtn.textContent = '✓ Verified';
            verifyBtn.disabled = true;
            verifyBtn.style.opacity = '0.7';
            verifyBtn.style.borderColor = '#4CAF50';
            verifyBtn.style.color = '#4CAF50';
            verifyBtn.style.cursor = 'default';
            
            // Show success message
            const verifySuccessEl = document.getElementById('verify-success');
            if (verifySuccessEl) {
                verifySuccessEl.style.display = 'block';
            }
            
            // Show unlock button and allocation message
            const unlockBtn = document.getElementById('unlock-tier');
            const allocationMsg = document.getElementById('allocation-message');
            
            if (unlockBtn) {
                unlockBtn.style.display = 'block';
            }
            
            if (allocationMsg) {
                allocationMsg.style.display = 'block';
            }
        }, 500);
    }

    proceedToPurchase() {
        const tier = this.ui.getTierForScore(this.score);
        // Store game result
        localStorage.setItem('unlockedTier', tier);
        localStorage.setItem('gameScore', this.score);
        
        // Always redirect the top window to prevent nested navigation
        try {
            // Try to access top window
            if (window.top && window.top !== window) {
                // We're in an iframe, redirect the top window
                window.top.location.href = '/#purchase?tier=' + tier.toLowerCase();
            } else {
                // We're not in an iframe or can't access top, redirect normally
                window.location.href = '/#purchase?tier=' + tier.toLowerCase();
            }
        } catch (e) {
            // Cross-origin restriction, open in new tab as fallback
            window.open('/#purchase?tier=' + tier.toLowerCase(), '_blank');
        }
    }

    updateProgress(percent, text) {
        const progressFill = document.getElementById('progress-fill');
        const loadingText = document.getElementById('loading-text');
        
        if (progressFill) progressFill.style.width = percent + '%';
        if (loadingText) loadingText.textContent = text;
    }
}

// Start game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    
    
    try {
        // Check if Three.js loaded
        if (typeof THREE === 'undefined') {
            throw new Error('Three.js failed to load');
        }
        
        window.game = new LightcatGame();
    } catch (error) {
        console.error('Failed to create game:', error);
        const loadingText = document.getElementById('loading-text');
        if (loadingText) {
            loadingText.textContent = 'Error: ' + error.message;
            loadingText.style.color = '#ff5252';
        }
        
        // Show error visually
        document.body.style.background = '#222';
        document.body.innerHTML += `<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: white; padding: 20px;">
            <h2>Game Loading Error</h2>
            <p style="color: #ff5252;">${error.message}</p>
            <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 20px;">Retry</button>
        </div>`;
    }
});