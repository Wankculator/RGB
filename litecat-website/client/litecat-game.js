// Litecat Lightning Game - Enhanced Version
class LitecatGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        
        // Game state
        this.running = false;
        this.paused = false;
        this.score = 0;
        this.level = 1;
        this.currentTier = 1;
        
        // Player (Litecat)
        this.player = {
            x: this.width / 2 - 30,
            y: this.height - 100,
            width: 60,
            height: 60,
            speed: 8,
            lightningCooldown: 0,
            powerLevel: 1
        };
        
        // Game objects
        this.lightningBolts = [];
        this.btcCoins = [];
        this.enemies = [];
        this.particles = [];
        this.powerUps = [];
        
        // Visual effects
        this.stars = this.createStarfield();
        this.lightningCharge = 0;
        
        // Controls
        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        
        // Sound
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.soundEnabled = true;
        
        this.setupControls();
    }
    
    setupControls() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (e.key === 'p' || e.key === 'P') this.togglePause();
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        // Mouse/Touch for aiming
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        
        this.canvas.addEventListener('click', () => {
            if (this.running && !this.paused) {
                this.shootLightning();
            }
        });
    }
    
    createStarfield() {
        const stars = [];
        for (let i = 0; i < 150; i++) {
            stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 0.5 + 0.1,
                twinkle: Math.random() * Math.PI * 2
            });
        }
        return stars;
    }
    
    start() {
        this.running = true;
        this.paused = false;
        this.score = 0;
        this.level = 1;
        this.lightningBolts = [];
        this.btcCoins = [];
        this.enemies = [];
        this.particles = [];
        
        this.spawnWave();
        this.gameLoop();
    }
    
    togglePause() {
        if (!this.running) return;
        this.paused = !this.paused;
        if (!this.paused) this.gameLoop();
    }
    
    gameLoop = () => {
        if (!this.running || this.paused) return;
        
        // Clear with trail effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Update
        this.update();
        
        // Draw
        this.draw();
        
        requestAnimationFrame(this.gameLoop);
    }
    
    update() {
        // Update stars
        this.updateStars();
        
        // Update player
        this.updatePlayer();
        
        // Update game objects
        this.updateLightning();
        this.updateBTCCoins();
        this.updateEnemies();
        this.updateParticles();
        this.updatePowerUps();
        
        // Check collisions
        this.checkCollisions();
        
        // Spawn new waves
        if (this.btcCoins.length === 0 && this.enemies.length === 0) {
            this.level++;
            this.spawnWave();
        }
        
        // Update charge
        this.lightningCharge = Math.min(this.lightningCharge + 0.02, 1);
    }
    
    updateStars() {
        this.stars.forEach(star => {
            star.y += star.speed;
            star.twinkle += 0.05;
            
            if (star.y > this.height) {
                star.y = -10;
                star.x = Math.random() * this.width;
            }
        });
    }
    
    updatePlayer() {
        // Movement
        if (this.keys['ArrowLeft'] || this.keys['a']) {
            this.player.x = Math.max(0, this.player.x - this.player.speed);
        }
        if (this.keys['ArrowRight'] || this.keys['d']) {
            this.player.x = Math.min(this.width - this.player.width, this.player.x + this.player.speed);
        }
        
        // Auto-fire with spacebar
        if (this.keys[' '] && this.player.lightningCooldown <= 0) {
            this.shootLightning();
        }
        
        // Cooldown
        if (this.player.lightningCooldown > 0) {
            this.player.lightningCooldown--;
        }
    }
    
    shootLightning() {
        if (this.player.lightningCooldown > 0) return;
        
        const centerX = this.player.x + this.player.width / 2;
        const centerY = this.player.y;
        
        // Create forked lightning based on power level
        for (let i = 0; i < this.player.powerLevel; i++) {
            const angle = (i - (this.player.powerLevel - 1) / 2) * 0.2;
            
            this.lightningBolts.push({
                x: centerX,
                y: centerY,
                targetX: centerX + Math.sin(angle) * 100,
                targetY: -20,
                segments: this.generateLightningPath(centerX, centerY, centerX + Math.sin(angle) * 100, -20),
                lifetime: 30,
                power: 1 + this.lightningCharge
            });
        }
        
        this.player.lightningCooldown = 15;
        this.lightningCharge = 0;
        
        // Sound effect
        this.playSound(1200, 0.05, 'sawtooth');
        this.playSound(800, 0.1, 'square');
    }
    
    generateLightningPath(x1, y1, x2, y2) {
        const segments = [];
        const steps = 8;
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 20;
            const y = y1 + (y2 - y1) * t;
            segments.push({ x, y });
        }
        
        return segments;
    }
    
    updateLightning() {
        this.lightningBolts = this.lightningBolts.filter(bolt => {
            bolt.lifetime--;
            
            // Update segments for animation
            bolt.segments = bolt.segments.map((seg, i) => ({
                x: seg.x + (Math.random() - 0.5) * 2,
                y: seg.y - 15
            }));
            
            return bolt.lifetime > 0;
        });
    }
    
    updateBTCCoins() {
        this.btcCoins = this.btcCoins.filter(coin => {
            coin.y += coin.speed;
            coin.rotation += coin.rotationSpeed;
            coin.bobPhase += 0.1;
            
            // Remove if off screen
            if (coin.y > this.height + 50) {
                return false;
            }
            
            return true;
        });
    }
    
    updateEnemies() {
        this.enemies = this.enemies.filter(enemy => {
            enemy.y += enemy.speed;
            
            if (enemy.type === 'zigzag') {
                enemy.x += Math.sin(enemy.y * 0.02) * 2;
            }
            
            return enemy.y < this.height + 50;
        });
    }
    
    updateParticles() {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.2; // gravity
            particle.life -= 0.02;
            particle.size *= 0.98;
            
            return particle.life > 0;
        });
    }
    
    updatePowerUps() {
        this.powerUps = this.powerUps.filter(powerUp => {
            powerUp.y += 2;
            powerUp.glow += 0.1;
            
            return powerUp.y < this.height + 50;
        });
    }
    
    spawnWave() {
        const waveSize = 5 + this.level * 2;
        
        for (let i = 0; i < waveSize; i++) {
            if (Math.random() > 0.3) {
                // Spawn BTC coin
                this.btcCoins.push({
                    x: Math.random() * (this.width - 40) + 20,
                    y: -50 - (i * 60),
                    size: 30,
                    speed: 2 + Math.random() * 2,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: 0.05 + Math.random() * 0.05,
                    bobPhase: Math.random() * Math.PI * 2,
                    value: Math.random() > 0.9 ? 10 : 5 // rare golden coins worth more
                });
            } else {
                // Spawn enemy
                this.enemies.push({
                    x: Math.random() * (this.width - 40) + 20,
                    y: -50 - (i * 80),
                    width: 40,
                    height: 40,
                    speed: 3 + Math.random() * 2,
                    type: Math.random() > 0.7 ? 'zigzag' : 'normal',
                    health: 1
                });
            }
        }
        
        // Chance for power-up
        if (Math.random() > 0.8) {
            this.powerUps.push({
                x: Math.random() * (this.width - 30) + 15,
                y: -100,
                type: 'multishot',
                glow: 0
            });
        }
    }
    
    checkCollisions() {
        // Lightning vs BTC Coins
        this.lightningBolts.forEach(bolt => {
            const boltTip = bolt.segments[bolt.segments.length - 1];
            
            this.btcCoins = this.btcCoins.filter(coin => {
                const dist = Math.hypot(boltTip.x - coin.x, boltTip.y - coin.y);
                
                if (dist < coin.size) {
                    // Hit!
                    this.score += coin.value;
                    this.createCoinExplosion(coin.x, coin.y);
                    this.playSound(880, 0.05, 'sine');
                    this.playSound(1320, 0.05, 'sine');
                    
                    // Check tier unlock
                    this.updateTier();
                    
                    return false;
                }
                return true;
            });
            
            // Lightning vs Enemies
            this.enemies = this.enemies.filter(enemy => {
                const dist = Math.hypot(boltTip.x - enemy.x - 20, boltTip.y - enemy.y - 20);
                
                if (dist < 30) {
                    this.createExplosion(enemy.x + 20, enemy.y + 20, '#FF6B6B');
                    this.playSound(200, 0.1, 'square');
                    return false;
                }
                return true;
            });
        });
        
        // Player vs Power-ups
        this.powerUps = this.powerUps.filter(powerUp => {
            const dist = Math.hypot(
                powerUp.x - (this.player.x + this.player.width / 2),
                powerUp.y - (this.player.y + this.player.height / 2)
            );
            
            if (dist < 40) {
                if (powerUp.type === 'multishot') {
                    this.player.powerLevel = Math.min(this.player.powerLevel + 1, 3);
                }
                this.playSound(440, 0.1, 'sine');
                this.playSound(660, 0.1, 'sine');
                return false;
            }
            return true;
        });
    }
    
    updateTier() {
        let newTier = 1;
        if (this.score >= 50) newTier = 2;
        if (this.score >= 100) newTier = 3;
        
        if (newTier !== this.currentTier) {
            this.currentTier = newTier;
            this.onTierUnlock(newTier);
        }
    }
    
    createCoinExplosion(x, y) {
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x,
                y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                size: Math.random() * 6 + 2,
                color: '#FFFF00',
                life: 1
            });
        }
    }
    
    createExplosion(x, y, color) {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x,
                y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                size: Math.random() * 4 + 2,
                color,
                life: 1
            });
        }
    }
    
    draw() {
        // Draw stars
        this.drawStars();
        
        // Draw game objects
        this.drawBTCCoins();
        this.drawEnemies();
        this.drawPowerUps();
        this.drawLightning();
        this.drawParticles();
        
        // Draw player
        this.drawPlayer();
        
        // Draw UI
        this.drawUI();
    }
    
    drawStars() {
        this.ctx.fillStyle = '#FFF';
        this.stars.forEach(star => {
            const opacity = 0.5 + Math.sin(star.twinkle) * 0.5;
            this.ctx.globalAlpha = opacity;
            this.ctx.fillRect(star.x, star.y, star.size, star.size);
        });
        this.ctx.globalAlpha = 1;
    }
    
    drawPlayer() {
        const cx = this.player.x + this.player.width / 2;
        const cy = this.player.y + this.player.height / 2;
        
        // Cat body (black with yellow outline)
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(this.player.x + 10, this.player.y + 15, 40, 35);
        
        this.ctx.strokeStyle = '#FFFF00';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(this.player.x + 10, this.player.y + 15, 40, 35);
        
        // Cat head
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(cx, cy - 10, 20, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#FFFF00';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        // Cat ears
        this.ctx.fillStyle = '#FFFF00';
        // Left ear
        this.ctx.beginPath();
        this.ctx.moveTo(cx - 15, cy - 20);
        this.ctx.lineTo(cx - 20, cy - 35);
        this.ctx.lineTo(cx - 8, cy - 28);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Right ear
        this.ctx.beginPath();
        this.ctx.moveTo(cx + 15, cy - 20);
        this.ctx.lineTo(cx + 20, cy - 35);
        this.ctx.lineTo(cx + 8, cy - 28);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Cat eyes
        this.ctx.fillStyle = '#FFFF00';
        this.ctx.fillRect(cx - 10, cy - 15, 6, 6);
        this.ctx.fillRect(cx + 4, cy - 15, 6, 6);
        
        // Lightning bolt on head (animated)
        const pulse = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
        this.ctx.strokeStyle = '#FFFF00';
        this.ctx.lineWidth = 3 + pulse * 2;
        this.ctx.shadowBlur = 10 + pulse * 20;
        this.ctx.shadowColor = '#FFFF00';
        
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy - 35);
        this.ctx.lineTo(cx - 5, cy - 28);
        this.ctx.lineTo(cx + 3, cy - 28);
        this.ctx.lineTo(cx - 2, cy - 20);
        this.ctx.stroke();
        
        this.ctx.shadowBlur = 0;
        
        // Draw charge meter
        if (this.lightningCharge > 0.1) {
            this.ctx.fillStyle = `rgba(255, 255, 0, ${this.lightningCharge * 0.5})`;
            this.ctx.fillRect(
                this.player.x + 5,
                this.player.y + this.player.height + 5,
                50 * this.lightningCharge,
                4
            );
        }
    }
    
    drawLightning() {
        this.lightningBolts.forEach(bolt => {
            this.ctx.strokeStyle = '#FFFF00';
            this.ctx.lineWidth = 3;
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = '#FFFF00';
            this.ctx.globalAlpha = bolt.lifetime / 30;
            
            this.ctx.beginPath();
            bolt.segments.forEach((seg, i) => {
                if (i === 0) {
                    this.ctx.moveTo(seg.x, seg.y);
                } else {
                    this.ctx.lineTo(seg.x, seg.y);
                }
            });
            this.ctx.stroke();
            
            // Draw lightning forks
            if (bolt.power > 1.5) {
                bolt.segments.forEach((seg, i) => {
                    if (i % 3 === 0 && i > 0) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(seg.x, seg.y);
                        this.ctx.lineTo(seg.x + (Math.random() - 0.5) * 30, seg.y - 20);
                        this.ctx.stroke();
                    }
                });
            }
            
            this.ctx.globalAlpha = 1;
            this.ctx.shadowBlur = 0;
        });
    }
    
    drawBTCCoins() {
        this.btcCoins.forEach(coin => {
            const bob = Math.sin(coin.bobPhase) * 3;
            
            this.ctx.save();
            this.ctx.translate(coin.x, coin.y + bob);
            this.ctx.rotate(coin.rotation);
            
            // Coin circle
            const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, coin.size);
            gradient.addColorStop(0, '#FFFF66');
            gradient.addColorStop(0.7, '#FFFF00');
            gradient.addColorStop(1, '#FFD700');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, coin.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // BTC symbol
            this.ctx.fillStyle = '#000';
            this.ctx.font = `bold ${coin.size}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('₿', 0, 0);
            
            // Coin shine
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(-coin.size/3, -coin.size/3, coin.size/3, 0, Math.PI/2, true);
            this.ctx.stroke();
            
            this.ctx.restore();
            
            // Value indicator for special coins
            if (coin.value === 10) {
                this.ctx.fillStyle = '#FFD700';
                this.ctx.font = 'bold 12px Arial';
                this.ctx.fillText('×10', coin.x + coin.size + 10, coin.y);
            }
        });
    }
    
    drawEnemies() {
        this.enemies.forEach(enemy => {
            if (enemy.type === 'zigzag') {
                this.ctx.fillStyle = '#FF6B6B';
            } else {
                this.ctx.fillStyle = '#FF3333';
            }
            
            // Draw enemy ship
            this.ctx.beginPath();
            this.ctx.moveTo(enemy.x + 20, enemy.y);
            this.ctx.lineTo(enemy.x, enemy.y + 40);
            this.ctx.lineTo(enemy.x + 40, enemy.y + 40);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Enemy details
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(enemy.x + 10, enemy.y + 20, 5, 5);
            this.ctx.fillRect(enemy.x + 25, enemy.y + 20, 5, 5);
        });
    }
    
    drawPowerUps() {
        this.powerUps.forEach(powerUp => {
            const glow = Math.sin(powerUp.glow) * 0.5 + 0.5;
            
            this.ctx.fillStyle = '#00FF00';
            this.ctx.shadowBlur = 20 + glow * 20;
            this.ctx.shadowColor = '#00FF00';
            
            // Power-up icon
            this.ctx.beginPath();
            this.ctx.arc(powerUp.x, powerUp.y, 15, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#000';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('⚡', powerUp.x, powerUp.y);
            
            this.ctx.shadowBlur = 0;
        });
    }
    
    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = particle.life;
            this.ctx.fillRect(
                particle.x - particle.size/2,
                particle.y - particle.size/2,
                particle.size,
                particle.size
            );
        });
        this.ctx.globalAlpha = 1;
    }
    
    drawUI() {
        // Score
        this.ctx.fillStyle = '#FFFF00';
        this.ctx.font = 'bold 24px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SCORE: ${this.score}`, 20, 40);
        
        // Level
        this.ctx.fillText(`LEVEL: ${this.level}`, 20, 70);
        
        // Power level
        for (let i = 0; i < this.player.powerLevel; i++) {
            this.ctx.fillText('⚡', 20 + i * 25, 100);
        }
    }
    
    playSound(freq, duration, type = 'square') {
        if (!this.soundEnabled) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = 0.1;
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        osc.start();
        osc.stop(this.audioContext.currentTime + duration);
    }
    
    onTierUnlock(tier) {
        // Callback for tier unlock - update UI
        if (window.updateTierDisplay) {
            window.updateTierDisplay();
        }
    }
}

// Export for use
window.LitecatGame = LitecatGame;