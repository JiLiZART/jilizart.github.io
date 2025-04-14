import type {Wall} from "./types.ts";

export function renderBrick(ctx: CanvasRenderingContext2D, wall: Wall) {
    ctx.fillStyle = "#B25D00"
    ctx.fillRect(wall.x, wall.y, wall.width, wall.height)

    // Draw brick pattern
    ctx.fillStyle = "#8B4513"
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if ((i + j) % 2 === 0) {
                ctx.fillRect(
                    wall.x + i * (wall.width / 4),
                    wall.y + j * (wall.height / 4),
                    wall.width / 4,
                    wall.height / 4,
                )
            }
        }
    }
}

export function renderSteel(ctx: CanvasRenderingContext2D, wall: Wall) {
    ctx.fillStyle = "#808080"
    ctx.fillRect(wall.x, wall.y, wall.width, wall.height)

    // Draw steel pattern
    ctx.fillStyle = "#A9A9A9"
    ctx.fillRect(wall.x + wall.width / 4, wall.y + wall.height / 4, wall.width / 2, wall.height / 2)
}

export function renderWater(ctx: CanvasRenderingContext2D, wall: Wall) {
    ctx.fillStyle = "#0077BE"
    ctx.fillRect(wall.x, wall.y, wall.width, wall.height)

    // Draw water pattern
    ctx.fillStyle = "#00A1DE"
    for (let i = 0; i < 4; i++) {
        ctx.fillRect(wall.x, wall.y + i * (wall.height / 4), wall.width, wall.height / 8)
    }
}

export function renderBush(ctx: CanvasRenderingContext2D, wall: Wall) {
    ctx.fillStyle = "#228B22"
    ctx.fillRect(wall.x, wall.y, wall.width, wall.height)

    // Draw bush pattern
    ctx.fillStyle = "#32CD32"
    for (let i = 0; i < 8; i++) {
        ctx.beginPath()
        ctx.arc(
            wall.x + Math.random() * wall.width,
            wall.y + Math.random() * wall.height,
            wall.width / 8,
            0,
            Math.PI * 2,
        )
        ctx.fill()
    }
}
