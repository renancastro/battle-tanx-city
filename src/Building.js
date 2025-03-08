import * as THREE from 'three';

export class Building {
    constructor(scene, x, z) {
        this.scene = scene;
        this.x = x;
        this.z = z;
        this.maxHealth = 100;
        this.currentHealth = this.maxHealth;
        this.destroyed = false;
        this.buildingGroup = new THREE.Group();
        this.createBuilding();
        this.createHealthBar();
    }

    createBuilding() {
        // Random building properties
        const width = 15 + Math.random() * 10;  // 15-25 width
        const depth = 15 + Math.random() * 10;  // 15-25 depth
        const height = 20 + Math.random() * 30; // 20-50 height
        
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
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.y = height / 2;
        building.castShadow = true;
        building.receiveShadow = true;
        this.buildingGroup.add(building);

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

    takeDamage(amount) {
        if (this.destroyed) return;
        
        this.currentHealth = Math.max(0, this.currentHealth - amount);
        this.updateHealthBar();
        
        // Flash the building red when taking damage
        this.buildingGroup.traverse((object) => {
            if (object instanceof THREE.Mesh && object.material.color) {
                const originalColor = object.material.color.getHex();
                object.material.color.setHex(0xff0000);
                
                setTimeout(() => {
                    object.material.color.setHex(originalColor);
                }, 100);
            }
        });

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