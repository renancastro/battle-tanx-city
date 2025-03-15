import * as THREE from 'three';

export class Tank {
    constructor(scene, audioManager, tankType = 'M1A1') {
        // Tank properties
        this.speed = 4.0;
        this.rotationSpeed = 0.4;
        this.turretRotationSpeed = 0.2;
        this.tankType = tankType; // 'M1A1', 'ModelS', 'T14', or 'Leopard2'
        
        // Audio system
        this.audioManager = audioManager;
        
        // Health system - different health values for different tanks
        this.maxHealth = tankType === 'T14' ? 120 : // T-14 has more health due to advanced armor
                        tankType === 'Leopard2' ? 110 : // Leopard 2 has slightly more health
                        100; // Default health for M1A1 and Tesla
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
        switch(this.tankType) {
            case 'ModelS':
                this.createTeslaModelS();
                break;
            case 'T14':
                this.createT14Armata();
                break;
            case 'Leopard2':
                this.createLeopard2();
                break;
            default:
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

    createT14Armata() {
        // T-14 Armata materials
        const tankMaterial = new THREE.MeshStandardMaterial({ 
            color: this.tankColor,
            roughness: 0.6,
            metalness: 0.4
        });
        const trackMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.9,
            metalness: 0.1
        });
        const detailMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.5,
            metalness: 0.5
        });

        // Main body group
        this.body = new THREE.Group();

        // Main hull (distinctive angular design)
        const hullGeometry = new THREE.BoxGeometry(4.2, 1.4, 6);
        const hull = new THREE.Mesh(hullGeometry, tankMaterial);
        hull.position.y = 0.7;
        this.body.add(hull);

        // Front glacis (heavily sloped armor)
        const glacisGeometry = new THREE.BoxGeometry(4.2, 1.6, 2);
        const glacis = new THREE.Mesh(glacisGeometry, tankMaterial);
        glacis.position.set(0, 0.6, -2);
        glacis.rotation.x = Math.PI * 0.15;
        this.body.add(glacis);

        // Track assemblies with ERA blocks
        const trackGeometry = new THREE.BoxGeometry(1, 0.6, 6.4);
        const leftTrack = new THREE.Mesh(trackGeometry, trackMaterial);
        const rightTrack = new THREE.Mesh(trackGeometry, trackMaterial);
        leftTrack.position.set(-2, -0.3, 0);
        rightTrack.position.set(2, -0.3, 0);
        this.body.add(leftTrack);
        this.body.add(rightTrack);

        // ERA (Explosive Reactive Armor) blocks
        const eraGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.8);
        for (let z = -2.5; z <= 2.5; z += 1) {
            for (let y = 0; y < 2; y++) {
                const leftEra = new THREE.Mesh(eraGeometry, detailMaterial);
                const rightEra = new THREE.Mesh(eraGeometry, detailMaterial);
                leftEra.position.set(-2.1, 0.3 + y * 0.4, z);
                rightEra.position.set(2.1, 0.3 + y * 0.4, z);
                this.body.add(leftEra);
                this.body.add(rightEra);
            }
        }

        // Unmanned turret (distinctive feature of T-14)
        this.turret = new THREE.Group();
        
        // Main turret body
        const turretGeometry = new THREE.BoxGeometry(3, 0.8, 3.5);
        const turret = new THREE.Mesh(turretGeometry, tankMaterial);
        turret.position.y = 0.4;
        this.turret.add(turret);

        // Angular turret front
        const turretFrontGeometry = new THREE.BoxGeometry(3, 0.8, 1);
        const turretFront = new THREE.Mesh(turretFrontGeometry, tankMaterial);
        turretFront.position.set(0, 0.4, -1.8);
        turretFront.rotation.x = -Math.PI * 0.1;
        this.turret.add(turretFront);

        // Main gun (125mm 2A82-1M)
        const mainGunGeometry = new THREE.CylinderGeometry(0.15, 0.15, 5, 16);
        this.cannon = new THREE.Mesh(mainGunGeometry, detailMaterial);
        this.cannon.position.z = 2.5;
        this.cannon.rotation.x = Math.PI / 2;
        this.turret.add(this.cannon);

        // Advanced sighting systems and sensors
        const sensorGeometry = new THREE.BoxGeometry(0.4, 0.2, 0.4);
        const sensor1 = new THREE.Mesh(sensorGeometry, detailMaterial);
        sensor1.position.set(0.8, 0.8, -1);
        this.turret.add(sensor1);

        const sensor2 = new THREE.Mesh(sensorGeometry, detailMaterial);
        sensor2.position.set(-0.8, 0.8, -1);
        this.turret.add(sensor2);

        // Position turret on hull
        this.turret.position.set(0, 1.4, 0);
        this.body.add(this.turret);
    }

    createLeopard2() {
        // Leopard 2A7 materials
        const tankMaterial = new THREE.MeshStandardMaterial({ 
            color: this.tankColor,
            roughness: 0.7,
            metalness: 0.3
        });
        const trackMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.9,
            metalness: 0.1
        });
        const detailMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.5,
            metalness: 0.5
        });

        // Main body group
        this.body = new THREE.Group();

        // Main hull
        const hullGeometry = new THREE.BoxGeometry(4, 1.3, 5.8);
        const hull = new THREE.Mesh(hullGeometry, tankMaterial);
        hull.position.y = 0.65;
        this.body.add(hull);

        // Front glacis
        const glacisGeometry = new THREE.BoxGeometry(4, 1.5, 1.8);
        const glacis = new THREE.Mesh(glacisGeometry, tankMaterial);
        glacis.position.set(0, 0.5, -2);
        glacis.rotation.x = Math.PI * 0.12;
        this.body.add(glacis);

        // Track assemblies with side skirts
        const trackGeometry = new THREE.BoxGeometry(0.8, 0.6, 6.2);
        const leftTrack = new THREE.Mesh(trackGeometry, trackMaterial);
        const rightTrack = new THREE.Mesh(trackGeometry, trackMaterial);
        leftTrack.position.set(-1.9, -0.3, 0);
        rightTrack.position.set(1.9, -0.3, 0);
        this.body.add(leftTrack);
        this.body.add(rightTrack);

        // Side skirts
        const skirtGeometry = new THREE.BoxGeometry(0.1, 0.8, 6);
        const leftSkirt = new THREE.Mesh(skirtGeometry, tankMaterial);
        const rightSkirt = new THREE.Mesh(skirtGeometry, tankMaterial);
        leftSkirt.position.set(-2, 0.2, 0);
        rightSkirt.position.set(2, 0.2, 0);
        this.body.add(leftSkirt);
        this.body.add(rightSkirt);

        // Turret (angular, modern design)
        this.turret = new THREE.Group();
        
        // Main turret body
        const turretGeometry = new THREE.BoxGeometry(3.2, 1, 3.8);
        const turret = new THREE.Mesh(turretGeometry, tankMaterial);
        turret.position.y = 0.5;
        this.turret.add(turret);

        // Turret front with spaced armor
        const turretFrontGeometry = new THREE.BoxGeometry(3.2, 1, 1.2);
        const turretFront = new THREE.Mesh(turretFrontGeometry, tankMaterial);
        turretFront.position.set(0, 0.5, -2);
        turretFront.rotation.x = -Math.PI * 0.08;
        this.turret.add(turretFront);

        // Main gun (120mm L/55)
        const mainGunGeometry = new THREE.CylinderGeometry(0.14, 0.14, 4.8, 16);
        this.cannon = new THREE.Mesh(mainGunGeometry, detailMaterial);
        this.cannon.position.z = 2.4;
        this.cannon.rotation.x = Math.PI / 2;
        this.turret.add(this.cannon);

        // Commander's sight
        const sightGeometry = new THREE.BoxGeometry(0.6, 0.4, 0.6);
        const sight = new THREE.Mesh(sightGeometry, detailMaterial);
        sight.position.set(0.8, 1, 0);
        this.turret.add(sight);

        // Position turret on hull
        this.turret.position.set(0, 1.3, 0);
        this.body.add(this.turret);
    }

    createM1A1() {
        // M1A1 Abrams materials
        const tankMaterial = new THREE.MeshStandardMaterial({ 
            color: this.tankColor,
            roughness: 0.7,
            metalness: 0.3
        });
        const trackMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.9,
            metalness: 0.1
        });
        const detailMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.5,
            metalness: 0.5
        });

        // Main body group
        this.body = new THREE.Group();

        // Lower hull (with angled sides)
        const lowerHullGeometry = new THREE.BoxGeometry(3.6, 0.8, 6.4);
        const lowerHull = new THREE.Mesh(lowerHullGeometry, tankMaterial);
        lowerHull.position.y = 0.4;
        this.body.add(lowerHull);

        // Hull side slopes (characteristic Abrams feature)
        const sideAngle = Math.PI * 0.15; // 27 degrees
        const sideSlopeGeometry = new THREE.BoxGeometry(0.6, 1.2, 6.2);
        
        const leftSlope = new THREE.Mesh(sideSlopeGeometry, tankMaterial);
        leftSlope.position.set(-1.5, 0.8, 0);
        leftSlope.rotation.z = sideAngle;
        this.body.add(leftSlope);

        const rightSlope = new THREE.Mesh(sideSlopeGeometry, tankMaterial);
        rightSlope.position.set(1.5, 0.8, 0);
        rightSlope.rotation.z = -sideAngle;
        this.body.add(rightSlope);

        // Front glacis (heavily sloped armor)
        const glacisGeometry = new THREE.BoxGeometry(3.4, 1.6, 2);
        const glacis = new THREE.Mesh(glacisGeometry, tankMaterial);
        glacis.position.set(0, 0.6, -2.2);
        glacis.rotation.x = Math.PI * 0.2; // Steeper angle
        this.body.add(glacis);

        // Rear plate (slightly angled)
        const rearPlateGeometry = new THREE.BoxGeometry(3.4, 1.2, 0.8);
        const rearPlate = new THREE.Mesh(rearPlateGeometry, tankMaterial);
        rearPlate.position.set(0, 0.7, 2.8);
        rearPlate.rotation.x = -Math.PI * 0.1;
        this.body.add(rearPlate);

        // Track assemblies with return rollers
        const trackGeometry = new THREE.BoxGeometry(0.6, 0.4, 6.8);
        const leftTrack = new THREE.Mesh(trackGeometry, trackMaterial);
        const rightTrack = new THREE.Mesh(trackGeometry, trackMaterial);
        leftTrack.position.set(-1.8, 0, 0);
        rightTrack.position.set(1.8, 0, 0);
        this.body.add(leftTrack);
        this.body.add(rightTrack);

        // Road wheels (7 per side)
        const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.3, 16);
        const wheelPositions = [-2.4, -1.6, -0.8, 0, 0.8, 1.6, 2.4];
        
        wheelPositions.forEach(z => {
            const leftWheel = new THREE.Mesh(wheelGeometry, detailMaterial);
            const rightWheel = new THREE.Mesh(wheelGeometry, detailMaterial);
            leftWheel.rotation.z = Math.PI / 2;
            rightWheel.rotation.z = Math.PI / 2;
            leftWheel.position.set(-1.9, 0.3, z);
            rightWheel.position.set(1.9, 0.3, z);
            this.body.add(leftWheel);
            this.body.add(rightWheel);
        });

        // Return rollers (3 per side)
        const rollerGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.2, 12);
        const rollerPositions = [-1.6, 0, 1.6];
        
        rollerPositions.forEach(z => {
            const leftRoller = new THREE.Mesh(rollerGeometry, detailMaterial);
            const rightRoller = new THREE.Mesh(rollerGeometry, detailMaterial);
            leftRoller.rotation.z = Math.PI / 2;
            rightRoller.rotation.z = Math.PI / 2;
            leftRoller.position.set(-1.85, 0.7, z);
            rightRoller.position.set(1.85, 0.7, z);
            this.body.add(leftRoller);
            this.body.add(rightRoller);
        });

        // Turret (distinctive Abrams design)
        this.turret = new THREE.Group();
        
        // Main turret body
        const turretGeometry = new THREE.BoxGeometry(3.2, 1.0, 4);
        const turret = new THREE.Mesh(turretGeometry, tankMaterial);
        turret.position.y = 0.5;
        this.turret.add(turret);

        // Turret cheeks (angular armor)
        const cheekGeometry = new THREE.BoxGeometry(1.2, 1.0, 2);
        
        const leftCheek = new THREE.Mesh(cheekGeometry, tankMaterial);
        leftCheek.position.set(-1.2, 0.5, -1);
        leftCheek.rotation.y = Math.PI * 0.15;
        this.turret.add(leftCheek);

        const rightCheek = new THREE.Mesh(cheekGeometry, tankMaterial);
        rightCheek.position.set(1.2, 0.5, -1);
        rightCheek.rotation.y = -Math.PI * 0.15;
        this.turret.add(rightCheek);

        // Turret roof slope
        const roofGeometry = new THREE.BoxGeometry(2.8, 0.4, 3.6);
        const roof = new THREE.Mesh(roofGeometry, tankMaterial);
        roof.position.set(0, 1.0, 0);
        roof.rotation.x = -Math.PI * 0.03;
        this.turret.add(roof);

        // Bustle rack (ammo storage)
        const bustleGeometry = new THREE.BoxGeometry(2.6, 0.8, 1.4);
        const bustle = new THREE.Mesh(bustleGeometry, detailMaterial);
        bustle.position.set(0, 0.6, 2);
        this.turret.add(bustle);

        // Main gun (120mm M256)
        const mainGunGeometry = new THREE.CylinderGeometry(0.15, 0.15, 5, 16);
        this.cannon = new THREE.Mesh(mainGunGeometry, detailMaterial);
        this.cannon.position.z = 2.5;
        this.cannon.rotation.x = Math.PI / 2;
        this.turret.add(this.cannon);

        // Gun mantlet (more detailed)
        const mantletGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.6, 16);
        const mantlet = new THREE.Mesh(mantletGeometry, detailMaterial);
        mantlet.position.z = 0.3;
        mantlet.rotation.x = Math.PI / 2;
        this.turret.add(mantlet);

        // Commander's cupola (more detailed)
        const cupolaBaseGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 8);
        const cupolaBase = new THREE.Mesh(cupolaBaseGeometry, detailMaterial);
        cupolaBase.position.set(0.8, 1.2, 0.2);
        this.turret.add(cupolaBase);

        const cupolaTopGeometry = new THREE.CylinderGeometry(0.4, 0.5, 0.3, 8);
        const cupolaTop = new THREE.Mesh(cupolaTopGeometry, detailMaterial);
        cupolaTop.position.set(0.8, 1.5, 0.2);
        this.turret.add(cupolaTop);

        // Loader's hatch
        const loaderHatchGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 8);
        const loaderHatch = new THREE.Mesh(loaderHatchGeometry, detailMaterial);
        loaderHatch.position.set(-0.8, 1.2, 0.2);
        this.turret.add(loaderHatch);

        // Thermal sight housing (CITV)
        const citvGeometry = new THREE.BoxGeometry(0.4, 0.5, 0.6);
        const citv = new THREE.Mesh(citvGeometry, detailMaterial);
        citv.position.set(1.2, 1.3, -0.4);
        this.turret.add(citv);

        // Gunner's sight
        const gunnerSightGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.5);
        const gunnerSight = new THREE.Mesh(gunnerSightGeometry, detailMaterial);
        gunnerSight.position.set(-0.6, 1.1, -1.2);
        this.turret.add(gunnerSight);

        // Smoke grenade launchers
        const launcherGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.4);
        for (let i = 0; i < 4; i++) {
            const leftLauncher = new THREE.Mesh(launcherGeometry, detailMaterial);
            const rightLauncher = new THREE.Mesh(launcherGeometry, detailMaterial);
            leftLauncher.position.set(-1.6, 0.8, -1 + i * 0.3);
            rightLauncher.position.set(1.6, 0.8, -1 + i * 0.3);
            this.turret.add(leftLauncher);
            this.turret.add(rightLauncher);
        }

        // Position turret on hull
        this.turret.position.set(0, 1.2, -0.2); // Slightly forward
        this.body.add(this.turret);

        // Add side skirts
        const skirtGeometry = new THREE.BoxGeometry(0.1, 0.6, 6);
        const leftSkirt = new THREE.Mesh(skirtGeometry, tankMaterial);
        const rightSkirt = new THREE.Mesh(skirtGeometry, tankMaterial);
        leftSkirt.position.set(-2, 0.5, 0);
        rightSkirt.position.set(2, 0.5, 0);
        this.body.add(leftSkirt);
        this.body.add(rightSkirt);
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

                    if (nextX >= buildingBounds.minX && nextX <= buildingBounds.maxX &&
                        nextZ >= buildingBounds.minZ && nextZ <= buildingBounds.maxZ) {
                        
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