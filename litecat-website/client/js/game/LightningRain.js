import * as THREE from 'three';

export class LightningRain {
    constructor(scene, bounds) {
        this.scene = scene;
        this.bounds = bounds;
        this.lightningBolts = [];
        this.particleCount = 500;
        this.collectibleCount = 30;
        
        this.createRainEffect();
        this.createCollectibleLightning();
    }

    createRainEffect() {
        // Create rain particles for atmosphere
        const rainGeometry = new THREE.BufferGeometry();
        const rainPositions = new Float32Array(this.particleCount * 3);
        const rainVelocities = new Float32Array(this.particleCount);
        
        for (let i = 0; i < this.particleCount; i++) {
            rainPositions[i * 3] = (Math.random() - 0.5) * this.bounds.x;
            rainPositions[i * 3 + 1] = Math.random() * this.bounds.y;
            rainPositions[i * 3 + 2] = (Math.random() - 0.5) * this.bounds.z;
            
            rainVelocities[i] = 0.5 + Math.random() * 0.5;
        }
        
        rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
        
        const rainMaterial = new THREE.PointsMaterial({
            color: 0xffeb3b,
            size: 0.1,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending
        });
        
        this.rainParticles = new THREE.Points(rainGeometry, rainMaterial);
        this.rainVelocities = rainVelocities;
        this.scene.add(this.rainParticles);
    }

    createCollectibleLightning() {
        // Create larger, collectible lightning bolts
        const lightningGeometry = this.createLightningGeometry();
        
        for (let i = 0; i < this.collectibleCount; i++) {
            const material = new THREE.MeshBasicMaterial({
                color: 0xffeb3b,
                emissive: 0xffeb3b,
                emissiveIntensity: 1,
                transparent: true,
                opacity: 0.9
            });
            
            const lightning = new THREE.Mesh(lightningGeometry, material);
            
            // Random position
            lightning.position.set(
                (Math.random() - 0.5) * this.bounds.x * 0.8,
                Math.random() * 10 + 10,
                (Math.random() - 0.5) * this.bounds.z * 0.8
            );
            
            // Random rotation
            lightning.rotation.z = Math.random() * Math.PI;
            
            // Scale for visibility
            lightning.scale.setScalar(0.8);
            
            // Add glow
            const glowLight = new THREE.PointLight(0xffeb3b, 2, 10);
            glowLight.position.copy(lightning.position);
            this.scene.add(glowLight);
            
            // Store data
            lightning.userData = {
                collected: false,
                glowLight: glowLight,
                fallSpeed: 2 + Math.random() * 2,
                rotationSpeed: Math.random() * 0.05,
                originalY: lightning.position.y
            };
            
            this.scene.add(lightning);
            this.lightningBolts.push(lightning);
        }
    }

    createLightningGeometry() {
        const shape = new THREE.Shape();
        
        // Create lightning bolt shape
        shape.moveTo(0, 4);
        shape.lineTo(-1, 2);
        shape.lineTo(0.5, 2);
        shape.lineTo(-0.5, 0);
        shape.lineTo(1, 0);
        shape.lineTo(0, -4);
        
        const extrudeSettings = {
            depth: 0.5,
            bevelEnabled: true,
            bevelSegments: 2,
            steps: 2,
            bevelSize: 0.1,
            bevelThickness: 0.1
        };
        
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.center();
        
        return geometry;
    }

    update(deltaTime) {
        // Update rain particles
        const positions = this.rainParticles.geometry.attributes.position.array;
        
        for (let i = 0; i < this.particleCount; i++) {
            positions[i * 3 + 1] -= this.rainVelocities[i] * deltaTime * 20;
            
            // Reset particle when it falls below ground
            if (positions[i * 3 + 1] < 0) {
                positions[i * 3] = (Math.random() - 0.5) * this.bounds.x;
                positions[i * 3 + 1] = this.bounds.y;
                positions[i * 3 + 2] = (Math.random() - 0.5) * this.bounds.z;
            }
        }
        
        this.rainParticles.geometry.attributes.position.needsUpdate = true;
        
        // Update collectible lightning bolts
        this.lightningBolts.forEach(lightning => {
            if (!lightning.userData.collected) {
                // Fall down
                lightning.position.y -= lightning.userData.fallSpeed * deltaTime;
                
                // Rotate
                lightning.rotation.y += lightning.userData.rotationSpeed;
                lightning.rotation.z += lightning.userData.rotationSpeed * 0.5;
                
                // Update glow
                lightning.userData.glowLight.position.copy(lightning.position);
                lightning.userData.glowLight.intensity = 1 + Math.sin(Date.now() * 0.005) * 0.5;
                
                // Reset when hits ground
                if (lightning.position.y < 0.5) {
                    lightning.position.y = lightning.userData.originalY;
                    lightning.position.x = (Math.random() - 0.5) * this.bounds.x * 0.8;
                    lightning.position.z = (Math.random() - 0.5) * this.bounds.z * 0.8;
                }
            }
        });
    }

    checkCollection(playerPosition, collectionRadius = 3) {
        let collected = null;
        
        this.lightningBolts.forEach(lightning => {
            if (!lightning.userData.collected) {
                const distance = playerPosition.distanceTo(lightning.position);
                
                if (distance < collectionRadius) {
                    lightning.userData.collected = true;
                    collected = lightning;
                }
            }
        });
        
        return collected;
    }

    removeCollected(lightning) {
        // Create collection effect
        this.createCollectionEffect(lightning.position);
        
        // Remove from scene
        this.scene.remove(lightning);
        this.scene.remove(lightning.userData.glowLight);
        
        // Remove from array
        const index = this.lightningBolts.indexOf(lightning);
        if (index > -1) {
            this.lightningBolts.splice(index, 1);
        }
        
        // Spawn new one after delay
        setTimeout(() => {
            this.spawnNewLightning();
        }, 1000);
    }

    spawnNewLightning() {
        const material = new THREE.MeshBasicMaterial({
            color: 0xffeb3b,
            emissive: 0xffeb3b,
            emissiveIntensity: 1,
            transparent: true,
            opacity: 0.9
        });
        
        const lightning = new THREE.Mesh(this.createLightningGeometry(), material);
        
        lightning.position.set(
            (Math.random() - 0.5) * this.bounds.x * 0.8,
            Math.random() * 10 + 20,
            (Math.random() - 0.5) * this.bounds.z * 0.8
        );
        
        lightning.rotation.z = Math.random() * Math.PI;
        lightning.scale.setScalar(2);
        
        const glowLight = new THREE.PointLight(0xffeb3b, 2, 10);
        glowLight.position.copy(lightning.position);
        this.scene.add(glowLight);
        
        lightning.userData = {
            collected: false,
            glowLight: glowLight,
            fallSpeed: 2 + Math.random() * 2,
            rotationSpeed: Math.random() * 0.05,
            originalY: lightning.position.y
        };
        
        this.scene.add(lightning);
        this.lightningBolts.push(lightning);
    }

    createCollectionEffect(position) {
        // Create expanding ring effect
        const ringGeometry = new THREE.RingGeometry(0.1, 0.5, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffeb3b,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(position);
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);
        
        // Create lightning flash
        const flashLight = new THREE.PointLight(0xffeb3b, 10, 20);
        flashLight.position.copy(position);
        this.scene.add(flashLight);
        
        // Create particle burst
        const particleCount = 30;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            const particleMaterial = new THREE.MeshBasicMaterial({ 
                color: i % 2 === 0 ? 0xffeb3b : 0xffffff,
                transparent: true,
                emissive: 0xffeb3b,
                emissiveIntensity: 1
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            particle.position.copy(position);
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 5 + Math.random() * 10;
            particle.velocity = new THREE.Vector3(
                Math.cos(angle) * speed,
                Math.random() * 10 + 5,
                Math.sin(angle) * speed
            );
            particle.rotationSpeed = new THREE.Vector3(
                Math.random() * 0.2,
                Math.random() * 0.2,
                Math.random() * 0.2
            );
            
            this.scene.add(particle);
            particles.push(particle);
        }
        
        // Create vertical beam
        const beamGeometry = new THREE.CylinderGeometry(0.5, 0.1, 10, 8);
        const beamMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffeb3b,
            transparent: true,
            opacity: 0.8
        });
        const beam = new THREE.Mesh(beamGeometry, beamMaterial);
        beam.position.copy(position);
        beam.position.y += 5;
        this.scene.add(beam);
        
        // Animate effects
        let animationTime = 0;
        const animateEffects = () => {
            animationTime += 0.016;
            
            // Expand ring
            ring.scale.x += 0.3;
            ring.scale.y += 0.3;
            ring.material.opacity -= 0.05;
            
            // Fade flash
            flashLight.intensity *= 0.9;
            
            // Animate particles
            particles.forEach((particle, i) => {
                particle.position.add(particle.velocity.clone().multiplyScalar(0.02));
                particle.velocity.y -= 0.3;
                particle.rotation.x += particle.rotationSpeed.x;
                particle.rotation.y += particle.rotationSpeed.y;
                particle.rotation.z += particle.rotationSpeed.z;
                particle.material.opacity -= 0.015;
                particle.scale.multiplyScalar(0.98);
                
                if (particle.material.opacity <= 0) {
                    this.scene.remove(particle);
                }
            });
            
            // Fade beam
            beam.scale.y *= 0.95;
            beam.material.opacity -= 0.04;
            beam.position.y += 0.2;
            
            // Continue animation
            if (ring.material.opacity > 0 || particles.some(p => p.material.opacity > 0)) {
                requestAnimationFrame(animateEffects);
            } else {
                // Cleanup
                this.scene.remove(ring);
                this.scene.remove(flashLight);
                this.scene.remove(beam);
                particles.forEach(p => this.scene.remove(p));
            }
        };
        
        animateEffects();
    }

    reset() {
        // Reset all lightning positions
        this.lightningBolts.forEach(lightning => {
            lightning.userData.collected = false;
            lightning.position.y = lightning.userData.originalY;
            lightning.position.x = (Math.random() - 0.5) * this.bounds.x * 0.8;
            lightning.position.z = (Math.random() - 0.5) * this.bounds.z * 0.8;
            lightning.visible = true;
            lightning.userData.glowLight.visible = true;
        });
    }
}