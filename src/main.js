import * as THREE from 'three';
import { Tank } from './Tank.js';

// Game state
const keys = {
    w: false,
    s: false,
    a: false,
    d: false
};

// Tank properties
const tankSpeed = 1.0;
const tankRotationSpeed = 0.15;
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

// Configure shadow properties
directionalLight.shadow.camera.left = -300;
directionalLight.shadow.camera.right = 300;
directionalLight.shadow.camera.top = 300;
directionalLight.shadow.camera.bottom = -300;
directionalLight.shadow.camera.near = 0.1;
directionalLight.shadow.camera.far = 600;
directionalLight.shadow.mapSize.width = 4096;
directionalLight.shadow.mapSize.height = 4096;
directionalLight.shadow.bias = -0.001;

scene.add(directionalLight);

// Ground
const groundGeometry = new THREE.PlaneGeometry(600, 600);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Create tank bases in corners
function createTankBase(x, z) {
    const baseGroup = new THREE.Group();

    // Main platform
    const baseGeometry = new THREE.BoxGeometry(30, 1, 30);
    const baseMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x505050,  // Darker than ground
        roughness: 0.7,
        metalness: 0.3
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.5; // Half height to sit on ground
    base.castShadow = true;
    base.receiveShadow = true;
    baseGroup.add(base);

    // Add border/rim
    const rimGeometry = new THREE.BoxGeometry(33, 0.5, 33);
    const rimMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x404040,  // Even darker for contrast
        roughness: 0.8,
        metalness: 0.2
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.position.y = 0.25; // Place at bottom of platform
    rim.castShadow = true;
    rim.receiveShadow = true;
    baseGroup.add(rim);

    baseGroup.position.set(x, 0, z);
    scene.add(baseGroup);
}

// Generate tank bases in corners
function generateBases() {
    const mapSize = 600;
    const baseOffset = 270; // Distance from center to base center

    // Create bases in each corner
    createTankBase(-baseOffset, -baseOffset);  // Bottom-left
    createTankBase(-baseOffset, baseOffset);   // Top-left
    createTankBase(baseOffset, -baseOffset);   // Bottom-right
    createTankBase(baseOffset, baseOffset);    // Top-right
}

// Empty city generation (keeping the function for future use if needed)
function generateCity() {
    // Empty function - no roads or plaza
}

generateCity();
generateBases();

// Create player tank
const tank = new Tank(scene);

// Camera setup
camera.position.set(0, 10, -10);
camera.lookAt(tank.getPosition());

// Camera controls
const cameraSettings = {
    minHeight: 5,
    maxHeight: 20,
    scrollSpeed: 0.5
};

// Mouse movement
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onMouseWheel(event) {
    // Adjust camera height based on scroll direction
    const delta = Math.sign(event.deltaY) * cameraSettings.scrollSpeed;
    const newHeight = Math.max(cameraSettings.minHeight, 
                             Math.min(cameraSettings.maxHeight, 
                                    camera.position.y + delta));
    camera.position.y = newHeight;
}

function onMouseDown(event) {
    if (event.button === 0) { // Left mouse button
        tank.fireProjectile();
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
window.addEventListener('wheel', onMouseWheel);
window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Update tank
    tank.update(ground, mouse, raycaster, camera);

    // Update camera position with larger offset
    const tankPos = tank.getPosition();
    camera.position.x = tankPos.x;
    camera.position.z = tankPos.z - 20; // Increased camera distance
    camera.lookAt(tankPos);

    // Update directional light position relative to tank with larger offset
    directionalLight.position.set(
        tankPos.x + 20,
        50,
        tankPos.z + 20
    );
    directionalLight.target = tank.body;

    renderer.render(scene, camera);
}

animate(); 