import * as THREE from 'three';

export class Road {
    constructor(scene) {
        this.scene = scene;
        
        // Road properties
        this.roadWidth = 12;  // Wider road for better visibility
        this.roadColor = 0x333333;  // Dark asphalt color
        
        // Line properties
        this.lineWidth = 0.3;
        this.centerLineColor = 0xffff00;  // Yellow for center lines
        
        // Gameplay zones
        this.crossingZoneLength = 40;     // Length of crossing zones
        this.crossingZoneSpacing = 100;   // Space between crossing zones
        
        // Material definitions
        this.roadMaterial = new THREE.MeshStandardMaterial({
            color: this.roadColor,
            roughness: 0.8,
            metalness: 0.1
        });
        
        this.centerLineMaterial = new THREE.MeshStandardMaterial({
            color: this.centerLineColor,
            roughness: 0.4,
            metalness: 0.1
        });

        // Create roads
        this.createMainRoad();
        this.createCrossingRoad();
    }

    createRoadSegment(length, isRotated = false) {
        const roadContainer = new THREE.Object3D();
        roadContainer.rotation.x = -Math.PI/2;
        if (isRotated) {
            roadContainer.rotation.z = Math.PI/2;
        }
        roadContainer.position.y = 0.01;
        
        // Create road base
        const roadGeometry = new THREE.PlaneGeometry(length, this.roadWidth);
        const road = new THREE.Mesh(roadGeometry, this.roadMaterial);
        roadContainer.add(road);
        
        // Add center lines with crossing zones
        const centerLineSpacing = 0.4;
        [-centerLineSpacing/2, centerLineSpacing/2].forEach(offset => {
            let currentX = -length/2;
            while (currentX < length/2) {
                const remainingLength = length/2 - currentX;
                
                // Solid line segment
                const solidLength = Math.min(this.crossingZoneSpacing, remainingLength);
                if (solidLength > 0) {
                    const solidLine = new THREE.Mesh(
                        new THREE.PlaneGeometry(solidLength, this.lineWidth),
                        this.centerLineMaterial
                    );
                    solidLine.position.set(currentX + solidLength/2, 0.001, offset);
                    solidLine.userData.isSolidLine = true;
                    roadContainer.add(solidLine);
                }
                
                currentX += solidLength;

                // Check if we can add a dashed section
                if (currentX < length/2) {
                    const remainingForDashed = length/2 - currentX;
                    const dashedSectionLength = Math.min(this.crossingZoneLength, remainingForDashed);
                    
                    if (dashedSectionLength > 0) {
                        const dashLength = 2;
                        const dashGap = 2;
                        const dashPeriod = dashLength + dashGap;
                        const numDashes = Math.floor(dashedSectionLength / dashPeriod);
                        
                        for (let i = 0; i < numDashes; i++) {
                            const dashOffset = currentX + i * dashPeriod + dashLength/2;
                            // Check if this dash would go beyond the road
                            if (dashOffset + dashLength/2 <= length/2) {
                                const dash = new THREE.Mesh(
                                    new THREE.PlaneGeometry(dashLength, this.lineWidth),
                                    this.centerLineMaterial
                                );
                                dash.position.set(dashOffset, 0.001, offset);
                                dash.userData.isCrossingZone = true;
                                roadContainer.add(dash);
                            }
                        }
                        
                        currentX += dashedSectionLength;
                    }
                }
            }
        });

        // Enable shadows
        roadContainer.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.receiveShadow = true;
            }
        });

        return roadContainer;
    }

    createMainRoad() {
        const mapSize = 900;
        const length = mapSize - 20; // Leave small gap from walls
        const mainRoad = this.createRoadSegment(length, false);
        this.scene.add(mainRoad);
        return mainRoad;
    }

    createCrossingRoad() {
        const mapSize = 900;
        const length = mapSize - 20; // Leave small gap from walls
        const crossRoad = this.createRoadSegment(length, true);
        this.scene.add(crossRoad);
        return crossRoad;
    }
} 