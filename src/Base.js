import * as THREE from 'three';

export class Base {
    constructor(scene, x, z, color = 0x505050) {
        this.scene = scene;
        this.x = x;
        this.z = z;
        this.color = color;
        this.baseGroup = new THREE.Group();
        this.wallPoints = [];
        this.gateInfo = null;
        
        // Command center properties
        this.maxHealth = 1000;
        this.currentHealth = this.maxHealth;
        this.destroyed = false;
        
        this.createBase();
        this.createCommandCenter();
        
        // Store reference to this base instance
        this.baseGroup.userData.isBase = true;
        this.baseGroup.userData.baseInstance = this;

        // Dispatch initial health state
        window.dispatchEvent(new CustomEvent('baseHealthChanged', {
            detail: {
                x: this.x,
                z: this.z,
                color: this.color,
                health: this.currentHealth,
                maxHealth: this.maxHealth
            }
        }));
    }

    createBase() {
        // Main platform
        const baseGeometry = new THREE.BoxGeometry(30, 1, 30);
        const baseMaterial = new THREE.MeshStandardMaterial({ 
            color: this.color,
            roughness: 0.7,
            metalness: 0.3
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.5; // Half height to sit on ground
        base.castShadow = true;
        base.receiveShadow = true;
        this.baseGroup.add(base);

        // Add border/rim
        const rimGeometry = new THREE.BoxGeometry(33, 0.5, 33);
        const rimMaterial = new THREE.MeshStandardMaterial({ 
            color: this.color,
            roughness: 0.8,
            metalness: 0.2
        });
        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.position.y = 0.25; // Place at bottom of platform
        rim.castShadow = true;
        rim.receiveShadow = true;
        this.baseGroup.add(rim);

        // Add colored squares around base
        const squareSize = 40; // Size of each adjacent square
        const squareGeometry = new THREE.PlaneGeometry(squareSize, squareSize);
        const squareMaterial = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.8,
            metalness: 0.2
        });

        // Define sizes for walls and pillars
        const pillarSize = 3;
        const wallHeight = 5;
        const wallThickness = 2;
        const pillarHeight = wallHeight + 1;
        const gateWidth = 15; // Width of the gate opening

        // Create 8 adjacent squares
        const squarePositions = [
            { x: -squareSize, z: 0 },      // Left
            { x: squareSize, z: 0 },       // Right
            { x: 0, z: -squareSize },      // Bottom
            { x: 0, z: squareSize },       // Top
            { x: -squareSize, z: -squareSize }, // Bottom-left
            { x: squareSize, z: -squareSize },  // Bottom-right
            { x: -squareSize, z: squareSize },  // Top-left
            { x: squareSize, z: squareSize }    // Top-right
        ];

        squarePositions.forEach(pos => {
            const square = new THREE.Mesh(squareGeometry, squareMaterial);
            square.rotation.x = -Math.PI / 2; // Lay flat
            square.position.set(pos.x, 0.05, pos.z); // Slightly above ground
            square.receiveShadow = true;
            this.baseGroup.add(square);
        });

        // Add walls around the perimeter
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.6,
            metalness: 0.4
        });

        // Define wall points for the outer perimeter (relative to base position)
        const wallPoints = [
            { x: -squareSize - squareSize/2, z: -squareSize - squareSize/2 }, // Bottom-left
            { x: squareSize + squareSize/2, z: -squareSize - squareSize/2 },  // Bottom-right
            { x: squareSize + squareSize/2, z: squareSize + squareSize/2 },   // Top-right
            { x: -squareSize - squareSize/2, z: squareSize + squareSize/2 }   // Top-left
        ];

        // Create walls between pillars with gate
        for (let i = 0; i < 4; i++) {
            const start = wallPoints[i];
            const end = wallPoints[(i + 1) % 4];
            
            // Calculate wall length and position
            const length = Math.sqrt(
                Math.pow(end.x - start.x, 2) + 
                Math.pow(end.z - start.z, 2)
            ) - pillarSize;
            
            // Calculate direction and normalized vectors
            const direction = {
                x: end.x - start.x,
                z: end.z - start.z
            };
            const distance = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
            const normalized = {
                x: direction.x / distance,
                z: direction.z / distance
            };

            // Determine if this is the front wall (facing outward from center)
            const isFrontWall = (
                (this.x < 0 && i === 1) || // Left bases, right wall
                (this.x > 0 && i === 3) || // Right bases, left wall
                (this.z < 0 && i === 2) || // Bottom bases, top wall
                (this.z > 0 && i === 0)    // Top bases, bottom wall
            );

            if (isFrontWall) {
                // Create two wall segments with a gate in the middle
                const wallLength = (length - gateWidth) / 2;
                
                // Left/Bottom segment
                const wall1Geometry = new THREE.BoxGeometry(wallLength, wallHeight, wallThickness);
                const wall1 = new THREE.Mesh(wall1Geometry, wallMaterial);
                const wall1Pos = {
                    x: start.x + normalized.x * (wallLength/2 + pillarSize/2),
                    z: start.z + normalized.z * (wallLength/2 + pillarSize/2)
                };
                wall1.position.set(wall1Pos.x, wallHeight/2, wall1Pos.z);
                wall1.rotation.y = Math.atan2(direction.z, direction.x);
                wall1.castShadow = true;
                wall1.receiveShadow = true;
                this.baseGroup.add(wall1);

                // Right/Top segment
                const wall2Geometry = new THREE.BoxGeometry(wallLength, wallHeight, wallThickness);
                const wall2 = new THREE.Mesh(wall2Geometry, wallMaterial);
                const wall2Pos = {
                    x: end.x - normalized.x * (wallLength/2 + pillarSize/2),
                    z: end.z - normalized.z * (wallLength/2 + pillarSize/2)
                };
                wall2.position.set(wall2Pos.x, wallHeight/2, wall2Pos.z);
                wall2.rotation.y = Math.atan2(direction.z, direction.x);
                wall2.castShadow = true;
                wall2.receiveShadow = true;
                this.baseGroup.add(wall2);

                // Add gate posts
                const gatePostGeometry = new THREE.BoxGeometry(pillarSize, wallHeight + 1, pillarSize);
                const gatePostMaterial = new THREE.MeshStandardMaterial({
                    color: 0x000000, // Changed to black
                    roughness: 0.7,
                    metalness: 0.5  // Increased metalness for a shinier look
                });

                // Left/Bottom gate post
                const gatePost1 = new THREE.Mesh(gatePostGeometry, gatePostMaterial);
                const gatePost1Pos = {
                    x: start.x + normalized.x * (length/2 - gateWidth/2),
                    z: start.z + normalized.z * (length/2 - gateWidth/2)
                };
                gatePost1.position.set(gatePost1Pos.x, (wallHeight + 1)/2, gatePost1Pos.z);
                gatePost1.castShadow = true;
                gatePost1.receiveShadow = true;
                this.baseGroup.add(gatePost1);

                // Right/Top gate post
                const gatePost2 = new THREE.Mesh(gatePostGeometry, gatePostMaterial);
                const gatePost2Pos = {
                    x: start.x + normalized.x * (length/2 + gateWidth/2),
                    z: start.z + normalized.z * (length/2 + gateWidth/2)
                };
                gatePost2.position.set(gatePost2Pos.x, (wallHeight + 1)/2, gatePost2Pos.z);
                gatePost2.castShadow = true;
                gatePost2.receiveShadow = true;
                this.baseGroup.add(gatePost2);

                // Add top beam
                const topBeamGeometry = new THREE.BoxGeometry(gateWidth + 2, 1, wallThickness);
                const topBeam = new THREE.Mesh(topBeamGeometry, gatePostMaterial); // Using same black material
                const topBeamPos = {
                    x: start.x + normalized.x * (length/2),
                    z: start.z + normalized.z * (length/2)
                };
                topBeam.position.set(topBeamPos.x, wallHeight, topBeamPos.z);
                topBeam.rotation.y = Math.atan2(direction.z, direction.x);
                topBeam.castShadow = true;
                topBeam.receiveShadow = true;
                this.baseGroup.add(topBeam);

            } else {
                // Create regular wall for non-gate sides
                const wallGeometry = new THREE.BoxGeometry(length, wallHeight, wallThickness);
                const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                
                const centerX = start.x + direction.x / 2;
                const centerZ = start.z + direction.z / 2;
                
                wall.position.set(
                    centerX,
                    wallHeight/2,
                    centerZ
                );
                wall.rotation.y = Math.atan2(direction.z, direction.x);
                wall.castShadow = true;
                wall.receiveShadow = true;
                this.baseGroup.add(wall);
            }
        }

        // Add corner pillars
        const pillarGeometry = new THREE.BoxGeometry(pillarSize, pillarHeight, pillarSize);
        const pillarMaterial = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.7,
            metalness: 0.3
        });

        wallPoints.forEach(point => {
            const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
            pillar.position.set(
                point.x,
                pillarHeight/2,
                point.z
            );
            pillar.castShadow = true;
            pillar.receiveShadow = true;
            this.baseGroup.add(pillar);
        });

        this.baseGroup.position.set(this.x, 0, this.z);
        this.scene.add(this.baseGroup);
    }

    createCommandCenter() {
        const materials = {
            main: new THREE.MeshStandardMaterial({ 
                color: this.color,
                roughness: 0.4,
                metalness: 0.6
            }),
            details: new THREE.MeshStandardMaterial({ 
                color: 0x333333,
                roughness: 0.7,
                metalness: 0.3
            }),
            glow: new THREE.MeshStandardMaterial({ 
                color: this.color,
                emissive: this.color,
                emissiveIntensity: 0.5,
                roughness: 0.3,
                metalness: 0.8
            })
        };

        // Main structure - hexagonal prism
        const hexGeometry = new THREE.CylinderGeometry(8, 8, 15, 6);
        this.commandCenter = new THREE.Mesh(hexGeometry, materials.main);
        this.commandCenter.position.set(0, 7.5, 0);
        this.commandCenter.castShadow = true;
        this.commandCenter.receiveShadow = true;
        this.baseGroup.add(this.commandCenter);

        // Top dome
        const domeGeometry = new THREE.SphereGeometry(6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const dome = new THREE.Mesh(domeGeometry, materials.main);
        dome.position.y = 15;
        this.commandCenter.add(dome);

        // Energy ring
        const ringGeometry = new THREE.TorusGeometry(7, 0.5, 16, 32);
        const ring = new THREE.Mesh(ringGeometry, materials.glow);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 12;
        this.commandCenter.add(ring);

        // Support pillars
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const pillarGeometry = new THREE.BoxGeometry(1, 15, 1);
            const pillar = new THREE.Mesh(pillarGeometry, materials.details);
            pillar.position.set(
                Math.cos(angle) * 7,
                0,
                Math.sin(angle) * 7
            );
            this.commandCenter.add(pillar);
        }
    }

    takeDamage(amount) {
        if (this.destroyed) return;
        
        this.currentHealth = Math.max(0, this.currentHealth - amount);
        
        // Update command center appearance based on damage
        const healthPercent = this.currentHealth / this.maxHealth;
        this.commandCenter.material.emissiveIntensity = healthPercent * 0.5;
        
        // Dispatch event for UI update
        const event = new CustomEvent('baseHealthChanged', {
            detail: {
                x: this.x,
                z: this.z,
                color: this.color,
                health: this.currentHealth,
                maxHealth: this.maxHealth
            }
        });
        window.dispatchEvent(event);

        if (this.currentHealth <= 0) {
            this.destroy();
        }
    }

    destroy() {
        if (this.destroyed) return;
        
        this.destroyed = true;
        
        // Create large explosion effect
        const particleCount = 200;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const baseColor = new THREE.Color(this.color);
        const velocities = [];
        const scales = [];
        
        // Create particles in a sphere around the command center
        for (let i = 0; i < particleCount; i++) {
            const radius = Math.random() * 20; // Larger radius for bigger explosion
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.cos(phi) + 10; // Start higher up
            positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
            
            colors[i * 3] = baseColor.r;
            colors[i * 3 + 1] = baseColor.g;
            colors[i * 3 + 2] = baseColor.b;

            // Add random velocities for more dynamic explosion
            velocities.push({
                x: (Math.random() - 0.5) * 0.5,
                y: Math.random() * 0.5,
                z: (Math.random() - 0.5) * 0.5
            });
            
            scales.push(Math.random() * 2 + 1);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            transparent: true,
            opacity: 1,
            emissive: this.color,
            emissiveIntensity: 1
        });
        
        const particles = new THREE.Points(geometry, material);
        particles.position.copy(this.commandCenter.position);
        particles.position.add(this.baseGroup.position); // Add base position offset
        this.scene.add(particles);

        // Add explosion light
        const light = new THREE.PointLight(this.color, 10, 50);
        light.position.copy(particles.position);
        this.scene.add(light);
        
        // Remove command center immediately
        this.baseGroup.remove(this.commandCenter);
        
        // Animate explosion
        const startTime = Date.now();
        const duration = 3000; // Longer duration for more dramatic effect
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                const positions = particles.geometry.attributes.position.array;
                
                // Update particle positions with gravity and spread
                for (let i = 0; i < particleCount; i++) {
                    const i3 = i * 3;
                    positions[i3] += velocities[i].x;
                    positions[i3 + 1] += velocities[i].y;
                    positions[i3 + 2] += velocities[i].z;
                    
                    // Add gravity effect
                    velocities[i].y -= 0.01;
                }
                
                particles.geometry.attributes.position.needsUpdate = true;
                
                // Fade out particles and light
                material.opacity = 1 - progress;
                light.intensity = 10 * (1 - progress);
                
                requestAnimationFrame(animate);
            } else {
                // Remove explosion effects
                this.scene.remove(particles);
                this.scene.remove(light);
            }
        };
        
        animate();
        
        // Dispatch event for scoring
        const event = new CustomEvent('baseDestroyed', {
            detail: { 
                x: this.x, 
                z: this.z,
                color: this.color
            }
        });
        window.dispatchEvent(event);
    }

    // Helper method to check if a point is within this base's area
    isPointInBase(x, z) {
        const baseSize = 40;
        return Math.abs(x - this.x) < baseSize && Math.abs(z - this.z) < baseSize;
    }

    // Method to get the base's position
    getPosition() {
        return { x: this.x, z: this.z };
    }

    // Method to get the base's dimensions
    getDimensions() {
        return {
            width: 30,  // Main platform width
            length: 30, // Main platform length
            height: 5,  // Wall height
            gateWidth: 15
        };
    }

    // Add after the createBase method
    isPointCollidingWithWalls(x, z) {
        const squareSize = 40;
        const wallThickness = 2;
        const gateWidth = 15;
        const pillarSize = 3;
        const gateOffset = -1; // Negative offset to move collision area right
        
        // Convert point to local base coordinates
        const localX = x - this.x;
        const localZ = z - this.z;
        
        // Base perimeter
        const perimeterSize = squareSize + squareSize/2;
        
        // Check if point is near the base walls
        if (Math.abs(localX) <= perimeterSize + wallThickness/2 && 
            Math.abs(localZ) <= perimeterSize + wallThickness/2) {
            
            // Determine which wall we're near (if any)
            const isNearOuterX = Math.abs(Math.abs(localX) - perimeterSize) < wallThickness;
            const isNearOuterZ = Math.abs(Math.abs(localZ) - perimeterSize) < wallThickness;
            
            if (isNearOuterX || isNearOuterZ) {
                // Check if we're at a gate
                const isFrontWall = (
                    (this.x < 0 && localX > 0) || // Left bases, right wall
                    (this.x > 0 && localX < 0) || // Right bases, left wall
                    (this.z < 0 && localZ > 0) || // Bottom bases, top wall
                    (this.z > 0 && localZ < 0)    // Top bases, bottom wall
                );

                if (isFrontWall) {
                    // For the wall with the gate, check if we're at the gate opening
                    const gateCenter = (isNearOuterX ? localZ : localX) + gateOffset;
                    
                    // Calculate distance from gate center
                    const distanceFromGateCenter = Math.abs(gateCenter);
                    
                    // Define gate post regions
                    const leftPostEnd = -(gateWidth/2 - pillarSize/2);
                    const rightPostStart = gateWidth/2 - pillarSize/2;
                    
                    // Check if we're in the gate opening
                    if (gateCenter > leftPostEnd && gateCenter < rightPostStart) {
                        return false; // Allow passage through gate opening
                    }
                    
                    // Check if we're beyond the walls
                    if (Math.abs(gateCenter) > gateWidth/2 + pillarSize/2) {
                        return true; // Collide with walls
                    }
                    
                    // Check if we're in the post regions
                    return Math.abs(gateCenter) >= gateWidth/2 - pillarSize;
                }
                
                // For walls without gates, always collide
                return true;
            }
        }
        
        return false;
    }

    // Method to get gate position and orientation
    getGateInfo() {
        const squareSize = 40;
        const perimeterSize = squareSize + squareSize/2;
        
        let gatePosition = { x: 0, z: 0 };
        let gateDirection = { x: 0, z: 0 };
        
        if (this.x < 0) { // Left bases
            gatePosition = { x: this.x + perimeterSize, z: this.z };
            gateDirection = { x: 1, z: 0 };
        } else if (this.x > 0) { // Right bases
            gatePosition = { x: this.x - perimeterSize, z: this.z };
            gateDirection = { x: -1, z: 0 };
        } else if (this.z < 0) { // Bottom bases
            gatePosition = { x: this.x, z: this.z + perimeterSize };
            gateDirection = { x: 0, z: 1 };
        } else { // Top bases
            gatePosition = { x: this.x, z: this.z - perimeterSize };
            gateDirection = { x: 0, z: -1 };
        }
        
        return {
            position: gatePosition,
            direction: gateDirection,
            width: 15 // Gate width
        };
    }

    // Method to check if a point is near the gate
    isPointNearGate(x, z) {
        const gateInfo = this.getGateInfo();
        const gateWidth = 15;
        const pillarSize = 3;
        const wallThickness = 2;
        const effectiveGateWidth = gateWidth - pillarSize * 2; // Adjust for both gate posts
        
        // Calculate distance to gate center
        const dx = x - gateInfo.position.x;
        const dz = z - gateInfo.position.z;
        
        // Calculate distance along gate direction and perpendicular to it
        const alongGate = dx * gateInfo.direction.x + dz * gateInfo.direction.z;
        const perpToGate = Math.abs(dx * gateInfo.direction.z - dz * gateInfo.direction.x);
        
        // Check if we're within the gate opening
        return Math.abs(alongGate) < wallThickness * 2 && perpToGate < effectiveGateWidth/2;
    }
} 