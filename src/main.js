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
        // For each vertical line, we might need multiple segments
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
        // Don't forget to draw the last segment if it exists
        if (currentLine.length === 1) {
            currentLine.push(new THREE.Vector3(x, 0.1, gridSize/2));
            const geometry = new THREE.BufferGeometry().setFromPoints(currentLine);
            const line = new THREE.Line(geometry, lineMaterial);
            gridHelper.add(line);
        }
    }

    // Create horizontal lines
    for (let z = -gridSize/2; z <= gridSize/2; z += blockSize) {
        // For each horizontal line, we might need multiple segments
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
        // Don't forget to draw the last segment if it exists
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

    // Add colored squares around base
    const squareSize = 40; // Size of each adjacent square
    const squareGeometry = new THREE.PlaneGeometry(squareSize, squareSize);
    const squareMaterial = new THREE.MeshStandardMaterial({
        color: 0x606060,  // Slightly lighter than base
        roughness: 0.8,
        metalness: 0.2
    });

    // Define sizes for walls and pillars
    const pillarSize = 3;
    const wallHeight = 5;
    const wallThickness = 2;
    const pillarHeight = wallHeight + 1;

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
        baseGroup.add(square);
    });

    // Add walls around the perimeter
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x606060,
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

    // Create walls between pillars
    for (let i = 0; i < 4; i++) {
        const start = wallPoints[i];
        const end = wallPoints[(i + 1) % 4];
        
        // Calculate wall length and position
        const length = Math.sqrt(
            Math.pow(end.x - start.x, 2) + 
            Math.pow(end.z - start.z, 2)
        ) - pillarSize; // Subtract pillar size to connect exactly to pillars
        
        // Calculate position to account for pillar offset
        const direction = {
            x: end.x - start.x,
            z: end.z - start.z
        };
        const distance = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
        const normalized = {
            x: direction.x / distance,
            z: direction.z / distance
        };
        
        const centerX = start.x + direction.x / 2;
        const centerZ = start.z + direction.z / 2;
        
        // Calculate rotation
        const rotation = Math.atan2(direction.z, direction.x);

        const wallGeometry = new THREE.BoxGeometry(length, wallHeight, wallThickness);
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        
        wall.position.set(
            centerX,
            wallHeight/2,
            centerZ
        );
        wall.rotation.y = rotation;
        wall.castShadow = true;
        wall.receiveShadow = true;
        baseGroup.add(wall);
    }

    // Add corner pillars
    const pillarGeometry = new THREE.BoxGeometry(pillarSize, pillarHeight, pillarSize);
    const pillarMaterial = new THREE.MeshStandardMaterial({
        color: 0x505050,
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
        baseGroup.add(pillar);
    });

    baseGroup.position.set(x, 0, z);
    scene.add(baseGroup);
}

// Generate tank bases in corners
function generateBases() {
    const mapSize = 900;
    const baseOffset = 380; // Increased distance from center to base center

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
generateBases();
createBoundaryWalls();

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