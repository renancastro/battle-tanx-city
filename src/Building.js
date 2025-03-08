import * as THREE from 'three';

export class Building {
    constructor(scene, x, z) {
        this.scene = scene;
        this.x = x;
        this.z = z;
        this.maxHealth = 400;
        this.currentHealth = this.maxHealth;
        this.destroyed = false;
        this.buildingGroup = new THREE.Group();
        this.damageLevel = 0;
        this.createBuilding();
        this.createHealthBar();
    }

    createBuilding() {
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
        
        // Create building container
        this.buildingGroup = new THREE.Group();
        this.buildingGroup.userData.isBuilding = true;
        this.buildingGroup.userData.buildingInstance = this;
        
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

        // Position the building
        this.buildingGroup.position.set(this.x, 0, this.z);

        // Add to scene
        this.scene.add(this.buildingGroup);
    }

    createHealthBar() {
        // Create container for health bar that will follow building
        this.healthBarContainer = new THREE.Object3D();
        
        // Background bar (gray)
        const backgroundGeometry = new THREE.PlaneGeometry(3, 0.3);
        const backgroundMaterial = new THREE.MeshBasicMaterial({
            color: 0x444444,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        this.healthBarBackground = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
        
        // Health bar (green)
        const healthGeometry = new THREE.PlaneGeometry(3, 0.3);
        const healthMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        this.healthBar = new THREE.Mesh(healthGeometry, healthMaterial);
        
        // Add meshes to container
        this.healthBarContainer.add(this.healthBarBackground);
        this.healthBarContainer.add(this.healthBar);
        
        // Position the health bar above the building
        const buildingHeight = this.buildingGroup.children[0].geometry.parameters.height;
        this.healthBarContainer.position.set(this.x, buildingHeight + 2, this.z);
        
        // Add container to scene
        this.scene.add(this.healthBarContainer);
        
        // Initially hide the health bar
        this.healthBarContainer.visible = false;
    }

    updateHealthBar() {
        // Show health bar when damaged
        if (this.currentHealth < this.maxHealth) {
            this.healthBarContainer.visible = true;
        }
        
        // Update health bar scale based on current health
        const healthPercent = this.currentHealth / this.maxHealth;
        this.healthBar.scale.x = Math.max(0, healthPercent);
        
        // Update color based on health percentage
        if (healthPercent > 0.6) {
            this.healthBar.material.color.setHex(0x00ff00); // Green
        } else if (healthPercent > 0.3) {
            this.healthBar.material.color.setHex(0xffff00); // Yellow
        } else {
            this.healthBar.material.color.setHex(0xff0000); // Red
        }
        
        // Position the health bar to scale from left to right
        this.healthBar.position.x = -1.5 * (1 - healthPercent);
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
        this.updateHealthBar();
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
        
        // Hide health bar
        this.healthBarContainer.visible = false;
        
        // Collapse building (animate downward and fade out)
        const duration = 1000; // 1 second
        const startTime = Date.now();
        const startHeight = this.buildingGroup.position.y;
        const startOpacity = 1;
        
        const animate = () => {
            const now = Date.now();
            const progress = Math.min(1, (now - startTime) / duration);
            
            // Ease out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            // Animate position and opacity
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
                // Remove building from scene
                this.scene.remove(this.buildingGroup);
                this.scene.remove(this.healthBarContainer);
                
                // Dispatch event for scoring
                const event = new CustomEvent('buildingDestroyed', {
                    detail: { x: this.x, z: this.z }
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