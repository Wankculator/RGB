import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class LightCatCharacter {
    constructor() {
        this.group = new THREE.Group();
        this.mixer = null;
        this.animations = {};
        this.currentAction = null;
        
        // Colors from the logo
        this.colors = {
            black: 0x000000,
            yellow: 0xFFFF00,
            glowYellow: 0xFFFF00
        };
        
        this.createCharacter();
    }

    createCharacter() {
        // Create the character based on the logo design
        // Main body group
        const body = new THREE.Group();
        
        // Create black body with yellow outline effect
        const bodyGeometry = new THREE.CapsuleGeometry(1.2, 2, 8, 16);
        const blackMaterial = new THREE.MeshPhongMaterial({ 
            color: this.colors.black,
            emissive: this.colors.black,
            emissiveIntensity: 0.1,
            shininess: 100
        });
        
        // Main black body
        const bodyMesh = new THREE.Mesh(bodyGeometry, blackMaterial);
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        body.add(bodyMesh);
        
        // Yellow outline using a slightly larger mesh
        const outlineGeometry = new THREE.CapsuleGeometry(1.35, 2.2, 8, 16);
        const yellowOutlineMaterial = new THREE.MeshBasicMaterial({ 
            color: this.colors.yellow,
            side: THREE.BackSide
        });
        const outline = new THREE.Mesh(outlineGeometry, yellowOutlineMaterial);
        body.add(outline);
        
        // Head (rounded like the logo)
        const headGroup = new THREE.Group();
        const headGeometry = new THREE.SphereGeometry(1, 16, 16);
        headGeometry.scale(1.2, 1, 1);
        
        const headMesh = new THREE.Mesh(headGeometry, blackMaterial);
        headMesh.castShadow = true;
        headGroup.add(headMesh);
        
        // Head outline
        const headOutlineGeometry = new THREE.SphereGeometry(1.15, 16, 16);
        headOutlineGeometry.scale(1.2, 1, 1);
        const headOutline = new THREE.Mesh(headOutlineGeometry, yellowOutlineMaterial);
        headGroup.add(headOutline);
        
        headGroup.position.set(0, 2.5, 0);
        body.add(headGroup);
        
        // Cat ears (triangular like the logo)
        const earShape = new THREE.Shape();
        earShape.moveTo(0, 0);
        earShape.lineTo(-0.4, 0.8);
        earShape.lineTo(0.4, 0.8);
        earShape.closePath();
        
        const earExtrudeSettings = {
            depth: 0.2,
            bevelEnabled: true,
            bevelSegments: 2,
            steps: 1,
            bevelSize: 0.05,
            bevelThickness: 0.05
        };
        
        const earGeometry = new THREE.ExtrudeGeometry(earShape, earExtrudeSettings);
        
        // Left ear
        const leftEar = new THREE.Mesh(earGeometry, blackMaterial);
        leftEar.position.set(-0.6, 3.2, 0);
        leftEar.rotation.z = 0.2;
        body.add(leftEar);
        
        const leftEarOutline = new THREE.Mesh(earGeometry, yellowOutlineMaterial);
        leftEarOutline.position.copy(leftEar.position);
        leftEarOutline.rotation.copy(leftEar.rotation);
        leftEarOutline.scale.multiplyScalar(1.1);
        body.add(leftEarOutline);
        
        // Right ear
        const rightEar = new THREE.Mesh(earGeometry, blackMaterial);
        rightEar.position.set(0.6, 3.2, 0);
        rightEar.rotation.z = -0.2;
        body.add(rightEar);
        
        const rightEarOutline = new THREE.Mesh(earGeometry, yellowOutlineMaterial);
        rightEarOutline.position.copy(rightEar.position);
        rightEarOutline.rotation.copy(rightEar.rotation);
        rightEarOutline.scale.multiplyScalar(1.1);
        body.add(rightEarOutline);
        
        // Half-closed eyes (like the logo)
        const eyeShape = new THREE.Shape();
        eyeShape.moveTo(0, 0);
        eyeShape.quadraticCurveTo(0.3, -0.1, 0.6, 0);
        eyeShape.quadraticCurveTo(0.3, 0.3, 0, 0);
        
        const eyeGeometry = new THREE.ShapeGeometry(eyeShape);
        const eyeMaterial = new THREE.MeshBasicMaterial({ 
            color: this.colors.yellow,
            emissive: this.colors.glowYellow,
            emissiveIntensity: 1
        });
        
        // Left eye
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.4, 2.6, 1.05);
        leftEye.scale.set(0.8, 0.6, 1);
        body.add(leftEye);
        
        // Right eye
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.4, 2.6, 1.05);
        rightEye.scale.set(-0.8, 0.6, 1); // Flipped
        body.add(rightEye);
        
        // Arms (spread wide like the logo)
        const armGeometry = new THREE.CapsuleGeometry(0.3, 1.5, 6, 8);
        
        // Left arm
        const leftArm = new THREE.Mesh(armGeometry, blackMaterial);
        leftArm.position.set(-1.5, 1.5, 0);
        leftArm.rotation.z = Math.PI / 3;
        body.add(leftArm);
        
        const leftArmOutline = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.35, 1.6, 6, 8),
            yellowOutlineMaterial
        );
        leftArmOutline.position.copy(leftArm.position);
        leftArmOutline.rotation.copy(leftArm.rotation);
        body.add(leftArmOutline);
        
        // Right arm
        const rightArm = new THREE.Mesh(armGeometry, blackMaterial);
        rightArm.position.set(1.5, 1.5, 0);
        rightArm.rotation.z = -Math.PI / 3;
        body.add(rightArm);
        
        const rightArmOutline = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.35, 1.6, 6, 8),
            yellowOutlineMaterial
        );
        rightArmOutline.position.copy(rightArm.position);
        rightArmOutline.rotation.copy(rightArm.rotation);
        body.add(rightArmOutline);
        
        // Legs
        const legGeometry = new THREE.CapsuleGeometry(0.4, 1.2, 6, 8);
        
        // Left leg
        const leftLeg = new THREE.Mesh(legGeometry, blackMaterial);
        leftLeg.position.set(-0.5, -1.5, 0);
        body.add(leftLeg);
        
        const leftLegOutline = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.45, 1.3, 6, 8),
            yellowOutlineMaterial
        );
        leftLegOutline.position.copy(leftLeg.position);
        body.add(leftLegOutline);
        
        // Right leg
        const rightLeg = new THREE.Mesh(legGeometry, blackMaterial);
        rightLeg.position.set(0.5, -1.5, 0);
        body.add(rightLeg);
        
        const rightLegOutline = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.45, 1.3, 6, 8),
            yellowOutlineMaterial
        );
        rightLegOutline.position.copy(rightLeg.position);
        body.add(rightLegOutline);
        
        // Add glow effect
        const glowLight = new THREE.PointLight(this.colors.glowYellow, 1, 10);
        glowLight.position.set(0, 1, 0);
        body.add(glowLight);
        
        // Add rim lighting for outline effect
        const rimLight = new THREE.SpotLight(this.colors.yellow, 0.5, 10, Math.PI / 4, 0.5);
        rimLight.position.set(0, 3, 3);
        rimLight.target.position.set(0, 0, 0);
        body.add(rimLight);
        body.add(rimLight.target);
        
        // Store references for animation
        this.parts = {
            body: bodyMesh,
            head: headGroup,
            leftArm,
            rightArm,
            leftLeg,
            rightLeg,
            leftEye,
            rightEye,
            glowLight,
            outlines: {
                body: outline,
                head: headOutline,
                leftArm: leftArmOutline,
                rightArm: rightArmOutline,
                leftLeg: leftLegOutline,
                rightLeg: rightLegOutline
            }
        };
        
        this.group.add(body);
        
        // Add particle system for lightning effect
        this.createLightningParticles();
    }

    createLightningParticles() {
        const particleCount = 50;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 4;
            positions[i + 1] = Math.random() * 4;
            positions[i + 2] = (Math.random() - 0.5) * 4;
            
            colors[i] = 1; // R
            colors[i + 1] = 1; // G
            colors[i + 2] = 0; // B
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        this.particles = new THREE.Points(geometry, material);
        this.group.add(this.particles);
    }

    update(velocity, deltaTime, isGrounded) {
        const speed = velocity.length();
        const time = Date.now() * 0.001;
        
        // Update particle positions
        if (this.particles) {
            const positions = this.particles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] -= deltaTime * 2;
                if (positions[i + 1] < 0) {
                    positions[i] = (Math.random() - 0.5) * 4;
                    positions[i + 1] = 4;
                    positions[i + 2] = (Math.random() - 0.5) * 4;
                }
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
            this.particles.rotation.y += deltaTime * 0.5;
        }
        
        // Running animation
        if (speed > 0.1 && isGrounded) {
            // Animate legs
            const runSpeed = Math.min(speed / 15, 1) * 10;
            this.parts.leftLeg.rotation.x = Math.sin(time * runSpeed) * 0.5;
            this.parts.rightLeg.rotation.x = -Math.sin(time * runSpeed) * 0.5;
            this.parts.outlines.leftLeg.rotation.x = this.parts.leftLeg.rotation.x;
            this.parts.outlines.rightLeg.rotation.x = this.parts.rightLeg.rotation.x;
            
            // Animate arms
            this.parts.leftArm.rotation.x = -Math.sin(time * runSpeed) * 0.3;
            this.parts.rightArm.rotation.x = Math.sin(time * runSpeed) * 0.3;
            this.parts.outlines.leftArm.rotation.x = this.parts.leftArm.rotation.x;
            this.parts.outlines.rightArm.rotation.x = this.parts.rightArm.rotation.x;
            
            // Head bob
            this.parts.head.position.y = 2.5 + Math.sin(time * runSpeed * 2) * 0.05;
        } else if (!isGrounded) {
            // Jump pose
            this.parts.leftArm.rotation.z = Math.PI / 2;
            this.parts.rightArm.rotation.z = -Math.PI / 2;
            this.parts.leftLeg.rotation.x = -0.3;
            this.parts.rightLeg.rotation.x = 0.3;
        } else {
            // Idle animation
            this.parts.leftLeg.rotation.x *= 0.9;
            this.parts.rightLeg.rotation.x *= 0.9;
            this.parts.leftArm.rotation.x *= 0.9;
            this.parts.rightArm.rotation.x *= 0.9;
            
            // Return arms to spread position
            this.parts.leftArm.rotation.z = THREE.MathUtils.lerp(this.parts.leftArm.rotation.z, Math.PI / 3, deltaTime * 5);
            this.parts.rightArm.rotation.z = THREE.MathUtils.lerp(this.parts.rightArm.rotation.z, -Math.PI / 3, deltaTime * 5);
            
            // Breathing effect
            const breathScale = 1 + Math.sin(time * 2) * 0.02;
            this.parts.body.scale.set(breathScale, breathScale, breathScale);
            this.parts.outlines.body.scale.set(breathScale * 1.1, breathScale * 1.1, breathScale * 1.1);
            
            // Idle head movement
            this.parts.head.position.y = 2.5 + Math.sin(time * 2) * 0.02;
        }
        
        // Eye blink
        if (Math.random() < 0.002) {
            this.parts.leftEye.scale.y = 0.1;
            this.parts.rightEye.scale.y = 0.1;
            setTimeout(() => {
                this.parts.leftEye.scale.y = 0.6;
                this.parts.rightEye.scale.y = 0.6;
            }, 100);
        }
        
        // Glow pulsing
        this.parts.glowLight.intensity = 0.8 + Math.sin(time * 3) * 0.2;
    }

    getMesh() {
        return this.group;
    }
}