import * as THREE from 'three';

export class Tank {
    constructor(scene) {
        // Tank properties
        this.speed = 1.0;
        this.rotationSpeed = 0.15;
        this.turretRotationSpeed = 0.1;
        
        // Movement state
        this.keys = {
            w: false,
            s: false,
            a: false,
            d: false
        };

        // Projectile properties
        this.projectileSpeed = 0.5;
        this.projectiles = [];
        this.projectileLifetime = 3000; // milliseconds

        // Muzzle flash properties
        this.flashDuration = 150; // milliseconds
        this.muzzleFlash = null;
        this.flashLight = null;
        this.lastFlashTime = 0;

        this.scene = scene;
        this.createTank();
        this.setupEventListeners();
    }

    createTank() {
        // Tank body
        const tankBodyGeometry = new THREE.BoxGeometry(2, 1, 3);
        const tankMaterial = new THREE.MeshStandardMaterial({ color: 0x4a5320 });
        this.body = new THREE.Mesh(tankBodyGeometry, tankMaterial);
        this.body.position.y = 0.5;
        this.body.castShadow = true;
        this.scene.add(this.body);

        // Tank turret
        const turretGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.5, 8);
        this.turret = new THREE.Mesh(turretGeometry, tankMaterial);
        this.turret.position.y = 1;
        this.turret.castShadow = true;
        this.body.add(this.turret);

        // Tank cannon
        const cannonGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2);
        this.cannon = new THREE.Mesh(cannonGeometry, tankMaterial);
        this.cannon.position.z = 1;
        this.cannon.rotation.x = Math.PI / 2;
        this.turret.add(this.cannon);

        // Projectile template
        this.projectileGeometry = new THREE.SphereGeometry(0.2);
        this.projectileMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 1,
            toneMapped: false
        });
    }

    createMuzzleFlash() {
        // Create the flash mesh
        const flashGeometry = new THREE.ConeGeometry(0.3, 0.8, 16);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffa500,
            transparent: true,
            opacity: 1
        });
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        
        // Create a container for proper positioning
        const flashContainer = new THREE.Object3D();
        this.cannon.add(flashContainer);
        
        // Position and rotate the container
        flashContainer.position.set(0, 1, 0);
        flashContainer.rotation.x = -Math.PI / 2;
        
        // Add flash to container with proper rotation and position
        flash.rotation.x = -Math.PI / 2;
        flash.position.set(0, 0, 0);
        flash.visible = false;
        flashContainer.add(flash);
        
        // Create a point light for the flash
        const light = new THREE.PointLight(0xffa500, 5, 3);
        light.position.copy(flash.position);
        light.visible = false;
        flashContainer.add(light);
        
        return {
            mesh: flash,
            light: light
        };
    }

    fireProjectile() {
        const projectile = new THREE.Mesh(this.projectileGeometry, this.projectileMaterial);
        
        // Position projectile at the end of the cannon
        const cannonTip = new THREE.Vector3();
        this.cannon.getWorldPosition(cannonTip);
        
        // Get the cannon's forward direction
        const direction = new THREE.Vector3(0, 0, 1);
        direction.applyQuaternion(this.turret.getWorldQuaternion(new THREE.Quaternion()));
        
        // Move the spawn point to the end of the cannon
        cannonTip.add(direction.multiplyScalar(2));
        projectile.position.copy(cannonTip);
        
        // Reset direction for velocity
        direction.set(0, 0, 1);
        direction.applyQuaternion(this.turret.getWorldQuaternion(new THREE.Quaternion()));
        
        // Set velocity
        projectile.userData.velocity = direction.multiplyScalar(this.projectileSpeed);
        projectile.userData.createdAt = Date.now();
        
        this.scene.add(projectile);
        this.projectiles.push(projectile);

        // Show muzzle flash
        if (!this.muzzleFlash) {
            const flash = this.createMuzzleFlash();
            this.muzzleFlash = flash.mesh;
            this.flashLight = flash.light;
        }
        this.muzzleFlash.visible = true;
        this.flashLight.visible = true;
        this.lastFlashTime = Date.now();
    }

    handleKeyDown(event) {
        const key = event.key.toLowerCase();
        if (this.keys.hasOwnProperty(key)) {
            this.keys[key] = true;
        }
    }

    handleKeyUp(event) {
        const key = event.key.toLowerCase();
        if (this.keys.hasOwnProperty(key)) {
            this.keys[key] = false;
        }
    }

    setupEventListeners() {
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
    }

    updateProjectiles() {
        const now = Date.now();
        
        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            // Move projectile
            if (projectile.userData.velocity) {
                projectile.position.x += projectile.userData.velocity.x;
                projectile.position.y += projectile.userData.velocity.y;
                projectile.position.z += projectile.userData.velocity.z;
            }
            
            // Remove old projectiles
            if (now - projectile.userData.createdAt > this.projectileLifetime) {
                this.scene.remove(projectile);
                this.projectiles.splice(i, 1);
                continue;
            }
        }

        // Update muzzle flash
        if (this.muzzleFlash && this.muzzleFlash.visible) {
            if (now - this.lastFlashTime > this.flashDuration) {
                this.muzzleFlash.visible = false;
                this.flashLight.visible = false;
            } else {
                // Animate flash opacity and light intensity
                const flashAge = now - this.lastFlashTime;
                const fadeRatio = 1 - flashAge / this.flashDuration;
                this.muzzleFlash.material.opacity = fadeRatio;
                this.flashLight.intensity = 5 * fadeRatio;
                
                // Animate flash scale
                const scalePhase = (1 - fadeRatio) * Math.PI;
                const scale = 1 + 0.5 * Math.sin(scalePhase);
                this.muzzleFlash.scale.set(scale, scale, scale);
            }
        }
    }

    update(ground, mouse, raycaster, camera) {
        // Tank movement
        if (this.keys.w) {
            this.body.position.x += Math.sin(this.body.rotation.y) * this.speed;
            this.body.position.z += Math.cos(this.body.rotation.y) * this.speed;
        }
        if (this.keys.s) {
            this.body.position.x -= Math.sin(this.body.rotation.y) * this.speed;
            this.body.position.z -= Math.cos(this.body.rotation.y) * this.speed;
        }
        if (this.keys.a) {
            this.body.rotation.y += this.rotationSpeed;
        }
        if (this.keys.d) {
            this.body.rotation.y -= this.rotationSpeed;
        }

        // Turret rotation
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(ground);
        
        if (intersects.length > 0) {
            const targetPoint = intersects[0].point;
            const tankPosition = this.body.position.clone();
            const direction = targetPoint.sub(tankPosition);
            const angle = Math.atan2(direction.x, direction.z);
            this.turret.rotation.y = -this.body.rotation.y + angle;
        }

        this.updateProjectiles();
    }

    getPosition() {
        return this.body.position;
    }
} 