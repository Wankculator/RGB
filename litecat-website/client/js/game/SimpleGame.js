import * as THREE from 'three';
import { LightningRain } from './LightningRain.js';
import { LightCatCharacter } from './LightCatCharacter.js';
import { ProEnvironment } from './ProEnvironment.js';

export class SimpleGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.score = 0;
        this.timeRemaining = 60;
        this.isPlaying = false;
        
        this.init();
    }

    init() {
        // Setup renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas,
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        // Setup scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x000000, 10, 100);
        
        // Setup camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 8, 15);
        this.camera.lookAt(0, 0, 0);
        
        // Setup lights
        this.setupLights();
        
        // Create professional environment
        this.environment = new ProEnvironment(this.scene);
        
        // Create cat model
        this.createCat();
        
        // Create lightning rain
        this.lightningRain = new LightningRain(this.scene, {
            x: 100,
            y: 50,
            z: 100
        });
        
        // Physics properties (Mario-style)
        this.physics = {
            gravity: -35,
            jumpPower: 15,
            moveSpeed: 15,
            sprintMultiplier: 1.5,
            groundDrag: 10,
            airDrag: 2,
            maxSpeed: 25,
            acceleration: 50,
            deceleration: 30,
            turnSpeed: 10
        };
        
        // Clock for delta time
        this.clock = new THREE.Clock();
        
        // Controls
        this.keys = {};
        this.mouseMovement = { x: 0, y: 0 };
        this.setupControls();
        
        // Camera controls
        this.cameraAngle = 0;
        this.cameraDistance = 15;
        this.cameraHeight = 8;
        
        // Start animation loop
        this.animate();
    }

    setupLights() {
        // Ambient light for base visibility
        const ambientLight = new THREE.AmbientLight(0x303030, 0.5);
        this.scene.add(ambientLight);
        
        // Main directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Rim light for atmosphere
        const rimLight = new THREE.DirectionalLight(0x4444ff, 0.3);
        rimLight.position.set(-10, 10, -10);
        this.scene.add(rimLight);
    }


    createCat() {
        // Use the LightCat character based on the logo
        this.catModel = new LightCatCharacter();
        this.cat = this.catModel.getMesh();
        this.cat.position.set(0, 0, 0);
        this.scene.add(this.cat);
        
        // Physics state
        this.catPhysics = {
            velocity: new THREE.Vector3(),
            position: new THREE.Vector3(),
            rotation: 0,
            targetRotation: 0,
            isGrounded: true,
            canJump: true,
            isSprinting: false
        };
    }

    setupControls() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // Handle jump on press
            if ((e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') && 
                this.catPhysics.isGrounded && this.catPhysics.canJump && this.isPlaying) {
                this.jump();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Mouse controls for camera
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.canvas) {
                this.mouseMovement.x = e.movementX;
                this.mouseMovement.y = e.movementY;
            }
        });
        
        // Click to lock pointer
        this.canvas.addEventListener('click', () => {
            if (this.isPlaying) {
                this.canvas.requestPointerLock();
            }
        });
        
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    jump() {
        this.catPhysics.velocity.y = this.physics.jumpPower;
        this.catPhysics.isGrounded = false;
        this.catPhysics.canJump = false;
        
        // Jump animation
        const jumpTween = { scale: 1 };
        const startScale = this.cat.scale.y;
        
        // Squash
        this.cat.scale.y = 0.7;
        
        // Stretch
        setTimeout(() => {
            this.cat.scale.y = 1.3;
        }, 50);
        
        // Return to normal
        setTimeout(() => {
            this.cat.scale.y = startScale;
        }, 150);
    }

    start() {
        this.isPlaying = true;
        this.score = 0;
        this.timeRemaining = 60;
        this.cat.position.set(0, 0, 0);
        this.catPhysics.velocity.set(0, 0, 0);
        this.catPhysics.position.copy(this.cat.position);
        this.lightningRain.reset();
        
        // Request pointer lock
        this.canvas.requestPointerLock();
        
        // Start timer
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            document.getElementById('timer').textContent = this.timeRemaining;
            
            if (this.timeRemaining <= 10) {
                // Flash timer when low
                document.getElementById('timer').style.color = this.timeRemaining % 2 === 0 ? '#ff0000' : '#ffeb3b';
            }
            
            if (this.timeRemaining <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    endGame() {
        this.isPlaying = false;
        clearInterval(this.timerInterval);
        
        // Exit pointer lock
        document.exitPointerLock();
        
        // Trigger game over event
        window.game.endGame();
    }

    update(deltaTime) {
        if (!this.isPlaying) return;
        
        // Get input direction
        const inputVector = new THREE.Vector3();
        
        if (this.keys['KeyW'] || this.keys['ArrowUp']) inputVector.z -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) inputVector.z += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) inputVector.x -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) inputVector.x += 1;
        
        // Sprint modifier
        this.catPhysics.isSprinting = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
        const speedMultiplier = this.catPhysics.isSprinting ? this.physics.sprintMultiplier : 1;
        
        // Normalize input
        if (inputVector.length() > 0) {
            inputVector.normalize();
        }
        
        // Apply camera-relative movement
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0;
        cameraDirection.normalize();
        
        const cameraRight = new THREE.Vector3();
        cameraRight.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));
        
        const moveDirection = new THREE.Vector3();
        moveDirection.addScaledVector(cameraRight, inputVector.x);
        moveDirection.addScaledVector(cameraDirection, -inputVector.z);
        
        // Apply acceleration
        if (moveDirection.length() > 0) {
            const targetVelocity = moveDirection.multiplyScalar(this.physics.moveSpeed * speedMultiplier);
            
            this.catPhysics.velocity.x = THREE.MathUtils.lerp(
                this.catPhysics.velocity.x,
                targetVelocity.x,
                this.physics.acceleration * deltaTime
            );
            
            this.catPhysics.velocity.z = THREE.MathUtils.lerp(
                this.catPhysics.velocity.z,
                targetVelocity.z,
                this.physics.acceleration * deltaTime
            );
            
            // Update rotation to face movement direction
            const angle = Math.atan2(moveDirection.x, moveDirection.z);
            this.catPhysics.targetRotation = angle;
        } else {
            // Apply deceleration
            const drag = this.catPhysics.isGrounded ? this.physics.groundDrag : this.physics.airDrag;
            this.catPhysics.velocity.x *= (1 - drag * deltaTime);
            this.catPhysics.velocity.z *= (1 - drag * deltaTime);
        }
        
        // Apply gravity
        if (!this.catPhysics.isGrounded) {
            this.catPhysics.velocity.y += this.physics.gravity * deltaTime;
        }
        
        // Update position
        this.catPhysics.position.add(this.catPhysics.velocity.clone().multiplyScalar(deltaTime));
        
        // Ground collision
        if (this.catPhysics.position.y <= 0) {
            this.catPhysics.position.y = 0;
            this.catPhysics.velocity.y = 0;
            this.catPhysics.isGrounded = true;
            this.catPhysics.canJump = true;
        } else {
            this.catPhysics.isGrounded = false;
        }
        
        // Keep cat on plane bounds
        const bounds = 45;
        this.catPhysics.position.x = Math.max(-bounds, Math.min(bounds, this.catPhysics.position.x));
        this.catPhysics.position.z = Math.max(-bounds, Math.min(bounds, this.catPhysics.position.z));
        
        // Update cat mesh
        this.cat.position.copy(this.catPhysics.position);
        
        // Smooth rotation
        this.catPhysics.rotation = THREE.MathUtils.lerp(
            this.catPhysics.rotation,
            this.catPhysics.targetRotation,
            this.physics.turnSpeed * deltaTime
        );
        this.cat.rotation.y = this.catPhysics.rotation;
        
        // Update cat animations
        this.catModel.update(this.catPhysics.velocity, deltaTime, this.catPhysics.isGrounded);
        
        // Update camera rotation with mouse
        if (document.pointerLockElement === this.canvas) {
            this.cameraAngle -= this.mouseMovement.x * 0.002;
            this.mouseMovement.x = 0;
            this.mouseMovement.y = 0;
        }
        
        // Update camera position (third person)
        const cameraOffset = new THREE.Vector3(
            Math.sin(this.cameraAngle) * this.cameraDistance,
            this.cameraHeight,
            Math.cos(this.cameraAngle) * this.cameraDistance
        );
        
        const desiredCameraPosition = this.cat.position.clone().add(cameraOffset);
        this.camera.position.lerp(desiredCameraPosition, 0.1);
        
        const lookAtPosition = this.cat.position.clone();
        lookAtPosition.y += 2;
        this.camera.lookAt(lookAtPosition);
        
        // Update lightning rain
        this.lightningRain.update(deltaTime);
        
        // Check for collections with smaller radius
        const collected = this.lightningRain.checkCollection(this.cat.position, 2);
        if (collected) {
            this.score++;
            document.getElementById('score').textContent = this.score;
            this.lightningRain.removeCollected(collected);
            
            // Play collect sound
            window.game.sound.playCollectSound();
            
            // Screen flash effect
            this.renderer.toneMappingExposure = 2;
            setTimeout(() => {
                this.renderer.toneMappingExposure = 1.2;
            }, 100);
        }
        
        // Update environment
        if (this.environment) {
            this.environment.update(deltaTime);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = Math.min(this.clock.getDelta(), 0.1); // Cap delta time
        this.update(deltaTime);
        
        this.renderer.render(this.scene, this.camera);
    }
}