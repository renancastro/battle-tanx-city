import * as THREE from 'three';

// Game state
const keys = {
    w: false,
    s: false,
    a: false,
    d: false
};

// Tank properties
const tankSpeed = 0.1;
const tankRotationSpeed = 0.03;
const turretRotationSpeed = 0.1;

// Projectile properties
const projectileSpeed = 0.5;
const projectiles = [];
const projectileLifetime = 3000; // milliseconds

// Muzzle flash properties
const flashDuration = 150; // milliseconds
let muzzleFlash = null;
let flashLight = null;
let lastFlashTime = 0;

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Ground
const groundGeometry = new THREE.PlaneGeometry(50, 50);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Tank body
const tankBodyGeometry = new THREE.BoxGeometry(2, 1, 3);
const tankMaterial = new THREE.MeshStandardMaterial({ color: 0x4a5320 });
const tankBody = new THREE.Mesh(tankBodyGeometry, tankMaterial);
tankBody.position.y = 0.5;
tankBody.castShadow = true;
scene.add(tankBody);

// Tank turret
const turretGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.5, 8);
const turret = new THREE.Mesh(turretGeometry, tankMaterial);
turret.position.y = 1;
turret.castShadow = true;
tankBody.add(turret);

// Tank cannon
const cannonGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2);
const cannon = new THREE.Mesh(cannonGeometry, tankMaterial);
cannon.position.z = 1;
cannon.rotation.x = Math.PI / 2;
turret.add(cannon);

// Projectile template
const projectileGeometry = new THREE.SphereGeometry(0.2);
const projectileMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 1,
    toneMapped: false
});

// Create muzzle flash
function createMuzzleFlash() {
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
    cannon.add(flashContainer);
    
    // Position and rotate the container
    flashContainer.position.set(0, 1, 0);
    flashContainer.rotation.x = -Math.PI / 2;  // Inverted rotation to point forward
    
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

// Camera setup
camera.position.set(0, 10, -10);
camera.lookAt(tankBody.position);

// Mouse movement
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function fireProjectile() {
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    
    // Position projectile at the end of the cannon
    const cannonTip = new THREE.Vector3();
    cannon.getWorldPosition(cannonTip);
    
    // Get the cannon's forward direction
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(turret.getWorldQuaternion(new THREE.Quaternion()));
    
    // Move the spawn point to the end of the cannon
    cannonTip.add(direction.multiplyScalar(2));
    projectile.position.copy(cannonTip);
    
    // Reset direction for velocity
    direction.set(0, 0, 1);
    direction.applyQuaternion(turret.getWorldQuaternion(new THREE.Quaternion()));
    
    // Set velocity
    projectile.userData.velocity = direction.multiplyScalar(projectileSpeed);
    projectile.userData.createdAt = Date.now();
    
    scene.add(projectile);
    projectiles.push(projectile);

    // Show muzzle flash
    if (!muzzleFlash) {
        const flash = createMuzzleFlash();
        muzzleFlash = flash.mesh;
        flashLight = flash.light;
    }
    muzzleFlash.visible = true;
    flashLight.visible = true;
    lastFlashTime = Date.now();
}

function onMouseDown(event) {
    if (event.button === 0) { // Left mouse button
        fireProjectile();
    }
}

// Key handlers
function onKeyDown(event) {
    const key = event.key.toLowerCase();
    if (keys.hasOwnProperty(key)) {
        keys[key] = true;
    }
}

function onKeyUp(event) {
    const key = event.key.toLowerCase();
    if (keys.hasOwnProperty(key)) {
        keys[key] = false;
    }
}

// Event listeners
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('mousedown', onMouseDown);
window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Update projectiles
function updateProjectiles() {
    const now = Date.now();
    
    // Update projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        
        // Move projectile
        if (projectile.userData.velocity) {
            projectile.position.x += projectile.userData.velocity.x;
            projectile.position.y += projectile.userData.velocity.y;
            projectile.position.z += projectile.userData.velocity.z;
        }
        
        // Remove old projectiles
        if (now - projectile.userData.createdAt > projectileLifetime) {
            scene.remove(projectile);
            projectiles.splice(i, 1);
            continue;
        }
    }

    // Update muzzle flash
    if (muzzleFlash && muzzleFlash.visible) {
        if (now - lastFlashTime > flashDuration) {
            muzzleFlash.visible = false;
            flashLight.visible = false;
        } else {
            // Animate flash opacity and light intensity
            const flashAge = now - lastFlashTime;
            const fadeRatio = 1 - flashAge / flashDuration;
            muzzleFlash.material.opacity = fadeRatio;
            flashLight.intensity = 5 * fadeRatio;
            
            // Animate flash scale
            const scalePhase = (1 - fadeRatio) * Math.PI;
            const scale = 1 + 0.5 * Math.sin(scalePhase);
            muzzleFlash.scale.set(scale, scale, scale);
        }
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Tank movement
    if (keys.w) {
        tankBody.position.x += Math.sin(tankBody.rotation.y) * tankSpeed;
        tankBody.position.z += Math.cos(tankBody.rotation.y) * tankSpeed;
    }
    if (keys.s) {
        tankBody.position.x -= Math.sin(tankBody.rotation.y) * tankSpeed;
        tankBody.position.z -= Math.cos(tankBody.rotation.y) * tankSpeed;
    }
    if (keys.a) {
        tankBody.rotation.y += tankRotationSpeed;
    }
    if (keys.d) {
        tankBody.rotation.y -= tankRotationSpeed;
    }

    // Turret rotation
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(ground);
    
    if (intersects.length > 0) {
        const targetPoint = intersects[0].point;
        const tankPosition = tankBody.position.clone();
        const direction = targetPoint.sub(tankPosition);
        const angle = Math.atan2(direction.x, direction.z);
        turret.rotation.y = -tankBody.rotation.y + angle;
    }

    // Update projectiles
    updateProjectiles();

    // Update camera position
    camera.position.x = tankBody.position.x;
    camera.position.z = tankBody.position.z - 10;
    camera.lookAt(tankBody.position);

    renderer.render(scene, camera);
}

animate(); 