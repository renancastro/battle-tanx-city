import * as THREE from 'three';
import { Tank } from './Tank.js';
import { Base } from './Base.js';
import { Road } from './Road.js';
import { Building } from './Building.js';
import { UI } from './UI.js';
import { AudioManager } from './AudioManager.js';
import { NetworkManager } from './NetworkManager.js';

// Game state
const keys = {
    w: false,
    s: false,
    a: false,
    d: false
};

// Initialize UI
const ui = new UI();

// Initialize audio system
const audioManager = new AudioManager();

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

// Add audio listener to camera
camera.add(audioManager.listener);

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

// Initialize NetworkManager
const networkManager = new NetworkManager(scene);

// Map of other players' tanks
const remotePlayers = new Map();

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

    // Create bases in each corner with their colors
    new Base(scene, -baseOffset, -baseOffset, 0xff0000);  // Bottom-left (Red)
    new Base(scene, -baseOffset, baseOffset, 0x0000ff);   // Top-left (Blue)
    new Base(scene, baseOffset, -baseOffset, 0x00ff00);   // Bottom-right (Green)
    new Base(scene, baseOffset, baseOffset, 0xffff00);    // Top-right (Yellow)
}

// City generation with roads and buildings
function generateCity() {
    // Create bases first
    generateBases();
    
    // Create road grid
    const roadSystem = new Road(scene);
    roadSystem.createRoadGrid();

    // Add military buildings in strategic locations
    const militaryBuildings = [
        { type: 'military_airport', x: -200, z: 0 },      // West side
        { type: 'military_barracks', x: 0, z: -200 },     // South side
        { type: 'military_control_tower', x: 200, z: 0 },  // East side
        { type: 'military_factory', x: 0, z: 200 },       // North side
        { type: 'military_science', x: 0, z: 0 },         // Center
        { type: 'military_gigafactory', x: 240, z: 240 }  // Northeast quadrant - adjusted to be within playable area
    ];

    // Keep track of placed buildings to check for overlaps
    const placedBuildings = [];

    // Helper function to check if a new building would overlap with existing ones
    function wouldOverlap(newX, newZ, buildingType) {
        // Define building sizes (width x depth)
        const buildingSizes = {
            'military_airport': { width: 55, depth: 30 },    // Including runway
            'military_barracks': { width: 30, depth: 20 },
            'military_control_tower': { width: 12, depth: 12 },
            'military_factory': { width: 30, depth: 20 },
            'military_science': { width: 25, depth: 25 },
            'military_gigafactory': { width: 40, depth: 60 }
        };

        const newSize = buildingSizes[buildingType] || { width: 20, depth: 20 };
        const safetyMargin = 20; // Increased safety margin for better spacing

        // Check if position is too close to map boundary
        const mapBoundary = 450 - safetyMargin; // Half of map size (900/2) minus safety margin
        if (Math.abs(newX) > mapBoundary || Math.abs(newZ) > mapBoundary) {
            return true; // Too close to boundary
        }

        // Check if near any road
        const roadWidth = 12;
        const gridSize = 4;
        const mapSize = 900;
        const spacing = (mapSize - 20) / (gridSize - 1);

        // Check horizontal roads
        for (let i = 0; i < gridSize; i++) {
            const roadZ = -mapSize/2 + i * spacing;
            if (Math.abs(newZ - roadZ) < roadWidth + safetyMargin) return true;
        }
        // Check vertical roads
        for (let i = 0; i < gridSize; i++) {
            const roadX = -mapSize/2 + i * spacing;
            if (Math.abs(newX - roadX) < roadWidth + safetyMargin) return true;
        }

        // Check other buildings
        for (const placed of placedBuildings) {
            const placedSize = buildingSizes[placed.type] || { width: 20, depth: 20 };
            
            // Calculate the minimum distance needed between building centers
            const minX = (newSize.width + placedSize.width) / 2 + safetyMargin;
            const minZ = (newSize.depth + placedSize.depth) / 2 + safetyMargin;

            // Check if buildings overlap
            if (Math.abs(newX - placed.x) < minX && Math.abs(newZ - placed.z) < minZ) {
                return true;
            }
        }
        return false;
    }

    // Place military buildings with overlap checking
    militaryBuildings.forEach(building => {
        if (!wouldOverlap(building.x, building.z, building.type)) {
            new Building(scene, building.x, building.z, building.type);
            placedBuildings.push(building);
        } else {
            console.warn(`Skipping overlapping building: ${building.type} at (${building.x}, ${building.z})`);
        }
    });

    // Add regular buildings along roads
    const mapSize = 900;
    const wallThickness = 4;
    const safeDistance = 15; // Distance from walls to prevent overlap
    const mapLimit = mapSize/2 - wallThickness - safeDistance;
    
    const gridSize = 4; // Same as in Road class
    const spacing = (mapSize - 20) / (gridSize - 1);
    const roadWidth = 12; // Same as in Road class
    const buildingOffset = roadWidth + 15; // Distance from road center to building (road width + gap)
    const baseOffset = 380; // Same as in generateBases
    const baseSize = 100; // Safe distance from bases
    const buildingSpacing = 50; // Space between buildings

    // Helper function to check if position is too close to bases
    function isTooCloseToBase(x, z) {
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

    // Helper function to check if position is within map bounds
    function isWithinMapBounds(x, z) {
        return Math.abs(x) <= mapLimit && Math.abs(z) <= mapLimit;
    }

    // Helper function to check if position is near any road
    function isNearRoad(x, z) {
        // Check horizontal roads
        for (let i = 0; i < gridSize; i++) {
            const roadZ = -mapSize/2 + i * spacing;
            if (Math.abs(z - roadZ) < roadWidth/2) return true;
        }
        // Check vertical roads
        for (let i = 0; i < gridSize; i++) {
            const roadX = -mapSize/2 + i * spacing;
            if (Math.abs(x - roadX) < roadWidth/2) return true;
        }
        return false;
    }

    // Place buildings along horizontal roads
    for (let i = 0; i < gridSize; i++) {
        const z = -mapSize/2 + i * spacing;
        for (let x = -mapLimit + buildingSpacing; x < mapLimit - buildingSpacing; x += buildingSpacing) {
            // Place buildings on both sides of the road
            [-buildingOffset, buildingOffset].forEach(offset => {
                const buildingZ = z + offset;
                const randomOffset = (Math.random() - 0.5) * 5; // Reduced random offset
                const finalX = x + randomOffset;
                const finalZ = buildingZ;
                
                // Check if position is valid
                if (!isTooCloseToBase(finalX, finalZ) && 
                    isWithinMapBounds(finalX, finalZ) && 
                    !isNearRoad(finalX, finalZ)) {
                    new Building(scene, finalX, finalZ);
                }
            });
        }
    }

    // Place buildings along vertical roads
    for (let i = 0; i < gridSize; i++) {
        const x = -mapSize/2 + i * spacing;
        for (let z = -mapLimit + buildingSpacing; z < mapLimit - buildingSpacing; z += buildingSpacing) {
            // Place buildings on both sides of the road
            [-buildingOffset, buildingOffset].forEach(offset => {
                const buildingX = x + offset;
                const randomOffset = (Math.random() - 0.5) * 5; // Reduced random offset
                const finalX = buildingX;
                const finalZ = z + randomOffset;
                
                // Check if position is valid
                if (!isTooCloseToBase(finalX, finalZ) && 
                    isWithinMapBounds(finalX, finalZ) && 
                    !isNearRoad(finalX, finalZ)) {
                    new Building(scene, finalX, finalZ);
                }
            });
        }
    }
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

// Initialize local player's tank (will be created after server connection)
let tank = null;

// Network event handlers
networkManager.onInit((data) => {
    console.log('Initializing player with data:', data);
    
    // Create local player's tank with assigned team color
    const teamColors = {
        'red': 0xff0000,
        'blue': 0x0000ff,
        'green': 0x00ff00,
        'yellow': 0xffff00
    };

    // Create tank with team color
    tank = new Tank(scene, audioManager, 'M1A1');
    
    // Set tank color based on team
    const teamColor = teamColors[data.team] || 0xff0000; // Default to red if team color not found
    tank.body.traverse((object) => {
        if (object instanceof THREE.Mesh) {
            if (object.material) {
                object.material.color.setHex(teamColor);
            }
            // Also set color for any child materials
            if (object.children) {
                object.children.forEach(child => {
                    if (child.material) {
                        child.material.color.setHex(teamColor);
                    }
                });
            }
        }
    });

    // Position tank in the correct base
    if (data.position) {
        tank.body.position.copy(data.position);
    }
    if (data.rotation) {
        tank.body.rotation.y = data.rotation.y;
    }
    
    // Initialize other players
    data.players?.forEach(playerData => {
        if (playerData.id !== networkManager.playerId) {
            createRemotePlayer(playerData);
        }
    });

    // Update camera to look at tank
    const tankPos = tank.getPosition();
    camera.position.set(
        tankPos.x - Math.sin(tank.getRotation()) * cameraSettings.distance,
        cameraSettings.currentHeight,
        tankPos.z - Math.cos(tank.getRotation()) * cameraSettings.distance
    );
    camera.lookAt(new THREE.Vector3(tankPos.x, tankPos.y + 0.5, tankPos.z));

    // Start the animation loop
    animate();
});

networkManager.onPlayerJoined((data) => {
    if (data.id !== networkManager.playerId) {
        createRemotePlayer(data);
    }
});

networkManager.onPlayerLeft((data) => {
    const remotePlayer = remotePlayers.get(data.id);
    if (remotePlayer) {
        scene.remove(remotePlayer);
        remotePlayers.delete(data.id);
    }
});

networkManager.onPlayerUpdated((data) => {
    const remotePlayer = remotePlayers.get(data.id);
    if (remotePlayer) {
        // Update position
        remotePlayer.body.position.set(
            data.position.x,
            data.position.y,
            data.position.z
        );
        // Update rotations
        remotePlayer.body.rotation.y = data.rotation.y;
        remotePlayer.turret.rotation.y = data.turretRotation.y;
    }
});

networkManager.onProjectileCreated((data) => {
    if (data.playerId !== networkManager.playerId) {
        // Create projectile for remote player
        const projectile = new THREE.Mesh(
            new THREE.SphereGeometry(0.2),
            new THREE.MeshBasicMaterial({ 
                color: 0xff0000,
                emissive: 0xff0000,
                emissiveIntensity: 1,
                toneMapped: false
            })
        );
        projectile.position.copy(data.position);
        projectile.userData.velocity = data.velocity;
        projectile.userData.createdAt = Date.now();
        scene.add(projectile);
        projectiles.push(projectile);
    }
});

networkManager.onProjectileRemoved((data) => {
    const index = projectiles.findIndex(p => p.userData.id === data.id);
    if (index !== -1) {
        scene.remove(projectiles[index]);
        projectiles.splice(index, 1);
    }
});

networkManager.onPlayerDamaged((data) => {
    if (data.id === networkManager.playerId) {
        tank.takeDamage(data.damage);
    } else {
        const remotePlayer = remotePlayers.get(data.id);
        if (remotePlayer) {
            remotePlayer.takeDamage(data.damage);
        }
    }
});

networkManager.onPlayerDestroyed((data) => {
    if (data.id === networkManager.playerId) {
        tank.onDestroyed();
    } else {
        const remotePlayer = remotePlayers.get(data.id);
        if (remotePlayer) {
            remotePlayer.onDestroyed();
        }
    }
});

function createRemotePlayer(playerData) {
    const teamColors = {
        'red': 0xff0000,
        'blue': 0x0000ff,
        'green': 0x00ff00,
        'yellow': 0xffff00
    };

    const remotePlayer = new Tank(scene, audioManager, playerData.tankType);
    
    // Set position and rotation using Vector3
    remotePlayer.body.position.set(
        playerData.position.x,
        playerData.position.y,
        playerData.position.z
    );
    remotePlayer.body.rotation.y = playerData.rotation.y;
    remotePlayer.turret.rotation.y = playerData.turretRotation.y;

    // Set team color
    const teamColor = teamColors[playerData.team] || 0xff0000;
    remotePlayer.body.traverse((object) => {
        if (object instanceof THREE.Mesh) {
            if (object.material) {
                object.material.color.setHex(teamColor);
            }
            // Also set color for any child materials
            if (object.children) {
                object.children.forEach(child => {
                    if (child.material) {
                        child.material.color.setHex(teamColor);
                    }
                });
            }
        }
    });

    remotePlayers.set(playerData.id, remotePlayer);
}

// Camera setup
camera.position.set(0, 15, 15);
camera.lookAt(new THREE.Vector3(0, 0, 0));

// Camera controls
const cameraSettings = {
    minHeight: 2,
    maxHeight: 50,
    scrollSpeed: 1,
    distance: 15,
    currentHeight: 15,
    minDistance: 3,
    rotationLag: 0.1,
    currentRotation: 0
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
    if (event.button === 0 && tank) { // Left mouse button
        tank.fireProjectile();
        
        // Send fire event to server
        const position = tank.getPosition();
        const direction = new THREE.Vector3(0, 0, 1);
        direction.applyQuaternion(tank.turret.getWorldQuaternion(new THREE.Quaternion()));
        direction.multiplyScalar(tank.projectileSpeed);
        
        networkManager.sendFire(position, direction);
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
let lastTime = performance.now();
let frameCount = 0;
let fpsDisplayTime = 0;
let currentFps = 0;
let lastNetworkUpdate = 0;
const NETWORK_UPDATE_INTERVAL = 50; // Send position updates every 50ms

// Create FPS display
const fpsDisplay = document.createElement('div');
fpsDisplay.style.position = 'fixed';
fpsDisplay.style.top = '70px';
fpsDisplay.style.right = '20px';
fpsDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
fpsDisplay.style.padding = '10px 20px';
fpsDisplay.style.borderRadius = '5px';
fpsDisplay.style.color = '#fff';
fpsDisplay.style.fontFamily = 'Arial, sans-serif';
fpsDisplay.style.fontSize = '16px';
fpsDisplay.style.zIndex = '1000';
fpsDisplay.style.userSelect = 'none';
fpsDisplay.style.pointerEvents = 'none';
document.body.appendChild(fpsDisplay);

function animate() {
    requestAnimationFrame(animate);

    const currentTime = performance.now();

    // Calculate FPS
    frameCount++;
    if (currentTime > fpsDisplayTime + 1000) {
        currentFps = Math.round((frameCount * 1000) / (currentTime - fpsDisplayTime));
        fpsDisplay.textContent = `FPS: ${currentFps}`;
        fpsDisplayTime = currentTime;
        frameCount = 0;
    }

    if (tank) {
        // Update tank
        tank.update(ground, mouse, raycaster, camera);

        // Send position updates to server
        if (currentTime - lastNetworkUpdate > NETWORK_UPDATE_INTERVAL) {
            networkManager.sendPosition(
                tank.getPosition(),
                { y: tank.getRotation() },
                { y: tank.turret.rotation.y }
            );
            lastNetworkUpdate = currentTime;
        }

        // Update camera position to follow tank
        const tankPos = tank.getPosition();
        const tankRotation = tank.getRotation();
        
        // Camera follow logic
        const rotationDiff = tankRotation - cameraSettings.currentRotation;
        
        if (rotationDiff > Math.PI) {
            cameraSettings.currentRotation += Math.PI * 2;
        } else if (rotationDiff < -Math.PI) {
            cameraSettings.currentRotation -= Math.PI * 2;
        }
        
        cameraSettings.currentRotation += rotationDiff * cameraSettings.rotationLag;
        
        camera.position.x = tankPos.x - Math.sin(cameraSettings.currentRotation) * cameraSettings.distance;
        camera.position.z = tankPos.z - Math.cos(cameraSettings.currentRotation) * cameraSettings.distance;
        camera.position.y = cameraSettings.currentHeight;

        const lookAtHeight = Math.max(0.5, cameraSettings.currentHeight * 0.1);
        camera.lookAt(new THREE.Vector3(tankPos.x, tankPos.y + lookAtHeight, tankPos.z));

        // Update directional light position relative to tank
        directionalLight.position.set(
            tankPos.x + 20,
            50,
            tankPos.z + 20
        );
        directionalLight.target = tank.body;
    }

    renderer.render(scene, camera);
}

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

// Start the game
createControlsOverlay();
networkManager.connect(); 