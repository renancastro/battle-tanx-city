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
        const duration = type === 'echo' ? 1.0 : 0.3; // Shortened duration for punchier sound
        const sampleRate = this.audioContext.sampleRate;
        const bufferSize = duration * sampleRate;
        const buffer = this.audioContext.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);

        // Create the main explosion sound
        for (let i = 0; i < bufferSize; i++) {
            const t = i / sampleRate;
            
            // Base explosion (white noise with exponential decay)
            const decay = Math.exp(-12 * t); // Faster decay
            const noise = (Math.random() * 2 - 1) * decay;
            
            // Low frequency rumble (lowered frequency for more impact)
            const rumble = Math.sin(2 * Math.PI * 20 * t) * Math.exp(-6 * t);
            
            // Mid frequency impact (increased frequency for sharper sound)
            const impact = Math.sin(2 * Math.PI * 150 * t) * Math.exp(-35 * t);

            // High frequency crack (new component)
            const crack = Math.sin(2 * Math.PI * 400 * t) * Math.exp(-50 * t);

            // Combine all components with different weights based on sound type
            if (type === 'near') {
                data[i] = (
                    noise * 0.6 + 
                    rumble * 0.3 + 
                    impact * 0.3 + 
                    crack * 0.2
                ) * Math.exp(-4 * t);
            } else if (type === 'far') {
                data[i] = (
                    noise * 0.3 + 
                    rumble * 0.5 + 
                    impact * 0.2
                ) * Math.exp(-3 * t);
            } else { // echo
                const delayedDecay = Math.exp(-2 * t);
                data[i] = (
                    noise * 0.1 + 
                    rumble * 0.7 + 
                    impact * 0.1
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
            sound.setVolume(0.7); // Increased volume for near sound
        });

        this.soundPools.cannonFire.far.sounds.forEach(sound => {
            const buffer = this.createCannonSound('far');
            sound.setBuffer(buffer);
            sound.setVolume(0.4); // Increased volume for far sound
        });

        this.soundPools.cannonFire.echo.sounds.forEach(sound => {
            const buffer = this.createCannonSound('echo');
            sound.setBuffer(buffer);
            sound.setVolume(0.3); // Increased volume for echo
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
        
        // Play the distant sound with minimal delay
        setTimeout(() => {
            farSound.play();
        }, 30); // Reduced delay for tighter sound
        
        // Play the echo with shorter delay
        setTimeout(() => {
            echoSound.play();
        }, 100); // Reduced delay for tighter sound
    }
} 