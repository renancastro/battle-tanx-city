export class UI {
    constructor() {
        this.score = 0;
        this.baseHealthBars = new Map(); // Store health bars for each base
        this.createScoreDisplay();
        this.createBaseHealthDisplay();
        this.setupEventListeners();
    }

    createScoreDisplay() {
        // Create score container
        this.scoreContainer = document.createElement('div');
        this.scoreContainer.style.position = 'fixed';
        this.scoreContainer.style.top = '20px';
        this.scoreContainer.style.right = '20px';
        this.scoreContainer.style.padding = '10px 20px';
        this.scoreContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.scoreContainer.style.color = '#fff';
        this.scoreContainer.style.fontFamily = 'Arial, sans-serif';
        this.scoreContainer.style.fontSize = '24px';
        this.scoreContainer.style.borderRadius = '5px';
        this.scoreContainer.style.zIndex = '1000';
        
        // Create score text
        this.updateScoreDisplay();
        
        // Add to document
        document.body.appendChild(this.scoreContainer);
    }

    createBaseHealthDisplay() {
        // Create container for base health bars
        this.baseHealthContainer = document.createElement('div');
        this.baseHealthContainer.style.position = 'fixed';
        this.baseHealthContainer.style.top = '120px';
        this.baseHealthContainer.style.right = '20px';
        this.baseHealthContainer.style.padding = '15px';
        this.baseHealthContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.baseHealthContainer.style.borderRadius = '8px';
        this.baseHealthContainer.style.minWidth = '220px';
        this.baseHealthContainer.style.zIndex = '1000';
        document.body.appendChild(this.baseHealthContainer);
    }

    updateScoreDisplay() {
        this.scoreContainer.textContent = `Score: ${this.score}`;
    }

    updateBaseHealth(x, z, color, health, maxHealth) {
        const baseId = `${x},${z}`;
        let healthBarElements = this.baseHealthBars.get(baseId);

        if (!healthBarElements) {
            // Create new health bar container
            const healthBar = document.createElement('div');
            healthBar.style.marginBottom = '12px';
            healthBar.style.width = '200px';
            healthBar.style.position = 'relative';
            
            // Base label
            const label = document.createElement('div');
            label.style.color = '#fff';
            label.style.fontFamily = 'Arial, sans-serif';
            label.style.fontSize = '14px';
            label.style.marginBottom = '5px';
            label.textContent = `Base (${x > 0 ? 'Right' : 'Left'}, ${z > 0 ? 'Top' : 'Bottom'})`;
            healthBar.appendChild(label);
            
            // Container background
            const container = document.createElement('div');
            container.style.backgroundColor = '#333';
            container.style.height = '24px';
            container.style.borderRadius = '4px';
            container.style.overflow = 'hidden';
            container.style.border = '1px solid #555';
            
            // Health fill
            const fill = document.createElement('div');
            fill.style.height = '100%';
            fill.style.backgroundColor = '#' + color.toString(16).padStart(6, '0');
            fill.style.width = '100%';
            fill.style.transition = 'width 0.3s ease-in-out';
            container.appendChild(fill);
            
            // Health text
            const text = document.createElement('div');
            text.style.position = 'absolute';
            text.style.width = '100%';
            text.style.textAlign = 'center';
            text.style.color = '#fff';
            text.style.fontFamily = 'Arial, sans-serif';
            text.style.fontSize = '14px';
            text.style.lineHeight = '24px';
            text.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
            text.style.top = '24px';
            text.style.left = '0';
            
            healthBar.appendChild(container);
            healthBar.appendChild(text);
            this.baseHealthContainer.appendChild(healthBar);
            
            healthBarElements = {
                container: healthBar,
                fill: fill,
                text: text,
                label: label
            };
            this.baseHealthBars.set(baseId, healthBarElements);
        }

        // Update health bar
        const percentage = (health / maxHealth) * 100;
        healthBarElements.fill.style.width = `${percentage}%`;
        healthBarElements.text.textContent = `${Math.ceil(health)}/${maxHealth} HP`;
    }

    removeBaseHealth(x, z) {
        const baseId = `${x},${z}`;
        const healthBarElements = this.baseHealthBars.get(baseId);
        if (healthBarElements) {
            healthBarElements.container.remove();
            this.baseHealthBars.delete(baseId);
        }
    }

    addPoints(points, isMilitary = false, isBase = false) {
        // Bases give double points of military buildings
        const multiplier = isBase ? 4 : (isMilitary ? 2 : 1);
        const finalPoints = points * multiplier;
        this.score += finalPoints;
        this.updateScoreDisplay();
        
        // Create floating score text
        this.showFloatingPoints(finalPoints, isMilitary || isBase);
    }

    showFloatingPoints(points, isMilitary) {
        // Create floating text element
        const floatingText = document.createElement('div');
        floatingText.textContent = `+${points}`;
        floatingText.style.position = 'fixed';
        floatingText.style.color = isMilitary ? '#ff4444' : '#ffff00'; // Red for military, yellow for regular
        floatingText.style.fontFamily = 'Arial, sans-serif';
        floatingText.style.fontSize = isMilitary ? '40px' : '32px'; // Bigger text for military
        floatingText.style.fontWeight = 'bold';
        floatingText.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
        floatingText.style.pointerEvents = 'none';
        floatingText.style.zIndex = '1001';
        
        // Position near the score display
        floatingText.style.top = '60px';
        floatingText.style.right = '40px';
        
        // Add to document
        document.body.appendChild(floatingText);
        
        // Animate
        let startTime = Date.now();
        const duration = 1000;
        const animate = () => {
            const progress = (Date.now() - startTime) / duration;
            
            if (progress < 1) {
                // Move upward and fade out
                floatingText.style.transform = `translateY(${-50 * progress}px)`;
                floatingText.style.opacity = 1 - progress;
                
                requestAnimationFrame(animate);
            } else {
                document.body.removeChild(floatingText);
            }
        };
        
        animate();
    }

    setupEventListeners() {
        // Listen for building destroyed events
        window.addEventListener('buildingDestroyed', (event) => {
            this.addPoints(100, event.detail.isMilitary);
        });

        // Listen for base health changes
        window.addEventListener('baseHealthChanged', (event) => {
            const { x, z, color, health, maxHealth } = event.detail;
            this.updateBaseHealth(x, z, color, health, maxHealth);
        });

        // Listen for base destroyed events
        window.addEventListener('baseDestroyed', (event) => {
            const { x, z } = event.detail;
            this.removeBaseHealth(x, z);
            this.addPoints(100, false, true); // Base destruction points
        });
    }
} 