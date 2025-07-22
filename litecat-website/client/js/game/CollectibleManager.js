import * as THREE from 'three';

export class CollectibleManager {
    constructor(scene) {
        this.scene = scene;
        this.lightnings = [];
        this.lightningGroup = new THREE.Group();
        this.scene.add(this.lightningGroup);
        
        // Create lightning bolt geometry
        this.createLightningGeometry();
    }

    createLightningGeometry() {
        // Create a stylized lightning bolt shape
        const shape = new THREE.Shape();
        
        // Lightning bolt path
        shape.moveTo(0, 2);
        shape.lineTo(-0.5, 1);
        shape.lineTo(0.2, 1);
        shape.lineTo(-0.3, 0);
        shape.lineTo(0.5, 0);
        shape.lineTo(0, -2);
        shape.lineTo(0.3, -0.5);
        shape.lineTo(-0.2, -0.5);
        shape.lineTo(0.5, 0.5);
        shape.lineTo(-0.2, 0.5);
        shape.lineTo(0, 2);
        
        const extrudeSettings = {
            depth: 0.3,
            bevelEnabled: true,
            bevelSegments: 2,
            steps: 2,
            bevelSize: 0.1,
            bevelThickness: 0.1
        };
        
        this.lightningGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        this.lightningGeometry.center();
    }

    spawnLightningBolts(count) {
        for (let i = 0; i < count; i++) {
            this.spawnSingleLightning();
        }
    }

    spawnSingleLightning() {
        const material = new THREE.MeshPhongMaterial({
            color: 0xffeb3b,
            emissive: 0xffeb3b,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.9
        });
        
        const lightning = new THREE.Mesh(this.lightningGeometry, material);
        
        // Random position
        lightning.position.set(
            (Math.random() - 0.5) * 180,
            Math.random() * 3 + 1,
            (Math.random() - 0.5) * 180
        );
        
        // Random rotation
        lightning.rotation.y = Math.random() * Math.PI * 2;
        lightning.rotation.z = Math.random() * 0.5 - 0.25;
        
        // Scale
        lightning.scale.setScalar(0.5 + Math.random() * 0.5);
        
        // Add glow
        const glowLight = new THREE.PointLight(0xffeb3b, 1, 5);
        glowLight.position.copy(lightning.position);
        this.scene.add(glowLight);
        
        // Store reference
        lightning.glowLight = glowLight;
        lightning.collected = false;
        lightning.originalY = lightning.position.y;
        lightning.floatOffset = Math.random() * Math.PI * 2;
        
        this.lightningGroup.add(lightning);
        this.lightnings.push(lightning);
    }

    removeLightning(lightning) {
        const index = this.lightnings.indexOf(lightning);
        if (index > -1) {
            this.lightnings.splice(index, 1);
            this.lightningGroup.remove(lightning);
            
            // Remove glow light
            if (lightning.glowLight) {
                this.scene.remove(lightning.glowLight);
            }
        }
    }

    update(deltaTime) {
        // Animate lightnings
        this.lightnings.forEach(lightning => {
            // Rotate
            lightning.rotation.y += deltaTime * 2;
            
            // Float up and down
            lightning.position.y = lightning.originalY + 
                Math.sin(Date.now() * 0.001 + lightning.floatOffset) * 0.5;
            
            // Update glow light position
            if (lightning.glowLight) {
                lightning.glowLight.position.copy(lightning.position);
                lightning.glowLight.intensity = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
            }
            
            // Pulse effect
            const scale = 0.5 + Math.sin(Date.now() * 0.003 + lightning.floatOffset) * 0.1;
            lightning.scale.setScalar(scale);
        });
    }

    getLightnings() {
        return this.lightnings;
    }

    reset() {
        // Remove all lightnings
        this.lightnings.forEach(lightning => {
            this.lightningGroup.remove(lightning);
            if (lightning.glowLight) {
                this.scene.remove(lightning.glowLight);
            }
        });
        this.lightnings = [];
    }

    getRandomSpawnPosition() {
        return new THREE.Vector3(
            (Math.random() - 0.5) * 180,
            Math.random() * 3 + 1,
            (Math.random() - 0.5) * 180
        );
    }
}