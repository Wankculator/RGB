import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Professional game inspired by sm64js and THREE-BasicThirdPersonGame
export class ProGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.score = 0;
        this.timeRemaining = 60;
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
        // Renderer with post-processing
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas,
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;
        
        // Scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.02);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        
        // Post-processing for glow effects
        this.setupPostProcessing();
        
        // Create game world
        this.createWorld();
        this.createCharacter();
        this.createLightningSystem();
        this.setupLighting();
        
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
        
        // Custom shader material
        this.groundMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                lightningPositions: { value: [] }
            },
            vertexShader: `
                varying vec3 vPosition;
                varying vec3 vNormal;
                varying vec2 vUv;
                
                void main() {
                    vPosition = position;
                    vNormal = normal;
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 lightningPositions[30];
                
                varying vec3 vPosition;
                varying vec3 vNormal;
                varying vec2 vUv;
                
                void main() {
                    // Base color
                    vec3 baseColor = vec3(0.02, 0.02, 0.02);
                    
                    // Grid effect
                    float gridSize = 4.0;
                    vec2 grid = abs(fract(vPosition.xy / gridSize - 0.5) - 0.5) / fwidth(vPosition.xy / gridSize);
                    float line = min(grid.x, grid.y);
                    float gridStrength = 1.0 - min(line, 1.0);
                    
                    // Lightning influence
                    vec3 lightningGlow = vec3(0.0);
                    for (int i = 0; i < 30; i++) {
                        float dist = distance(vPosition.xy, lightningPositions[i].xy);
                        float glow = exp(-dist * 0.3) * lightningPositions[i].z;
                        lightningGlow += vec3(1.0, 1.0, 0.0) * glow * 0.5;
                    }
                    
                    // Combine
                    vec3 gridColor = vec3(1.0, 1.0, 0.0) * gridStrength * 0.2;
                    vec3 finalColor = baseColor + gridColor + lightningGlow;
                    
                    // Distance fade
                    float fade = 1.0 - smoothstep(20.0, 80.0, length(vPosition.xy));
                    finalColor *= fade;
                    
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `
        });
        
        this.ground = new THREE.Mesh(groundGeometry, this.groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
        
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
            emissiveIntensity: 2,
            roughness: 0,
            metalness: 0.8,
            clearcoat: 1
        });
        
        // Create 30 lightning bolts
        for (let i = 0; i < 30; i++) {
            const bolt = new THREE.Mesh(boltGeometry, boltMaterial);
            bolt.position.set(
                (Math.random() - 0.5) * 100,
                Math.random() * 20 + 15,
                (Math.random() - 0.5) * 100
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
            const light = new THREE.PointLight(0xFFFF00, 2, 10);
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
        const positions = [];
        this.lightningBolts.forEach((bolt, i) => {
            if (i < 30 && !bolt.userData.collected) {
                positions.push(new THREE.Vector3(
                    bolt.position.x,
                    bolt.position.z,
                    bolt.userData.light.intensity / 10
                ));
            }
        });
        
        // Pad array to 30 elements
        while (positions.length < 30) {
            positions.push(new THREE.Vector3(0, 0, 0));
        }
        
        if (this.groundMaterial.uniforms.lightningPositions) {
            this.groundMaterial.uniforms.lightningPositions.value = positions;
        }
    }

    setupLighting() {
        // Ambient
        const ambient = new THREE.AmbientLight(0x202020, 0.5);
        this.scene.add(ambient);
        
        // Main directional light
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
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
        
        // Rim light
        const rimLight = new THREE.DirectionalLight(0x4444ff, 0.5);
        rimLight.position.set(-20, 20, -20);
        this.scene.add(rimLight);
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
            this.composer.setSize(window.innerWidth, window.innerHeight);
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
        this.timeRemaining = 60;
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
        const particleCount = 20;
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.1, 0.1),
                new THREE.MeshBasicMaterial({ color: 0xFFFF00 })
            );
            
            particle.position.copy(position);
            particle.position.y = this.groundY;
            
            const angle = (i / particleCount) * Math.PI * 2;
            particle.velocity = new THREE.Vector3(
                Math.cos(angle) * 5,
                Math.random() * 5 + 2,
                Math.sin(angle) * 5
            );
            
            particle.life = 1;
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
                bolt.userData.light.intensity = 2 + Math.sin(time * 3) * 0.5;
                
                // Update light position
                bolt.userData.light.position.copy(bolt.position);
                
                // Check collection
                const distance = this.characterPhysics.position.distanceTo(bolt.position);
                if (distance < 2) {
                    this.collectLightning(bolt);
                }
            }
        });
        
        // Update effects
        for (let i = this.collectedEffects.length - 1; i >= 0; i--) {
            const effect = this.collectedEffects[i];
            effect.position.add(effect.velocity.clone().multiplyScalar(deltaTime));
            effect.velocity.y -= 20 * deltaTime;
            effect.life -= deltaTime * 2;
            effect.scale.setScalar(effect.life);
            effect.material.opacity = effect.life;
            
            if (effect.life <= 0) {
                this.scene.remove(effect);
                this.collectedEffects.splice(i, 1);
            }
        }
        
        // Update ground shader
        this.updateLightningPositions();
    }

    collectLightning(bolt) {
        bolt.userData.collected = true;
        bolt.visible = false;
        bolt.userData.light.visible = false;
        
        this.score++;
        const scoreEl = document.getElementById('score');
        if (scoreEl) scoreEl.textContent = this.score;
        
        // Collection effect
        this.createCollectionEffect(bolt.position);
        
        // Play sound
        if (window.game && window.game.sound) {
            window.game.sound.playCollectSound();
        }
        
        // Respawn
        setTimeout(() => {
            bolt.userData.collected = false;
            bolt.visible = true;
            bolt.userData.light.visible = true;
            bolt.position.set(
                (Math.random() - 0.5) * 100,
                20 + Math.random() * 10,
                (Math.random() - 0.5) * 100
            );
            bolt.userData.fallSpeed = 3 + Math.random() * 2;
        }, 2000);
    }

    createCollectionEffect(position) {
        // Lightning burst
        const burstCount = 30;
        for (let i = 0; i < burstCount; i++) {
            const particle = new THREE.Mesh(
                new THREE.TetrahedronGeometry(0.2),
                new THREE.MeshBasicMaterial({ 
                    color: 0xFFFF00,
                    emissive: 0xFFFF00
                })
            );
            
            particle.position.copy(position);
            
            const angle = Math.random() * Math.PI * 2;
            const speed = 5 + Math.random() * 10;
            const upSpeed = Math.random() * 10 + 5;
            
            particle.velocity = new THREE.Vector3(
                Math.cos(angle) * speed,
                upSpeed,
                Math.sin(angle) * speed
            );
            
            particle.life = 1;
            particle.rotationSpeed = Math.random() * 10;
            
            this.scene.add(particle);
            this.collectedEffects.push(particle);
        }
        
        // Flash effect
        const flash = new THREE.PointLight(0xFFFF00, 50, 20);
        flash.position.copy(position);
        this.scene.add(flash);
        
        setTimeout(() => {
            this.scene.remove(flash);
        }, 100);
    }

    update(deltaTime) {
        if (!this.isPlaying) return;
        
        // Update systems
        this.updatePhysics(deltaTime);
        this.updateCharacterAnimation(deltaTime);
        this.updateCamera(deltaTime);
        this.updateLightning(deltaTime);
        
        // Update shader time
        if (this.groundMaterial.uniforms.time) {
            this.groundMaterial.uniforms.time.value += deltaTime;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = Math.min(this.clock.getDelta(), 0.1);
        this.update(deltaTime);
        
        // Render with post-processing
        this.composer.render();
    }
}