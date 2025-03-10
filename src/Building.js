import * as THREE from 'three';

export class Building {
    constructor(scene, x, z, type = 'regular') {
        this.scene = scene;
        this.x = x;
        this.z = z;
        this.type = type;
        this.maxHealth = type === 'military' ? 600 : 400;  // Military buildings are tougher
        this.currentHealth = this.maxHealth;
        this.destroyed = false;
        this.buildingGroup = new THREE.Group();
        this.buildingGroup.userData.isBuilding = true;
        this.buildingGroup.userData.buildingInstance = this;
        this.damageLevel = 0;
        this.createBuilding();
    }

    createBuilding() {
        switch(this.type) {
            case 'military_airport':
                this.createMilitaryAirport();
                break;
            case 'military_barracks':
                this.createMilitaryBarracks();
                break;
            case 'military_control_tower':
                this.createControlTower();
                break;
            case 'military_factory':
                this.createMilitaryFactory();
                break;
            case 'military_science':
                this.createScienceFacility();
                break;
            default:
                this.createRegularBuilding();
        }

        // Position the building
        this.buildingGroup.position.set(this.x, 0, this.z);
        this.scene.add(this.buildingGroup);
    }

    createMilitaryAirport() {
        const materials = {
            main: new THREE.MeshStandardMaterial({ 
                color: 0x4b5320, // Olive drab
                roughness: 0.8,
                metalness: 0.2
            }),
            runway: new THREE.MeshStandardMaterial({ 
                color: 0x1a1a1a, // Dark asphalt
                roughness: 0.9 
            }),
            details: new THREE.MeshStandardMaterial({ 
                color: 0x8b7355, // Khaki
                roughness: 0.6,
                metalness: 0.3
            })
        };

        // Main terminal building
        const terminal = new THREE.Mesh(
            new THREE.BoxGeometry(15, 8, 20),
            materials.main
        );
        terminal.position.y = 4;
        this.buildingGroup.add(terminal);

        // Runway
        const runway = new THREE.Mesh(
            new THREE.BoxGeometry(40, 0.5, 10),
            materials.runway
        );
        runway.position.set(20, 0.25, 0);
        this.buildingGroup.add(runway);

        // Control tower
        const tower = new THREE.Mesh(
            new THREE.CylinderGeometry(2, 2, 15, 8),
            materials.details
        );
        tower.position.set(-5, 7.5, -8);
        this.buildingGroup.add(tower);
    }

    createMilitaryBarracks() {
        const materials = {
            walls: new THREE.MeshStandardMaterial({ 
                color: 0x5d5d3d, // Military green
                roughness: 0.8,
                metalness: 0.1
            }),
            roof: new THREE.MeshStandardMaterial({ 
                color: 0x3d3d28, // Darker military green
                roughness: 0.7,
                metalness: 0.2
            })
        };

        // Multiple barrack buildings
        for (let i = 0; i < 3; i++) {
            const barracks = new THREE.Mesh(
                new THREE.BoxGeometry(8, 4, 20),
                materials.walls
            );
            barracks.position.set((i - 1) * 10, 2, 0);
            this.buildingGroup.add(barracks);

            // Sloped roof for each building
            const roof = new THREE.Mesh(
                new THREE.ConeGeometry(4, 2, 4),
                materials.roof
            );
            roof.rotation.y = Math.PI / 4;
            roof.position.set((i - 1) * 10, 5, 0);
            roof.scale.set(2, 1, 5);
            this.buildingGroup.add(roof);
        }
    }

    createControlTower() {
        const materials = {
            base: new THREE.MeshStandardMaterial({ 
                color: 0x4a5f2a, // Dark olive green
                roughness: 0.7,
                metalness: 0.3
            }),
            glass: new THREE.MeshStandardMaterial({ 
                color: 0x88ccff,
                transparent: true,
                opacity: 0.6,
                roughness: 0.2,
                metalness: 0.8
            }),
            details: new THREE.MeshStandardMaterial({
                color: 0x2f3d1b, // Darker military green
                roughness: 0.6,
                metalness: 0.4
            })
        };

        // Base structure
        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(3, 4, 20, 8),
            materials.base
        );
        base.position.y = 10;
        this.buildingGroup.add(base);

        // Control room
        const controlRoom = new THREE.Mesh(
            new THREE.CylinderGeometry(6, 6, 5, 8),
            materials.glass
        );
        controlRoom.position.y = 22;
        this.buildingGroup.add(controlRoom);

        // Add radar dish
        const radarBase = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.5, 2, 8),
            materials.details
        );
        radarBase.position.y = 25;
        this.buildingGroup.add(radarBase);

        const radarDish = new THREE.Mesh(
            new THREE.SphereGeometry(2, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
            materials.details
        );
        radarDish.rotation.x = Math.PI / 4;
        radarDish.position.y = 26;
        this.buildingGroup.add(radarDish);
    }

    createMilitaryFactory() {
        const materials = {
            walls: new THREE.MeshStandardMaterial({ 
                color: 0x4f5942, // Military olive
                roughness: 0.8,
                metalness: 0.2
            }),
            roof: new THREE.MeshStandardMaterial({ 
                color: 0x363d2d, // Dark military green
                roughness: 0.7,
                metalness: 0.3
            }),
            details: new THREE.MeshStandardMaterial({ 
                color: 0x6b735a, // Light military green
                roughness: 0.6,
                metalness: 0.4
            })
        };

        // Main factory building
        const mainBuilding = new THREE.Mesh(
            new THREE.BoxGeometry(30, 12, 20),
            materials.walls
        );
        mainBuilding.position.y = 6;
        this.buildingGroup.add(mainBuilding);

        // Smokestacks
        for (let i = 0; i < 3; i++) {
            const smokestack = new THREE.Mesh(
                new THREE.CylinderGeometry(1, 1.5, 8, 8),
                materials.details
            );
            smokestack.position.set(-10 + i * 8, 12, -5);
            this.buildingGroup.add(smokestack);
        }

        // Add some industrial details
        const roofStructure = new THREE.Mesh(
            new THREE.BoxGeometry(28, 2, 18),
            materials.roof
        );
        roofStructure.position.y = 13;
        this.buildingGroup.add(roofStructure);
    }

    createScienceFacility() {
        const materials = {
            base: new THREE.MeshStandardMaterial({ 
                color: 0x4d5d53, // Military sage
                roughness: 0.7,
                metalness: 0.4
            }),
            dome: new THREE.MeshStandardMaterial({ 
                color: 0x6b7c70, // Light military sage
                roughness: 0.3,
                metalness: 0.8
            }),
            details: new THREE.MeshStandardMaterial({
                color: 0x3a463e, // Dark military sage
                roughness: 0.5,
                metalness: 0.6
            })
        };

        // Main research building
        const base = new THREE.Mesh(
            new THREE.BoxGeometry(25, 8, 25),
            materials.base
        );
        base.position.y = 4;
        this.buildingGroup.add(base);

        // Geodesic dome
        const dome = new THREE.Mesh(
            new THREE.SphereGeometry(10, 16, 16),
            materials.dome
        );
        dome.position.y = 14;
        this.buildingGroup.add(dome);

        // Add research antennas
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const antenna = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2, 0.2, 6, 8),
                materials.details
            );
            antenna.position.set(
                Math.cos(angle) * 8,
                16,
                Math.sin(angle) * 8
            );
            antenna.rotation.x = Math.PI / 6;
            antenna.rotation.y = angle;
            this.buildingGroup.add(antenna);
        }
    }

    createRegularBuilding() {
        // Random building properties
        const width = 15 + Math.random() * 10;  // 15-25 width
        const depth = 15 + Math.random() * 10;  // 15-25 depth
        const height = 20 + Math.random() * 30; // 20-50 height
        
        // Store dimensions for damage states
        this.dimensions = { width, depth, height };
        
        // Building colors (modern urban palette)
        const buildingColors = [
            0x808080, // Gray
            0x606060, // Dark gray
            0x707070, // Medium gray
            0x505050, // Charcoal
            0x404040, // Dark charcoal
            0x909090, // Light gray
        ];
        const randomColor = buildingColors[Math.floor(Math.random() * buildingColors.length)];
        
        // Main building body
        const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
        const buildingMaterial = new THREE.MeshStandardMaterial({
            color: randomColor,
            roughness: 0.7,
            metalness: 0.2
        });
        this.mainBuilding = new THREE.Mesh(buildingGeometry, buildingMaterial);
        this.mainBuilding.position.y = height / 2;
        this.mainBuilding.castShadow = true;
        this.mainBuilding.receiveShadow = true;
        this.buildingGroup.add(this.mainBuilding);

        // Store original material for damage states
        this.originalMaterial = buildingMaterial.clone();
        
        // Create damage overlay geometries (will be invisible initially)
        this.createDamageOverlays(width, height, depth);

        // Add windows
        const windowMaterial = new THREE.MeshStandardMaterial({
            color: 0x88ccff,
            roughness: 0.3,
            metalness: 0.8,
            emissive: 0x88ccff,
            emissiveIntensity: 0.2
        });

        // Window parameters
        const windowSize = 1.5;
        const windowSpacing = 3;
        const windowDepth = 0.1;

        // Calculate number of windows based on building size
        const windowsPerFloor = {
            x: Math.floor((width - 4) / windowSpacing),
            z: Math.floor((depth - 4) / windowSpacing)
        };
        const floors = Math.floor(height / windowSpacing);

        // Create windows for each face
        const faces = [
            { axis: 'x', sign: 1, rotation: Math.PI / 2 },    // Right face
            { axis: 'x', sign: -1, rotation: -Math.PI / 2 },  // Left face
            { axis: 'z', sign: 1, rotation: 0 },              // Front face
            { axis: 'z', sign: -1, rotation: Math.PI }        // Back face
        ];

        faces.forEach(face => {
            const windowsCount = face.axis === 'x' ? windowsPerFloor.z : windowsPerFloor.x;
            const buildingSide = face.axis === 'x' ? depth : width;
            
            for (let floor = 1; floor < floors; floor++) {
                for (let w = 0; w < windowsCount; w++) {
                    const windowGeometry = new THREE.BoxGeometry(windowSize, windowSize, windowDepth);
                    const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);

                    // Position window
                    const offset = (buildingSide - windowSize) / 2;
                    const spacing = (buildingSide - windowSize) / (windowsCount + 1);
                    const pos = -offset + (w + 1) * spacing;
                    
                    if (face.axis === 'x') {
                        windowMesh.position.set(
                            (width/2) * face.sign,
                            floor * windowSpacing,
                            pos
                        );
                    } else {
                        windowMesh.position.set(
                            pos,
                            floor * windowSpacing,
                            (depth/2) * face.sign
                        );
                    }
                    
                    windowMesh.rotation.y = face.rotation;
                    this.buildingGroup.add(windowMesh);
                }
            }
        });

        // Add roof details
        const roofDetail = new THREE.Mesh(
            new THREE.BoxGeometry(width - 2, 2, depth - 2),
            new THREE.MeshStandardMaterial({
                color: 0x505050,
                roughness: 0.9,
                metalness: 0.1
            })
        );
        roofDetail.position.y = height + 1;
        this.buildingGroup.add(roofDetail);
    }

    createDamageOverlays(width, height, depth) {
        // Create damage textures
        const crackTexture1 = this.createCrackTexture(0.3); // Light damage
        const crackTexture2 = this.createCrackTexture(0.6); // Medium damage
        const crackTexture3 = this.createCrackTexture(0.9); // Heavy damage

        // Create damage overlay meshes for each side
        const sides = [
            { size: [width, height], pos: [0, height/2, depth/2], rot: [0, 0, 0] },    // Front
            { size: [width, height], pos: [0, height/2, -depth/2], rot: [0, Math.PI, 0] }, // Back
            { size: [depth, height], pos: [width/2, height/2, 0], rot: [0, Math.PI/2, 0] }, // Right
            { size: [depth, height], pos: [-width/2, height/2, 0], rot: [0, -Math.PI/2, 0] } // Left
        ];

        this.damageOverlays = [];

        sides.forEach(side => {
            const overlayGeometry = new THREE.PlaneGeometry(side.size[0], side.size[1]);
            
            // Create three levels of damage overlays for each side
            [crackTexture1, crackTexture2, crackTexture3].forEach((texture, index) => {
                const overlayMaterial = new THREE.MeshStandardMaterial({
                    map: texture,
                    transparent: true,
                    opacity: 0,
                    depthWrite: false,
                    roughness: 0.8,
                    metalness: 0.2
                });

                const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
                overlay.position.set(...side.pos);
                overlay.rotation.set(...side.rot);
                overlay.renderOrder = 1;
                
                this.buildingGroup.add(overlay);
                this.damageOverlays.push({
                    mesh: overlay,
                    level: index + 1
                });
            });
        });
    }

    createCrackTexture(intensity) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Fill with transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Create cracks
        const numCracks = Math.floor(20 * intensity);
        ctx.strokeStyle = 'rgba(40, 40, 40, 0.8)';
        ctx.lineWidth = 3;

        for (let i = 0; i < numCracks; i++) {
            const startX = Math.random() * canvas.width;
            const startY = Math.random() * canvas.height;
            ctx.beginPath();
            ctx.moveTo(startX, startY);

            let x = startX;
            let y = startY;
            const segments = 5 + Math.floor(Math.random() * 5);
            
            for (let j = 0; j < segments; j++) {
                const angleChange = (Math.random() - 0.5) * Math.PI * 0.5;
                const length = 20 + Math.random() * 40;
                x += Math.cos(angleChange) * length;
                y += Math.sin(angleChange) * length;
                ctx.lineTo(x, y);
            }
            
            ctx.stroke();

            // Add some debris around cracks
            const debrisCount = Math.floor(Math.random() * 5);
            ctx.fillStyle = 'rgba(40, 40, 40, 0.6)';
            for (let k = 0; k < debrisCount; k++) {
                const debrisX = x + (Math.random() - 0.5) * 20;
                const debrisY = y + (Math.random() - 0.5) * 20;
                const debrisSize = 2 + Math.random() * 4;
                ctx.beginPath();
                ctx.arc(debrisX, debrisY, debrisSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    updateDamageState() {
        const healthPercent = this.currentHealth / this.maxHealth;
        const newDamageLevel = healthPercent <= 0.25 ? 3 :
                              healthPercent <= 0.5 ? 2 :
                              healthPercent <= 0.75 ? 1 : 0;

        if (newDamageLevel !== this.damageLevel) {
            this.damageLevel = newDamageLevel;
            
            // Update damage overlays visibility
            this.damageOverlays.forEach(overlay => {
                if (overlay.level <= this.damageLevel) {
                    // Fade in the appropriate damage level
                    const targetOpacity = 0.2 + (overlay.level * 0.2);
                    const startOpacity = overlay.mesh.material.opacity;
                    const duration = 500;
                    const startTime = Date.now();

                    const animate = () => {
                        const progress = (Date.now() - startTime) / duration;
                        if (progress < 1) {
                            overlay.mesh.material.opacity = startOpacity + (targetOpacity - startOpacity) * progress;
                            requestAnimationFrame(animate);
                        } else {
                            overlay.mesh.material.opacity = targetOpacity;
                        }
                    };
                    animate();
                }
            });

            // Add some falling debris when damage increases
            if (newDamageLevel > 0) {
                this.createDebrisEffect(newDamageLevel);
            }
        }
    }

    createDebrisEffect(damageLevel) {
        const debrisCount = 10 + (damageLevel * 5);
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(debrisCount * 3);
        const sizes = new Float32Array(debrisCount);
        const velocities = [];

        for (let i = 0; i < debrisCount; i++) {
            // Random position on the building surface
            positions[i * 3] = (Math.random() - 0.5) * this.dimensions.width;
            positions[i * 3 + 1] = Math.random() * this.dimensions.height;
            positions[i * 3 + 2] = (Math.random() - 0.5) * this.dimensions.depth;

            velocities.push({
                x: (Math.random() - 0.5) * 0.2,
                y: -Math.random() * 0.3,
                z: (Math.random() - 0.5) * 0.2
            });

            sizes[i] = Math.random() * 0.5 + 0.2;
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            color: this.originalMaterial.color,
            size: 0.5,
            transparent: true,
            opacity: 0.8
        });

        const debris = new THREE.Points(geometry, material);
        debris.position.copy(this.mainBuilding.position);
        this.scene.add(debris);

        // Animate debris falling
        const startTime = Date.now();
        const duration = 1000;

        const animateDebris = () => {
            const progress = (Date.now() - startTime) / duration;
            
            if (progress < 1) {
                const positions = debris.geometry.attributes.position.array;
                
                for (let i = 0; i < debrisCount; i++) {
                    positions[i * 3] += velocities[i].x;
                    positions[i * 3 + 1] += velocities[i].y;
                    positions[i * 3 + 2] += velocities[i].z;
                    velocities[i].y -= 0.01; // Gravity
                }
                
                debris.geometry.attributes.position.needsUpdate = true;
                material.opacity = 1 - progress;
                
                requestAnimationFrame(animateDebris);
            } else {
                this.scene.remove(debris);
            }
        };

        animateDebris();
    }

    takeDamage(amount) {
        if (this.destroyed) return;
        
        this.currentHealth = Math.max(0, this.currentHealth - amount);
        this.updateDamageState();

        if (this.currentHealth <= 0) {
            this.destroy();
        }
    }

    destroy() {
        if (this.destroyed) return;
        
        this.destroyed = true;
        
        // Create explosion effect
        this.createExplosionEffect();
        
        // Collapse building (animate downward and fade out)
        const duration = 1000;
        const startTime = Date.now();
        const startHeight = this.buildingGroup.position.y;
        const startOpacity = 1;
        
        const animate = () => {
            const now = Date.now();
            const progress = Math.min(1, (now - startTime) / duration);
            
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            this.buildingGroup.position.y = startHeight * (1 - easeProgress);
            this.buildingGroup.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                    if (!object.material.transparent) {
                        object.material.transparent = true;
                    }
                    object.material.opacity = startOpacity * (1 - easeProgress);
                }
            });
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(this.buildingGroup);
                
                // Dispatch event with building type for scoring
                const event = new CustomEvent('buildingDestroyed', {
                    detail: { 
                        x: this.x, 
                        z: this.z,
                        isMilitary: this.type.startsWith('military_')
                    }
                });
                window.dispatchEvent(event);
            }
        };
        
        animate();
    }

    createExplosionEffect() {
        // Create particle system for explosion
        const particleCount = 50;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];
        const sizes = new Float32Array(particleCount);
        
        for (let i = 0; i < particleCount; i++) {
            // Random position within building bounds
            positions[i * 3] = this.x + (Math.random() - 0.5) * 10;
            positions[i * 3 + 1] = this.buildingGroup.position.y + Math.random() * 20;
            positions[i * 3 + 2] = this.z + (Math.random() - 0.5) * 10;
            
            // Random velocity
            velocities.push({
                x: (Math.random() - 0.5) * 0.5,
                y: Math.random() * 0.5,
                z: (Math.random() - 0.5) * 0.5
            });
            
            // Random size
            sizes[i] = Math.random() * 2 + 1;
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            color: 0xff4400,
            size: 1,
            transparent: true,
            opacity: 1,
            map: this.createExplosionParticleTexture()
        });
        
        const particles = new THREE.Points(geometry, material);
        this.scene.add(particles);
        
        // Animate particles
        const startTime = Date.now();
        const duration = 1500;
        
        const animateParticles = () => {
            const now = Date.now();
            const progress = (now - startTime) / duration;
            
            if (progress < 1) {
                const positions = particles.geometry.attributes.position.array;
                
                for (let i = 0; i < particleCount; i++) {
                    positions[i * 3] += velocities[i].x;
                    positions[i * 3 + 1] += velocities[i].y;
                    positions[i * 3 + 2] += velocities[i].z;
                    
                    // Add gravity effect
                    velocities[i].y -= 0.01;
                }
                
                particles.geometry.attributes.position.needsUpdate = true;
                material.opacity = 1 - progress;
                
                requestAnimationFrame(animateParticles);
            } else {
                this.scene.remove(particles);
            }
        };
        
        animateParticles();
    }

    createExplosionParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.3, 'rgba(255,180,0,1)');
        gradient.addColorStop(0.7, 'rgba(255,0,0,0.5)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 32, 32);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
} 