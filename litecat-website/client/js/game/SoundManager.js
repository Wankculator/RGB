export class SoundManager {
    constructor() {
        this.sounds = {};
        this.musicVolume = 0.3;
        this.effectsVolume = 0.5;
        this.enabled = true;
        
        // Create audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    async loadSounds() {
        // For now, we'll create synthetic sounds
        // In production, you'd load actual audio files
        
        this.sounds = {
            collect: this.createCollectSound(),
            jump: this.createJumpSound(),
            land: this.createLandSound(),
            background: this.createBackgroundMusic(),
            countdown: this.createCountdownSound(),
            gameOver: this.createGameOverSound()
        };
    }

    createCollectSound() {
        let lastPlayTime = 0;
        return () => {
            if (!this.enabled) return;
            
            // Throttle sound playback to prevent overlap
            const now = performance.now();
            if (now - lastPlayTime < 50) return;
            lastPlayTime = now;
            
            // Ensure audio context is running
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            try {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(1600, this.audioContext.currentTime + 0.1);
                
                gainNode.gain.setValueAtTime(this.effectsVolume * 0.5, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
                
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + 0.1);
            } catch (e) {
                // Ignore audio errors
            }
        };
    }

    createJumpSound() {
        return () => {
            if (!this.enabled) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(this.effectsVolume * 0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);
        };
    }

    createLandSound() {
        return () => {
            if (!this.enabled) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(this.effectsVolume * 0.2, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.05);
        };
    }

    createCountdownSound() {
        return () => {
            if (!this.enabled) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(this.effectsVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.2);
        };
    }

    createGameOverSound() {
        return () => {
            if (!this.enabled) return;
            
            for (let i = 0; i < 3; i++) {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(440 - i * 100, this.audioContext.currentTime + i * 0.1);
                
                gainNode.gain.setValueAtTime(this.effectsVolume * 0.5, this.audioContext.currentTime + i * 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + i * 0.1 + 0.3);
                
                oscillator.start(this.audioContext.currentTime + i * 0.1);
                oscillator.stop(this.audioContext.currentTime + i * 0.1 + 0.3);
            }
        };
    }

    createBackgroundMusic() {
        // Create a simple looping background track
        const createLoop = () => {
            if (!this.enabled || !this.backgroundPlaying) return;
            
            const notes = [220, 246.94, 261.63, 293.66, 329.63];
            const note = notes[Math.floor(Math.random() * notes.length)];
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(note, this.audioContext.currentTime);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.musicVolume * 0.1, this.audioContext.currentTime + 0.1);
            gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.5);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.6);
            
            // Schedule next note
            setTimeout(createLoop, 150);
        };
        
        return {
            play: () => {
                this.backgroundPlaying = true;
                createLoop();
            },
            stop: () => {
                this.backgroundPlaying = false;
            }
        };
    }

    playCollectSound() {
        this.sounds.collect();
    }

    playJumpSound() {
        this.sounds.jump();
    }

    playLandSound() {
        this.sounds.land();
    }

    playCountdownSound() {
        this.sounds.countdown();
    }

    playGameOverSound() {
        this.sounds.gameOver();
    }

    playBackgroundMusic() {
        if (this.sounds.background) {
            this.sounds.background.play();
        }
    }

    stopBackgroundMusic() {
        if (this.sounds.background) {
            this.sounds.background.stop();
        }
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
    }

    setEffectsVolume(volume) {
        this.effectsVolume = Math.max(0, Math.min(1, volume));
    }

    toggleSound() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.stopBackgroundMusic();
        }
        return this.enabled;
    }
}