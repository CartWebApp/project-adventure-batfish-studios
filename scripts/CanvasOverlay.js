import * as functionExports from './Functions.js';
Object.entries(functionExports).forEach(([name, exported]) => window[name] = exported);

export class CanvasHandler {
    constructor(canvas, container, strength=1, speed=1, transitionDuration=1000) {
        this.canvas = canvas;
        this.container = container ?? document.getElementsByTagName('body')[0];
        this.strength = strength;
        this.speed = speed;
        this.transitionDuration = transitionDuration;
        this.ctx = canvas.getContext("2d");
        this.width = this.canvas.width = this.container.clientWidth;
        this.height = this.canvas.height = this.container.clientHeight;
        this.particles = [];
        this.animations = {};
        this.createAnimations();
        this.currentAnimation = this.animations['ashes'];
        this.looping = true;
        this.state = 'idle'; // ['running', 'despawning', 'idle']
        
        // enables canvas to respond to size changes
        window.addEventListener('resize', ()=>this.handleResize())
    }

    handleResize() {
        this.width = this.canvas.width = this.container.clientWidth;
        this.height = this.canvas.height = this.container.clientHeight;
    }

    async changeAnimation(animationName) {
        this.state = 'despawning';
        for (const particle of this.particles) {
            particle.despawn();
        }
        let awaitDespawning = async()=> {
            while (this.particles.length > 0) {
                console.log(this.particles);
                await sleep(5);
            }
        }
        await Promise.race([sleep(10000), awaitDespawning()]);
        this.looping = false
        await sleep(2);
        this.particles = []
        this.currentAnimation = this.animations[animationName];
        if (!this.animations[animationName] || this.currentAnimation === this.animations['none']) {
            this.state = 'idle';
            return;
        }
        this.state = 'running'
        if (this.currentAnimation.generatorOptions) {
            this.generateParticles(this.currentAnimation.generatorOptions);
        }
        this.looping = true;
        this.loop();
    }

    async loop() {
        if (!this.currentAnimation) return;
        if (this.currentAnimation.background) {
            this.currentAnimation.background(this);
        } else {
            this.ctx.clearRect(0, 0, this.width, this.height);
        }

        if (this.currentAnimation.loopOptions && this.state === 'running') {
            this.generateParticles(this.currentAnimation.loopOptions);
        }

        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i]?.update();
            this.particles[i]?.draw();
            this.particles[i]?.checkForDeletion();
            if (this.state === 'despawning') this.particles[i]?.despawn;
        }

        if (!this.currentAnimation || this.currentAnimation === this.animations['none']) {
            this.state = 'idle';
            return;
        }
        if (this.looping) {
            requestAnimationFrame(()=>this.loop());
        }
    }

    generateParticles(options) {
        let {getCount, getX, getY, getColor, getRadius, getVelX, getVelY, getAccelX, getAccelY, getTick, getModFn, getSpawnFn, getDespawnFn, getDespawnReq} = options
        if (!getCount) getCount = () => 100 * this.strength;
        if (!getX) getX = () => random(0,this.width);
        if (!getY) getY = () => random(0,this.height);
        if (!getColor) getColor = () => ({r: 255, g: 255, b: 255, a: 1});
        if (!getRadius) getRadius = () => random(2, 4);
        if (!getVelX) getVelX = () => 0;
        if (!getVelY) getVelY = () => 0;
        if (!getAccelX) getAccelX = () => 0;
        if (!getAccelY) getAccelY = () => 0;
        if (!getTick) getTick = () => 0;
        if (!getModFn) getModFn = () => undefined;
        if (!getSpawnFn) getSpawnFn = () => undefined;
        if (!getDespawnFn) getDespawnFn = () => undefined;
        if (!getDespawnReq) getDespawnReq = () => undefined;
        while (this.particles.length < getCount()) {
            const color = getColor();
            let ball = new Ball(
                this,
                getX(), 
                getY(),
                getRadius(),
                color.r, color.g, color.b, color.a,
                getVelX(),
                getVelY(),
                getAccelX(),
                getAccelY(),
                getTick(),
                getModFn(),
                getSpawnFn(),
                getDespawnFn(),
                getDespawnReq(),

            );
            this.particles.push(ball);
        }
    }

    createAnimations() {
        let animator = this.animations;
        animator['none'] = new Animation();
        let reusableParams = {
                getX: () => random(-100,this.width),
                getY: () => random(-100,this.height),
                getColor: () => {
                    const randomColor = random(20, 230);
                    return{r: randomColor, g: randomColor, b: randomColor, a: random(.5, .8, 1)}
                },
                getVelX: () => random(.2, .5, 3),
                getTick: () => random(0, 1),
                getModFn: () => (particle) => {
                    particle.velY += (Math.sin(particle.tick / 100) + .3) / 1000;
                },
                getDespawnReq: () => (particle) => {
                    return (particle.x + particle.radius < -this.width 
                        || particle.x - particle.radius > particle.controller.width 
                        || particle.y + particle.radius < -this.height 
                        || particle.y - particle.radius > particle.controller.height)
                },
            }
        animator['ashes'] = new Animation(deepClone(reusableParams));
        
        reusableParams = {
            getX: () => random(-this.height/4,this.width),
            getY: () => random(this.height/1.5,this.height),
            getAccelX: () => 0,
            getRadius: () => random(50, this.height/4),
            getColor: () => {
                const randomColor = random(150, 230);
                return{r: randomColor, g: randomColor, b: randomColor, a: random(.1, .4, 1)}
            },
            getVelX: () => random(.2, .5, 3),
            getDespawnReq: () => (particle) => {
                return (particle.x + particle.radius < -this.width 
                    || particle.x - particle.radius > particle.controller.width 
                    || particle.y + particle.radius < -this.height 
                    || particle.y - particle.radius > particle.controller.height)
            },
        }
        animator['fog'] = new Animation(deepClone(reusableParams));

        reusableParams.getY = () => random(-100,this.height/3)
        reusableParams.getColor = () => {
            const randomColor = random(50, 220);
            return{r: randomColor, g: randomColor, b: randomColor, a: random(.1, .4, 1)}
        }
        animator['smoke top'] = new Animation(deepClone(reusableParams));
    }
}

class Animation {
    constructor(generatorOptions, loopOptions) {
        this.generatorOptions = generatorOptions;
        this.loopOptions = loopOptions;
        if (!this.loopOptions) {
            this.loopOptions = generatorOptions;
        }
    }
}

class Ball {
    constructor(controller, x, y, radius, r, g, b, a, velX, velY, accelX, accelY, tick, updateMod, spawnFunction, despawnFunction, despawnCondition) {
        this.controller = controller;
        this.ctx = controller.ctx;
        this.x = x ?? 0;
        this.y = y ?? 0;
        this.velX = velX ?? 0;
        this.velY = velY ?? 0;
        this.accelX = accelX ?? 0;
        this.accelY = accelY ?? 0;
        this.color = {};
        this.color.r = r ?? 255
        this.color.g = g ?? 255
        this.color.b = b ?? 255
        this.color.a = a ?? 1
        this.radius = radius ?? 0;
        this.tick = tick ?? 0;
        this.lastTick = tick;
        this.delta = 0;
        this.opacity = 1;
        this.updateMod = updateMod;
        this.state = 'spawning';
        if (!this.updateMod) {
            this.updateMod = ()=>{};
        }
        this.spawnFunction = spawnFunction;
        if (!this.spawnFunction) {
            this.spawnFunction = async () => {
                this.opacity = 0;
                while (this.opacity < 1 && this.state === 'spawning') {
                    this.opacity = clamp(this.opacity + .01 * controller.speed, 0, 1);
                    await sleep(controller.transitionDuration / 100);
                }
            };
        }
        this.despawnFunction = despawnFunction;
        if (!this.despawnFunction) {
            this.despawnFunction = async () => {
                this.state = 'despawning';
                while (this.opacity > 0 && this.state === 'despawning') {
                    this.opacity = clamp(this.opacity - .01 * controller.speed, 0, 1);
                    await sleep(controller.transitionDuration / 100);
                }
            };
        }
        this.despawnCondition = despawnCondition;
        if (!this.despawnCondition) {
            this.despawnCondition = () => {
                return (this.x + this.radius < -100 
                    || this.x - this.radius > this.controller.width 
                    || this.y + this.radius < -100 
                    || this.y - this.radius > this.controller.height)
            };
        }
        this.spawnFunction();
    }

    // draws
    draw() {
        this.ctx.beginPath();
        this.ctx.fillStyle = `rgba(${~~this.color.r}, ${~~this.color.g}, ${~~this.color.b}, ${this.color.a * this.opacity}`;
        this.ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        this.ctx.fill();
    }

    update() {
        this.lastTick = this.tick;
        this.tick += this.controller.speed;
        this.delta = this.tick - this.lastTick;
        this.updateMod(this);
        this.velX += this.accelX * this.delta;
        this.velY += this.accelY * this.delta;
        this.x += this.velX * this.delta;
        this.y += this.velY * this.delta;
    }

    checkForDeletion() {
        if (this.despawnCondition(this)) {
            this.delete();
        }
    }

    async delete() {
        this.state = 'deleted';
        let particleArray = this.controller.particles;
        particleArray.splice(particleArray.indexOf(this), 1);
    }

    async despawn() {
        this.state = 'despawning';
        await this.despawnFunction();
        this.delete();
    }

}