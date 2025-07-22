import * as THREE from 'three';

export class ProEnvironment {
    constructor(scene) {
        this.scene = scene;
        this.colors = {
            black: 0x000000,
            darkGray: 0x0a0a0a,
            yellow: 0xFFFF00,
            gridYellow: 0x444400,
            gridDark: 0x111111
        };
        
        this.createEnvironment();
    }

    createEnvironment() {
        // Create advanced ground with displacement
        this.createGround();
        
        // Create cyberpunk city backdrop
        this.createCityscape();
        
        // Create atmospheric effects
        this.createAtmosphere();
        
        // Create animated elements
        this.createAnimatedElements();
    }

    createGround() {
        // Main ground plane with custom shader
        const groundGeometry = new THREE.PlaneGeometry(200, 200, 100, 100);
        
        // Custom shader for ground
        const groundMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color1: { value: new THREE.Color(this.colors.black) },
                color2: { value: new THREE.Color(this.colors.darkGray) },
                gridColor: { value: new THREE.Color(this.colors.gridYellow) }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPosition;
                uniform float time;
                
                void main() {
                    vUv = uv;
                    vPosition = position;
                    
                    // Wave displacement
                    vec3 pos = position;
                    float wave = sin(position.x * 0.1 + time) * cos(position.y * 0.1 + time) * 0.5;
                    pos.z += wave;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color1;
                uniform vec3 color2;
                uniform vec3 gridColor;
                uniform float time;
                varying vec2 vUv;
                varying vec3 vPosition;
                
                void main() {
                    // Grid pattern
                    float grid = 0.0;
                    float gridSize = 2.0;
                    float lineWidth = 0.02;
                    
                    vec2 coord = vPosition.xy / gridSize;
                    vec2 gridCoord = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
                    float line = min(gridCoord.x, gridCoord.y);
                    
                    grid = 1.0 - min(line, 1.0);
                    grid *= 0.5;
                    
                    // Distance fade
                    float dist = length(vPosition.xy) / 100.0;
                    float fade = 1.0 - smoothstep(0.3, 1.0, dist);
                    
                    // Mix colors
                    vec3 baseColor = mix(color1, color2, vUv.y);
                    vec3 finalColor = mix(baseColor, gridColor, grid * fade);
                    
                    // Pulse effect
                    float pulse = sin(time * 2.0 + length(vPosition.xy) * 0.1) * 0.1 + 0.9;
                    finalColor *= pulse;
                    
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `
        });
        
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
        
        // Add glow grid overlay
        const glowGridGeometry = new THREE.PlaneGeometry(200, 200, 50, 50);
        const glowGridMaterial = new THREE.MeshBasicMaterial({
            color: this.colors.yellow,
            wireframe: true,
            transparent: true,
            opacity: 0.1,
            blending: THREE.AdditiveBlending
        });
        
        this.glowGrid = new THREE.Mesh(glowGridGeometry, glowGridMaterial);
        this.glowGrid.rotation.x = -Math.PI / 2;
        this.glowGrid.position.y = 0.1;
        this.scene.add(this.glowGrid);
    }

    createCityscape() {
        const buildingCount = 30;
        const buildings = new THREE.Group();
        
        for (let i = 0; i < buildingCount; i++) {
            const width = 5 + Math.random() * 15;
            const height = 20 + Math.random() * 60;
            const depth = 5 + Math.random() * 15;
            
            // Building geometry
            const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
            
            // Building material with emissive windows
            const buildingMaterial = new THREE.MeshStandardMaterial({
                color: this.colors.black,
                emissive: this.colors.darkGray,
                emissiveIntensity: 0.2,
                roughness: 0.8,
                metalness: 0.2
            });
            
            const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
            
            // Position buildings in a circle
            const angle = (i / buildingCount) * Math.PI * 2;
            const radius = 60 + Math.random() * 40;
            building.position.x = Math.cos(angle) * radius;
            building.position.z = Math.sin(angle) * radius;
            building.position.y = height / 2;
            
            building.castShadow = true;
            building.receiveShadow = true;
            
            buildings.add(building);
            
            // Add window lights
            const windowRows = Math.floor(height / 5);
            const windowCols = Math.floor(width / 3);
            
            for (let row = 0; row < windowRows; row++) {
                for (let col = 0; col < windowCols; col++) {
                    if (Math.random() > 0.3) {
                        const windowLight = new THREE.PointLight(this.colors.yellow, 0.5, 10);
                        windowLight.position.set(
                            building.position.x + (col - windowCols/2) * 3,
                            row * 5 + 5,
                            building.position.z + (depth/2 + 0.1) * (Math.random() > 0.5 ? 1 : -1)
                        );
                        this.scene.add(windowLight);
                    }
                }
            }
        }
        
        this.scene.add(buildings);
        this.buildings = buildings;
    }

    createAtmosphere() {
        // Fog for depth
        this.scene.fog = new THREE.FogExp2(this.colors.black, 0.02);
        
        // Particle system for ambient particles
        const particleCount = 1000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 200;
            positions[i * 3 + 1] = Math.random() * 100;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
            
            // Yellow and white particles
            const isYellow = Math.random() > 0.7;
            colors[i * 3] = isYellow ? 1 : 0.5;
            colors[i * 3 + 1] = isYellow ? 1 : 0.5;
            colors[i * 3 + 2] = isYellow ? 0 : 0.5;
            
            sizes[i] = Math.random() * 2 + 0.5;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const particleMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                attribute float size;
                varying vec3 vColor;
                uniform float time;
                
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    
                    // Pulse size
                    float pulse = sin(time * 2.0 + position.x * 0.1) * 0.5 + 1.0;
                    gl_PointSize = size * pulse * (300.0 / -mvPosition.z);
                    
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                
                void main() {
                    // Circular particle
                    vec2 coord = gl_PointCoord - vec2(0.5);
                    if (length(coord) > 0.5) discard;
                    
                    float alpha = 1.0 - length(coord) * 2.0;
                    gl_FragColor = vec4(vColor, alpha * 0.5);
                }
            `,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            vertexColors: true
        });
        
        this.particles = new THREE.Points(geometry, particleMaterial);
        this.scene.add(this.particles);
    }

    createAnimatedElements() {
        // Lightning strikes in the distance
        this.lightningStrikes = [];
        
        for (let i = 0; i < 5; i++) {
            const strikeGeometry = new THREE.CylinderGeometry(0.5, 2, 50, 4);
            const strikeMaterial = new THREE.MeshBasicMaterial({
                color: this.colors.yellow,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending
            });
            
            const strike = new THREE.Mesh(strikeGeometry, strikeMaterial);
            strike.position.set(
                (Math.random() - 0.5) * 150,
                25,
                (Math.random() - 0.5) * 150
            );
            
            this.scene.add(strike);
            this.lightningStrikes.push({
                mesh: strike,
                nextStrike: Math.random() * 10
            });
        }
        
        // Scanning beams
        const beamGeometry = new THREE.PlaneGeometry(100, 2);
        const beamMaterial = new THREE.MeshBasicMaterial({
            color: this.colors.yellow,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });
        
        this.scanBeam = new THREE.Mesh(beamGeometry, beamMaterial);
        this.scanBeam.rotation.x = -Math.PI / 2;
        this.scanBeam.position.y = 0.1;
        this.scene.add(this.scanBeam);
    }

    update(deltaTime) {
        const time = Date.now() * 0.001;
        
        // Update ground shader
        if (this.ground.material.uniforms) {
            this.ground.material.uniforms.time.value = time;
        }
        
        // Animate glow grid
        this.glowGrid.material.opacity = 0.05 + Math.sin(time * 2) * 0.05;
        
        // Update particles
        if (this.particles.material.uniforms) {
            this.particles.material.uniforms.time.value = time;
        }
        
        // Float particles
        const positions = this.particles.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] += Math.sin(time + i) * 0.01;
        }
        this.particles.geometry.attributes.position.needsUpdate = true;
        
        // Lightning strikes
        this.lightningStrikes.forEach(strike => {
            strike.nextStrike -= deltaTime;
            
            if (strike.nextStrike <= 0) {
                // Strike animation
                strike.mesh.material.opacity = 1;
                strike.mesh.scale.y = 1 + Math.random() * 0.5;
                
                // Flash light
                const flash = new THREE.PointLight(this.colors.yellow, 50, 100);
                flash.position.copy(strike.mesh.position);
                this.scene.add(flash);
                
                // Fade out
                setTimeout(() => {
                    const fadeOut = setInterval(() => {
                        strike.mesh.material.opacity -= 0.1;
                        flash.intensity *= 0.8;
                        
                        if (strike.mesh.material.opacity <= 0) {
                            clearInterval(fadeOut);
                            this.scene.remove(flash);
                        }
                    }, 50);
                }, 100);
                
                strike.nextStrike = 5 + Math.random() * 15;
            }
        });
        
        // Scan beam animation
        this.scanBeam.position.z = Math.sin(time * 0.5) * 50;
        this.scanBeam.material.opacity = 0.1 + Math.sin(time * 3) * 0.1;
        
        // Rotate buildings slowly
        if (this.buildings) {
            this.buildings.rotation.y = time * 0.01;
        }
    }
}