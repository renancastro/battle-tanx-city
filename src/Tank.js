import * as THREE from 'three';

export class Tank {
    constructor(scene, audioManager, tankType = 'M1A1') {
        // Tank properties
        this.speed = 4.0;
        this.rotationSpeed = 0.4;
        this.turretRotationSpeed = 0.2;
        this.tankType = tankType; // 'M1A1' or 'ModelS'
        
        // Audio system
        this.audioManager = audioManager;
        
        // Health system
        this.maxHealth = 100;
        this.currentHealth = this.maxHealth;
        
        // Movement state
        this.keys = {
            w: false,
            s: false,
            a: false,
            d: false
        };

        // Recoil properties
        this.recoilAmount = 0.3;
        this.recoilDuration = 150;
        this.recoilRecoveryDuration = 300;
        this.isRecoiling = false;
        this.recoilStartTime = 0;
        this.originalCannonPosition = null;
        this.originalTurretRotation = null;

        // Projectile properties
        this.projectileSpeed = 8.0;
        this.projectiles = [];
        this.projectileLifetime = 1500;
        this.projectileSize = 0.15;

        // Muzzle flash properties
        this.flashDuration = 100;
        this.muzzleFlash = null;
        this.flashLight = null;
        this.lastFlashTime = 0;

        this.scene = scene;
        
        // Position tank in a random base
        const baseOffset = 380;
        const basePositions = [
            { x: -baseOffset, z: -baseOffset, rotation: Math.PI / 4, color: 0xff0000 },    // Bottom-left, Red
            { x: -baseOffset, z: baseOffset, rotation: -Math.PI / 4, color: 0x0000ff },    // Top-left, Blue
            { x: baseOffset, z: -baseOffset, rotation: 3 * Math.PI / 4, color: 0x00ff00 }, // Bottom-right, Green
            { x: baseOffset, z: baseOffset, rotation: -3 * Math.PI / 4, color: 0xffff00 }  // Top-right, Yellow
        ];
        
        // Randomly select a base
        const spawnBase = basePositions[Math.floor(Math.random() * basePositions.length)];
        this.tankColor = spawnBase.color;
        
        this.createTank();
        
        // Position and rotate tank to face the gate
        this.body.position.set(spawnBase.x, 0.6, spawnBase.z);
        this.body.rotation.y = spawnBase.rotation;
        
        this.createHealthBar();
        this.setupEventListeners();
    }

    createTank() {
        if (this.tankType === 'ModelS') {
            this.createTeslaModelS();
        } else {
            this.createM1A1();
        }

        // Enable shadows
        this.body.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });

        // Add to scene
        this.scene.add(this.body);

        // Projectile template
        this.projectileGeometry = new THREE.SphereGeometry(0.2);
        this.projectileMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 1,
            toneMapped: false
        });
    }

    createTeslaModelS() {
        // Tesla Model S materials
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: this.tankColor,
            roughness: 0.2,
            metalness: 0.8
        });
        const glassMaterial = new THREE.MeshStandardMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.6,
            roughness: 0.2,
            metalness: 0.9
        });
        const detailMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.5,
            metalness: 0.7
        });
        const lightMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.5,
            roughness: 0.3,
            metalness: 0.9
        });

        // Main body group
        this.body = new THREE.Group();

        // Lower body (main chassis)
        const lowerBodyGeometry = new THREE.BoxGeometry(3.8, 0.6, 5.2);
        const lowerBody = new THREE.Mesh(lowerBodyGeometry, bodyMaterial);
        lowerBody.position.set(0, 0.5, 0);
        this.body.add(lowerBody);

        // Middle body (passenger compartment)
        const middleBodyGeometry = new THREE.BoxGeometry(3.6, 0.8, 4.8);
        const middleBody = new THREE.Mesh(middleBodyGeometry, bodyMaterial);
        middleBody.position.set(0, 1.2, 0);
        this.body.add(middleBody);

        // Upper body (roof)
        const upperBodyGeometry = new THREE.BoxGeometry(3.4, 0.4, 4.4);
        const upperBody = new THREE.Mesh(upperBodyGeometry, bodyMaterial);
        upperBody.position.set(0, 1.8, 0);
        this.body.add(upperBody);

        // Front hood (sloped)
        const hoodGeometry = new THREE.BoxGeometry(3.6, 0.2, 1.8);
        const hood = new THREE.Mesh(hoodGeometry, bodyMaterial);
        hood.position.set(0, 1.3, -1.8);
        hood.rotation.x = -Math.PI * 0.06;
        this.body.add(hood);

        // Rear trunk (slightly raised)
        const trunkGeometry = new THREE.BoxGeometry(3.6, 0.2, 1.4);
        const trunk = new THREE.Mesh(trunkGeometry, bodyMaterial);
        trunk.position.set(0, 1.4, 1.8);
        trunk.rotation.x = Math.PI * 0.03;
        this.body.add(trunk);

        // Front nose cone
        const noseGeometry = new THREE.BoxGeometry(3.6, 0.8, 1.0);
        const nose = new THREE.Mesh(noseGeometry, bodyMaterial);
        nose.position.set(0, 0.8, -2.4);
        this.body.add(nose);

        // Side skirts
        const skirtGeometry = new THREE.BoxGeometry(0.2, 0.4, 4.8);
        const leftSkirt = new THREE.Mesh(skirtGeometry, bodyMaterial);
        leftSkirt.position.set(-1.9, 0.4, 0);
        this.body.add(leftSkirt);

        const rightSkirt = leftSkirt.clone();
        rightSkirt.position.x = 1.9;
        this.body.add(rightSkirt);

        // Roof curves
        const roofCurveGeometry = new THREE.CylinderGeometry(0.4, 0.4, 3.4, 16, 1, true, Math.PI, Math.PI);
        const frontRoofCurve = new THREE.Mesh(roofCurveGeometry, bodyMaterial);
        frontRoofCurve.rotation.z = Math.PI / 2;
        frontRoofCurve.position.set(0, 1.8, -1.2);
        this.body.add(frontRoofCurve);

        const rearRoofCurve = frontRoofCurve.clone();
        rearRoofCurve.position.z = 1.2;
        this.body.add(rearRoofCurve);

        // Windshield
        const windshieldGeometry = new THREE.PlaneGeometry(3.2, 1.2);
        const windshield = new THREE.Mesh(windshieldGeometry, glassMaterial);
        windshield.rotation.x = -Math.PI * 0.25;
        windshield.position.set(0, 1.6, -1.2);
        this.body.add(windshield);

        // Rear window
        const rearWindow = windshield.clone();
        rearWindow.rotation.x = Math.PI * 0.25;
        rearWindow.position.z = 1.2;
        this.body.add(rearWindow);

        // Side windows
        const sideWindowGeometry = new THREE.PlaneGeometry(2.0, 0.8);
        const leftWindow = new THREE.Mesh(sideWindowGeometry, glassMaterial);
        leftWindow.rotation.y = Math.PI / 2;
        leftWindow.position.set(-1.81, 1.5, 0);
        this.body.add(leftWindow);

        const rightWindow = leftWindow.clone();
        rightWindow.rotation.y = -Math.PI / 2;
        rightWindow.position.x = 1.81;
        this.body.add(rightWindow);

        // Wheels with Tesla-style rims
        const wheelGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 24);
        const wheelPositions = [
            { x: -1.8, z: -1.5 },
            { x: 1.8, z: -1.5 },
            { x: -1.8, z: 1.5 },
            { x: 1.8, z: 1.5 }
        ];

        wheelPositions.forEach(pos => {
            const wheelRim = new THREE.Group();
            
            // Main wheel
            const wheel = new THREE.Mesh(wheelGeometry, detailMaterial);
            wheelRim.add(wheel);

            // Tesla-style rim design
            for (let i = 0; i < 5; i++) {
                const spoke = new THREE.Mesh(
                    new THREE.BoxGeometry(0.25, 0.02, 0.05),
                    detailMaterial
                );
                spoke.rotation.z = (i / 5) * Math.PI * 2;
                spoke.position.y = 0;
                wheelRim.add(spoke);
            }

            wheelRim.rotation.z = Math.PI / 2;
            wheelRim.position.set(pos.x, 0.35, pos.z);
            this.body.add(wheelRim);
        });

        // Headlights (Tesla's distinctive LED strip)
        const headlightMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 2,
            roughness: 0.3,
            metalness: 0.9,
            transparent: true,
            opacity: 0.9
        });

        // Main LED strips
        const headlightGeometry = new THREE.BoxGeometry(1.2, 0.15, 0.1);
        
        // Left headlight
        const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        leftHeadlight.position.set(-1.2, 0.8, -2.5);
        this.body.add(leftHeadlight);

        // Right headlight
        const rightHeadlight = leftHeadlight.clone();
        rightHeadlight.position.x = 1.2;
        this.body.add(rightHeadlight);

        // Add point lights for headlight glow
        const headlightGlow = new THREE.PointLight(0xffffff, 2, 10);
        headlightGlow.position.set(0, 0.8, -2.5);
        this.body.add(headlightGlow);

        // Taillights (Tesla's distinctive light bar)
        const taillightMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 3,
            roughness: 0.3,
            metalness: 0.9,
            transparent: true,
            opacity: 0.9
        });

        // Main taillight bar
        const tailLightGeometry = new THREE.BoxGeometry(3.4, 0.15, 0.1);
        const tailLight = new THREE.Mesh(tailLightGeometry, taillightMaterial);
        tailLight.position.set(0, 1.1, 2.3);
        this.body.add(tailLight);

        // Additional taillight details
        const tailLightDetailGeometry = new THREE.BoxGeometry(0.3, 0.15, 0.1);
        
        // Left corner taillight
        const leftTailDetail = new THREE.Mesh(tailLightDetailGeometry, taillightMaterial);
        leftTailDetail.position.set(-1.7, 1.1, 2.25);
        leftTailDetail.rotation.y = Math.PI * 0.25;
        this.body.add(leftTailDetail);

        // Right corner taillight
        const rightTailDetail = new THREE.Mesh(tailLightDetailGeometry, taillightMaterial);
        rightTailDetail.position.set(1.7, 1.1, 2.25);
        rightTailDetail.rotation.y = -Math.PI * 0.25;
        this.body.add(rightTailDetail);

        // Turret (retractable weapon system)
        this.turret = new THREE.Group();
        
        // Weapon housing (sleek, retractable design)
        const housingGeometry = new THREE.BoxGeometry(1.5, 0.15, 1.2);
        const housing = new THREE.Mesh(housingGeometry, bodyMaterial);
        this.turret.position.set(0, 1.9, -0.8);
        this.turret.add(housing);

        // Main weapon (slimmer for Tesla design)
        const mainGunGeometry = new THREE.CylinderGeometry(0.06, 0.06, 3, 16);
        this.cannon = new THREE.Mesh(mainGunGeometry, detailMaterial);
        this.cannon.position.z = 1.5;
        this.cannon.rotation.x = Math.PI / 2;
        this.turret.add(this.cannon);

        // Add turret to body
        this.body.add(this.turret);

        // Tesla logo
        const logoGeometry = new THREE.CircleGeometry(0.2, 32);
        const logo = new THREE.Mesh(logoGeometry, detailMaterial);
        logo.position.set(0, 0.9, -2.55);
        logo.rotation.y = Math.PI;
        this.body.add(logo);
    }

    createM1A1() {
        // Tank materials
        const tankMaterial = new THREE.MeshStandardMaterial({ 
            color: this.tankColor,
            roughness: 0.7,
            metalness: 0.3
        });
        const trackMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,  // Dark gray for tracks
            roughness: 0.9,
            metalness: 0.1
        });
        const detailMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,  // Darker gray for details
            roughness: 0.5,
            metalness: 0.5
        });

        // Main hull (sloped armor)
        const hullGeometry = new THREE.BoxGeometry(4, 1.2, 5);
        this.body = new THREE.Mesh(hullGeometry, tankMaterial);
        this.body.position.y = 0.6;
        
        // Front slope
        const frontSlopeGeometry = new THREE.BoxGeometry(4, 1.4, 1.2);
        const frontSlope = new THREE.Mesh(frontSlopeGeometry, tankMaterial);
        frontSlope.position.set(0, 0.2, -2);
        frontSlope.rotation.x = Math.PI * 0.1;
        this.body.add(frontSlope);

        // Track assemblies
        const trackGeometry = new THREE.BoxGeometry(0.8, 0.5, 5.4);
        const leftTrack = new THREE.Mesh(trackGeometry, trackMaterial);
        const rightTrack = new THREE.Mesh(trackGeometry, trackMaterial);
        leftTrack.position.set(-1.8, -0.35, 0);
        rightTrack.position.set(1.8, -0.35, 0);
        this.body.add(leftTrack);
        this.body.add(rightTrack);

        // Track wheels
        const wheelGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.4, 16);
        const wheelPositions = [-2.2, -1.5, -0.8, 0, 0.8, 1.5, 2.2];
        wheelPositions.forEach(z => {
            const leftWheel = new THREE.Mesh(wheelGeometry, detailMaterial);
            const rightWheel = new THREE.Mesh(wheelGeometry, detailMaterial);
            leftWheel.rotation.z = Math.PI / 2;
            rightWheel.rotation.z = Math.PI / 2;
            leftWheel.position.set(-1.8, -0.35, z);
            rightWheel.position.set(1.8, -0.35, z);
            this.body.add(leftWheel);
            this.body.add(rightWheel);
        });

        // Turret base (characteristic Abrams angular turret)
        const turretBaseGeometry = new THREE.BoxGeometry(2.2, 0.6, 2.4);
        this.turret = new THREE.Mesh(turretBaseGeometry, tankMaterial);
        this.turret.position.y = 0.9;

        // Turret front slope
        const turretFrontGeometry = new THREE.BoxGeometry(2.2, 0.7, 0.8);
        const turretFront = new THREE.Mesh(turretFrontGeometry, tankMaterial);
        turretFront.position.set(0, 0, -1.2);
        turretFront.rotation.x = -Math.PI * 0.1;
        this.turret.add(turretFront);

        // Turret side armor
        const sideArmorGeometry = new THREE.BoxGeometry(0.3, 0.5, 1.8);
        const leftArmor = new THREE.Mesh(sideArmorGeometry, tankMaterial);
        const rightArmor = new THREE.Mesh(sideArmorGeometry, tankMaterial);
        leftArmor.position.set(-1.2, 0, -0.3);
        rightArmor.position.set(1.2, 0, -0.3);
        this.turret.add(leftArmor);
        this.turret.add(rightArmor);

        // Main gun (120mm smoothbore)
        const mainGunGeometry = new THREE.CylinderGeometry(0.12, 0.12, 4, 16);
        this.cannon = new THREE.Mesh(mainGunGeometry, detailMaterial);
        this.cannon.position.z = 2;
        this.cannon.rotation.x = Math.PI / 2;

        // Gun mantlet
        const mantletGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.35, 16);
        const mantlet = new THREE.Mesh(mantletGeometry, detailMaterial);
        mantlet.rotation.x = Math.PI / 2;
        mantlet.position.z = 0.2;
        this.cannon.add(mantlet);

        // Commander's cupola
        const cupolaGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.35, 8);
        const cupola = new THREE.Mesh(cupolaGeometry, detailMaterial);
        cupola.position.set(-0.5, 0.45, 0.3);
        this.turret.add(cupola);

        // Loader's hatch
        const loaderHatchGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.25, 8);
        const loaderHatch = new THREE.Mesh(loaderHatchGeometry, detailMaterial);
        loaderHatch.position.set(0.5, 0.45, 0.3);
        this.turret.add(loaderHatch);

        // Add turret to body
        this.body.add(this.turret);
        // Add cannon to turret
        this.turret.add(this.cannon);
    }

    createMuzzleFlash() {
        // Create the flash mesh with adjusted dimensions
        const flashGeometry = new THREE.ConeGeometry(0.3, 1.0, 16);
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
        flashContainer.position.set(0, 2, 0);
        flashContainer.rotation.x = -Math.PI / 2;
        
        // Add flash to container with proper rotation and position
        flash.rotation.x = -Math.PI / 2;
        flash.position.set(0, 0, 0);
        flash.visible = false;
        flashContainer.add(flash);
        
        // Create a point light for the flash - increased intensity for brighter flash
        const light = new THREE.PointLight(0xffa500, 10, 4);
        light.position.copy(flash.position);
        light.visible = false;
        flashContainer.add(light);
        
        return {
            mesh: flash,
            light: light
        };
    }

    fireProjectile() {
        if (this.isRecoiling) return; // Prevent rapid firing during recoil

        const projectile = new THREE.Mesh(
            new THREE.SphereGeometry(this.projectileSize),
            new THREE.MeshStandardMaterial({ 
                color: 0xff4400,
                emissive: 0xff4400,
                emissiveIntensity: 2,
                metalness: 0.3,
                roughness: 0.4,
                toneMapped: false
            })
        );
        
        // Store original positions for recoil
        this.originalCannonPosition = this.cannon.position.clone();
        this.originalTurretRotation = this.turret.rotation.x;
        
        // Start recoil
        this.isRecoiling = true;
        this.recoilStartTime = Date.now();
        
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

        // Play cannon fire sound
        if (this.audioManager) {
            this.audioManager.playCannonFire(cannonTip);
        }

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
        const mapBoundary = 450 - 4; // Same boundary as tank movement
        
        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            // Move projectile
            if (projectile.userData.velocity) {
                const nextX = projectile.position.x + projectile.userData.velocity.x;
                const nextZ = projectile.position.z + projectile.userData.velocity.z;

                // Get all bases and buildings from the scene
                const bases = [];
                const buildings = [];
                this.scene.traverse((object) => {
                    if (object.type === 'Group') {
                        if (object.userData.isBase) {
                            bases.push(object.userData.baseInstance);
                        } else if (object.userData.isBuilding) {
                            buildings.push(object);
                        }
                    }
                });

                // Check collision with map boundary walls
                if (Math.abs(nextX) >= mapBoundary || Math.abs(nextZ) >= mapBoundary) {
                    this.createImpactEffect(projectile.position);
                    this.scene.remove(projectile);
                    this.projectiles.splice(i, 1);
                    continue;
                }

                // Check collision with buildings
                let hitBuilding = false;
                for (const building of buildings) {
                    // Get building dimensions based on type
                    const buildingSizes = {
                        'military_airport': { width: 55, depth: 30 },
                        'military_barracks': { width: 30, depth: 20 },
                        'military_control_tower': { width: 12, depth: 12 },
                        'military_factory': { width: 30, depth: 20 },
                        'military_science': { width: 25, depth: 25 },
                        'military_gigafactory': { width: 40, depth: 60 }
                    };

                    const buildingType = building.userData.buildingType;
                    console.log('Checking collision with building type:', buildingType);
                    
                    const buildingSize = buildingSizes[buildingType] || { width: 20, depth: 20 };
                    const halfWidth = buildingSize.width / 2;
                    const halfDepth = buildingSize.depth / 2;

                    // Box collision check using actual building dimensions
                    const buildingBounds = {
                        minX: building.position.x - halfWidth,
                        maxX: building.position.x + halfWidth,
                        minZ: building.position.z - halfDepth,
                        maxZ: building.position.z + halfDepth
                    };

                    console.log('Building bounds:', buildingBounds);
                    console.log('Projectile next position:', { x: nextX, z: nextZ });

                    if (nextX >= buildingBounds.minX && nextX <= buildingBounds.maxX &&
                        nextZ >= buildingBounds.minZ && nextZ <= buildingBounds.maxZ) {
                        console.log('Hit detected on building type:', buildingType);
                        
                        // Calculate impact point
                        const impactPoint = new THREE.Vector3(
                            projectile.position.x,
                            projectile.position.y,
                            projectile.position.z
                        );

                        // Create impact effect
                        this.createImpactEffect(impactPoint);

                        // Deal damage to building
                        if (building.userData.buildingInstance) {
                            // Gigafactory takes less damage due to its reinforced construction
                            const damage = buildingType === 'military_gigafactory' ? 15 : 25;
                            building.userData.buildingInstance.takeDamage(damage);
                        }

                        // Remove projectile
                        this.scene.remove(projectile);
                        this.projectiles.splice(i, 1);
                        hitBuilding = true;
                        break;
                    }
                }

                if (hitBuilding) continue;

                // Check collision with each base's walls and command center
                let hitBase = false;
                for (const base of bases) {
                    // Check if projectile hits the command center
                    const commandCenterBounds = {
                        minX: base.x - 8,  // Command center radius is 8
                        maxX: base.x + 8,
                        minZ: base.z - 8,
                        maxZ: base.z + 8
                    };

                    if (nextX >= commandCenterBounds.minX && nextX <= commandCenterBounds.maxX &&
                        nextZ >= commandCenterBounds.minZ && nextZ <= commandCenterBounds.maxZ) {
                        // Calculate impact point
                        const impactPoint = new THREE.Vector3(
                            projectile.position.x,
                            projectile.position.y,
                            projectile.position.z
                        );

                        // Create impact effect
                        this.createImpactEffect(impactPoint);

                        // Deal damage to base
                        base.takeDamage(50);  // Bases take more damage than buildings

                        // Remove projectile
                        this.scene.remove(projectile);
                        this.projectiles.splice(i, 1);
                        hitBase = true;
                        break;
                    }

                    // Check multiple points along the projectile's path for wall collisions
                    const steps = 5; // Number of interpolation steps
                    for (let step = 0; step <= steps; step++) {
                        const t = step / steps;
                        const checkX = projectile.position.x + (nextX - projectile.position.x) * t;
                        const checkZ = projectile.position.z + (nextZ - projectile.position.z) * t;
                        
                        if (base.isPointCollidingWithWalls(checkX, checkZ) && !base.isPointNearGate(checkX, checkZ)) {
                            // Calculate exact collision point for impact effect
                            const collisionPoint = new THREE.Vector3(
                                checkX,
                                projectile.position.y,
                                checkZ
                            );
                            this.createImpactEffect(collisionPoint);

                            // Deal reduced damage to base when hitting walls
                            base.takeDamage(25);  // Walls take less damage than direct hits

                            this.scene.remove(projectile);
                            this.projectiles.splice(i, 1);
                            hitBase = true;
                            break;
                        }
                    }
                    if (hitBase) break;
                }

                if (hitBase) continue;

                // Update position if no collision
                projectile.position.x = nextX;
                projectile.position.y += projectile.userData.velocity.y;
                projectile.position.z = nextZ;
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

    createImpactEffect(position) {
        // Create double-sided impact flash
        const impactGeometry = new THREE.SphereGeometry(0.3);
        const impactMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide
        });
        
        // Create two impact meshes, slightly offset on both sides of the wall
        const impactFront = new THREE.Mesh(impactGeometry, impactMaterial);
        const impactBack = new THREE.Mesh(impactGeometry, impactMaterial);
        
        // Position impacts slightly offset from the collision point
        const offset = 0.1; // Small offset to prevent z-fighting
        impactFront.position.copy(position);
        impactBack.position.copy(position);
        
        // Add impacts to scene
        this.scene.add(impactFront);
        this.scene.add(impactBack);

        // Add impact lights on both sides
        const impactLightFront = new THREE.PointLight(0xffff00, 2, 5);
        const impactLightBack = new THREE.PointLight(0xffff00, 2, 5);
        impactLightFront.position.copy(position);
        impactLightBack.position.copy(position);
        
        this.scene.add(impactLightFront);
        this.scene.add(impactLightBack);

        // Animate and remove impact effect
        const startTime = Date.now();
        const duration = 200;

        const animate = () => {
            const now = Date.now();
            const age = now - startTime;
            
            if (age < duration) {
                const fadeRatio = 1 - age / duration;
                const scale = 1 + age/duration;
                
                // Update both impacts
                [impactFront, impactBack].forEach(impact => {
                    impact.material.opacity = fadeRatio;
                    impact.scale.set(scale, scale, scale);
                });
                
                // Update both lights
                impactLightFront.intensity = 2 * fadeRatio;
                impactLightBack.intensity = 2 * fadeRatio;
                
                requestAnimationFrame(animate);
            } else {
                // Remove all elements
                this.scene.remove(impactFront);
                this.scene.remove(impactBack);
                this.scene.remove(impactLightFront);
                this.scene.remove(impactLightBack);
            }
        };

        animate();
    }

    createHealthBar() {
        // Create container for health bar that will follow tank
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
        
        // Position the health bar above the tank
        this.healthBarContainer.position.y = 2.5;
        
        // Add meshes to container
        this.healthBarContainer.add(this.healthBarBackground);
        this.healthBarContainer.add(this.healthBar);
        
        // Add container to scene instead of tank body
        this.scene.add(this.healthBarContainer);
    }

    updateHealthBar() {
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
        this.healthBar.position.x = -1 * (1 - healthPercent);
    }

    takeDamage(amount) {
        this.currentHealth = Math.max(0, this.currentHealth - amount);
        this.updateHealthBar();
        
        // Flash the tank red when taking damage
        const originalColor = this.body.material.color.getHex();
        this.body.traverse((object) => {
            if (object instanceof THREE.Mesh && object.material.color) {
                object.material.color.setHex(0xff0000);
            }
        });
        
        // Reset color after 100ms
        setTimeout(() => {
            this.body.traverse((object) => {
                if (object instanceof THREE.Mesh && object.material.color) {
                    object.material.color.setHex(originalColor);
                }
            });
        }, 100);

        // Check if tank is destroyed
        if (this.currentHealth <= 0) {
            this.onDestroyed();
        }
    }

    heal(amount) {
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
        this.updateHealthBar();
    }

    onDestroyed() {
        // Flash the tank red
        this.body.traverse((object) => {
            if (object instanceof THREE.Mesh && object.material.color) {
                object.material.color.setHex(0xff0000);
            }
        });
        
        // Disable movement
        this.speed = 0;
        this.rotationSpeed = 0;
        
        // You could add explosion effects, particle systems, etc. here
        console.log('Tank destroyed!');
    }

    update(ground, mouse, raycaster, camera) {
        // Handle recoil animation
        if (this.isRecoiling) {
            const now = Date.now();
            const recoilAge = now - this.recoilStartTime;
            
            if (recoilAge <= this.recoilDuration) {
                // Recoil phase
                const recoilProgress = recoilAge / this.recoilDuration;
                const recoilOffset = Math.sin(recoilProgress * Math.PI) * this.recoilAmount;
                
                // Move cannon backward more significantly
                this.cannon.position.z = this.originalCannonPosition.z - recoilOffset * 1.5;
                
                // Tilt turret up more noticeably
                this.turret.rotation.x = this.originalTurretRotation - (recoilOffset * 0.3);
                
            } else if (recoilAge <= this.recoilDuration + this.recoilRecoveryDuration) {
                // Recovery phase
                const recoveryProgress = (recoilAge - this.recoilDuration) / this.recoilRecoveryDuration;
                const smoothProgress = 1 - Math.pow(1 - recoveryProgress, 2); // Smooth easing
                
                // Smoothly return to original position
                this.cannon.position.z = this.originalCannonPosition.z - 
                    (this.recoilAmount * 1.5 * (1 - smoothProgress));
                
                // Smoothly return turret rotation
                this.turret.rotation.x = this.originalTurretRotation - 
                    (this.recoilAmount * 0.3 * (1 - smoothProgress));
                
            } else {
                // Reset everything
                this.isRecoiling = false;
                this.cannon.position.copy(this.originalCannonPosition);
                this.turret.rotation.x = this.originalTurretRotation;
            }
        }

        // Calculate next position before moving
        let nextX = this.body.position.x;
        let nextZ = this.body.position.z;

        // Tank movement with boundary checks
        const mapBoundary = 450 - 4; // Half map size minus wall thickness and some margin
        
        // Tank dimensions (based on hull size plus tracks)
        const tankWidth = 4.0;  // Full width including tracks
        const tankLength = 5.4; // Full length including front slope
        const tankHalfWidth = tankWidth / 2;
        const tankHalfLength = tankLength / 2;
        
        if (this.keys.w) {
            nextX = this.body.position.x + Math.sin(this.body.rotation.y) * this.speed;
            nextZ = this.body.position.z + Math.cos(this.body.rotation.y) * this.speed;
        }
        if (this.keys.s) {
            nextX = this.body.position.x - Math.sin(this.body.rotation.y) * this.speed;
            nextZ = this.body.position.z - Math.cos(this.body.rotation.y) * this.speed;
        }

        // Check collisions with base walls
        let canMove = true;
        if (Math.abs(nextX) < mapBoundary && Math.abs(nextZ) < mapBoundary) {
            // Get all bases and buildings from the scene
            const bases = [];
            const buildings = [];
            this.scene.traverse((object) => {
                if (object.type === 'Group') {
                    if (object.userData.isBase) {
                        bases.push(object.userData.baseInstance);
                    } else if (object.userData.isBuilding) {
                        buildings.push(object);
                    }
                }
            });

            // Calculate tank corners in world space for the next position
            const angle = this.body.rotation.y;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            
            // Define tank corner points (clockwise from front-right)
            const cornerPoints = [
                { // Front-right
                    x: nextX + (tankHalfLength * sin + tankHalfWidth * cos),
                    z: nextZ + (tankHalfLength * cos - tankHalfWidth * sin)
                },
                { // Back-right
                    x: nextX + (-tankHalfLength * sin + tankHalfWidth * cos),
                    z: nextZ + (-tankHalfLength * cos - tankHalfWidth * sin)
                },
                { // Back-left
                    x: nextX + (-tankHalfLength * sin - tankHalfWidth * cos),
                    z: nextZ + (-tankHalfLength * cos + tankHalfWidth * sin)
                },
                { // Front-left
                    x: nextX + (tankHalfLength * sin - tankHalfWidth * cos),
                    z: nextZ + (tankHalfLength * cos + tankHalfWidth * sin)
                }
            ];

            // Check collision with buildings
            for (const building of buildings) {
                // Get building dimensions based on type
                const buildingSizes = {
                    'military_airport': { width: 55, depth: 30 },
                    'military_barracks': { width: 30, depth: 20 },
                    'military_control_tower': { width: 12, depth: 12 },
                    'military_factory': { width: 30, depth: 20 },
                    'military_science': { width: 25, depth: 25 },
                    'military_gigafactory': { width: 40, depth: 60 }
                };

                const buildingType = building.userData.buildingType;
                const buildingSize = buildingSizes[buildingType] || { width: 20, depth: 20 };
                const halfWidth = buildingSize.width / 2;
                const halfDepth = buildingSize.depth / 2;

                // Building bounds
                const buildingBounds = {
                    minX: building.position.x - halfWidth,
                    maxX: building.position.x + halfWidth,
                    minZ: building.position.z - halfDepth,
                    maxZ: building.position.z + halfDepth
                };

                // Check if any tank corner intersects with building bounds
                for (const corner of cornerPoints) {
                    if (corner.x >= buildingBounds.minX && corner.x <= buildingBounds.maxX &&
                        corner.z >= buildingBounds.minZ && corner.z <= buildingBounds.maxZ) {
                        canMove = false;
                        break;
                    }
                }
                if (!canMove) break;
            }

            // Check collision for each corner point with bases
            if (canMove) {
                for (const base of bases) {
                    for (const corner of cornerPoints) {
                        if (base.isPointCollidingWithWalls(corner.x, corner.z)) {
                            // Only allow movement if all corners are near a gate
                            if (!base.isPointNearGate(corner.x, corner.z)) {
                                canMove = false;
                                break;
                            }
                        }
                    }
                    if (!canMove) break;
                }
            }

            // Also check map boundaries for all corners
            if (canMove) {
                for (const corner of cornerPoints) {
                    if (Math.abs(corner.x) >= mapBoundary || Math.abs(corner.z) >= mapBoundary) {
                        canMove = false;
                        break;
                    }
                }
            }

            // Update position if no collision
            if (canMove) {
                this.body.position.x = nextX;
                this.body.position.z = nextZ;
            }
        }

        // Tank rotation
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

        // Update health bar position to follow tank
        const tankPosition = this.body.position;
        this.healthBarContainer.position.set(
            tankPosition.x,
            tankPosition.y + 2.5,
            tankPosition.z
        );

        // Make health bar face the camera while staying horizontal
        if (camera) {
            // Get camera direction vector
            const cameraDir = new THREE.Vector3();
            camera.getWorldDirection(cameraDir);
            
            // Calculate rotation to face camera but only on Y axis
            const angle = Math.atan2(cameraDir.x, cameraDir.z);
            this.healthBarContainer.rotation.y = angle;
        }

        this.updateProjectiles();
    }

    getPosition() {
        return {
            x: this.body.position.x,
            y: this.body.position.y,
            z: this.body.position.z
        };
    }

    getRotation() {
        return this.body.rotation.y;
    }
} 