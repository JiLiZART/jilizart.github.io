// Add the following interface after the Wall interface
export interface Powerup extends GameObject {
    type: "helmet" | "star" | "tank"
    duration: number
    spawnTime: number
}

// Add the following interfaces after the Powerup interface
export interface Explosion extends GameObject {
    frame: number
    maxFrames: number
    frameTime: number
    lastFrameUpdate: number
    isPlayer: boolean
}

// Game objects
export interface Bullet extends GameObject {
    direction: string
    speed: number
    isEnemy: boolean
}

export interface Enemy extends GameObject {
    speed: number
    direction: string
    color: string
    lastDirectionChange: number
    directionChangeCooldown: number
    lastShot: number
    shootCooldown: number
}

export interface Wall extends GameObject {
    type: "brick" | "steel" | "water" | "bush"
}

export interface GameObject {
    x: number
    y: number
    width: number
    height: number
}
