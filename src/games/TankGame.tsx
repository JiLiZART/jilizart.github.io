"use client"

import { useEffect, useRef, useState } from "react"
import type {Bullet, Enemy, Explosion, Powerup, Wall} from "./types.ts";
import {checkCollision} from "./util.ts";
import {renderBrick, renderBush, renderSteel, renderWater} from "./render.ts";

export default function TankGame() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [gameStarted, setGameStarted] = useState(false)
    const [score, setScore] = useState(0)
    const [level, setLevel] = useState(1)
    const [lives, setLives] = useState(3)
    const [gameOver, setGameOver] = useState(false)

    useEffect(() => {
        if (!gameStarted) return

        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        // Game constants
        const TILE_SIZE = 32
        const GRID_WIDTH = 20
        const GRID_HEIGHT = 15

        // Set canvas size
        canvas.width = GRID_WIDTH * TILE_SIZE
        canvas.height = GRID_HEIGHT * TILE_SIZE

        // Game state
        let animationFrameId: number
        let lastTimestamp = 0
        const FPS = 60
        const frameTime = 1000 / FPS

        // Player tank
        const player = {
            x: (GRID_WIDTH * TILE_SIZE) / 2 - TILE_SIZE / 2,
            y: (GRID_HEIGHT - 1) * TILE_SIZE,
            width: TILE_SIZE,
            height: TILE_SIZE,
            speed: 3,
            direction: "up",
            color: "#4CAF50",
            bullets: [] as Bullet[],
            lastShot: 0,
            shootCooldown: 300, // ms
        }

        // Enemy tanks
        const enemies: Enemy[] = []
        const MAX_ENEMIES = 5
        const ENEMY_SPAWN_INTERVAL = 3000 // ms
        let lastEnemySpawn = 0

        // Walls
        const walls: Wall[] = []

        // Add powerups array to the game state section (after walls declaration)
        const powerups: Powerup[] = []
        const POWERUP_CHANCE = 0.4 // 40% chance to spawn a powerup
        const POWERUP_DURATION = 10000 // 10 seconds for temporary powerups

        // Add player powerup state
        let playerInvincible = false
        let playerPoweredUp = false
        let invincibilityEndTime = 0
        let powerupEndTime = 0

        // Add explosions array to the game state section (after powerups declaration)
        const explosions: Explosion[] = []
        const EXPLOSION_FRAME_TIME = 80 // ms between frames

        // Generate level
        generateLevel()

        // Input handling
        const keys: { [key: string]: boolean } = {}

        window.addEventListener("keydown", (e) => {
            keys[e.key.toLowerCase()] = true

            // Shoot on space
            if (e.key === " " && Date.now() - player.lastShot > player.shootCooldown) {
                shoot()
                player.lastShot = Date.now()
            }
        })

        window.addEventListener("keyup", (e) => {
            keys[e.key.toLowerCase()] = false
        })

        // Generate random level
        function generateLevel() {
            walls.length = 0 // Clear existing walls

            // Create border walls
            for (let x = 0; x < GRID_WIDTH; x++) {
                for (let y = 0; y < GRID_HEIGHT; y++) {
                    // Border walls
                    if (x === 0 || x === GRID_WIDTH - 1 || y === 0) {
                        walls.push({
                            x: x * TILE_SIZE,
                            y: y * TILE_SIZE,
                            width: TILE_SIZE,
                            height: TILE_SIZE,
                            type: "steel",
                        })
                    }
                }
            }

            // Add random walls
            for (let i = 0; i < 40 + level * 5; i++) {
                const x = Math.floor(Math.random() * (GRID_WIDTH - 2)) + 1
                const y = Math.floor(Math.random() * (GRID_HEIGHT - 3)) + 1

                // Don't place walls near player spawn
                if (Math.abs(x * TILE_SIZE - player.x) < TILE_SIZE * 2 && Math.abs(y * TILE_SIZE - player.y) < TILE_SIZE * 2) {
                    continue
                }

                const wallType =
                    Math.random() < 0.7 ? "brick" : Math.random() < 0.5 ? "water" : Math.random() < 0.5 ? "bush" : "steel"

                walls.push({
                    x: x * TILE_SIZE,
                    y: y * TILE_SIZE,
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                    type: wallType,
                })
            }
        }

        // Spawn enemy
        function spawnEnemy() {
            if (enemies.length >= MAX_ENEMIES) return

            const spawnPoints = [
                { x: TILE_SIZE, y: TILE_SIZE },
                { x: (GRID_WIDTH - 2) * TILE_SIZE, y: TILE_SIZE },
                { x: (GRID_WIDTH / 2) * TILE_SIZE, y: TILE_SIZE },
            ]

            const spawnPoint = spawnPoints[Math.floor(Math.random() * spawnPoints.length)]

            // Check if spawn point is clear
            for (const enemy of enemies) {
                if (
                    spawnPoint.x < enemy.x + enemy.width &&
                    spawnPoint.x + TILE_SIZE > enemy.x &&
                    spawnPoint.y < enemy.y + enemy.height &&
                    spawnPoint.y + TILE_SIZE > enemy.y
                ) {
                    return // Spawn point is occupied
                }
            }

            enemies.push({
                x: spawnPoint.x,
                y: spawnPoint.y,
                width: TILE_SIZE,
                height: TILE_SIZE,
                speed: 1 + Math.random() * 0.5,
                direction: ["up", "down", "left", "right"][Math.floor(Math.random() * 4)],
                color: "#F44336",
                lastDirectionChange: 0,
                directionChangeCooldown: 1000 + Math.random() * 2000,
                lastShot: 0,
                shootCooldown: 1500 + Math.random() * 1500,
            })
        }

        // Add the spawnPowerup function after the spawnEnemy function
        function spawnPowerup(x: number, y: number) {
            const powerupTypes: ("helmet" | "star" | "tank")[] = ["helmet", "star", "tank"]
            const type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)]

            powerups.push({
                x,
                y,
                width: TILE_SIZE,
                height: TILE_SIZE,
                type,
                duration: POWERUP_DURATION,
                spawnTime: Date.now(),
            })
        }

        // Add the createExplosion function after the spawnPowerup function
        function createExplosion(x: number, y: number, width: number, height: number, isPlayer: boolean) {
            explosions.push({
                x: x - width / 2,
                y: y - height / 2,
                width: width * 1.2,
                height: height * 1.2,
                frame: 0,
                maxFrames: isPlayer ? 12 : 8, // Player explosion lasts longer
                frameTime: EXPLOSION_FRAME_TIME,
                lastFrameUpdate: Date.now(),
                isPlayer,
            })
        }

        // Player shoot
        function shoot() {
            const bulletSize = 8
            let bulletX = 0
            let bulletY = 0

            // Position bullet based on tank direction
            switch (player.direction) {
                case "up":
                    bulletX = player.x + player.width / 2 - bulletSize / 2
                    bulletY = player.y - bulletSize
                    break
                case "down":
                    bulletX = player.x + player.width / 2 - bulletSize / 2
                    bulletY = player.y + player.height
                    break
                case "left":
                    bulletX = player.x - bulletSize
                    bulletY = player.y + player.height / 2 - bulletSize / 2
                    break
                case "right":
                    bulletX = player.x + player.width
                    bulletY = player.y + player.height / 2 - bulletSize / 2
                    break
            }

            player.bullets.push({
                x: bulletX,
                y: bulletY,
                width: bulletSize,
                height: bulletSize,
                direction: player.direction,
                speed: 5,
                isEnemy: false,
            })
        }

        // Enemy shoot
        function enemyShoot(enemy: Enemy) {
            const bulletSize = 8
            let bulletX = 0
            let bulletY = 0

            // Position bullet based on tank direction
            switch (enemy.direction) {
                case "up":
                    bulletX = enemy.x + enemy.width / 2 - bulletSize / 2
                    bulletY = enemy.y - bulletSize
                    break
                case "down":
                    bulletX = enemy.x + enemy.width / 2 - bulletSize / 2
                    bulletY = enemy.y + enemy.height
                    break
                case "left":
                    bulletX = enemy.x - bulletSize
                    bulletY = enemy.y + enemy.height / 2 - bulletSize / 2
                    break
                case "right":
                    bulletX = enemy.x + enemy.width
                    bulletY = enemy.y + enemy.height / 2 - bulletSize / 2
                    break
            }

            player.bullets.push({
                x: bulletX,
                y: bulletY,
                width: bulletSize,
                height: bulletSize,
                direction: enemy.direction,
                speed: 4,
                isEnemy: true,
            })
        }


        // Check if position is valid (no collision with walls)
        function isValidPosition(x: number, y: number, width: number, height: number) {
            const obj = { x, y, width, height }

            // Check collision with walls
            for (const wall of walls) {
                if (wall.type === "bush") continue // Can move through bushes
                if (checkCollision(obj, wall)) {
                    return false
                }
            }

            // Check if within canvas bounds
            if (x < 0 || x + width > canvas.width || y < 0 || y + height > canvas.height) {
                return false
            }

            return true
        }

        // Game loop
        function gameLoop(timestamp: number) {
            // Calculate delta time
            const deltaTime = timestamp - lastTimestamp

            if (deltaTime >= frameTime) {
                lastTimestamp = timestamp - (deltaTime % frameTime)

                // Clear canvas
                ctx.fillStyle = "#000000"
                ctx.fillRect(0, 0, canvas.width, canvas.height)

                // Update player position based on input
                let newX = player.x
                let newY = player.y

                if (keys["w"]) {
                    player.direction = "up"
                    newY -= player.speed
                } else if (keys["s"]) {
                    player.direction = "down"
                    newY += player.speed
                } else if (keys["a"]) {
                    player.direction = "left"
                    newX -= player.speed
                } else if (keys["d"]) {
                    player.direction = "right"
                    newX += player.speed
                }

                // Check if new position is valid
                if (isValidPosition(newX, player.y, player.width, player.height)) {
                    player.x = newX
                }

                if (isValidPosition(player.x, newY, player.width, player.height)) {
                    player.y = newY
                }

                // Add powerup collection check after the player movement section
                // Add this after the player position update
                // Check collision with powerups
                for (let i = powerups.length - 1; i >= 0; i--) {
                    const powerup = powerups[i]

                    // Remove powerups that have been on screen too long (30 seconds)
                    if (Date.now() - powerup.spawnTime > 30000) {
                        powerups.splice(i, 1)
                        continue
                    }

                    if (checkCollision(player, powerup)) {
                        // Apply powerup effect
                        switch (powerup.type) {
                            case "helmet":
                                playerInvincible = true
                                invincibilityEndTime = Date.now() + powerup.duration
                                break
                            case "star":
                                playerPoweredUp = true
                                player.speed = 5 // Increased speed
                                player.shootCooldown = 150 // Faster shooting
                                powerupEndTime = Date.now() + powerup.duration
                                break
                            case "tank":
                                setLives((prev) => prev + 1) // Extra life
                                break
                        }

                        powerups.splice(i, 1)
                    }
                }

                // Check if powerups have expired
                if (playerInvincible && Date.now() > invincibilityEndTime) {
                    playerInvincible = false
                }

                if (playerPoweredUp && Date.now() > powerupEndTime) {
                    playerPoweredUp = false
                    player.speed = 3 // Reset speed
                    player.shootCooldown = 300 // Reset shooting cooldown
                }

                // Spawn enemies
                if (Date.now() - lastEnemySpawn > ENEMY_SPAWN_INTERVAL && enemies.length < MAX_ENEMIES) {
                    spawnEnemy()
                    lastEnemySpawn = Date.now()
                }

                // Update enemies
                for (let i = enemies.length - 1; i >= 0; i--) {
                    const enemy = enemies[i]

                    // Change direction randomly
                    if (Date.now() - enemy.lastDirectionChange > enemy.directionChangeCooldown) {
                        enemy.direction = ["up", "down", "left", "right"][Math.floor(Math.random() * 4)]
                        enemy.lastDirectionChange = Date.now()
                        enemy.directionChangeCooldown = 1000 + Math.random() * 2000
                    }

                    // Move enemy
                    let newEnemyX = enemy.x
                    let newEnemyY = enemy.y

                    switch (enemy.direction) {
                        case "up":
                            newEnemyY -= enemy.speed
                            break
                        case "down":
                            newEnemyY += enemy.speed
                            break
                        case "left":
                            newEnemyX -= enemy.speed
                            break
                        case "right":
                            newEnemyX += enemy.speed
                            break
                    }

                    // Check if new position is valid
                    if (isValidPosition(newEnemyX, enemy.y, enemy.width, enemy.height)) {
                        enemy.x = newEnemyX
                    } else {
                        // Change direction if blocked
                        enemy.direction = ["up", "down", "left", "right"][Math.floor(Math.random() * 4)]
                        enemy.lastDirectionChange = Date.now()
                    }

                    if (isValidPosition(enemy.x, newEnemyY, enemy.width, enemy.height)) {
                        enemy.y = newEnemyY
                    } else {
                        // Change direction if blocked
                        enemy.direction = ["up", "down", "left", "right"][Math.floor(Math.random() * 4)]
                        enemy.lastDirectionChange = Date.now()
                    }

                    // Enemy shooting
                    if (Date.now() - enemy.lastShot > enemy.shootCooldown) {
                        enemyShoot(enemy)
                        enemy.lastShot = Date.now()
                    }

                    // Modify the check collision with player section in the enemy update loop
                    // Replace the existing check with:
                    // Check collision with player
                    if (checkCollision(player, enemy)) {
                        // Create explosion
                        createExplosion(enemy.x, enemy.y, enemy.width, enemy.height, false)

                        if (!playerInvincible) {
                            if (lives <= 1) {
                                // Create player explosion
                                createExplosion(player.x, player.y, player.width, player.height, true)
                                // Delay game over to allow animation to play
                                setTimeout(() => {
                                    setGameOver(true)
                                }, 1000)
                            } else {
                                setLives((prev) => prev - 1)
                            }
                        }

                        enemies.splice(i, 1)
                    }
                }

                // Update bullets
                for (let i = player.bullets.length - 1; i >= 0; i--) {
                    const bullet = player.bullets[i]

                    // Move bullet
                    switch (bullet.direction) {
                        case "up":
                            bullet.y -= bullet.speed
                            break
                        case "down":
                            bullet.y += bullet.speed
                            break
                        case "left":
                            bullet.x -= bullet.speed
                            break
                        case "right":
                            bullet.x += bullet.speed
                            break
                    }

                    // Check if bullet is out of bounds
                    if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
                        player.bullets.splice(i, 1)
                        continue
                    }

                    // Check collision with walls
                    let bulletHit = false
                    for (let j = walls.length - 1; j >= 0; j--) {
                        const wall = walls[j]
                        if (wall.type === "bush" || wall.type === "water") continue // Bullets pass through bushes and water

                        if (checkCollision(bullet, wall)) {
                            bulletHit = true

                            // Destroy brick walls
                            if (wall.type === "brick") {
                                walls.splice(j, 1)
                            }

                            break
                        }
                    }

                    if (bulletHit) {
                        player.bullets.splice(i, 1)
                        continue
                    }

                    // Modify the enemy collision check in the bullet update section
                    // Replace the existing collision check with enemies with this:
                    // Check collision with enemies (for player bullets)
                    if (!bullet.isEnemy) {
                        for (let j = enemies.length - 1; j >= 0; j--) {
                            const enemy = enemies[j]

                            if (checkCollision(bullet, enemy)) {
                                // Create explosion
                                createExplosion(enemy.x, enemy.y, enemy.width, enemy.height, false)

                                // Spawn powerup with a chance
                                if (Math.random() < POWERUP_CHANCE) {
                                    spawnPowerup(enemy.x, enemy.y)
                                }

                                enemies.splice(j, 1)
                                player.bullets.splice(i, 1)
                                setScore((prev) => prev + 100)
                                bulletHit = true
                                break
                            }
                        }
                    } else {
                        // Check collision with player (for enemy bullets)
                        if (checkCollision(bullet, player) && !playerInvincible) {
                            player.bullets.splice(i, 1)

                            // Create player explosion if this is the last life
                            if (lives <= 1) {
                                createExplosion(player.x, player.y, player.width, player.height, true)
                                // Delay game over to allow animation to play
                                setTimeout(() => {
                                    setGameOver(true)
                                }, 2_000)
                            } else {
                                // Smaller explosion for hit but not death
                                createExplosion(player.x, player.y, player.width, player.height, false)
                                setLives((prev) => prev - 1)
                            }

                            bulletHit = true
                        }
                    }

                    if (bulletHit) {
                        continue
                    }
                }

                // Draw walls
                for (const wall of walls) {
                    switch (wall.type) {
                        case "brick":
                            renderBrick(ctx, wall)
                            break
                        case "steel":
                            renderSteel(ctx, wall)
                            break
                        case "water":
                            renderWater(ctx, wall)
                            break
                        case "bush":
                            renderBush(ctx, wall)
                            break
                    }
                }

                // Add explosion update and drawing code after drawing bullets and before drawing powerups
                // Update explosions
                for (let i = explosions.length - 1; i >= 0; i--) {
                    const explosion = explosions[i]

                    // Update frame
                    if (Date.now() - explosion.lastFrameUpdate > explosion.frameTime) {
                        explosion.frame++
                        explosion.lastFrameUpdate = Date.now()

                        // Remove explosion if animation is complete
                        if (explosion.frame >= explosion.maxFrames) {
                            explosions.splice(i, 1)
                            continue
                        }
                    }

                    // Draw explosion
                    const progress = explosion.frame / explosion.maxFrames
                    const size = explosion.isPlayer
                        ? explosion.width * (1 + progress) // Player explosion grows more
                        : explosion.width * (1 + progress * 0.5)

                    // Base explosion
                    ctx.beginPath()
                    ctx.arc(
                        explosion.x + explosion.width / 2,
                        explosion.y + explosion.height / 2,
                        (size / 2) * (1 - progress * 0.3), // Shrink slightly as it progresses
                        0,
                        Math.PI * 2,
                    )

                    // Player explosions are more dramatic with different colors
                    if (explosion.isPlayer) {
                        // Create gradient for player explosion
                        const gradient = ctx.createRadialGradient(
                            explosion.x + explosion.width / 2,
                            explosion.y + explosion.height / 2,
                            0,
                            explosion.x + explosion.width / 2,
                            explosion.y + explosion.height / 2,
                            size / 2,
                        )

                        // Red core to yellow to white
                        gradient.addColorStop(0, "white")
                        gradient.addColorStop(0.3, "#FFFF00")
                        gradient.addColorStop(0.6, "#FFA500")
                        gradient.addColorStop(1, "#FF4500")

                        ctx.fillStyle = gradient
                        ctx.fill()

                        // Add shockwave effect
                        if (explosion.frame < explosion.maxFrames / 2) {
                            ctx.strokeStyle = "rgba(255, 255, 255, " + (1 - progress * 2) + ")"
                            ctx.lineWidth = 3
                            ctx.beginPath()
                            ctx.arc(
                                explosion.x + explosion.width / 2,
                                explosion.y + explosion.height / 2,
                                size / 2 + explosion.frame * 4,
                                0,
                                Math.PI * 2,
                            )
                            ctx.stroke()
                        }

                        // Add particles
                        for (let j = 0; j < 5; j++) {
                            const angle = Math.random() * Math.PI * 2
                            const distance = Math.random() * size * 0.8
                            const particleSize = Math.random() * 4 + 2

                            ctx.fillStyle = ["#FF4500", "#FFA500", "#FFFF00"][Math.floor(Math.random() * 3)]
                            ctx.beginPath()
                            ctx.arc(
                                explosion.x + explosion.width / 2 + Math.cos(angle) * distance,
                                explosion.y + explosion.height / 2 + Math.sin(angle) * distance,
                                particleSize * (1 - progress),
                                0,
                                Math.PI * 2,
                            )
                            ctx.fill()
                        }

                        // Screen shake effect for player explosion
                        if (explosion.frame < 5) {
                            const shakeAmount = (5 - explosion.frame) * 2
                            ctx.save()
                            ctx.translate(
                                Math.random() * shakeAmount - shakeAmount / 2,
                                Math.random() * shakeAmount - shakeAmount / 2,
                            )
                        }
                    } else {
                        // Regular enemy explosion
                        const gradient = ctx.createRadialGradient(
                            explosion.x + explosion.width / 2,
                            explosion.y + explosion.height / 2,
                            0,
                            explosion.x + explosion.width / 2,
                            explosion.y + explosion.height / 2,
                            size / 2,
                        )

                        gradient.addColorStop(0, "#FFFF00")
                        gradient.addColorStop(0.7, "#FFA500")
                        gradient.addColorStop(1, "#FF4500")

                        ctx.fillStyle = gradient
                        ctx.fill()

                        // Add particles for enemy explosion
                        for (let j = 0; j < 3; j++) {
                            const angle = Math.random() * Math.PI * 2
                            const distance = Math.random() * size * 0.6
                            const particleSize = Math.random() * 3 + 1

                            ctx.fillStyle = "#FFA500"
                            ctx.beginPath()
                            ctx.arc(
                                explosion.x + explosion.width / 2 + Math.cos(angle) * distance,
                                explosion.y + explosion.height / 2 + Math.sin(angle) * distance,
                                particleSize * (1 - progress),
                                0,
                                Math.PI * 2,
                            )
                            ctx.fill()
                        }
                    }
                }

                // Reset context transform if we applied screen shake
                for (const explosion of explosions) {
                    if (explosion.isPlayer && explosion.frame < 5) {
                        ctx.restore()
                    }
                }

                // Add powerup drawing code after drawing bullets and before checking if enemies are defeated
                // Draw powerups
                for (const powerup of powerups) {
                    // Base powerup background
                    ctx.fillStyle = "#000"
                    ctx.fillRect(powerup.x, powerup.y, powerup.width, powerup.height)

                    // Draw powerup based on type
                    switch (powerup.type) {
                        case "helmet":
                            // Draw helmet (blue)
                            ctx.fillStyle = "#4169E1"
                            ctx.fillRect(powerup.x + 4, powerup.y + 4, powerup.width - 8, powerup.height - 8)

                            // Helmet details
                            ctx.fillStyle = "#87CEFA"
                            ctx.beginPath()
                            ctx.arc(powerup.x + powerup.width / 2, powerup.y + powerup.height / 2, powerup.width / 4, 0, Math.PI * 2)
                            ctx.fill()
                            break

                        case "star":
                            // Draw star (yellow)
                            ctx.fillStyle = "#FFD700"
                            ctx.fillRect(powerup.x + 4, powerup.y + 4, powerup.width - 8, powerup.height - 8)

                            // Star details
                            ctx.fillStyle = "#FFFF00"
                            // Draw a simple star shape
                            const centerX = powerup.x + powerup.width / 2
                            const centerY = powerup.y + powerup.height / 2
                            const spikes = 5
                            const outerRadius = powerup.width / 3
                            const innerRadius = powerup.width / 6

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
                            ctx.fillRect(powerup.x + 4, powerup.y + 4, powerup.width - 8, powerup.height - 8)

                            // Tank details
                            ctx.fillStyle = "#00FF00"
                            // Tank body
                            ctx.fillRect(
                                powerup.x + powerup.width / 4,
                                powerup.y + powerup.height / 3,
                                powerup.width / 2,
                                powerup.height / 2,
                            )
                            // Tank turret
                            ctx.fillRect(powerup.x + powerup.width / 2 - 2, powerup.y + powerup.height / 6, 4, powerup.height / 3)
                            break
                    }
                }

                // Draw player tank
                ctx.fillStyle = player.color
                ctx.fillRect(player.x, player.y, player.width, player.height)

                // Modify the player tank drawing to show powerup effects
                // After drawing the player tank and before drawing tank details, add:
                // Draw powerup effects
                if (playerInvincible) {
                    // Draw shield effect
                    ctx.strokeStyle = "#4169E1"
                    ctx.lineWidth = 2
                    ctx.beginPath()
                    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width * 0.75, 0, Math.PI * 2)
                    ctx.stroke()

                    // Pulsating effect
                    const pulseSize = Math.sin(Date.now() / 100) * 2 + player.width * 0.6
                    ctx.beginPath()
                    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, pulseSize, 0, Math.PI * 2)
                    ctx.stroke()
                }

                if (playerPoweredUp) {
                    // Draw powered-up effect (glowing outline)
                    ctx.strokeStyle = "#FFD700"
                    ctx.lineWidth = 2
                    ctx.strokeRect(player.x - 2, player.y - 2, player.width + 4, player.height + 4)

                    // Particles
                    for (let i = 0; i < 3; i++) {
                        const particleX = player.x + Math.random() * player.width
                        const particleY = player.y + Math.random() * player.height
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
                switch (player.direction) {
                    case "up":
                        ctx.fillRect(
                            player.x + player.width / 2 - player.width / 8,
                            player.y - player.height / 3,
                            player.width / 4,
                            player.height / 2,
                        )
                        break
                    case "down":
                        ctx.fillRect(
                            player.x + player.width / 2 - player.width / 8,
                            player.y + player.height - player.height / 6,
                            player.width / 4,
                            player.height / 2,
                        )
                        break
                    case "left":
                        ctx.fillRect(
                            player.x - player.width / 3,
                            player.y + player.height / 2 - player.height / 8,
                            player.width / 2,
                            player.height / 4,
                        )
                        break
                    case "right":
                        ctx.fillRect(
                            player.x + player.width - player.width / 6,
                            player.y + player.height / 2 - player.height / 8,
                            player.width / 2,
                            player.height / 4,
                        )
                        break
                }

                // Draw tank body details
                ctx.fillStyle = "#222"
                ctx.fillRect(player.x + player.width / 4, player.y + player.height / 4, player.width / 2, player.height / 2)

                // Draw enemies
                for (const enemy of enemies) {
                    ctx.fillStyle = enemy.color
                    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height)

                    // Draw tank details
                    ctx.fillStyle = "#333"

                    // Draw tank barrel
                    switch (enemy.direction) {
                        case "up":
                            ctx.fillRect(
                                enemy.x + enemy.width / 2 - enemy.width / 8,
                                enemy.y - enemy.height / 3,
                                enemy.width / 4,
                                enemy.height / 2,
                            )
                            break
                        case "down":
                            ctx.fillRect(
                                enemy.x + enemy.width / 2 - enemy.width / 8,
                                enemy.y + enemy.height - enemy.height / 6,
                                enemy.width / 4,
                                enemy.height / 2,
                            )
                            break
                        case "left":
                            ctx.fillRect(
                                enemy.x - enemy.width / 3,
                                enemy.y + enemy.height / 2 - enemy.height / 8,
                                enemy.width / 2,
                                enemy.height / 4,
                            )
                            break
                        case "right":
                            ctx.fillRect(
                                enemy.x + enemy.width - enemy.width / 6,
                                enemy.y + enemy.height / 2 - enemy.height / 8,
                                enemy.width / 2,
                                enemy.height / 4,
                            )
                            break
                    }

                    // Draw tank body details
                    ctx.fillStyle = "#222"
                    ctx.fillRect(enemy.x + enemy.width / 4, enemy.y + enemy.height / 4, enemy.width / 2, enemy.height / 2)
                }

                // Draw bullets
                ctx.fillStyle = "#FFFF00"
                for (const bullet of player.bullets) {
                    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height)
                }

                // Add explosion update and drawing code after drawing bullets and before drawing powerups
                // Update explosions

                // Check if all enemies are defeated
                if (enemies.length === 0 && Date.now() - lastEnemySpawn > ENEMY_SPAWN_INTERVAL * 2) {
                    setLevel((prev) => prev + 1)
                    setScore((prev) => prev + 500)
                    generateLevel()
                    lastEnemySpawn = Date.now()
                }
            }

            // Continue game loop
            animationFrameId = requestAnimationFrame(gameLoop)
        }

        // Start game loop
        animationFrameId = requestAnimationFrame(gameLoop)

        // Cleanup
        return () => {
            cancelAnimationFrame(animationFrameId)
            window.removeEventListener("keydown", (e) => {
                keys[e.key.toLowerCase()] = true
            })
            window.removeEventListener("keyup", (e) => {
                keys[e.key.toLowerCase()] = false
            })
        }
    }, [gameStarted, gameOver, lives])

    // Reset game
    const resetGame = () => {
        setGameStarted(true)
        setGameOver(false)
        setScore(0)
        setLevel(1)
        setLives(3)
    }

    return (
        <article className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-50 to-sky-100 dark:from-gray-700 dark:to-gray-600">
            <div className="text-center mb-4">
                <div className="flex justify-center gap-8 text-gray-400 font-mono">
                    <div>⭐ {score}</div>
                    <div>📦 L{level}</div>
                    <div>♥️ {lives}</div>
                </div>
            </div>

            <div className="relative border-4 border-gray-700 rounded-lg overflow-hidden">
                <canvas ref={canvasRef} className="bg-black" width={640} height={480} />

                {!gameStarted && !gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 p-8">
                        <h2 className="text-2xl font-bold text-white mb-4 font-mono">TANK BATTLE</h2>
                        <p className="text-white mb-6 font-mono text-center">
                            Use W, A, S, D to move
                            <br />
                            SPACE to shoot
                            <br />
                            Collect powerups:
                            <br />
                            🛡️ Helmet - Temporary invincibility
                            <br />⭐ Star - Speed & firepower boost
                            <br />🎮 Tank - Extra life
                            <br />
                            Destroy enemy tanks and survive!
                        </p>
                        <button
                            type="button"
                            onClick={() => setGameStarted(true)}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded font-mono"
                        >
                            START GAME
                        </button>
                    </div>
                )}

                {gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 p-8">
                        <h2 className="text-2xl font-bold text-red-500 mb-4 font-mono">GAME OVER</h2>
                        <p className="text-white mb-2 font-mono">FINAL SCORE: {score}</p>
                        <p className="text-white mb-6 font-mono">LEVEL REACHED: {level}</p>
                        <button
                            type="button"
                            onClick={resetGame}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded font-mono"
                        >
                            PLAY AGAIN
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-6 text-gray-400 text-sm font-mono text-center">
                <p>Controls: W, A, S, D to move | SPACE to shoot</p>
                <p className="mt-1">Destroy enemy tanks and collect powerups!</p>
                <p className="mt-1">🛡️ Helmet - Invincibility | ⭐ Star - Speed boost | 🎮 Tank - Extra life</p>
            </div>
        </article>
    )
}
