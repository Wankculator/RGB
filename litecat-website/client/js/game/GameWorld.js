import * as THREE from 'three';

export class GameWorld {
    constructor(scene) {
        this.scene = scene;
        this.collectEffects = [];
    }

    async create() {
        // Create ground
        const groundGeometry = new THREE.PlaneGeometry(200, 200, 50, 50);
        const groundMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x1a1a1a,
            emissive: 0x0a0a0a,
            wireframe: false
        });
        
        // Add displacement for terrain
        const vertices = groundGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i + 2] = Math.random() * 0.5;
        }
        groundGeometry.computeVertexNormals();
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Add grid overlay
        const gridHelper = new THREE.GridHelper(200, 100, 0xffeb3b, 0x444444);
        gridHelper.position.y = 0.1;
        this.scene.add(gridHelper);
        
        // Create obstacles/buildings
        this.createBuildings();
        
        // Create particle system for ambiance
        this.createParticles();
        
        // Create skybox
        this.createSkybox();
    }

    createBuildings() {
        const buildingMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x2a2a2a,
            emissive: 0x111111
        });
        
        // Create random buildings
        for (let i = 0; i < 20; i++) {
            const width = 5 + Math.random() * 10;
            const height = 10 + Math.random() * 30;
            const depth = 5 + Math.random() * 10;
            
            const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
            const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
            
            building.position.x = (Math.random() - 0.5) * 150;
            building.position.z = (Math.random() - 0.5) * 150;
            building.position.y = height / 2;
            
            building.castShadow = true;
            building.receiveShadow = true;
            
            // Add glowing windows
            const windowCount = Math.floor(height / 3);
            for (let j = 0; j < windowCount; j++) {
                const windowLight = new THREE.PointLight(0xffeb3b, 0.2, 10);
                windowLight.position.set(
                    building.position.x + (Math.random() - 0.5) * width,
                    building.position.y - height/2 + j * 3 + 2,
                    building.position.z + (Math.random() - 0.5) * depth
                );
                this.scene.add(windowLight);
            }
            
            this.scene.add(building);
        }
        
        // Create central tower
        const towerGeometry = new THREE.CylinderGeometry(8, 10, 50, 8);
        const towerMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x3a3a3a,
            emissive: 0x1a1a1a
        });
        const tower = new THREE.Mesh(towerGeometry, towerMaterial);
        tower.position.y = 25;
        tower.castShadow = true;
        tower.receiveShadow = true;
        this.scene.add(tower);
        
        // Add beacon light on tower
        const beaconLight = new THREE.SpotLight(0xffeb3b, 2, 100, Math.PI / 6);
        beaconLight.position.set(0, 50, 0);
        beaconLight.target.position.set(0, 0, 0);
        beaconLight.castShadow = true;
        this.scene.add(beaconLight);
        this.scene.add(beaconLight.target);
        
        // Animate beacon
        this.beaconLight = beaconLight;
    }

    createParticles() {
        const particleCount = 1000;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 200;
            positions[i + 1] = Math.random() * 50;
            positions[i + 2] = (Math.random() - 0.5) * 200;
            
            // Yellow/electric colors
            colors[i] = 1;
            colors[i + 1] = 0.9 + Math.random() * 0.1;
            colors[i + 2] = 0.2 + Math.random() * 0.3;
        }
        
        const particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        this.particles = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(this.particles);
    }

    createSkybox() {
        // Create gradient sky
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0a0a0a) },
                bottomColor: { value: new THREE.Color(0x1a1a2e) },
                offset: { value: 33 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });
        
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);
    }

    addCollectEffect(position) {
        // Create burst effect
        const particleCount = 20;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.1);
            const particleMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xffeb3b,
                transparent: true
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            particle.position.copy(position);
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                Math.random() * 10 + 5,
                (Math.random() - 0.5) * 10
            );
            particle.life = 1;
            
            this.scene.add(particle);
            particles.push(particle);
        }
        
        this.collectEffects.push({ particles, time: 0 });
    }

    update(deltaTime) {
        // Animate particles
        if (this.particles) {
            this.particles.rotation.y += deltaTime * 0.1;
            
            const positions = this.particles.geometry.attributes.position.array;
            for (let i = 1; i < positions.length; i += 3) {
                positions[i] += Math.sin(Date.now() * 0.001 + i) * 0.01;
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
        }
        
        // Animate beacon
        if (this.beaconLight) {
            this.beaconLight.angle = Math.PI / 6 + Math.sin(Date.now() * 0.001) * Math.PI / 12;
            this.beaconLight.target.position.x = Math.sin(Date.now() * 0.0005) * 20;
            this.beaconLight.target.position.z = Math.cos(Date.now() * 0.0005) * 20;
        }
        
        // Update collect effects
        this.collectEffects = this.collectEffects.filter(effect => {
            effect.time += deltaTime;
            
            effect.particles.forEach(particle => {
                particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
                particle.velocity.y -= 20 * deltaTime; // gravity
                
                particle.material.opacity = 1 - effect.time;
                particle.scale.setScalar(1 - effect.time * 0.5);
            });
            
            if (effect.time > 1) {
                effect.particles.forEach(particle => {
                    this.scene.remove(particle);
                });
                return false;
            }
            
            return true;
        });
    }
}