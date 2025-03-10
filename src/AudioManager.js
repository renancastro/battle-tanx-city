import * as THREE from 'three';

export class AudioManager {
    constructor() {
        // Create audio listener
        this.listener = new THREE.AudioListener();
        
        // Get audio context from the listener
        this.audioContext = this.listener.context;
        
        // Create sound pools
        this.soundPools = {
            cannonFire: {
                near: this.createSoundPool(3),
                far: this.createSoundPool(3),
                echo: this.createSoundPool(3)
            }
        };

        // Initialize sounds
        this.loadSounds();

        // Resume audio context if it's suspended (needed for some browsers)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    createSoundPool(poolSize) {
        const pool = [];
        for (let i = 0; i < poolSize; i++) {
            const sound = new THREE.Audio(this.listener);
            sound.setVolume(0.5); // Set default volume
            pool.push(sound);
        }
        return {
            sounds: pool,
            currentIndex: 0
        };
    }

    getNextSound(pool) {
        const sound = pool.sounds[pool.currentIndex];
        pool.currentIndex = (pool.currentIndex + 1) % pool.sounds.length;
        return sound;
    }

    createCannonSound(type) {
        const duration = type === 'echo' ? 2.0 : 0.5; // Longer duration for more powerful sound
        const sampleRate = this.audioContext.sampleRate;
        const bufferSize = duration * sampleRate;
        const buffer = this.audioContext.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);

        // Create the main explosion sound
        for (let i = 0; i < bufferSize; i++) {
            const t = i / sampleRate;
            
            // Base explosion (white noise with slower decay for more power)
            const decay = Math.exp(-8 * t); // Slower decay for longer rumble
            const noise = (Math.random() * 2 - 1) * decay;
            
            // Deep bass rumble (lowered frequency for artillery-like sound)
            const bassRumble = Math.sin(2 * Math.PI * 15 * t) * Math.exp(-4 * t);
            
            // Mid frequency impact (adjusted for 155mm characteristic)
            const impact = Math.sin(2 * Math.PI * 100 * t) * Math.exp(-20 * t);

            // High frequency crack (sharper initial crack)
            const crack = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-60 * t);

            // Secondary explosion components
            const secondaryBoom = Math.sin(2 * Math.PI * 40 * t) * Math.exp(-10 * t);

            // Combine all components with different weights based on sound type
            if (type === 'near') {
                data[i] = (
                    noise * 0.4 + 
                    bassRumble * 0.5 + // Increased bass for near sound
                    impact * 0.3 + 
                    crack * 0.3 +
                    secondaryBoom * 0.3
                ) * Math.exp(-3 * t);
            } else if (type === 'far') {
                data[i] = (
                    noise * 0.2 + 
                    bassRumble * 0.6 + // More bass in distance
                    impact * 0.2 +
                    secondaryBoom * 0.4
                ) * Math.exp(-2 * t);
            } else { // echo
                const delayedDecay = Math.exp(-1.5 * t);
                data[i] = (
                    noise * 0.1 + 
                    bassRumble * 0.8 + // Echo dominated by bass
                    impact * 0.1 +
                    secondaryBoom * 0.3
                ) * delayedDecay;
            }
        }

        return buffer;
    }

    loadSounds() {
        // Create synthesized sounds for each pool
        this.soundPools.cannonFire.near.sounds.forEach(sound => {
            const buffer = this.createCannonSound('near');
            sound.setBuffer(buffer);
            sound.setVolume(0.8); // Increased volume for more impact
        });

        this.soundPools.cannonFire.far.sounds.forEach(sound => {
            const buffer = this.createCannonSound('far');
            sound.setBuffer(buffer);
            sound.setVolume(0.5); // Increased volume for distant sound
        });

        this.soundPools.cannonFire.echo.sounds.forEach(sound => {
            const buffer = this.createCannonSound('echo');
            sound.setBuffer(buffer);
            sound.setVolume(0.4); // Increased echo volume
        });
    }

    playCannonFire(position) {
        // Ensure audio context is running
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const nearSound = this.getNextSound(this.soundPools.cannonFire.near);
        const farSound = this.getNextSound(this.soundPools.cannonFire.far);
        const echoSound = this.getNextSound(this.soundPools.cannonFire.echo);

        // Play sounds with proper timing
        nearSound.play();
        
        // Play the distant sound with slight delay
        setTimeout(() => {
            farSound.play();
        }, 50); // Increased delay for more realistic sound propagation
        
        // Play the echo with longer delay
        setTimeout(() => {
            echoSound.play();
        }, 150); // Increased delay for more realistic echo
    }
} 