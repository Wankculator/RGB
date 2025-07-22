import * as THREE from 'three';
import { ProGame } from './ProGame.js';
import { GameUI } from './GameUI.js';
import { SoundManager } from './SoundManager.js';

class LightcatGame {
    constructor() {
        this.proGame = null;
        this.ui = null;
        this.sound = null;
        
        this.gameState = 'loading'; // loading, menu, playing, gameover
        this.score = 0;
        this.timeRemaining = 60;
        
        this.init();
    }

    async init() {
        // Update loading progress
        this.updateProgress(20, 'Creating game world...');
        
        // Get canvas
        const canvas = document.getElementById('game-canvas');
        
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
        
        // Auto-start the game
        setTimeout(() => {
            document.getElementById('loading-progress').style.display = 'none';
            this.gameState = 'menu';
            // Automatically start the game
            this.startGame();
        }, 500);
        
        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            // ProGame handles resize internally
        });
        
        document.getElementById('start-game').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('play-again').addEventListener('click', () => {
            this.resetGame();
        });
        
        document.getElementById('verify-tweet').addEventListener('click', () => {
            this.verifyTweet();
        });
        
        document.getElementById('unlock-tier').addEventListener('click', () => {
            this.proceedToPurchase();
        });
    }

    startGame() {
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('game-ui').style.display = 'flex';
        document.getElementById('game-over').style.display = 'none';
        
        this.gameState = 'playing';
        this.score = 0;
        this.timeRemaining = 60;
        
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
                
                // Show tier progress
                if (this.score % 10 === 0) {
                    this.ui.showTierProgress(this.score);
                }
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

    verifyTweet() {
        // In production, this would verify with Twitter API
        // For now, simulate verification
        setTimeout(() => {
            alert('Tweet verified! Tier unlocked.');
            document.getElementById('unlock-tier').style.display = 'block';
        }, 1000);
    }

    proceedToPurchase() {
        const tier = this.ui.getTierForScore(this.score);
        // Store game result
        localStorage.setItem('unlockedTier', tier);
        localStorage.setItem('gameScore', this.score);
        
        // Redirect to main page with tier unlocked
        window.location.href = '/?tier=' + tier.toLowerCase();
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
    window.game = new LightcatGame();
});