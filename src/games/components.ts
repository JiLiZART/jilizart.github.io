export class Position {
  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number
  ) {}
}

export class Level {
    constructor(public index: number) {}

    public increment() {
        this.index++
    }
}

export class Player {
    constructor(public id: number, public index: number) {}
}

export class Movement {
  constructor(public speed: number, public direction: string) {}
}

export class DirectionChange {
    constructor(public changeCooldown: number, public lastChange: number = 0) {}
}

export class Health {
  constructor(public current: number, public max: number) {}

  public isDead(): boolean {
    return this.current <= 0;
  }

  public hit(value: number) {
    this.current -= value
  }
}

export class Score {
    constructor(public value: number) {}

    add(value: number) {
        this.value += value
    }
}

export class Bullet {
  constructor(public ownerId: number, public damage: number = 1) {}
}

export class Tank {
  constructor(
    public color: string,
    public lastShot: number,
    public shootCooldown: number,
  ) {}
}

export class Powerup {
  constructor(
    public type: "helmet" | "star" | "tank",
    public duration: number,
    public spawnTime: number
  ) {}
}

export class Invincible {
    constructor(public duration: number, public spawnTime: number) {}
}

export class Explosion {
  constructor(
    public frame: number,
    public maxFrames: number,
    public frameTime: number,
    public lastFrameUpdate: number,
    public ownerId: number
  ) {}
}

export class Wall {
  constructor(public type: "brick" | "steel" | "water" | "bush") {}
}
