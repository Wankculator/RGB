import * as THREE from 'three';

export class CatModel {
    constructor() {
        this.group = new THREE.Group();
        this.animations = {};
        this.createCat();
    }

    createCat() {
        // Materials
        const blackFur = new THREE.MeshPhongMaterial({ 
            color: 0x0a0a0a,
            roughness: 0.8,
            metalness: 0.1,
            shininess: 30
        });

        const yellowGlow = new THREE.MeshBasicMaterial({ 
            color: 0xffeb3b,
            emissive: 0xffeb3b
        });

        // Body (more cat-like proportions)
        const bodyGeometry = new THREE.CapsuleGeometry(0.8, 2, 8, 16);
        const body = new THREE.Mesh(bodyGeometry, blackFur);
        body.rotation.z = Math.PI / 2;
        body.position.set(0, 0.8, 0);
        body.castShadow = true;
        this.group.add(body);

        // Head (rounded)
        const headGeometry = new THREE.SphereGeometry(0.6, 16, 16);
        const head = new THREE.Mesh(headGeometry, blackFur);
        head.scale.set(1, 0.9, 0.8);
        head.position.set(0, 1.2, 0.8);
        head.castShadow = true;
        this.group.add(head);

        // Ears (proper cat ears)
        const earGeometry = new THREE.ConeGeometry(0.25, 0.5, 4);
        
        const leftEar = new THREE.Mesh(earGeometry, blackFur);
        leftEar.position.set(-0.35, 1.7, 0.7);
        leftEar.rotation.z = -0.3;
        leftEar.rotation.x = 0.2;
        this.group.add(leftEar);

        const rightEar = new THREE.Mesh(earGeometry, blackFur);
        rightEar.position.set(0.35, 1.7, 0.7);
        rightEar.rotation.z = 0.3;
        rightEar.rotation.x = 0.2;
        this.group.add(rightEar);

        // Inner ears (pink detail)
        const innerEarGeometry = new THREE.ConeGeometry(0.15, 0.3, 4);
        const innerEarMaterial = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
        
        const leftInnerEar = new THREE.Mesh(innerEarGeometry, innerEarMaterial);
        leftInnerEar.position.copy(leftEar.position);
        leftInnerEar.position.z += 0.1;
        leftInnerEar.rotation.copy(leftEar.rotation);
        this.group.add(leftInnerEar);

        const rightInnerEar = new THREE.Mesh(innerEarGeometry, innerEarMaterial);
        rightInnerEar.position.copy(rightEar.position);
        rightInnerEar.position.z += 0.1;
        rightInnerEar.rotation.copy(rightEar.rotation);
        this.group.add(rightInnerEar);

        // Eyes (glowing yellow with pupils)
        const eyeGeometry = new THREE.SphereGeometry(0.12, 8, 8);
        
        const leftEye = new THREE.Mesh(eyeGeometry, yellowGlow);
        leftEye.position.set(-0.2, 1.3, 1.3);
        this.group.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, yellowGlow);
        rightEye.position.set(0.2, 1.3, 1.3);
        this.group.add(rightEye);

        // Pupils
        const pupilGeometry = new THREE.SphereGeometry(0.06, 8, 8);
        const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(-0.2, 1.3, 1.38);
        this.group.add(leftPupil);

        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(0.2, 1.3, 1.38);
        this.group.add(rightPupil);

        // Nose
        const noseGeometry = new THREE.ConeGeometry(0.08, 0.1, 4);
        const noseMaterial = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.set(0, 1.15, 1.4);
        nose.rotation.x = Math.PI;
        this.group.add(nose);

        // Legs (4 legs)
        const legGeometry = new THREE.CylinderGeometry(0.15, 0.12, 0.8, 8);
        
        // Front legs
        const frontLeftLeg = new THREE.Mesh(legGeometry, blackFur);
        frontLeftLeg.position.set(-0.4, 0.4, 0.5);
        this.group.add(frontLeftLeg);

        const frontRightLeg = new THREE.Mesh(legGeometry, blackFur);
        frontRightLeg.position.set(0.4, 0.4, 0.5);
        this.group.add(frontRightLeg);

        // Back legs
        const backLeftLeg = new THREE.Mesh(legGeometry, blackFur);
        backLeftLeg.position.set(-0.4, 0.4, -0.5);
        this.group.add(backLeftLeg);

        const backRightLeg = new THREE.Mesh(legGeometry, blackFur);
        backRightLeg.position.set(0.4, 0.4, -0.5);
        this.group.add(backRightLeg);

        // Paws
        const pawGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const pawPositions = [
            [-0.4, 0.05, 0.5],
            [0.4, 0.05, 0.5],
            [-0.4, 0.05, -0.5],
            [0.4, 0.05, -0.5]
        ];

        pawPositions.forEach(pos => {
            const paw = new THREE.Mesh(pawGeometry, blackFur);
            paw.position.set(...pos);
            paw.scale.set(1, 0.7, 1.2);
            this.group.add(paw);
        });

        // Tail (curved)
        const tailCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0.8, -0.8),
            new THREE.Vector3(0, 1.2, -1.2),
            new THREE.Vector3(0.2, 1.6, -1.5),
            new THREE.Vector3(0.3, 2.0, -1.6)
        ]);

        const tailGeometry = new THREE.TubeGeometry(tailCurve, 20, 0.15, 8, false);
        const tail = new THREE.Mesh(tailGeometry, blackFur);
        this.group.add(tail);
        this.tail = tail;

        // Whiskers
        const whiskerMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
        const whiskerGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.4, 4);

        const whiskerPositions = [
            [-0.3, 1.1, 1.3, -0.4],
            [-0.15, 1.1, 1.3, -0.2],
            [0.3, 1.1, 1.3, 0.4],
            [0.15, 1.1, 1.3, 0.2]
        ];

        whiskerPositions.forEach(([x, y, z, rot]) => {
            const whisker = new THREE.Mesh(whiskerGeometry, whiskerMaterial);
            whisker.position.set(x, y, z);
            whisker.rotation.z = Math.PI / 2;
            whisker.rotation.y = rot;
            this.group.add(whisker);
        });

        // Add subtle glow
        const catGlow = new THREE.PointLight(0xffeb3b, 0.3, 3);
        catGlow.position.set(0, 1, 0);
        this.group.add(catGlow);

        // Store body parts for animation
        this.bodyParts = {
            head,
            tail,
            legs: [frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg],
            eyes: [leftEye, rightEye],
            pupils: [leftPupil, rightPupil]
        };
    }

    update(velocity, deltaTime) {
        const speed = velocity.length();
        const time = Date.now() * 0.001;

        // Running animation
        if (speed > 0.1) {
            // Animate legs
            this.bodyParts.legs.forEach((leg, i) => {
                leg.rotation.x = Math.sin(time * 10 + i * Math.PI) * 0.3 * (speed / 20);
            });

            // Bob head slightly
            this.bodyParts.head.position.y = 1.2 + Math.sin(time * 20) * 0.02 * (speed / 20);
        } else {
            // Idle animation
            this.bodyParts.legs.forEach(leg => {
                leg.rotation.x *= 0.9;
            });
            
            // Breathing effect
            this.bodyParts.head.position.y = 1.2 + Math.sin(time * 2) * 0.01;
        }

        // Tail animation (always active)
        const tailTime = time * 2;
        this.tail.rotation.y = Math.sin(tailTime) * 0.3;
        this.tail.rotation.z = Math.cos(tailTime * 0.7) * 0.2;

        // Blink occasionally
        if (Math.random() < 0.005) {
            this.bodyParts.eyes.forEach(eye => {
                eye.scale.y = 0.1;
                setTimeout(() => {
                    eye.scale.y = 1;
                }, 100);
            });
        }

        // Look direction based on movement
        if (Math.abs(velocity.x) > 0.1) {
            const lookOffset = velocity.x > 0 ? 0.1 : -0.1;
            this.bodyParts.pupils.forEach((pupil, i) => {
                pupil.position.x = (i === 0 ? -0.2 : 0.2) + lookOffset * 0.05;
            });
        }
    }

    getMesh() {
        return this.group;
    }
}