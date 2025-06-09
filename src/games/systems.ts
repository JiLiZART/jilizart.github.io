import {World} from "./worlds";
import {
    Bullet,
    DirectionChange,
    Explosion,
    Health, Invincible,
    Level,
    Movement,
    Player,
    Position,
    Powerup, Score,
    Tank,
    Wall,
} from "./components";
import {
    EXPLOSION_FRAME_TIME,
    GRID_HEIGHT,
    GRID_WIDTH,
    POWERUP_CHANCE,
    POWERUP_DURATION,
    TILE_SIZE
} from "./constants.ts";
import {checkCollision, generateLevel, isValidPosition} from "./util.ts";
import {renderBrick, renderBush, renderSteel, renderWater} from "./render.ts";

const randomDirection = () => {
    return ["up", "down", "left", "right"][Math.floor(Math.random() * 4)]
}

const randomCooldown = () => {
    return 1000 + Math.random() * 2000
}

const createExplosion = (world: World, entityId: number, pos: Position, timestamp: number, isSmall: boolean) => {
    const explosionId = world.createEntity();

    world.addComponents(
        explosionId,
        [
            new Explosion(0, isSmall ? 8 : 12, EXPLOSION_FRAME_TIME, timestamp, entityId),
            new Position(pos.x + pos.width / 2, pos.y + pos.height / 2, pos.width * 0.5, pos.height * 0.5)
        ]
    );
}

const createPowerup = (world: World, pos: Position, timestamp: number) => {
    const powerupId = world.createEntity();
    // spawn powerup
    const powerupTypes: ("helmet" | "star" | "tank")[] = ["helmet", "star", "tank"]
    const type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)]

    world.addComponents(
        powerupId,
        [
            new Position(pos.x, pos.y, TILE_SIZE, TILE_SIZE),
            new Powerup(type, POWERUP_DURATION, timestamp)
        ]
    )
}


export class MovementSystem {
    constructor(private world: World) {
    }

    public update(deltaTime: number): void {
        const entities = this.world.getComponents(Position);

        for (const [entityId, position] of entities) {
            const movement = this.world.getComponent(entityId, Movement);
            if (!movement) continue;

            let newX = position.x
            let newY = position.y

            console.log(movement.isMoving, movement.direction, movement.speed)

            if (movement.isMoving) {
                switch (movement.direction) {
                    case "up":
                        newY -= movement.speed;
                        break;
                    case "down":
                        newY += movement.speed;
                        break;
                    case "left":
                        newX -= movement.speed;
                        break;
                    case "right":
                        newX += movement.speed;
                        break;
                }
            }

            if (isValidPosition(this.world, new Position(newX, position.y, position.width, position.height))) {
                position.x = newX
            }

            if (isValidPosition(this.world, new Position(position.x, newY, position.width, position.height))) {
                position.y = newY
            }
        }
    }
}

export class ShootingSystem {
    constructor(private world: World) {
    }

    public update(currentTime: number): void {
        const tanks = this.world.getComponents(Tank);
        const playerId = this.world.getComponent(this.world.id, Player).id;

        for (const [entityId, tank] of tanks) {
            if (!tank.isShooting) continue;
            if (currentTime - tank.lastShot < tank.shootCooldown) continue;

            const position = this.world.getComponent(entityId, Position);
            if (!position) continue;

            const movement = this.world.getComponent(entityId, Movement);
            if (!movement) continue;

            const isPlayer = playerId === entityId;

            const bulletSize = 8
            let bulletX = 0
            let bulletY = 0

            // Position bullet based on tank direction
            switch (movement.direction) {
                case "up":
                    bulletX = position.x + position.width / 2 - bulletSize / 2
                    bulletY = position.y - bulletSize
                    break
                case "down":
                    bulletX = position.x + position.width / 2 - bulletSize / 2
                    bulletY = position.y + position.height
                    break
                case "left":
                    bulletX = position.x - bulletSize
                    bulletY = position.y + position.height / 2 - bulletSize / 2
                    break
                case "right":
                    bulletX = position.x + position.width
                    bulletY = position.y + position.height / 2 - bulletSize / 2
                    break
            }

            const bulletId = this.world.createEntity();

            this.world.addComponents(
                bulletId,
                [
                    new Position(bulletX, bulletY, bulletSize, bulletSize),
                    new Movement(isPlayer ? 5 : 4, movement.direction),
                    new Bullet(entityId, 1)
                ]
            )

            tank.isShooting = false
            tank.lastShot = currentTime;
        }
    }
}

export class CollisionSystem {
    constructor(private world: World) {
    }

    public update(timestamp: number): void {
        this.updateBullets(timestamp)
        this.updateEnemies(timestamp)
    }

    public updateBullets(timestamp: number) {
        const bullets = this.world.getComponents(Bullet);
        const tanks = this.world.getComponents(Tank);
        const walls = this.world.getComponents(Wall);
        const player = this.world.getComponent(this.world.id, Player);

        for (const [bulletId, bullet] of bullets) {
            const movement = this.world.getComponent(bulletId, Movement);
            const bulletPos = this.world.getComponent(bulletId, Position);

            if (!movement) continue;
            if (!bulletPos) continue;
            let newX = bulletPos.x
            let newY = bulletPos.y

            // Move bullet
            switch (movement.direction) {
                case "up":
                    newY -= movement.speed
                    break
                case "down":
                    newY += movement.speed
                    break
                case "left":
                    newX -= movement.speed
                    break
                case "right":
                    newX += movement.speed
                    break
            }

            // Check if bullet is out of bounds
            if (newX < 0 || newX > this.world.width || newY < 0 || newY > this.world.height) {
                this.world.removeEntity(bulletId)

                continue
            }

            // Check collision with walls
            let bulletHit = false
            for (const [wallId, wall] of walls) {
                if (wall.type === "bush" || wall.type === "water") continue // Bullets pass through bushes and water

                const wallPos = this.world.getComponent(wallId, Position);

                if (checkCollision(bulletPos, wallPos)) {
                    bulletHit = true

                    // Destroy brick walls
                    if (wall.type === "brick") {
                        this.world.removeEntity(wallId)
                    }

                    break
                }
            }

            if (bulletHit) {
                this.world.removeEntity(bulletId)
                continue
            }

            const isPlayerBullet = bullet.ownerId === player.id

            // Modify the enemy collision check in the bullet update section
            // Replace the existing collision check with enemies with this:
            // Check collision with enemies (for player bullets)
            if (isPlayerBullet) {
                const enemies = tanks.filter(([entityId]) => entityId !== player.id)

                for (const [enemyId, enemy] of enemies) {
                    const enemyPos = this.world.getComponent(enemyId, Position);

                    if (checkCollision(bulletPos, enemyPos)) {
                        // Create explosion
                        createExplosion(this.world, enemyId, enemyPos, timestamp, false)

                        // Spawn powerup with a chance
                        if (Math.random() < POWERUP_CHANCE) {
                            createPowerup(this.world, enemyPos, timestamp)
                        }

                        // @TODO: check enemy Health
                        this.world.removeEntity(enemyId);
                        this.world.removeEntity(bulletId);
                        this.world.getComponent(player.id, Score).add(100)

                        bulletHit = true
                        break
                    }
                }
            } else {
                // Check collision with player (for enemy bullets)
                const invincible = this.world.getComponent(player.id, Invincible)
                const playerPos = this.world.getComponent(player.id, Position)
                const playerHealth = this.world.getComponent(player.id, Health)

                if (checkCollision(bulletPos, playerPos) && !invincible) {
                    this.world.removeEntity(bulletId)

                    // Create player explosion if this is the last life
                    if (playerHealth.current <= 1) {
                        createExplosion(this.world, player.id, playerPos, timestamp, false)
                        // Delay game over to allow animation to play
                        setTimeout(() => {
                            this.world.removeEntity(player.id)
                        }, 2_000)
                    } else {
                        // Smaller explosion for hit but not death
                        createExplosion(this.world, player.id, playerPos, timestamp, true)
                        playerHealth.hit(1)
                    }

                    bulletHit = true
                }
            }

            if (bulletHit) {
                continue
            }
        }
    }

    public updateEnemies(timestamp: number) {
        const tanks = this.world.getComponents(Tank);
        const player = this.world.getComponent(this.world.id, Player);
        const enemies = tanks.filter(([entityId]) => entityId !== player.id);

        for (const [enemyId, enemy] of enemies) {
            const directionChange = this.world.getComponent(enemyId, DirectionChange)
            const movement = this.world.getComponent(enemyId, Movement)
            const enemyPos = this.world.getComponent(enemyId, Position)

            // Change direction randomly
            if (timestamp - directionChange.lastChange > directionChange.changeCooldown) {
                movement.direction = randomDirection()
                directionChange.lastChange = timestamp
                directionChange.changeCooldown = randomCooldown()
            }

            // Move enemy
            let newEnemyX = enemyPos.x
            let newEnemyY = enemyPos.y

            switch (movement.direction) {
                case "up":
                    newEnemyY -= movement.speed
                    break
                case "down":
                    newEnemyY += movement.speed
                    break
                case "left":
                    newEnemyX -= movement.speed
                    break
                case "right":
                    newEnemyX += movement.speed
                    break
            }

            // Check if new position is valid
            if (!isValidPosition(this.world, new Position(newEnemyX, enemyPos.y, enemyPos.width, enemyPos.height))) {
                // Change direction if blocked
                movement.direction = randomDirection()
                directionChange.lastChange = timestamp
            }
            // else {
            //     enemyPos.x = newEnemyX
            // }

            if (!isValidPosition(this.world, new Position(enemyPos.x, newEnemyY, enemyPos.width, enemyPos.height))) {
                // Change direction if blocked
                movement.direction = randomDirection()
                directionChange.lastChange = timestamp
            }
            // else {
            //     enemyPos.y = newEnemyY
            // }

            // Enemy shooting
            if (timestamp - enemy.lastShot > enemy.shootCooldown) {
                // enemyShoot(enemy)
                enemy.isShooting = true
                enemy.lastShot = timestamp
            }

            const playerPos = this.world.getComponent(player.id, Position)
            // Modify the check collision with player section in the enemy update loop
            // Replace the existing check with:
            // Check collision with player
            if (checkCollision(playerPos, enemyPos)) {
                // Create explosion
                createExplosion(this.world, enemyId, enemyPos, timestamp, false)

                const invincible = this.world.getComponent(player.id, Invincible)
                const playerHealth = this.world.getComponent(player.id, Health)

                if (!invincible) {
                    if (playerHealth.current <= 1) {
                        // Create player explosion
                        createExplosion(this.world, player.id, playerPos, timestamp, true)
                        // Delay game over to allow animation to play
                        setTimeout(() => {
                            this.world.removeEntity(player.id)
                        }, 1000)
                    } else {
                        playerHealth.hit(1)
                    }
                }

                this.world.removeEntity(enemyId)
            }
        }
    }
}

export class PowerupSystem {
    constructor(private world: World) {
    }

    public update(currentTime: number): void {
        const powerups = this.world.getComponents(Powerup);
        const tanks = this.world.getComponents(Tank);
        const player = this.world.getComponent(this.world.id, Player);

        for (const [powerupId, powerup] of powerups) {
            if (currentTime - powerup.spawnTime > powerup.duration) {
                this.world.removeEntity(powerupId);
                continue;
            }

            const powerupPos = this.world.getComponent(powerupId, Position);
            if (!powerupPos) continue;

            for (const [tankId, tank] of tanks) {
                if (tankId !== player.id) continue;

                const tankPos = this.world.getComponent(tankId, Position);
                if (!tankPos) continue;

                if (this.checkCollision(powerupPos, tankPos)) {
                    this.applyPowerup(tankId, powerup);
                    this.world.removeEntity(powerupId);
                    break;
                }
            }
        }
    }

    private checkCollision(pos1: Position, pos2: Position): boolean {
        return (
            pos1.x < pos2.x + pos2.width &&
            pos1.x + pos1.width > pos2.x &&
            pos1.y < pos2.y + pos2.height &&
            pos1.y + pos1.height > pos2.y
        );
    }

    private applyPowerup(tankId: number, powerup: Powerup): void {
        const tank = this.world.getComponent(tankId, Tank);
        if (!tank) return;

        switch (powerup.type) {
            case "helmet":
                // Add invincibility component
                break;
            case "star":
                tank.shootCooldown *= 0.5;
                break;
            case "tank":
                const health = this.world.getComponent(tankId, Health);
                if (health) {
                    health.current = Math.min(health.current + 1, health.max);
                }
                break;
        }
    }
}

export class EnemySpawnSystem {
    private lastSpawnTime: number = 0;
    private readonly SPAWN_INTERVAL: number = 3000;
    private readonly MAX_ENEMIES: number = 5;

    constructor(private world: World) {
    }

    public update(currentTime: number): void {
        const playerId = this.world.getComponent(this.world.id, Player).id;
        const enemies = this.world
            .getComponents(Tank)
            .filter(([entityId]) => entityId !== playerId);

        if (currentTime - this.lastSpawnTime > this.SPAWN_INTERVAL && enemies.length < this.MAX_ENEMIES) {
            this.spawnEnemy();
            this.lastSpawnTime = currentTime;
        }

        // Check if all enemies are defeated
        if (enemies.length === 0 && currentTime - this.lastSpawnTime > this.SPAWN_INTERVAL * 2) {

            this.world.getComponent(this.world.id, Level).increment()
            this.world.getComponent(playerId, Score).add(500)

            generateLevel(this.world)

            this.lastSpawnTime = currentTime
        }
    }

    // Spawn enemy
    spawnEnemy() {
        const playerId = this.world.getComponent(this.world.id, Player).id;
        const enemies = this.world
            .getComponents(Tank)
            .filter(([entityId]) => entityId !== playerId);

        if (enemies.length >= this.MAX_ENEMIES) return

        const spawnPoints = [
            { x: TILE_SIZE, y: TILE_SIZE },
            { x: (GRID_WIDTH - 2) * TILE_SIZE, y: TILE_SIZE },
            { x: (GRID_WIDTH / 2) * TILE_SIZE, y: TILE_SIZE },
        ]

        const spawnPoint = spawnPoints[Math.floor(Math.random() * spawnPoints.length)]

        const positions = this.world.getComponents(Position);
        // Check if spawn point is clear
        for (const [_, pos] of positions) {
            if (
                spawnPoint.x < pos.x + pos.width &&
                spawnPoint.x + TILE_SIZE > pos.x &&
                spawnPoint.y < pos.y + pos.height &&
                spawnPoint.y + TILE_SIZE > pos.y
            ) {
                return // Spawn point is occupied
            }
        }

        const enemyId = this.world.createEntity();

        const direction = randomDirection()
        const speed = 1 + Math.random() * 0.5
        const color = "#F44336"
        const directionChangeCooldown = randomCooldown()
        const lastDirectionChange = 0
        const shootCooldown = 1500 + Math.random() * 1500

        this.world.addComponents(
            enemyId,
            [
                new Position(spawnPoint.x, spawnPoint.y, TILE_SIZE, TILE_SIZE),
                new Movement(speed, direction),
                new DirectionChange(directionChangeCooldown, lastDirectionChange),
                new Tank(color, 0, shootCooldown),
                new Health(1, 1),
            ]
        );
    }
}

export class ExplosionSystem {
    constructor(private world: World) {
    }

    public update(currentTime: number): void {
        const explosions = this.world.getComponents(Explosion);

        for (const [explosionId, explosion] of explosions) {
            if (currentTime - explosion.lastFrameUpdate > explosion.frameTime) {
                explosion.frame++;
                explosion.lastFrameUpdate = currentTime;

                if (explosion.frame >= explosion.maxFrames) {
                    this.world.removeEntity(explosionId);
                }
            }
        }
    }
}

export class KeyboardSystem {
    world: World;
    keys: { [key: string]: boolean } = {};
    abort: AbortController;

    constructor(world: World) {
        this.world = world;
        this.abort = new AbortController();

        if (typeof window === "undefined") return;

        // Input handling
        window.addEventListener("keydown", (e) => {
            this.keys[e.key.toLowerCase()] = true;
        }, {signal: this.abort.signal});

        window.addEventListener("keyup", (e) => {
            this.keys[e.key.toLowerCase()] = false;
        }, {signal: this.abort.signal});
    }

    unmount() {
        this.abort.abort();
    }
}

export class RenderSystem {
    world: World;
    abort: AbortController;

    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    FPS = 60;
    frameTime = 1000 / this.FPS;

    constructor(world: World) {
        this.world = world;
        this.abort = new AbortController();
    }

    init(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        this.ctx = ctx;

        // Set canvas size
        canvas.width = this.world.width;
        canvas.height = this.world.height;

        // this.update(0);
    }

    clear() {
        // Clear canvas
        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    update(deltaTime: number) {
        this.clear()
        this.drawWalls()
        this.drawExplosions()
        this.drawPowerups()
        this.drawPlayer()
        this.drawEnemies()
        this.drawBullets()
    }

    drawWalls() {
        const walls = this.world.getComponents(Wall);

        // Draw walls
        for (const [wallId, wall] of walls) {
            const wallPos = this.world.getComponent(wallId, Position)

            switch (wall.type) {
                case "brick":
                    renderBrick(this.ctx, wallPos)
                    break
                case "steel":
                    renderSteel(this.ctx, wallPos)
                    break
                case "water":
                    renderWater(this.ctx, wallPos)
                    break
                case "bush":
                    renderBush(this.ctx, wallPos)
                    break
            }
        }
    }

    drawExplosions() {
        const explosions = this.world.getComponents(Explosion);
        const player = this.world.getComponent(this.world.id, Player);
        // Add explosion update and drawing code after drawing bullets and before drawing powerups
        // Update explosions
        for (const [explosionId, explosion] of explosions) {
            const isPlayerExplosion = explosion.ownerId === player.id;

            const explosionPos = this.world.getComponent(explosionId, Position);

            // Update frame
            if (Date.now() - explosion.lastFrameUpdate > explosion.frameTime) {
                explosion.frame++
                explosion.lastFrameUpdate = Date.now()

                // Remove explosion if animation is complete
                if (explosion.frame >= explosion.maxFrames) {
                    this.world.removeEntity(explosionId);
                    continue
                }
            }

            // Draw explosion
            const progress = explosion.frame / explosion.maxFrames
            const size = isPlayerExplosion
                ? explosionPos.width * (1 + progress) // Player explosion grows more
                : explosionPos.width * (1 + progress * 0.5)

            // Base explosion
            this.ctx.beginPath()
            this.ctx.arc(
                explosionPos.x + explosionPos.width / 2,
                explosionPos.y + explosionPos.height / 2,
                (size / 2) * (1 - progress * 0.3), // Shrink slightly as it progresses
                0,
                Math.PI * 2,
            )

            // Player explosions are more dramatic with different colors
            if (isPlayerExplosion) {
                // Create gradient for player explosion
                const gradient = this.ctx.createRadialGradient(
                    explosionPos.x + explosionPos.width / 2,
                    explosionPos.y + explosionPos.height / 2,
                    0,
                    explosionPos.x + explosionPos.width / 2,
                    explosionPos.y + explosionPos.height / 2,
                    size / 2,
                )

                // Red core to yellow to white
                gradient.addColorStop(0, "white")
                gradient.addColorStop(0.3, "#FFFF00")
                gradient.addColorStop(0.6, "#FFA500")
                gradient.addColorStop(1, "#FF4500")

                this.ctx.fillStyle = gradient
                this.ctx.fill()

                // Add shockwave effect
                if (explosion.frame < explosion.maxFrames / 2) {
                    this.ctx.strokeStyle = "rgba(255, 255, 255, " + (1 - progress * 2) + ")"
                    this.ctx.lineWidth = 3
                    this.ctx.beginPath()
                    this.ctx.arc(
                        explosionPos.x + explosionPos.width / 2,
                        explosionPos.y + explosionPos.height / 2,
                        size / 2 + explosion.frame * 4,
                        0,
                        Math.PI * 2,
                    )
                    this.ctx.stroke()
                }

                // Add particles
                for (let j = 0; j < 5; j++) {
                    const angle = Math.random() * Math.PI * 2
                    const distance = Math.random() * size * 0.8
                    const particleSize = Math.random() * 4 + 2

                    this.ctx.fillStyle = ["#FF4500", "#FFA500", "#FFFF00"][Math.floor(Math.random() * 3)]
                    this.ctx.beginPath()
                    this.ctx.arc(
                        explosionPos.x + explosionPos.width / 2 + Math.cos(angle) * distance,
                        explosionPos.y + explosionPos.height / 2 + Math.sin(angle) * distance,
                        particleSize * (1 - progress),
                        0,
                        Math.PI * 2,
                    )
                    this.ctx.fill()
                }

                // Screen shake effect for player explosion
                if (explosion.frame < 5) {
                    const shakeAmount = (5 - explosion.frame) * 2
                    this.ctx.save()
                    this.ctx.translate(
                        Math.random() * shakeAmount - shakeAmount / 2,
                        Math.random() * shakeAmount - shakeAmount / 2,
                    )
                }
            } else {
                // Regular enemy explosion
                const gradient = this.ctx.createRadialGradient(
                    explosionPos.x + explosionPos.width / 2,
                    explosionPos.y + explosionPos.height / 2,
                    0,
                    explosionPos.x + explosionPos.width / 2,
                    explosionPos.y + explosionPos.height / 2,
                    size / 2,
                )

                gradient.addColorStop(0, "#FFFF00")
                gradient.addColorStop(0.7, "#FFA500")
                gradient.addColorStop(1, "#FF4500")

                this.ctx.fillStyle = gradient
                this.ctx.fill()

                // Add particles for enemy explosion
                for (let j = 0; j < 3; j++) {
                    const angle = Math.random() * Math.PI * 2
                    const distance = Math.random() * size * 0.6
                    const particleSize = Math.random() * 3 + 1

                    this.ctx.fillStyle = "#FFA500"
                    this.ctx.beginPath()
                    this.ctx.arc(
                        explosionPos.x + explosionPos.width / 2 + Math.cos(angle) * distance,
                        explosionPos.y + explosionPos.height / 2 + Math.sin(angle) * distance,
                        particleSize * (1 - progress),
                        0,
                        Math.PI * 2,
                    )
                    this.ctx.fill()
                }
            }
        }

        // Reset context transform if we applied screen shake
        for (const [explosionId, explosion] of explosions) {
            const isPlayerExplosion = explosion.ownerId === player.id;

            if (isPlayerExplosion && explosion.frame < 5) {
                this.ctx.restore()
            }
        }
    }

    drawPowerups() {
        const ctx = this.ctx;
        const powerups = this.world.getComponents(Powerup);

        // Add powerup drawing code after drawing bullets and before checking if enemies are defeated
        // Draw powerups
        for (const [powerupId, powerup] of powerups) {
            const powerupPos = this.world.getComponent(powerupId, Position);
            // Base powerup background
            ctx.fillStyle = "#000"
            ctx.fillRect(powerupPos.x, powerupPos.y, powerupPos.width, powerupPos.height)

            // Draw powerup based on type
            switch (powerup.type) {
                case "helmet":
                    // Draw helmet (blue)
                    ctx.fillStyle = "#4169E1"
                    ctx.fillRect(powerupPos.x + 4, powerupPos.y + 4, powerupPos.width - 8, powerupPos.height - 8)

                    // Helmet details
                    ctx.fillStyle = "#87CEFA"
                    ctx.beginPath()
                    ctx.arc(powerupPos.x + powerupPos.width / 2, powerupPos.y + powerupPos.height / 2, powerupPos.width / 4, 0, Math.PI * 2)
                    ctx.fill()
                    break

                case "star":
                    // Draw star (yellow)
                    ctx.fillStyle = "#FFD700"
                    ctx.fillRect(powerupPos.x + 4, powerupPos.y + 4, powerupPos.width - 8, powerupPos.height - 8)

                    // Star details
                    ctx.fillStyle = "#FFFF00"
                    // Draw a simple star shape
                    const centerX = powerupPos.x + powerupPos.width / 2
                    const centerY = powerupPos.y + powerupPos.height / 2
                    const spikes = 5
                    const outerRadius = powerupPos.width / 3
                    const innerRadius = powerupPos.width / 6

                    ctx.beginPath()
                    for (let i = 0; i < spikes * 2; i++) {
                        const radius = i % 2 === 0 ? outerRadius : innerRadius
                        const angle = (Math.PI * i) / spikes - Math.PI / 2
                        const x = centerX + Math.cos(angle) * radius
                        const y = centerY + Math.sin(angle) * radius

                        if (i === 0) {
                            ctx.moveTo(x, y)
                        } else {
                            ctx.lineTo(x, y)
                        }
                    }
                    ctx.closePath()
                    ctx.fill()
                    break

                case "tank":
                    // Draw tank (green)
                    ctx.fillStyle = "#32CD32"
                    ctx.fillRect(powerupPos.x + 4, powerupPos.y + 4, powerupPos.width - 8, powerupPos.height - 8)

                    // Tank details
                    ctx.fillStyle = "#00FF00"
                    // Tank body
                    ctx.fillRect(
                        powerupPos.x + powerupPos.width / 4,
                        powerupPos.y + powerupPos.height / 3,
                        powerupPos.width / 2,
                        powerupPos.height / 2,
                    )
                    // Tank turret
                    ctx.fillRect(powerupPos.x + powerupPos.width / 2 - 2, powerupPos.y + powerupPos.height / 6, 4, powerupPos.height / 3)
                    break
            }
        }
    }

    drawPlayer() {
        const ctx = this.ctx;
        const player = this.world.getComponent(this.world.id, Player);
        const tank = this.world.getComponent(player.id, Tank);
        const pos = this.world.getComponent(player.id, Position);
        const invincible = this.world.getComponent(player.id, Invincible);
        const powerup = this.world.getComponent(player.id, Powerup);
        const movement = this.world.getComponent(player.id, Movement);

        // Draw player tank
        ctx.fillStyle = tank.color
        ctx.fillRect(pos.x, pos.y, pos.width, pos.height)

        // Modify the player tank drawing to show powerup effects
        // After drawing the player tank and before drawing tank details, add:
        // Draw powerup effects
        if (invincible) {
            // Draw shield effect
            ctx.strokeStyle = "#4169E1"
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(pos.x + pos.width / 2, pos.y + pos.height / 2, pos.width * 0.75, 0, Math.PI * 2)
            ctx.stroke()

            // Pulsating effect
            const pulseSize = Math.sin(Date.now() / 100) * 2 + pos.width * 0.6
            ctx.beginPath()
            ctx.arc(pos.x + pos.width / 2, pos.y + pos.height / 2, pulseSize, 0, Math.PI * 2)
            ctx.stroke()
        }

        if (powerup) {
            // Draw powered-up effect (glowing outline)
            ctx.strokeStyle = "#FFD700"
            ctx.lineWidth = 2
            ctx.strokeRect(pos.x - 2, pos.y - 2, pos.width + 4, pos.height + 4)

            // Particles
            for (let i = 0; i < 3; i++) {
                const particleX = pos.x + Math.random() * pos.width
                const particleY = pos.y + Math.random() * pos.height
                const particleSize = Math.random() * 3 + 1

                ctx.fillStyle = "#FFFF00"
                ctx.beginPath()
                ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2)
                ctx.fill()
            }
        }

        // Draw tank details
        ctx.fillStyle = "#333"

        // Draw tank barrel
        switch (movement.direction) {
            case "up":
                ctx.fillRect(
                    pos.x + pos.width / 2 - pos.width / 8,
                    pos.y - pos.height / 3,
                    pos.width / 4,
                    pos.height / 2,
                )
                break
            case "down":
                ctx.fillRect(
                    pos.x + pos.width / 2 - pos.width / 8,
                    pos.y + pos.height - pos.height / 6,
                    pos.width / 4,
                    pos.height / 2,
                )
                break
            case "left":
                ctx.fillRect(
                    pos.x - pos.width / 3,
                    pos.y + pos.height / 2 - pos.height / 8,
                    pos.width / 2,
                    pos.height / 4,
                )
                break
            case "right":
                ctx.fillRect(
                    pos.x + pos.width - pos.width / 6,
                    pos.y + pos.height / 2 - pos.height / 8,
                    pos.width / 2,
                    pos.height / 4,
                )
                break
        }

        // Draw tank body details
        ctx.fillStyle = "#222"
        ctx.fillRect(pos.x + pos.width / 4, pos.y + pos.height / 4, pos.width / 2, pos.height / 2)

    }

    drawEnemies() {
        const ctx = this.ctx;
        const player = this.world.getComponent(this.world.id, Player);
        const enemies = this.world.getComponents(Tank).filter(([entityId]) => entityId !== player.id);

        // Draw enemies
        for (const [enemyId, enemy] of enemies) {
            const pos = this.world.getComponent(enemyId, Position);
            const movement = this.world.getComponent(enemyId, Movement);

            ctx.fillStyle = enemy.color
            ctx.fillRect(pos.x, pos.y, pos.width, pos.height)

            // Draw tank details
            ctx.fillStyle = "#333"

            // Draw tank barrel
            switch (movement.direction) {
                case "up":
                    ctx.fillRect(
                        pos.x + pos.width / 2 - pos.width / 8,
                        pos.y - pos.height / 3,
                        pos.width / 4,
                        pos.height / 2,
                    )
                    break
                case "down":
                    ctx.fillRect(
                        pos.x + pos.width / 2 - pos.width / 8,
                        pos.y + pos.height - pos.height / 6,
                        pos.width / 4,
                        pos.height / 2,
                    )
                    break
                case "left":
                    ctx.fillRect(
                        pos.x - pos.width / 3,
                        pos.y + pos.height / 2 - pos.height / 8,
                        pos.width / 2,
                        pos.height / 4,
                    )
                    break
                case "right":
                    ctx.fillRect(
                        pos.x + pos.width - pos.width / 6,
                        pos.y + pos.height / 2 - pos.height / 8,
                        pos.width / 2,
                        pos.height / 4,
                    )
                    break
            }

            // Draw tank body details
            ctx.fillStyle = "#222"
            ctx.fillRect(pos.x + pos.width / 4, pos.y + pos.height / 4, pos.width / 2, pos.height / 2)
        }
    }

    drawBullets() {
        const ctx = this.ctx;
        const bullets = this.world.getComponents(Bullet);

        // Draw bullets
        ctx.fillStyle = "#FFFF00"

        for (const [bulletId, bullet] of bullets) {
            const pos = this.world.getComponent(bulletId, Position);

            ctx.fillRect(pos.x, pos.y, pos.width, pos.height)
        }
    }

    unmount() {
        this.abort.abort();
    }
}

export class DirectorSystem {
    constructor(private world: World) {
    }

    public startGame() {
        const playerId = this.world.createPlayer(1);

        this.world.addComponents(
            playerId,
            [
                new Position(
                    (GRID_WIDTH * TILE_SIZE) / 2 - TILE_SIZE / 2,
                    (GRID_HEIGHT - 1) * TILE_SIZE,
                    TILE_SIZE,
                    TILE_SIZE
                ),
                new Movement(3, "up"),
                new Tank("#4CAF50", 0, 300),
                new Health(3, 3),
                new Score(0)
            ]
        )

        this.world.addComponent(this.world.id, new Level(0));

        // Generate level
        generateLevel(this.world);

        return playerId
    }
}
