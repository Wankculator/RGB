import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Professional game inspired by sm64js and THREE-BasicThirdPersonGame
export class ProGame {
    constructor(canvas) {
        if (!canvas) {
            throw new Error('Canvas element is required');
        }
        this.canvas = canvas;
        this.score = 0;
        this.timeRemaining = 30;
        this.isPlaying = false;
        
        // Physics constants (Mario 64 style)
        this.physics = {
            gravity: -32,
            jumpPower: 18,
            walkSpeed: 8,
            runSpeed: 16,
            airControl: 0.3,
            groundFriction: 0.89,
            airFriction: 0.98,
            maxVelocity: 40,
            groundAccel: 0.8,
            airAccel: 0.3
        };
        
        this.init();
    }

    init() {
        try {
            // Check if mobile
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            // Renderer with mobile-friendly settings
            this.renderer = new THREE.WebGLRenderer({ 
                canvas: this.canvas,
                antialias: !isMobile,
                powerPreference: isMobile ? "low-power" : "high-performance",
                alpha: false,
                stencil: false,
                depth: true,
                preserveDrawingBuffer: true,
                failIfMajorPerformanceCaveat: false
            });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2)); // Lower pixel ratio on mobile
            this.renderer.shadowMap.enabled = !isMobile; // Disable shadows on mobile
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1;
            
            // Scene
            this.scene = new THREE.Scene();
            this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.008); // Lighter fog, less dense
            
            // Camera
            this.camera = new THREE.PerspectiveCamera(
                60,
                window.innerWidth / window.innerHeight,
                0.1,
                1000
            );
            
            // Post-processing for glow effects (desktop only)
            this.usePostProcessing = !isMobile;
            if (this.usePostProcessing) {
                try {
                    this.setupPostProcessing();
                } catch (e) {
                    console.warn('Post-processing disabled:', e);
                    this.usePostProcessing = false;
                }
            }
            
            // Create game world
            this.createWorld();
            this.createCharacter();
            this.createLightningSystem();
            this.setupLighting();
            
            
        } catch (error) {
            console.error('ProGame init error:', error);
            throw error;
        }
        
        // Input system
        this.input = {
            keys: {},
            mouse: { x: 0, y: 0, deltaX: 0, deltaY: 0 },
            isPointerLocked: false,
            touch: { x: 0, y: 0, active: false },
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        };
        
        // Camera controller
        this.cameraController = {
            distance: 15,
            height: 8,
            angle: 0,
            verticalAngle: -0.3,
            smoothness: 0.1
        };
        
        this.setupControls();
        if (this.input.isMobile) {
            this.setupMobileControls();
        }
        
        // Game loop
        this.clock = new THREE.Clock();
        this.animate();
    }

    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        
        // Bloom for glow effects
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.8, // strength
            0.4, // radius
            0.85  // threshold
        );
        this.composer.addPass(this.bloomPass);
    }

    createGridTexture() {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, size, size);
        
        // Grid lines - yellow for visibility
        ctx.strokeStyle = '#333344';
        ctx.lineWidth = 2;
        
        // Add some glow effect to grid
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 2;
        
        const gridSize = 32;
        for (let i = 0; i <= size; i += gridSize) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, size);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(size, i);
            ctx.stroke();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(10, 10);
        
        return texture;
    }

    createBoundaryWalls() {
        const boundarySize = 80;
        const wallHeight = 20;
        const wallMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFF00,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide
        });
        
        // Create boundary lines on the ground
        const edgeGeometry = new THREE.EdgesGeometry(
            new THREE.BoxGeometry(boundarySize * 2, 0.1, boundarySize * 2)
        );
        const edgeMaterial = new THREE.LineBasicMaterial({ 
            color: 0xFFFF00,
            opacity: 0.5,
            transparent: true
        });
        const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        edgeLines.position.y = 0.1;
        this.scene.add(edgeLines);
        
        // Add corner markers
        const markerGeometry = new THREE.ConeGeometry(1, 3, 4);
        const markerMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFF00,
            emissive: 0xFFFF00,
            emissiveIntensity: 0.5
        });
        
        const corners = [
            [-boundarySize, 0, -boundarySize],
            [boundarySize, 0, -boundarySize],
            [boundarySize, 0, boundarySize],
            [-boundarySize, 0, boundarySize]
        ];
        
        corners.forEach(pos => {
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.set(pos[0], pos[1] + 1.5, pos[2]);
            marker.rotation.z = Math.PI;
            this.scene.add(marker);
        });
    }

    createWorld() {
        // Professional ground with custom shader
        const groundSize = 200;
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 100, 100);
        
        // Vertex displacement for terrain
        const vertices = groundGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            const distance = Math.sqrt(x * x + y * y);
            vertices[i + 2] = Math.sin(distance * 0.05) * 0.5 * Math.max(0, 1 - distance / 50);
        }
        groundGeometry.computeVertexNormals();
        
        // Brighter ground material
        this.groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            roughness: 0.8,
            metalness: 0.2,
            envMapIntensity: 0.5
        });
        
        // Add grid texture
        const gridTexture = this.createGridTexture();
        this.groundMaterial.map = gridTexture;
        this.groundMaterial.emissive = new THREE.Color(0x222233);
        this.groundMaterial.emissiveIntensity = 0.3;
        
        this.ground = new THREE.Mesh(groundGeometry, this.groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
        
        // Add boundary walls (invisible)
        this.createBoundaryWalls();
        
        // Collision plane for physics
        this.groundY = 0;
    }

    createCharacter() {
        // Professional cat character with physics
        const catGroup = new THREE.Group();
        
        // Body
        const bodyGeometry = new THREE.CapsuleGeometry(0.8, 1.5, 8, 16);
        const bodyMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x000000,
            roughness: 0.8,
            metalness: 0.2,
            clearcoat: 1,
            clearcoatRoughness: 0
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        catGroup.add(body);
        
        // Head
        const headGeometry = new THREE.SphereGeometry(0.7, 16, 16);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.y = 1.5;
        head.scale.set(1.1, 0.9, 1);
        head.castShadow = true;
        catGroup.add(head);
        
        // Ears
        const earGeometry = new THREE.ConeGeometry(0.3, 0.6, 4);
        const leftEar = new THREE.Mesh(earGeometry, bodyMaterial);
        leftEar.position.set(-0.4, 2.1, 0);
        leftEar.rotation.z = -0.3;
        catGroup.add(leftEar);
        
        const rightEar = new THREE.Mesh(earGeometry, bodyMaterial);
        rightEar.position.set(0.4, 2.1, 0);
        rightEar.rotation.z = 0.3;
        catGroup.add(rightEar);
        
        // Glowing eyes
        const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFF00,
            emissive: 0xFFFF00,
            emissiveIntensity: 2
        });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.25, 1.6, 0.6);
        catGroup.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.25, 1.6, 0.6);
        catGroup.add(rightEye);
        
        // Yellow outline using second mesh
        const outlineGroup = new THREE.Group();
        const outlineMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFF00,
            side: THREE.BackSide
        });
        
        const bodyOutline = new THREE.Mesh(bodyGeometry, outlineMaterial);
        bodyOutline.scale.multiplyScalar(1.05);
        outlineGroup.add(bodyOutline);
        
        const headOutline = new THREE.Mesh(headGeometry, outlineMaterial);
        headOutline.position.copy(head.position);
        headOutline.scale.multiplyScalar(1.05);
        outlineGroup.add(headOutline);
        
        catGroup.add(outlineGroup);
        
        // Add glow light
        const catGlow = new THREE.PointLight(0xFFFF00, 1, 10);
        catGlow.position.y = 1;
        catGroup.add(catGlow);
        
        this.character = catGroup;
        this.character.position.set(0, 1, 0);
        this.scene.add(this.character);
        
        // Physics state
        this.characterPhysics = {
            position: new THREE.Vector3(0, 1, 0),
            velocity: new THREE.Vector3(0, 0, 0),
            isGrounded: false,
            jumpCount: 0,
            canDoubleJump: true,
            rotation: 0,
            targetRotation: 0
        };
        
        // Animation state
        this.characterAnimation = {
            runCycle: 0,
            jumpSquash: 1,
            landSquash: 1
        };
    }

    createLightningSystem() {
        this.lightningBolts = [];
        this.lightningParticles = [];
        this.collectedEffects = [];
        
        // Lightning bolt mesh
        const boltGeometry = new THREE.ConeGeometry(0.3, 1.5, 6);
        const boltMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xFFFF00,
            emissive: 0xFFFF00,
            emissiveIntensity: 3, // Brighter emission
            roughness: 0,
            metalness: 0.8,
            clearcoat: 1,
            transparent: true,
            opacity: 0.9
        });
        
        // Create 20 lightning bolts for better performance
        for (let i = 0; i < 20; i++) {
            const bolt = new THREE.Mesh(boltGeometry, boltMaterial);
            bolt.position.set(
                (Math.random() - 0.5) * 60,  // Closer spawn radius
                Math.random() * 15 + 10,     // Lower height range
                (Math.random() - 0.5) * 60
            );
            bolt.rotation.z = Math.PI;
            bolt.castShadow = true;
            
            // Inner glow mesh
            const glowGeometry = new THREE.SphereGeometry(1, 8, 8);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0xFFFF00,
                transparent: true,
                opacity: 0.3
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            bolt.add(glow);
            
            // Point light
            const light = new THREE.PointLight(0xFFFF00, 3, 15); // Brighter and larger radius
            light.position.copy(bolt.position);
            this.scene.add(light);
            
            bolt.userData = {
                light: light,
                glow: glow,
                originalY: bolt.position.y,
                fallSpeed: 3 + Math.random() * 2,
                rotationSpeed: 2 + Math.random() * 2,
                floatOffset: Math.random() * Math.PI * 2,
                collected: false
            };
            
            this.scene.add(bolt);
            this.lightningBolts.push(bolt);
        }
        
        // Update ground shader uniforms
        this.updateLightningPositions();
    }

    updateLightningPositions() {
        // Skip every other frame for performance
        this.frameCount = (this.frameCount || 0) + 1;
        if (this.frameCount % 2 !== 0) return;
        
        const positions = [];
        let count = 0;
        for (let i = 0; i < this.lightningBolts.length && count < 20; i++) {
            const bolt = this.lightningBolts[i];
            if (!bolt.userData.collected) {
                positions.push(new THREE.Vector3(
                    bolt.position.x,
                    bolt.position.z,
                    bolt.userData.light.intensity / 10
                ));
                count++;
            }
        }
        
        // Shader updates disabled - using simple material instead
        // while (positions.length < 30) {
        //     positions.push(new THREE.Vector3(0, 0, 0));
        // }
        
        // if (this.groundMaterial.uniforms.lightningPositions) {
        //     this.groundMaterial.uniforms.lightningPositions.value = positions;
        // }
    }

    setupLighting() {
        // Brighter ambient light
        const ambient = new THREE.AmbientLight(0x404040, 1.5);
        this.scene.add(ambient);
        
        // Main directional light - brighter
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(20, 30, 10);
        dirLight.castShadow = true;
        dirLight.shadow.camera.left = -50;
        dirLight.shadow.camera.right = 50;
        dirLight.shadow.camera.top = 50;
        dirLight.shadow.camera.bottom = -50;
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 100;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);
        
        // Rim light - yellow tint for better visibility
        const rimLight = new THREE.DirectionalLight(0xFFFF44, 0.8);
        rimLight.position.set(-20, 20, -20);
        this.scene.add(rimLight);
        
        // Add hemisphere light for better overall illumination
        const hemiLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
        this.scene.add(hemiLight);
    }

    setupControls() {
        // Keyboard
        document.addEventListener('keydown', (e) => {
            this.input.keys[e.code] = true;
            
            // Jump on press
            if (e.code === 'Space' && this.isPlaying) {
                this.jump();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.input.keys[e.code] = false;
        });
        
        // Mouse (desktop only)
        if (!this.input.isMobile) {
            this.canvas.addEventListener('click', () => {
                if (this.isPlaying && !this.input.isPointerLocked) {
                    this.canvas.requestPointerLock();
                }
            });
        }
        
        document.addEventListener('pointerlockchange', () => {
            this.input.isPointerLocked = document.pointerLockElement === this.canvas;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.input.isPointerLocked) {
                this.input.mouse.deltaX = e.movementX;
                this.input.mouse.deltaY = e.movementY;
            }
        });
        
        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            if (this.composer) {
                this.composer.setSize(window.innerWidth, window.innerHeight);
            }
        });
    }

    setupMobileControls() {
        const joystick = document.getElementById('mobile-joystick');
        const handle = document.getElementById('joystick-handle');
        const jumpBtn = document.getElementById('mobile-jump');
        
        if (!joystick || !handle || !jumpBtn) return;
        
        let joystickActive = false;
        let joystickCenter = { x: 60, y: 60 };
        const maxDistance = 50;
        
        // Joystick controls
        const handleTouch = (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = joystick.getBoundingClientRect();
            const x = touch.clientX - rect.left - joystickCenter.x;
            const y = touch.clientY - rect.top - joystickCenter.y;
            
            const distance = Math.sqrt(x * x + y * y);
            const angle = Math.atan2(y, x);
            
            const clampedDistance = Math.min(distance, maxDistance);
            const clampedX = Math.cos(angle) * clampedDistance;
            const clampedY = Math.sin(angle) * clampedDistance;
            
            handle.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
            
            // Convert to movement
            this.input.touch.x = clampedX / maxDistance;
            this.input.touch.y = clampedY / maxDistance;
            this.input.touch.active = true;
        };
        
        joystick.addEventListener('touchstart', (e) => {
            joystickActive = true;
            handleTouch(e);
        });
        
        joystick.addEventListener('touchmove', (e) => {
            if (joystickActive) handleTouch(e);
        });
        
        joystick.addEventListener('touchend', () => {
            joystickActive = false;
            handle.style.transform = 'translate(0, 0)';
            this.input.touch.x = 0;
            this.input.touch.y = 0;
            this.input.touch.active = false;
        });
        
        // Jump button
        jumpBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.jump();
        });
        
        // Prevent touch scrolling on game
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
    }

    jump() {
        const physics = this.characterPhysics;
        
        // Ground jump
        if (physics.isGrounded) {
            physics.velocity.y = this.physics.jumpPower;
            physics.isGrounded = false;
            physics.jumpCount = 1;
            this.playJumpSound();
            
            // Jump squash animation
            this.characterAnimation.jumpSquash = 0.7;
        }
        // Double jump
        else if (physics.canDoubleJump && physics.jumpCount === 1) {
            physics.velocity.y = this.physics.jumpPower * 0.8;
            physics.jumpCount = 2;
            physics.canDoubleJump = false;
            this.playDoubleJumpSound();
            
            // Spin animation for double jump
            this.character.rotation.y += Math.PI * 2;
        }
    }

    playJumpSound() {
        if (window.game && window.game.sound) {
            window.game.sound.playJumpSound();
        }
    }

    playDoubleJumpSound() {
        // Higher pitched jump sound
        if (window.game && window.game.sound) {
            const sound = window.game.sound;
            const originalFreq = 200;
            sound.audioContext.resume().then(() => {
                const osc = sound.audioContext.createOscillator();
                const gain = sound.audioContext.createGain();
                osc.connect(gain);
                gain.connect(sound.audioContext.destination);
                osc.frequency.setValueAtTime(originalFreq * 1.5, sound.audioContext.currentTime);
                osc.frequency.exponentialRampToValueAtTime(originalFreq * 2, sound.audioContext.currentTime + 0.1);
                gain.gain.setValueAtTime(0.1, sound.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, sound.audioContext.currentTime + 0.1);
                osc.start(sound.audioContext.currentTime);
                osc.stop(sound.audioContext.currentTime + 0.1);
            });
        }
    }

    start() {
        this.isPlaying = true;
        this.score = 0;
        this.timeRemaining = 30;
        this.characterPhysics.position.set(0, 1, 0);
        this.characterPhysics.velocity.set(0, 0, 0);
        
        // Reset lightning
        this.lightningBolts.forEach(bolt => {
            bolt.userData.collected = false;
            bolt.visible = true;
            bolt.userData.light.visible = true;
            bolt.position.y = bolt.userData.originalY;
        });
        
        // Lock pointer (only on desktop)
        if (!this.input.isMobile) {
            this.canvas.requestPointerLock();
        }
        
        // Start timer
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            const timerEl = document.getElementById('timer');
            if (timerEl) timerEl.textContent = this.timeRemaining;
            
            if (this.timeRemaining <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    endGame() {
        this.isPlaying = false;
        clearInterval(this.timerInterval);
        document.exitPointerLock();
        if (window.game && window.game.endGame) {
            window.game.endGame();
        }
    }

    updatePhysics(deltaTime) {
        const physics = this.characterPhysics;
        const input = this.input;
        
        // Get input vector
        let moveX = 0;
        let moveZ = 0;
        
        // Keyboard input
        if (input.keys['KeyW'] || input.keys['ArrowUp']) moveZ -= 1;
        if (input.keys['KeyS'] || input.keys['ArrowDown']) moveZ += 1;
        if (input.keys['KeyA'] || input.keys['ArrowLeft']) moveX -= 1;
        if (input.keys['KeyD'] || input.keys['ArrowRight']) moveX += 1;
        
        // Mobile touch input
        if (input.touch.active) {
            moveX = input.touch.x;
            moveZ = input.touch.y;
        }
        
        // Normalize movement
        const moveLength = Math.sqrt(moveX * moveX + moveZ * moveZ);
        if (moveLength > 0) {
            moveX /= moveLength;
            moveZ /= moveLength;
        }
        
        // Apply camera-relative movement
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0;
        cameraDirection.normalize();
        
        const cameraRight = new THREE.Vector3();
        cameraRight.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));
        
        const moveDirection = new THREE.Vector3();
        moveDirection.addScaledVector(cameraRight, moveX);
        moveDirection.addScaledVector(cameraDirection, -moveZ);
        
        // Apply acceleration
        const speed = input.keys['ShiftLeft'] ? this.physics.runSpeed : this.physics.walkSpeed;
        const accel = physics.isGrounded ? this.physics.groundAccel : this.physics.airAccel;
        
        physics.velocity.x += moveDirection.x * speed * accel;
        physics.velocity.z += moveDirection.z * speed * accel;
        
        // Apply friction
        const friction = physics.isGrounded ? this.physics.groundFriction : this.physics.airFriction;
        physics.velocity.x *= friction;
        physics.velocity.z *= friction;
        
        // Apply gravity
        physics.velocity.y += this.physics.gravity * deltaTime;
        
        // Limit velocity
        const horizontalVel = new THREE.Vector2(physics.velocity.x, physics.velocity.z);
        if (horizontalVel.length() > this.physics.maxVelocity) {
            horizontalVel.normalize().multiplyScalar(this.physics.maxVelocity);
            physics.velocity.x = horizontalVel.x;
            physics.velocity.z = horizontalVel.y;
        }
        
        // Update position
        physics.position.add(physics.velocity.clone().multiplyScalar(deltaTime));
        
        // Apply boundaries (keep player within game area)
        const boundarySize = 80; // Half the ground size
        physics.position.x = THREE.MathUtils.clamp(physics.position.x, -boundarySize, boundarySize);
        physics.position.z = THREE.MathUtils.clamp(physics.position.z, -boundarySize, boundarySize);
        
        // Ground collision
        if (physics.position.y <= this.groundY + 1) {
            physics.position.y = this.groundY + 1;
            
            if (!physics.isGrounded && physics.velocity.y < 0) {
                // Landing
                physics.isGrounded = true;
                physics.jumpCount = 0;
                physics.canDoubleJump = true;
                this.characterAnimation.landSquash = 0.6;
                
                // Landing particles
                this.createLandingEffect(physics.position);
            }
            
            physics.velocity.y = 0;
        } else {
            physics.isGrounded = false;
        }
        
        // Update rotation
        if (moveDirection.length() > 0.1) {
            physics.targetRotation = Math.atan2(moveDirection.x, moveDirection.z);
        }
        physics.rotation = THREE.MathUtils.lerp(physics.rotation, physics.targetRotation, 0.2);
        
        // Apply to mesh
        this.character.position.copy(physics.position);
        this.character.rotation.y = physics.rotation;
    }

    createLandingEffect(position) {
        const particleCount = 6;
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 0.08, 0.08),
                new THREE.MeshBasicMaterial({ 
                    color: 0xFFFF00,
                    transparent: true,
                    opacity: 0.7
                })
            );
            
            particle.position.copy(position);
            particle.position.y = this.groundY;
            
            const angle = (i / particleCount) * Math.PI * 2;
            particle.velocity = new THREE.Vector3(
                Math.cos(angle) * 3,
                Math.random() * 3 + 1,
                Math.sin(angle) * 3
            );
            
            particle.life = 0.6;
            this.scene.add(particle);
            this.collectedEffects.push(particle);
        }
    }

    updateCharacterAnimation(deltaTime) {
        const anim = this.characterAnimation;
        const physics = this.characterPhysics;
        const speed = physics.velocity.length();
        
        // Running animation
        if (physics.isGrounded && speed > 0.5) {
            anim.runCycle += speed * deltaTime * 0.5;
            this.character.position.y = physics.position.y + Math.abs(Math.sin(anim.runCycle)) * 0.1;
            
            // Slight rotation during run
            this.character.rotation.z = Math.sin(anim.runCycle) * 0.05;
        }
        
        // Jump/land squash
        anim.jumpSquash = THREE.MathUtils.lerp(anim.jumpSquash, 1, 0.2);
        anim.landSquash = THREE.MathUtils.lerp(anim.landSquash, 1, 0.2);
        
        const squash = anim.jumpSquash * anim.landSquash;
        this.character.scale.y = squash;
        this.character.scale.x = 2 - squash;
        this.character.scale.z = 2 - squash;
    }

    updateCamera(deltaTime) {
        const cam = this.cameraController;
        
        // Update camera angle from mouse
        if (this.input.isPointerLocked) {
            cam.angle -= this.input.mouse.deltaX * 0.002;
            cam.verticalAngle -= this.input.mouse.deltaY * 0.002;
            cam.verticalAngle = Math.max(-Math.PI / 3, Math.min(Math.PI / 6, cam.verticalAngle));
            
            this.input.mouse.deltaX = 0;
            this.input.mouse.deltaY = 0;
        }
        
        // Calculate camera position
        const idealPosition = new THREE.Vector3(
            Math.sin(cam.angle) * cam.distance,
            cam.height,
            Math.cos(cam.angle) * cam.distance
        );
        
        // Apply vertical angle
        idealPosition.y = cam.height + Math.sin(cam.verticalAngle) * cam.distance;
        const horizontalDistance = Math.cos(cam.verticalAngle) * cam.distance;
        idealPosition.x = Math.sin(cam.angle) * horizontalDistance;
        idealPosition.z = Math.cos(cam.angle) * horizontalDistance;
        
        idealPosition.add(this.characterPhysics.position);
        
        // Smooth camera movement
        this.camera.position.lerp(idealPosition, cam.smoothness);
        
        // Look at character
        const lookTarget = this.characterPhysics.position.clone();
        lookTarget.y += 2;
        this.camera.lookAt(lookTarget);
    }

    updateLightning(deltaTime) {
        const time = Date.now() * 0.001;
        
        this.lightningBolts.forEach(bolt => {
            if (!bolt.userData.collected) {
                // Fall
                bolt.position.y -= bolt.userData.fallSpeed * deltaTime;
                
                // Rotation
                bolt.rotation.y += bolt.userData.rotationSpeed * deltaTime;
                bolt.rotation.x = Math.sin(time * 2 + bolt.userData.floatOffset) * 0.2;
                
                // Float effect when close to ground
                if (bolt.position.y < 5) {
                    bolt.position.y = 2 + Math.sin(time * 3 + bolt.userData.floatOffset) * 0.5;
                    bolt.userData.fallSpeed = 0;
                }
                
                // Update glow
                bolt.userData.glow.scale.setScalar(1 + Math.sin(time * 5) * 0.2);
                bolt.userData.light.intensity = 3 + Math.sin(time * 3) * 0.5;
                
                // Update light position
                bolt.userData.light.position.copy(bolt.position);
                
                // Check collection with larger radius for better gameplay
                const dx = this.characterPhysics.position.x - bolt.position.x;
                const dy = this.characterPhysics.position.y - bolt.position.y;
                const dz = this.characterPhysics.position.z - bolt.position.z;
                const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
                
                // Larger collection radius for better gameplay
                if (distance < 3) {
                    this.collectLightning(bolt);
                }
            }
        });
        
        // Update collection effects
        for (let i = this.collectedEffects.length - 1; i >= 0; i--) {
            const effect = this.collectedEffects[i];
            
            // Update position with velocity
            if (effect.velocity) {
                effect.position.x += effect.velocity.x * deltaTime;
                effect.position.y += effect.velocity.y * deltaTime;
                effect.position.z += effect.velocity.z * deltaTime;
                effect.velocity.y -= 15 * deltaTime; // Gravity
            }
            
            // Update life and appearance
            effect.life -= deltaTime * 2;
            
            if (effect.life > 0) {
                const scale = effect.life;
                effect.scale.set(scale, scale, scale);
                if (effect.material && effect.material.opacity !== undefined) {
                    effect.material.opacity = effect.life;
                }
            } else {
                // Remove expired effect
                this.scene.remove(effect);
                if (effect.geometry) effect.geometry.dispose();
                if (effect.material) effect.material.dispose();
                this.collectedEffects.splice(i, 1);
            }
        }
        
        // Disabled ground shader updates for performance
        // this.updateLightningPositions();
    }

    collectLightning(bolt) {
        // Prevent double collection
        if (bolt.userData.collected) return;
        
        // Mark as collected and hide immediately
        bolt.userData.collected = true;
        bolt.visible = false;
        bolt.userData.light.visible = false;
        
        // Update score
        this.score++;
        const scoreEl = document.getElementById('score');
        if (scoreEl) scoreEl.textContent = this.score;
        
        // Visual feedback
        this.createCollectionEffect(bolt.position);
        
        // Play sound using the pre-created sound manager
        if (window.game && window.game.sound) {
            window.game.sound.playCollectSound();
        }
        
        // Schedule respawn
        setTimeout(() => {
            bolt.userData.collected = false;
            bolt.visible = true;
            bolt.userData.light.visible = true;
            bolt.position.set(
                (Math.random() - 0.5) * 60,
                15 + Math.random() * 10,
                (Math.random() - 0.5) * 60
            );
            bolt.userData.fallSpeed = 3 + Math.random() * 2;
        }, 2000);
    }

    flashCatEyes() {
        // Simple flash effect without searching for eyes
        if (!this.character || !this.character.children) return;
        
        // Flash the cat's glow light instead of searching for eyes
        const catGlow = this.character.children.find(child => child.isLight);
        if (catGlow) {
            const originalIntensity = catGlow.intensity;
            catGlow.intensity = 3;
            setTimeout(() => {
                catGlow.intensity = originalIntensity;
            }, 100);
        }
    }

    createSimpleCollectionEffect(position) {
        // Flash the cat's eyes for instant feedback
        if (this.character) {
            const eyes = this.character.children.filter(child => 
                child.material && child.material.emissive
            );
            
            eyes.forEach(eye => {
                if (eye.material) {
                    const originalIntensity = eye.material.emissiveIntensity || 2;
                    eye.material.emissiveIntensity = 5;
                    
                    setTimeout(() => {
                        if (eye.material) {
                            eye.material.emissiveIntensity = originalIntensity;
                        }
                    }, 150);
                }
            });
        }
        
        // Add a simple particle to the effect pool without creating new geometry
        if (this.collectedEffects.length < 5) {
            const effect = {
                position: position.clone(),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 3,
                    Math.random() * 5 + 2,
                    (Math.random() - 0.5) * 3
                ),
                life: 0.5,
                scale: new THREE.Vector3(1, 1, 1)
            };
            this.collectedEffects.push(effect);
        }
    }

    createCollectionEffect(position) {
        // Reduced particle count for better performance
        const burstCount = 8;
        for (let i = 0; i < burstCount; i++) {
            const particle = new THREE.Mesh(
                new THREE.TetrahedronGeometry(0.15),
                new THREE.MeshBasicMaterial({ 
                    color: 0xFFFF00,
                    transparent: true,
                    opacity: 0.8
                })
            );
            
            particle.position.copy(position);
            
            const angle = (i / burstCount) * Math.PI * 2;
            const speed = 3 + Math.random() * 5;
            const upSpeed = Math.random() * 5 + 3;
            
            particle.velocity = new THREE.Vector3(
                Math.cos(angle) * speed,
                upSpeed,
                Math.sin(angle) * speed
            );
            
            particle.life = 0.8;
            particle.rotationSpeed = Math.random() * 5;
            
            this.scene.add(particle);
            this.collectedEffects.push(particle);
        }
        
        // Softer flash effect
        const flash = new THREE.PointLight(0xFFFF00, 20, 15);
        flash.position.copy(position);
        this.scene.add(flash);
        
        // Fade out flash
        let intensity = 20;
        const fadeInterval = setInterval(() => {
            intensity -= 4;
            flash.intensity = intensity;
            if (intensity <= 0) {
                clearInterval(fadeInterval);
                this.scene.remove(flash);
            }
        }, 20);
    }

    update(deltaTime) {
        if (!this.isPlaying) return;
        
        // Update systems
        this.updatePhysics(deltaTime);
        this.updateCharacterAnimation(deltaTime);
        this.updateCamera(deltaTime);
        this.updateLightning(deltaTime);
        
        // Shader updates disabled for performance
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = Math.min(this.clock.getDelta(), 0.1);
        this.update(deltaTime);
        
        // Render with or without post-processing based on device
        if (this.usePostProcessing && this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
}