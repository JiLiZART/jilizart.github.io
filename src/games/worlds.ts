import {Level, Player} from "./components.ts";
import {GRID_HEIGHT, GRID_WIDTH, TILE_SIZE} from "./constants.ts";

export class World {
  public id = 0;
  public width = GRID_WIDTH * TILE_SIZE;
  public height = GRID_HEIGHT * TILE_SIZE;
  private entities: Map<number, Map<string, any>> = new Map([[this.id, new Map()]]);
  private nextEntityId: number = 1;

  public createPlayer(num: number): number {
    const playerId = this.createEntity();

    this.addComponent(this.id, new Player(playerId, num));

    return playerId;
  }

  public createEntity(): number {
    const id = this.nextEntityId++;
    this.entities.set(id, new Map());
    return id;
  }

  public removeEntity(id: number): void {
    this.entities.delete(id);
  }

  public addComponent<T>(entityId: number, component: T): void {
    const entity = this.entities.get(entityId);
    if (entity) {
      entity.set(component.constructor.name, component);
    }
  }

  public addComponents<T>(entityId: number, components: T[]): void {
    const entity = this.entities.get(entityId);
    if (entity) {
      for (const component of components) {
        entity.set(component.constructor.name, component);
      }
    }
  }

  public getComponent<T>(
    entityId: number,
    componentType: new (...args: any[]) => T
  ): T | undefined {
    const entity = this.entities.get(entityId);
    return entity?.get(componentType.name);
  }

  public getComponents<T>(
    componentType: new (...args: any[]) => T
  ): [number, T][] {
    const result: [number, T][] = [];
    for (const [id, components] of this.entities) {
      const component = components.get(componentType.name);
      if (component) {
        result.push([id, component]);
      }
    }
    return result;
  }

  public hasComponent(
    entityId: number,
    componentType: new (...args: any[]) => any
  ): boolean {
    const entity = this.entities.get(entityId);
    return entity?.has(componentType.name) ?? false;
  }
}
