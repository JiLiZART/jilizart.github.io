// Add the following interface after the Wall interface
export interface Powerup extends Position {
    type: "helmet" | "star" | "tank"
    duration: number
    spawnTime: number
}

// Add the following interfaces after the Powerup interface
export interface Explosion extends Position {
    frame: number
    maxFrames: number
    frameTime: number
    lastFrameUpdate: number
    isPlayer: boolean
}

// Game objects
export interface Bullet extends Position {
    direction: string
    speed: number
    isEnemy: boolean
}

export interface Enemy extends Position {
    speed: number
    direction: string
    color: string
    lastDirectionChange: number
    directionChangeCooldown: number
    lastShot: number
    shootCooldown: number
}

export interface Wall extends Position {
    type: "brick" | "steel" | "water" | "bush"
}

export interface Position {
    x: number
    y: number
    width: number
    height: number
}
