export class UI {
    constructor() {
        this.score = 0;
        this.createScoreDisplay();
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

    updateScoreDisplay() {
        this.scoreContainer.textContent = `Score: ${this.score}`;
    }

    addPoints(points) {
        this.score += points;
        this.updateScoreDisplay();
        
        // Create floating score text
        this.showFloatingPoints(points);
    }

    showFloatingPoints(points) {
        // Create floating text element
        const floatingText = document.createElement('div');
        floatingText.textContent = `+${points}`;
        floatingText.style.position = 'fixed';
        floatingText.style.color = '#ffff00';
        floatingText.style.fontFamily = 'Arial, sans-serif';
        floatingText.style.fontSize = '32px';
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
        window.addEventListener('buildingDestroyed', () => {
            // Add points for destroying a building
            this.addPoints(100);
        });
    }
} 