import * as THREE from 'three';
import { Tank } from './Tank.js';
import { Base } from './Base.js';
import { Road } from './Road.js';

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
directionalLight.shadow.camera.left = -450;
directionalLight.shadow.camera.right = 450;
directionalLight.shadow.camera.top = 450;
directionalLight.shadow.camera.bottom = -450;
directionalLight.shadow.camera.near = 0.1;
directionalLight.shadow.camera.far = 900;
directionalLight.shadow.mapSize.width = 4096;
directionalLight.shadow.mapSize.height = 4096;
directionalLight.shadow.bias = -0.001;

scene.add(directionalLight);

// Ground
const groundGeometry = new THREE.PlaneGeometry(900, 900);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Create grid pattern
function createGrid() {
    const gridSize = 900; // Total size of the map
    const blockSize = 40;  // Size of each block
    const baseOffset = 380; // Increased distance from center to base
    const baseSize = 40;   // Slightly larger than tank base for clearance
    const gridHelper = new THREE.Group();

    // Create lines material
    const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0x404040,
        transparent: true,
        opacity: 0.5
    });

    // Helper function to check if a point is within any base area
    function isInBaseArea(x, z) {
        const bases = [
            { x: -baseOffset, z: -baseOffset },
            { x: -baseOffset, z: baseOffset },
            { x: baseOffset, z: -baseOffset },
            { x: baseOffset, z: baseOffset }
        ];

        return bases.some(base => 
            Math.abs(x - base.x) < baseSize && 
            Math.abs(z - base.z) < baseSize
        );
    }

    // Create vertical lines
    for (let x = -gridSize/2; x <= gridSize/2; x += blockSize) {
        let currentLine = [];
        for (let z = -gridSize/2; z <= gridSize/2; z += blockSize) {
            if (!isInBaseArea(x, z)) {
                if (currentLine.length === 0) {
                    currentLine.push(new THREE.Vector3(x, 0.1, z));
                }
            } else if (currentLine.length === 1) {
                currentLine.push(new THREE.Vector3(x, 0.1, z - blockSize));
                const geometry = new THREE.BufferGeometry().setFromPoints(currentLine);
                const line = new THREE.Line(geometry, lineMaterial);
                gridHelper.add(line);
                currentLine = [];
            }
        }
        if (currentLine.length === 1) {
            currentLine.push(new THREE.Vector3(x, 0.1, gridSize/2));
            const geometry = new THREE.BufferGeometry().setFromPoints(currentLine);
            const line = new THREE.Line(geometry, lineMaterial);
            gridHelper.add(line);
        }
    }

    // Create horizontal lines
    for (let z = -gridSize/2; z <= gridSize/2; z += blockSize) {
        let currentLine = [];
        for (let x = -gridSize/2; x <= gridSize/2; x += blockSize) {
            if (!isInBaseArea(x, z)) {
                if (currentLine.length === 0) {
                    currentLine.push(new THREE.Vector3(x, 0.1, z));
                }
            } else if (currentLine.length === 1) {
                currentLine.push(new THREE.Vector3(x - blockSize, 0.1, z));
                const geometry = new THREE.BufferGeometry().setFromPoints(currentLine);
                const line = new THREE.Line(geometry, lineMaterial);
                gridHelper.add(line);
                currentLine = [];
            }
        }
        if (currentLine.length === 1) {
            currentLine.push(new THREE.Vector3(gridSize/2, 0.1, z));
            const geometry = new THREE.BufferGeometry().setFromPoints(currentLine);
            const line = new THREE.Line(geometry, lineMaterial);
            gridHelper.add(line);
        }
    }

    // Create thicker lines for major divisions (every 120 units)
    const majorLineMaterial = new THREE.LineBasicMaterial({ 
        color: 0x303030,
        transparent: true,
        opacity: 0.8,
        linewidth: 2
    });

    // Major vertical lines
    for (let x = -gridSize/2; x <= gridSize/2; x += 120) {
        let currentLine = [];
        for (let z = -gridSize/2; z <= gridSize/2; z += blockSize) {
            if (!isInBaseArea(x, z)) {
                if (currentLine.length === 0) {
                    currentLine.push(new THREE.Vector3(x, 0.2, z));
                }
            } else if (currentLine.length === 1) {
                currentLine.push(new THREE.Vector3(x, 0.2, z - blockSize));
                const geometry = new THREE.BufferGeometry().setFromPoints(currentLine);
                const line = new THREE.Line(geometry, majorLineMaterial);
                gridHelper.add(line);
                currentLine = [];
            }
        }
        if (currentLine.length === 1) {
            currentLine.push(new THREE.Vector3(x, 0.2, gridSize/2));
            const geometry = new THREE.BufferGeometry().setFromPoints(currentLine);
            const line = new THREE.Line(geometry, majorLineMaterial);
            gridHelper.add(line);
        }
    }

    // Major horizontal lines
    for (let z = -gridSize/2; z <= gridSize/2; z += 120) {
        let currentLine = [];
        for (let x = -gridSize/2; x <= gridSize/2; x += blockSize) {
            if (!isInBaseArea(x, z)) {
                if (currentLine.length === 0) {
                    currentLine.push(new THREE.Vector3(x, 0.2, z));
                }
            } else if (currentLine.length === 1) {
                currentLine.push(new THREE.Vector3(x - blockSize, 0.2, z));
                const geometry = new THREE.BufferGeometry().setFromPoints(currentLine);
                const line = new THREE.Line(geometry, majorLineMaterial);
                gridHelper.add(line);
                currentLine = [];
            }
        }
        if (currentLine.length === 1) {
            currentLine.push(new THREE.Vector3(gridSize/2, 0.2, z));
            const geometry = new THREE.BufferGeometry().setFromPoints(currentLine);
            const line = new THREE.Line(geometry, majorLineMaterial);
            gridHelper.add(line);
        }
    }

    scene.add(gridHelper);
}

createGrid();

// Generate tank bases in corners
function generateBases() {
    const baseOffset = 380; // Increased distance from center to base center

    // Create bases in each corner
    new Base(scene, -baseOffset, -baseOffset);  // Bottom-left
    new Base(scene, -baseOffset, baseOffset);   // Top-left
    new Base(scene, baseOffset, -baseOffset);   // Bottom-right
    new Base(scene, baseOffset, baseOffset);    // Top-right
}

// City generation with main road
function generateCity() {
    // Create bases first
    generateBases();
    
    // Create main road
    const roadSystem = new Road(scene);
    roadSystem.createMainRoad();
}

// Create boundary walls around the map
function createBoundaryWalls() {
    const wallHeight = 8;
    const wallThickness = 4;
    const mapSize = 900;
    const wallOffset = mapSize/2 - wallThickness/2; // Position walls at the edge of the map

    // Wall material
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x505050,
        roughness: 0.7,
        metalness: 0.3
    });

    // Create the four walls
    const walls = [
        // North wall (top)
        { length: mapSize, x: 0, z: -wallOffset, rotation: 0 },
        // South wall (bottom)
        { length: mapSize, x: 0, z: wallOffset, rotation: 0 },
        // East wall (right)
        { length: mapSize, x: wallOffset, z: 0, rotation: Math.PI/2 },
        // West wall (left)
        { length: mapSize, x: -wallOffset, z: 0, rotation: Math.PI/2 }
    ];

    walls.forEach(wall => {
        const wallGeometry = new THREE.BoxGeometry(wall.length, wallHeight, wallThickness);
        const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
        
        wallMesh.position.set(wall.x, wallHeight/2, wall.z);
        wallMesh.rotation.y = wall.rotation;
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;
        
        scene.add(wallMesh);
    });

    // Add corner pillars
    const pillarSize = 6;
    const pillarHeight = wallHeight + 2;
    const pillarGeometry = new THREE.BoxGeometry(pillarSize, pillarHeight, pillarSize);
    const pillarMaterial = new THREE.MeshStandardMaterial({
        color: 0x404040,
        roughness: 0.8,
        metalness: 0.2
    });

    const pillarPositions = [
        { x: -wallOffset, z: -wallOffset }, // Northwest
        { x: wallOffset, z: -wallOffset },  // Northeast
        { x: wallOffset, z: wallOffset },   // Southeast
        { x: -wallOffset, z: wallOffset }   // Southwest
    ];

    pillarPositions.forEach(pos => {
        const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        pillar.position.set(pos.x, pillarHeight/2, pos.z);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        scene.add(pillar);
    });
}

generateCity();
createBoundaryWalls();

// Create player tank
const tank = new Tank(scene);

// Camera setup
camera.position.set(0, 15, 15); // Reduced initial z distance from 20 to 15
camera.lookAt(tank.getPosition());

// Camera controls
const cameraSettings = {
    minHeight: 2,      // Keep minimum height the same
    maxHeight: 50,     // Keep maximum height the same
    scrollSpeed: 1,    // Keep scroll speed the same
    distance: 15,      // Reduced default distance from 20 to 15
    currentHeight: 15, // Keep initial height the same
    minDistance: 3,    // Reduced minimum distance from 5 to 3
    rotationLag: 0.1,  // Keep rotation lag the same
    currentRotation: 0 // Keep rotation tracking
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
                                 cameraSettings.currentHeight + delta));
    
    // Adjust distance based on height to maintain good viewing angle
    if (newHeight < 5) {
        cameraSettings.distance = Math.max(cameraSettings.minDistance, 
                                         cameraSettings.distance - Math.abs(delta));
    } else if (cameraSettings.distance < 15) { // Changed from 20 to 15
        cameraSettings.distance = Math.min(15, cameraSettings.distance + Math.abs(delta));
    }
    
    cameraSettings.currentHeight = newHeight;
}

function onMouseDown(event) {
    if (event.button === 0) { // Left mouse button
        // Tank firing
        tank.fireProjectile();
        
        // Coordinate logging
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(ground);
        if (intersects.length > 0) {
            const point = intersects[0].point;
            console.log(`Clicked coordinates: x: ${point.x.toFixed(2)}, z: ${point.z.toFixed(2)}`);
        }
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

    // Update camera position to follow behind tank
    const tankPos = tank.getPosition();
    const tankRotation = tank.getRotation();
    
    // Smoothly interpolate camera rotation
    const rotationDiff = tankRotation - cameraSettings.currentRotation;
    
    // Handle rotation wrap-around
    if (rotationDiff > Math.PI) {
        cameraSettings.currentRotation += Math.PI * 2;
    } else if (rotationDiff < -Math.PI) {
        cameraSettings.currentRotation -= Math.PI * 2;
    }
    
    cameraSettings.currentRotation += rotationDiff * cameraSettings.rotationLag;
    
    // Calculate camera position using interpolated rotation
    camera.position.x = tankPos.x - Math.sin(cameraSettings.currentRotation) * cameraSettings.distance;
    camera.position.z = tankPos.z - Math.cos(cameraSettings.currentRotation) * cameraSettings.distance;
    camera.position.y = cameraSettings.currentHeight;

    // Adjust look-at point based on height
    const lookAtHeight = Math.max(0.5, cameraSettings.currentHeight * 0.1);
    camera.lookAt(new THREE.Vector3(tankPos.x, tankPos.y + lookAtHeight, tankPos.z));

    // Update directional light position relative to tank
    directionalLight.position.set(
        tankPos.x + 20,
        50,
        tankPos.z + 20
    );
    directionalLight.target = tank.body;

    renderer.render(scene, camera);
}

animate();

// Create controls overlay
function createControlsOverlay() {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '20px';
    overlay.style.left = '20px';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.padding = '15px';
    overlay.style.borderRadius = '8px';
    overlay.style.color = 'white';
    overlay.style.fontFamily = 'Arial, sans-serif';
    overlay.style.fontSize = '14px';
    overlay.style.zIndex = '1000';
    overlay.style.userSelect = 'none';
    overlay.style.pointerEvents = 'none';

    const controls = [
        'W - Move Forward',
        'S - Move Backward',
        'A - Rotate Left',
        'D - Rotate Right',
        'Mouse - Aim Turret',
        'Left Click - Fire'
    ];

    const title = document.createElement('div');
    title.textContent = 'Controls';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '8px';
    title.style.fontSize = '16px';
    overlay.appendChild(title);

    controls.forEach(control => {
        const div = document.createElement('div');
        div.textContent = control;
        div.style.marginBottom = '4px';
        overlay.appendChild(div);
    });

    document.body.appendChild(overlay);
}

// Call this after scene initialization
createControlsOverlay(); 