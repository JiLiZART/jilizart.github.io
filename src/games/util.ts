
// Check collision between two objects
import {World} from "./worlds.ts";
import {GRID_HEIGHT, GRID_WIDTH, TILE_SIZE} from "./constants.ts";
import {Level, Player, Position, Wall} from "./components.ts";

export function checkCollision(obj1: Position, obj2: Position) {
    return (
        obj1.x < obj2.x + obj2.width &&
        obj1.x + obj1.width > obj2.x &&
        obj1.y < obj2.y + obj2.height &&
        obj1.y + obj1.height > obj2.y
    )
}

// Check if position is valid (no collision with walls)
export function isValidPosition(world: World, pos: Position) {
    const walls = world.getComponents(Wall);

    // Check collision with walls
    for (const [wallId, wall] of walls) {
        if (wall.type === "bush") continue // Can move through bushes

        const wallPos = world.getComponent(wallId, Position)

        if (checkCollision(pos, wallPos)) {
            return false
        }
    }

    // Check if within canvas bounds
    return !(pos.x < 0 || pos.x + pos.width > world.width || pos.y < 0 || pos.y + pos.height > world.height);
}

// Generate random level
export function generateLevel(world: World) {
    const walls = world.getComponents(Wall)

    walls.forEach(([wallId]) => world.removeEntity(wallId))

    // walls.length = 0 // Clear existing walls

    const level = world.getComponent(world.id, Level)

    // Create border walls
    for (let x = 0; x < GRID_WIDTH; x++) {
        for (let y = 0; y < GRID_HEIGHT; y++) {
            // Border walls
            if (x === 0 || x === GRID_WIDTH - 1 || y === 0) {
                const wallId = world.createEntity()

                world.addComponents(
                    wallId,
                    [
                        new Position(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE),
                        new Wall("steel"),
                    ]
                )
            }
        }
    }

    const player = world.getComponent(world.id, Player)
    const playerPos = world.getComponent(player.id, Position)

    // Add random walls
    for (let i = 0; i < 40 + level.index * 5; i++) {
        const x = Math.floor(Math.random() * (GRID_WIDTH - 2)) + 1
        const y = Math.floor(Math.random() * (GRID_HEIGHT - 3)) + 1

        // Don't place walls near player spawn
        if (Math.abs(x * TILE_SIZE - playerPos.x) < TILE_SIZE * 2 && Math.abs(y * TILE_SIZE - playerPos.y) < TILE_SIZE * 2) {
            continue
        }

        const wallType =
            Math.random() < 0.7 ? "brick" : Math.random() < 0.5 ? "water" : Math.random() < 0.5 ? "bush" : "steel"

        const wallId = world.createEntity()

        world.addComponents(
            wallId,
            [
                new Position(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE),
                new Wall(wallType),
            ]
        )
    }
}
