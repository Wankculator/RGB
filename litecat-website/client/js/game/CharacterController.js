import * as THREE from 'three';

export class CharacterController {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        
        // Character model
        this.model = null;
        this.mixer = null;
        this.animations = {};
        
        // Movement properties
        this.moveSpeed = 15;
        this.sprintSpeed = 25;
        this.jumpSpeed = 20;
        this.gravity = -50;
        
        // State
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.isJumping = false;
        this.isGrounded = true;
        this.isSprinting = false;
        
        // Controls
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.canJump = true;
        
        // Camera controls
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.minPolarAngle = 0;
        this.maxPolarAngle = Math.PI;
        
        // Input
        this.enabled = false;
        this.setupControls();
    }

    async loadModel() {
        // Create placeholder cat model
        const catGeometry = new THREE.BoxGeometry(1, 1, 2);
        const catMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x1a1a1a,
            emissive: 0x111111
        });
        
        this.model = new THREE.Group();
        
        // Body
        const body = new THREE.Mesh(catGeometry, catMaterial);
        body.castShadow = true;
        body.receiveShadow = true;
        this.model.add(body);
        
        // Head
        const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const head = new THREE.Mesh(headGeometry, catMaterial);
        head.position.set(0, 0.5, 0.8);
        head.castShadow = true;
        this.model.add(head);
        
        // Ears
        const earGeometry = new THREE.ConeGeometry(0.2, 0.4, 4);
        const ear1 = new THREE.Mesh(earGeometry, catMaterial);
        ear1.position.set(0.3, 1, 0.8);
        ear1.rotation.z = 0.3;
        this.model.add(ear1);
        
        const ear2 = new THREE.Mesh(earGeometry, catMaterial);
        ear2.position.set(-0.3, 1, 0.8);
        ear2.rotation.z = -0.3;
        this.model.add(ear2);
        
        // Tail
        const tailGeometry = new THREE.CylinderGeometry(0.1, 0.2, 1.5);
        const tail = new THREE.Mesh(tailGeometry, catMaterial);
        tail.position.set(0, 0.3, -1.2);
        tail.rotation.z = -0.5;
        this.model.add(tail);
        
        // Eyes (glowing)
        const eyeGeometry = new THREE.SphereGeometry(0.1);
        const eyeMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffeb3b,
            emissive: 0xffeb3b
        });
        
        const eye1 = new THREE.Mesh(eyeGeometry, eyeMaterial);
        eye1.position.set(0.2, 0.6, 1.2);
        this.model.add(eye1);
        
        const eye2 = new THREE.Mesh(eyeGeometry, eyeMaterial);
        eye2.position.set(-0.2, 0.6, 1.2);
        this.model.add(eye2);
        
        // Add lightning effect around cat
        const lightningAura = new THREE.PointLight(0xffeb3b, 0.5, 5);
        lightningAura.position.set(0, 1, 0);
        this.model.add(lightningAura);
        
        // Position model
        this.model.position.set(0, 1, 0);
        this.scene.add(this.model);
        
        // Setup camera follow
        this.cameraOffset = new THREE.Vector3(0, 5, 10);
    }

    setupControls() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (!this.enabled) return;
            
            switch (e.code) {
                case 'KeyW':
                case 'ArrowUp':
                    this.moveForward = true;
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    this.moveBackward = true;
                    break;
                case 'KeyA':
                case 'ArrowLeft':
                    this.moveLeft = true;
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    this.moveRight = true;
                    break;
                case 'Space':
                    if (this.canJump && this.isGrounded) {
                        this.velocity.y = this.jumpSpeed;
                        this.isJumping = true;
                        this.isGrounded = false;
                    }
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.isSprinting = true;
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            if (!this.enabled) return;
            
            switch (e.code) {
                case 'KeyW':
                case 'ArrowUp':
                    this.moveForward = false;
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    this.moveBackward = false;
                    break;
                case 'KeyA':
                case 'ArrowLeft':
                    this.moveLeft = false;
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    this.moveRight = false;
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.isSprinting = false;
                    break;
            }
        });

        // Mouse controls
        document.addEventListener('mousemove', (e) => {
            if (!this.enabled || !document.pointerLockElement) return;
            
            const movementX = e.movementX || 0;
            const movementY = e.movementY || 0;
            
            this.euler.y -= movementX * 0.002;
            this.euler.x -= movementY * 0.002;
            
            // Clamp vertical rotation
            this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
        });
    }

    update(deltaTime) {
        if (!this.enabled || !this.model) return;
        
        // Update velocity
        this.velocity.x -= this.velocity.x * 10.0 * deltaTime;
        this.velocity.z -= this.velocity.z * 10.0 * deltaTime;
        this.velocity.y += this.gravity * deltaTime;
        
        // Calculate movement direction
        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize();
        
        // Apply movement
        const speed = this.isSprinting ? this.sprintSpeed : this.moveSpeed;
        
        if (this.moveForward || this.moveBackward) {
            this.velocity.z -= this.direction.z * speed * deltaTime * 60;
        }
        if (this.moveLeft || this.moveRight) {
            this.velocity.x += this.direction.x * speed * deltaTime * 60;
        }
        
        // Apply rotation based on camera
        const moveDirection = new THREE.Vector3(this.velocity.x, 0, this.velocity.z);
        moveDirection.applyEuler(new THREE.Euler(0, this.euler.y, 0));
        
        // Update position
        this.model.position.x += moveDirection.x * deltaTime;
        this.model.position.z += moveDirection.z * deltaTime;
        this.model.position.y += this.velocity.y * deltaTime;
        
        // Ground check
        if (this.model.position.y <= 1) {
            this.model.position.y = 1;
            this.velocity.y = 0;
            this.isGrounded = true;
            this.isJumping = false;
        }
        
        // Rotate model to face movement direction
        if (moveDirection.length() > 0.1) {
            const angle = Math.atan2(moveDirection.x, moveDirection.z);
            this.model.rotation.y = angle;
        }
        
        // Update camera
        this.updateCamera();
        
        // Animate tail
        if (this.model.children[3]) { // tail
            this.model.children[3].rotation.z = -0.5 + Math.sin(Date.now() * 0.005) * 0.2;
        }
    }

    updateCamera() {
        // Third person camera
        const idealOffset = this.cameraOffset.clone();
        idealOffset.applyEuler(new THREE.Euler(this.euler.x, this.euler.y, 0));
        idealOffset.add(this.model.position);
        
        // Smooth camera movement
        this.camera.position.lerp(idealOffset, 0.1);
        
        // Look at character
        const lookAtPoint = this.model.position.clone();
        lookAtPoint.y += 2;
        this.camera.lookAt(lookAtPoint);
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.isSprinting = false;
    }

    getPosition() {
        return this.model ? this.model.position.clone() : new THREE.Vector3();
    }

    reset() {
        if (this.model) {
            this.model.position.set(0, 1, 0);
            this.velocity.set(0, 0, 0);
            this.euler.set(0, 0, 0);
        }
    }
}