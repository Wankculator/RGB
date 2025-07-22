/**
 * LITECAT ARCADE GAME ENGINE
 * Retro-style lightning shooter game for tier unlocking
 */

class LitecatGameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.isRunning = false;
    this.isPaused = false;
    
    // Game state
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.tier = 1;
    this.gameSpeed = 1;
    
    // Player
    this.player = {
      x: canvas.width / 2 - 25,
      y: canvas.height - 80,
      width: 50,
      height: 50,
      speed: 5,
      color: '#FFFF00'
    };
    
    // Game objects
    this.bullets = [];
    this.enemies = [];
    this.explosions = [];
    this.powerUps = [];
    this.particles = [];
    
    // Input handling
    this.keys = {};
    this.setupEventListeners();
    
    // Game timing
    this.lastTime = 0;
    this.deltaTime = 0;
    this.enemySpawnTimer = 0;
    this.powerUpSpawnTimer = 0;
    
    // Audio
    this.audioEnabled = true;
    this.musicEnabled = true;
    this.setupAudio();
    
    // Graphics
    this.stars = this.generateStars(100);
    this.setupGraphics();
  }
  
  setupEventListeners() {
    // Keyboard events
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      
      // Prevent default for game keys
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
    
    // Touch events for mobile
    this.canvas.addEventListener('touchstart', this.handleTouch.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouch.bind(this));
    this.canvas.addEventListener('touchend', () => {
      this.touchInput = null;
    });
  }
  
  handleTouch(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    
    if (touch) {
      this.touchInput = {
        x: (touch.clientX - rect.left) * (this.canvas.width / rect.width),
        y: (touch.clientY - rect.top) * (this.canvas.height / rect.height)
      };
    }
  }
  
  setupAudio() {
    this.sounds = {
      shoot: this.createSound([0.3, 0.1, 0.2, 0.05, 0.1]),
      hit: this.createSound([0.5, 0.2, 0.1, 0.3, 0.2]),
      explosion: this.createSound([0.8, 0.3, 0.2, 0.5, 0.4]),
      powerUp: this.createSound([0.4, 0.6, 0.3, 0.2, 0.5]),
      levelUp: this.createSound([0.6, 0.8, 0.5, 0.4, 0.7])
    };
  }
  
  createSound(frequencies) {
    // Simple procedural audio generation
    return {
      play: () => {
        if (!this.audioEnabled) return;
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const duration = 0.2;
        
        frequencies.forEach((freq, index) => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(200 + freq * 400, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
          
          oscillator.start(audioContext.currentTime + index * 0.05);
          oscillator.stop(audioContext.currentTime + duration + index * 0.05);
        });
      }
    };
  }
  
  setupGraphics() {
    // Create gradient patterns
    this.playerGradient = this.ctx.createRadialGradient(25, 25, 5, 25, 25, 25);
    this.playerGradient.addColorStop(0, '#FFFF00');
    this.playerGradient.addColorStop(0.7, '#FFD700');
    this.playerGradient.addColorStop(1, '#FFA500');
    
    this.bulletGradient = this.ctx.createLinearGradient(0, 0, 0, 10);
    this.bulletGradient.addColorStop(0, '#FFFFFF');
    this.bulletGradient.addColorStop(1, '#FFFF00');
  }
  
  generateStars(count) {
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.5 + 0.1,
        opacity: Math.random() * 0.8 + 0.2
      });
    }
    return stars;
  }
  
  start() {
    this.isRunning = true;
    this.isPaused = false;
    this.reset();
    this.gameLoop();
    
    // Update UI
    document.getElementById('current-score').textContent = this.score;
    document.getElementById('current-lives').textContent = this.lives;
    document.getElementById('current-tier').textContent = this.tier;
  }
  
  stop() {
    this.isRunning = false;
    this.showGameOverScreen();
  }
  
  pause() {
    this.isPaused = !this.isPaused;
  }
  
  reset() {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.tier = 1;
    this.gameSpeed = 1;
    
    this.player.x = this.canvas.width / 2 - 25;
    this.player.y = this.canvas.height - 80;
    
    this.bullets = [];
    this.enemies = [];
    this.explosions = [];
    this.powerUps = [];
    this.particles = [];
    
    this.enemySpawnTimer = 0;
    this.powerUpSpawnTimer = 0;
  }
  
  gameLoop(currentTime = 0) {
    if (!this.isRunning) return;
    
    this.deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    if (!this.isPaused) {
      this.update();
    }
    
    this.render();
    
    requestAnimationFrame(this.gameLoop.bind(this));
  }
  
  update() {
    this.updatePlayer();
    this.updateBullets();
    this.updateEnemies();
    this.updateExplosions();
    this.updatePowerUps();
    this.updateParticles();
    this.updateStars();
    
    this.checkCollisions();
    this.spawnEnemies();
    this.spawnPowerUps();
    this.updateGameState();
  }
  
  updatePlayer() {
    // Keyboard controls
    if (this.keys['ArrowLeft'] && this.player.x > 0) {
      this.player.x -= this.player.speed;
    }
    if (this.keys['ArrowRight'] && this.player.x < this.canvas.width - this.player.width) {
      this.player.x += this.player.speed;
    }
    if (this.keys['ArrowUp'] && this.player.y > this.canvas.height / 2) {
      this.player.y -= this.player.speed;
    }
    if (this.keys['ArrowDown'] && this.player.y < this.canvas.height - this.player.height) {
      this.player.y += this.player.speed;
    }
    
    // Touch controls
    if (this.touchInput) {
      const targetX = this.touchInput.x - this.player.width / 2;
      const targetY = this.touchInput.y - this.player.height / 2;
      
      this.player.x += (targetX - this.player.x) * 0.1;
      this.player.y += (targetY - this.player.y) * 0.1;
      
      // Keep player in bounds
      this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.width, this.player.x));
      this.player.y = Math.max(this.canvas.height / 2, Math.min(this.canvas.height - this.player.height, this.player.y));
    }
    
    // Auto-shoot
    if (this.keys['Space'] || this.touchInput) {
      this.shoot();
    }
  }
  
  shoot() {
    const now = Date.now();
    if (now - (this.lastShot || 0) > 150) { // Rate limit shooting
      this.bullets.push({
        x: this.player.x + this.player.width / 2 - 2,
        y: this.player.y,
        width: 4,
        height: 12,
        speed: 8,
        damage: 1
      });
      
      this.sounds.shoot.play();
      this.lastShot = now;
      
      // Add muzzle flash particles
      this.addParticles(this.player.x + this.player.width / 2, this.player.y, '#FFFF00', 5);
    }
  }
  
  updateBullets() {
    this.bullets = this.bullets.filter(bullet => {
      bullet.y -= bullet.speed;
      return bullet.y > -bullet.height;
    });
  }
  
  updateEnemies() {
    this.enemies = this.enemies.filter(enemy => {
      enemy.y += enemy.speed * this.gameSpeed;
      
      // Simple AI movement
      if (enemy.type === 'zigzag') {
        enemy.x += Math.sin(enemy.y * 0.01) * 2;
      } else if (enemy.type === 'seeker') {
        const dx = this.player.x - enemy.x;
        enemy.x += Math.sign(dx) * 0.5;
      }
      
      return enemy.y < this.canvas.height + enemy.height;
    });
  }
  
  updateExplosions() {
    this.explosions = this.explosions.filter(explosion => {
      explosion.frame++;
      explosion.size += 2;
      explosion.opacity -= 0.05;
      return explosion.opacity > 0;
    });
  }
  
  updatePowerUps() {
    this.powerUps = this.powerUps.filter(powerUp => {
      powerUp.y += 2;
      powerUp.rotation += 0.1;
      return powerUp.y < this.canvas.height + powerUp.size;
    });
  }
  
  updateParticles() {
    this.particles = this.particles.filter(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life--;
      particle.opacity = particle.life / particle.maxLife;
      return particle.life > 0;
    });
  }
  
  updateStars() {
    this.stars.forEach(star => {
      star.y += star.speed * this.gameSpeed;
      if (star.y > this.canvas.height) {
        star.y = -5;
        star.x = Math.random() * this.canvas.width;
      }
    });
  }
  
  spawnEnemies() {
    this.enemySpawnTimer += this.deltaTime;
    const spawnRate = Math.max(1000 - this.level * 100, 300);
    
    if (this.enemySpawnTimer > spawnRate) {
      const enemyTypes = ['basic', 'zigzag', 'seeker'];
      const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      
      this.enemies.push({
        x: Math.random() * (this.canvas.width - 30),
        y: -30,
        width: 30,
        height: 30,
        speed: 1 + Math.random() * 2,
        hp: type === 'seeker' ? 3 : (type === 'zigzag' ? 2 : 1),
        maxHp: type === 'seeker' ? 3 : (type === 'zigzag' ? 2 : 1),
        type: type,
        color: type === 'seeker' ? '#FF0000' : (type === 'zigzag' ? '#FF6B35' : '#666666')
      });
      
      this.enemySpawnTimer = 0;
    }
  }
  
  spawnPowerUps() {
    this.powerUpSpawnTimer += this.deltaTime;
    
    if (this.powerUpSpawnTimer > 8000 && Math.random() < 0.3) {
      const powerUpTypes = ['multishot', 'shield', 'lightning'];
      const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
      
      this.powerUps.push({
        x: Math.random() * (this.canvas.width - 20),
        y: -20,
        size: 20,
        type: type,
        rotation: 0,
        color: type === 'lightning' ? '#FFFF00' : (type === 'shield' ? '#00FF00' : '#FF00FF')
      });
      
      this.powerUpSpawnTimer = 0;
    }
  }
  
  checkCollisions() {
    // Bullet vs Enemy collisions
    this.bullets.forEach((bullet, bulletIndex) => {
      this.enemies.forEach((enemy, enemyIndex) => {
        if (this.isColliding(bullet, enemy)) {
          enemy.hp -= bullet.damage;
          this.bullets.splice(bulletIndex, 1);
          
          this.addParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color, 8);
          this.sounds.hit.play();
          
          if (enemy.hp <= 0) {
            this.score += enemy.maxHp * 10;
            this.enemies.splice(enemyIndex, 1);
            this.addExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
            this.sounds.explosion.play();
          }
        }
      });
    });
    
    // Player vs Enemy collisions
    this.enemies.forEach((enemy, enemyIndex) => {
      if (this.isColliding(this.player, enemy)) {
        this.lives--;
        this.enemies.splice(enemyIndex, 1);
        this.addExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
        this.addParticles(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, '#FFFF00', 15);
        this.sounds.explosion.play();
        
        if (this.lives <= 0) {
          this.stop();
        }
      }
    });
    
    // Player vs PowerUp collisions
    this.powerUps.forEach((powerUp, powerUpIndex) => {
      if (this.isColliding(this.player, powerUp)) {
        this.powerUps.splice(powerUpIndex, 1);
        this.applyPowerUp(powerUp.type);
        this.sounds.powerUp.play();
        this.addParticles(powerUp.x, powerUp.y, powerUp.color, 10);
      }
    });
  }
  
  isColliding(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }
  
  addExplosion(x, y) {
    this.explosions.push({
      x: x,
      y: y,
      size: 10,
      frame: 0,
      opacity: 1
    });
  }
  
  addParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 20,
        maxLife: 20,
        color: color,
        opacity: 1
      });
    }
  }
  
  applyPowerUp(type) {
    switch (type) {
      case 'multishot':
        // Temporarily increase bullet count
        break;
      case 'shield':
        this.lives = Math.min(this.lives + 1, 5);
        break;
      case 'lightning':
        this.score += 50;
        break;
    }
  }
  
  updateGameState() {
    // Update tier based on score
    const newTier = this.score >= 20 ? 3 : (this.score >= 10 ? 2 : 1);
    if (newTier > this.tier) {
      this.tier = newTier;
      this.sounds.levelUp.play();
    }
    
    // Update level
    const newLevel = Math.floor(this.score / 50) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      this.gameSpeed = Math.min(this.gameSpeed + 0.1, 3);
    }
    
    // Update UI
    document.getElementById('current-score').textContent = this.score;
    document.getElementById('current-lives').textContent = this.lives;
    document.getElementById('current-tier').textContent = this.tier;
    
    // Update tier cards
    document.querySelectorAll('.tier-card').forEach((card, index) => {
      card.classList.toggle('active', index + 1 <= this.tier);
    });
  }
  
  render() {
    // Clear canvas
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw starfield
    this.drawStars();
    
    // Draw game objects
    this.drawPlayer();
    this.drawBullets();
    this.drawEnemies();
    this.drawPowerUps();
    this.drawExplosions();
    this.drawParticles();
    
    // Draw UI elements
    this.drawHUD();
  }
  
  drawStars() {
    this.ctx.fillStyle = '#FFFFFF';
    this.stars.forEach(star => {
      this.ctx.globalAlpha = star.opacity;
      this.ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    this.ctx.globalAlpha = 1;
  }
  
  drawPlayer() {
    this.ctx.save();
    this.ctx.translate(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
    
    // Draw cat body
    this.ctx.fillStyle = this.playerGradient;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 20, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw cat ears
    this.ctx.fillStyle = '#FFFF00';
    this.ctx.beginPath();
    this.ctx.moveTo(-15, -15);
    this.ctx.lineTo(-5, -25);
    this.ctx.lineTo(-8, -10);
    this.ctx.closePath();
    this.ctx.fill();
    
    this.ctx.beginPath();
    this.ctx.moveTo(15, -15);
    this.ctx.lineTo(5, -25);
    this.ctx.lineTo(8, -10);
    this.ctx.closePath();
    this.ctx.fill();
    
    // Draw lightning bolt
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⚡', 0, 5);
    
    this.ctx.restore();
  }
  
  drawBullets() {
    this.ctx.fillStyle = this.bulletGradient;
    this.bullets.forEach(bullet => {
      this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
      
      // Add glow effect
      this.ctx.shadowColor = '#FFFF00';
      this.ctx.shadowBlur = 10;
      this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
      this.ctx.shadowBlur = 0;
    });
  }
  
  drawEnemies() {
    this.enemies.forEach(enemy => {
      // Health bar
      if (enemy.hp < enemy.maxHp) {
        this.ctx.fillStyle = '#FF0000';
        this.ctx.fillRect(enemy.x, enemy.y - 8, enemy.width, 3);
        this.ctx.fillStyle = '#00FF00';
        this.ctx.fillRect(enemy.x, enemy.y - 8, (enemy.hp / enemy.maxHp) * enemy.width, 3);
      }
      
      // Enemy body
      this.ctx.fillStyle = enemy.color;
      this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      
      // Enemy face
      this.ctx.fillStyle = '#FF0000';
      this.ctx.font = '20px Arial';
      this.ctx.textAlign = 'center';
      
      if (enemy.type === 'seeker') {
        this.ctx.fillText('👹', enemy.x + enemy.width / 2, enemy.y + enemy.height / 2 + 7);
      } else if (enemy.type === 'zigzag') {
        this.ctx.fillText('🤖', enemy.x + enemy.width / 2, enemy.y + enemy.height / 2 + 7);
      } else {
        this.ctx.fillText('👾', enemy.x + enemy.width / 2, enemy.y + enemy.height / 2 + 7);
      }
    });
  }
  
  drawPowerUps() {
    this.powerUps.forEach(powerUp => {
      this.ctx.save();
      this.ctx.translate(powerUp.x + powerUp.size / 2, powerUp.y + powerUp.size / 2);
      this.ctx.rotate(powerUp.rotation);
      
      this.ctx.fillStyle = powerUp.color;
      this.ctx.fillRect(-powerUp.size / 2, -powerUp.size / 2, powerUp.size, powerUp.size);
      
      // Add glow
      this.ctx.shadowColor = powerUp.color;
      this.ctx.shadowBlur = 15;
      this.ctx.fillRect(-powerUp.size / 2, -powerUp.size / 2, powerUp.size, powerUp.size);
      
      this.ctx.restore();
    });
  }
  
  drawExplosions() {
    this.explosions.forEach(explosion => {
      this.ctx.save();
      this.ctx.globalAlpha = explosion.opacity;
      this.ctx.fillStyle = `rgba(255, 255, 0, ${explosion.opacity})`;
      this.ctx.beginPath();
      this.ctx.arc(explosion.x, explosion.y, explosion.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
  }
  
  drawParticles() {
    this.particles.forEach(particle => {
      this.ctx.save();
      this.ctx.globalAlpha = particle.opacity;
      this.ctx.fillStyle = particle.color;
      this.ctx.fillRect(particle.x, particle.y, 2, 2);
      this.ctx.restore();
    });
  }
  
  drawHUD() {
    // Score display on canvas
    this.ctx.fillStyle = '#FFFF00';
    this.ctx.font = 'bold 24px Montserrat';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Score: ${this.score}`, 20, 40);
    
    // Tier indicator
    this.ctx.fillText(`Tier: ${this.tier}`, 20, 70);
    
    // Lives
    this.ctx.fillText(`Lives: ${'♥'.repeat(this.lives)}`, 20, 100);
  }
  
  showGameOverScreen() {
    const gameOverScreen = document.getElementById('game-over-screen');
    const gameStartScreen = document.getElementById('game-start-screen');
    
    document.getElementById('final-score').textContent = this.score;
    document.getElementById('achieved-tier').textContent = this.tier;
    
    gameStartScreen.style.display = 'none';
    gameOverScreen.style.display = 'flex';
    
    // Store tier in localStorage for purchase form
    localStorage.setItem('litecatGameTier', this.tier);
    
    // Update max batches in purchase form
    const maxBatches = this.tier === 3 ? 10 : (this.tier === 2 ? 8 : 5);
    document.getElementById('max-batches').textContent = maxBatches;
    document.getElementById('batch-count').max = maxBatches;
  }
  
  toggleSound() {
    this.audioEnabled = !this.audioEnabled;
    const soundBtn = document.getElementById('toggle-sound');
    soundBtn.querySelector('.sound-icon').textContent = this.audioEnabled ? '🔊' : '🔇';
  }
  
  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    const musicBtn = document.getElementById('toggle-music');
    musicBtn.querySelector('.music-icon').textContent = this.musicEnabled ? '🎵' : '🔇';
  }
}

// Export for use in other modules
window.LitecatGameEngine = LitecatGameEngine;
