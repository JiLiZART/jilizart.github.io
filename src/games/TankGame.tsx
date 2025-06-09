"use client";

import {useEffect, useRef, useState} from "react";
import {World} from "./worlds";
import {Health, Movement, Tank,} from "./components";
import {
    CollisionSystem,
    DirectorSystem,
    EnemySpawnSystem,
    ExplosionSystem,
    KeyboardSystem,
    MovementSystem,
    PowerupSystem,
    RenderSystem,
    ShootingSystem,
} from "./systems";


const isBoolean = (value: any) => typeof value === 'boolean'

const KEY_SPACE = " "
const KEY_UP = "w"
const KEY_DOWN = "s"
const KEY_LEFT = "a"
const KEY_RIGHT = "d"

export default function TankGame() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameStarted, setGameStarted] = useState(false);
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [lives, setLives] = useState(3);
    const [gameOver, setGameOver] = useState(false);

    const world = useRef<World>(new World());
    const movementSystem = useRef<MovementSystem>(
        new MovementSystem(world.current)
    );
    const shootingSystem = useRef<ShootingSystem>(
        new ShootingSystem(world.current)
    );
    const collisionSystem = useRef<CollisionSystem>(
        new CollisionSystem(world.current)
    );
    const powerupSystem = useRef<PowerupSystem>(new PowerupSystem(world.current));
    const enemySpawnSystem = useRef<EnemySpawnSystem>(
        new EnemySpawnSystem(world.current)
    );
    const explosionSystem = useRef<ExplosionSystem>(
        new ExplosionSystem(world.current)
    );
    const keyboardSystem = useRef<KeyboardSystem>(new KeyboardSystem(world.current));
    const renderSystem = useRef<RenderSystem>(new RenderSystem(world.current));
    const directorSystem = useRef<DirectorSystem>(new DirectorSystem(world.current));


    useEffect(() => {
        if (!gameStarted) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        renderSystem.current.init(canvas);

        // Game state
        let animationFrameId: number;
        let lastTimestamp = 0;

        // Create player tank
        const playerId = directorSystem.current.startGame();

        // Game loop
        function gameLoop(timestamp: number) {
            // Calculate delta time
            const deltaTime = timestamp - lastTimestamp

            if (deltaTime >= renderSystem.current.frameTime) {
                lastTimestamp = timestamp - (deltaTime % renderSystem.current.frameTime);

                const keys = keyboardSystem.current.keys;

                const tank = world.current.getComponent(playerId, Tank);

                // Shoot on space
                if (keys[KEY_SPACE] && timestamp - tank.lastShot > tank.shootCooldown) {
                    tank.isShooting = true
                    tank.lastShot = timestamp
                }

                // Update player movement
                const playerMovement = world.current.getComponent(playerId, Movement);
                if (playerMovement) {
                    debugger
                    if (keys["w"]) {
                        playerMovement.direction = "up"
                        newY -= player.speed
                    } else if (keys["s"]) {
                        playerMovement.direction = "down"
                        newY += player.speed
                    } else if (keys["a"]) {
                        playerMovement.direction = "left"
                        newX -= player.speed
                    } else if (keys["d"]) {
                        playerMovement.direction = "right"
                        newX += player.speed
                    }
                }

                // Update systems
                movementSystem.current.update(deltaTime / 1000);
                shootingSystem.current.update(timestamp);
                collisionSystem.current.update(timestamp);
                powerupSystem.current.update(timestamp);
                enemySpawnSystem.current.update(timestamp);
                explosionSystem.current.update(timestamp);
                renderSystem.current.update(deltaTime);

                // Check game over
                if (!world.current.hasComponent(playerId, Health)) {
                    setGameOver(true);
                }
            }

            animationFrameId = requestAnimationFrame(gameLoop);
        }

        // Start game loop
        animationFrameId = requestAnimationFrame(gameLoop);

        // Cleanup
        return () => {
            cancelAnimationFrame(animationFrameId);
            keyboardSystem.current.unmount();
        };
    }, [gameStarted, gameOver]);

    // Reset game
    const resetGame = () => {
        setGameStarted(true);
        setGameOver(false);
        // setScore(0);
        // setLevel(1);
        // setLives(3);
    };

    return (
        <article
            className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-50 to-sky-100 dark:from-gray-700 dark:to-gray-600">
            <div className="text-center mb-4">
                <div className="flex justify-center gap-8 text-gray-400 font-mono">
                    <div>⭐ {score}</div>
                    <div>📦 L{level}</div>
                    <div>♥️ {lives}</div>
                </div>
            </div>

            <div className="relative border-4 border-gray-700 rounded-lg overflow-hidden">
                <canvas ref={canvasRef} className="bg-black" width={640} height={480}/>

                {!gameStarted && !gameOver && (
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 p-8">
                        <h2 className="text-2xl font-bold text-white mb-4 font-mono">
                            TANK BATTLE
                        </h2>
                        <p className="text-white mb-6 font-mono text-center">
                            Use W, A, S, D to move
                            <br/>
                            SPACE to shoot
                            <br/>
                            Collect powerups:
                            <br/>
                            🛡️ Helmet - Temporary invincibility
                            <br/>⭐ Star - Speed & firepower boost
                            <br/>
                            🎮 Tank - Extra life
                            <br/>
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
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 p-8">
                        <h2 className="text-2xl font-bold text-red-500 mb-4 font-mono">
                            GAME OVER
                        </h2>
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
                <p className="mt-1">
                    🛡️ Helmet - Invincibility | ⭐ Star - Speed boost | 🎮 Tank - Extra
                    life
                </p>
            </div>
        </article>
    );
}
