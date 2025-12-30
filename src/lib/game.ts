import { modP } from '@/lib/utils';

export interface Point {
  x: number;
  y: number;
}

class PointPacker {
  // requestAnimationFrame callback is async so shared buffers might cause problems
  pack(point: Point): number {
    if (typeof point !== 'object') throw new Error('point is undefined', { cause: point });
    if (point.x < 0) throw new Error('x < 0', { cause: point });
    if (point.y < 0) throw new Error('y < 0', { cause: point });
    return (point.x << 16) | point.y;
  }
  unpack(packed: number): Point {
    if (typeof packed !== 'number') throw new Error('packed is undefined', { cause: packed });
    return { x: packed >> 16, y: packed & 0xffff };
  }
}

export class PointSet {
  #set = new Set<number>();
  #packer = new PointPacker();
  add(key: Point): this {
    this.#set.add(this.#packer.pack(key));
    return this;
  }
  clear(): void {
    this.#set.clear();
  }
  delete(key: Point): boolean {
    return this.#set.delete(this.#packer.pack(key));
  }
  keys(): SetIterator<Point> {
    return this.#set.keys().map(this.#packer.unpack);
  }
  has(key: Point): boolean {
    return this.#set.has(this.#packer.pack(key));
  }
  get size(): number {
    return this.#set.size;
  }
}

export enum Heading {
  North,
  East,
  South,
  West,
}

export class PointMap<Item> {
  #map = new Map<number, Item>();
  #packer = new PointPacker();
  set(key: Point, value: Item): this {
    this.#map.set(this.#packer.pack(key), value);
    return this;
  }
  clear(): void {
    this.#map.clear();
  }
  delete(key: Point): boolean {
    return this.#map.delete(this.#packer.pack(key));
  }
  keys(): MapIterator<Point> {
    return this.#map.keys().map(this.#packer.unpack);
  }
  values(): MapIterator<Item> {
    return this.#map.values();
  }
  entries(): MapIterator<[Point, Item]> {
    return this.#map.entries().map(([packed, value]) => [this.#packer.unpack(packed), value]);
  }
  has(key: Point): boolean {
    return this.#map.has(this.#packer.pack(key));
  }
  get size(): number {
    return this.#map.size;
  }
}

export class Snake extends PointMap<Heading> {
  get head(): [Point, Heading] {
    // biome-ignore format: no
    const result = super.entries().drop(super.size - 1).next().value;
    if (typeof result === 'undefined') throw new Error('oh no');
    return result;
  }
  get tail(): [Point, Heading] {
    const result = super.entries().next().value;
    if (typeof result === 'undefined') throw new Error('oh no');
    return result;
  }
}

export enum Turn {
  Left = -1,
  Right = 1,
  None = 0,
}

export enum ObjectType {
  Player,
  Food,
}

export class Game {
  #food = new PointSet();
  #snake = new Snake();
  #score = 0;
  constructor(
    public readonly width: number,
    public readonly height: number
  ) {
    this.reset();
  }
  get length(): number {
    return this.#snake.size;
  }
  get score(): number {
    return this.#score;
  }
  reset(): void {
    this.#food.clear();
    this.#snake.clear();
    this.#score = 0;
    this.#snake.set({ x: Math.floor(this.width / 2), y: Math.floor(this.width / 2) }, Heading.North);
    this.addFood();
  }
  addFood(): void {
    while (true) {
      const food: Point = {
        x: Math.round(Math.random() * (this.width - 1)),
        y: Math.round(Math.random() * (this.height - 1)),
      };
      if (this.#food.has(food)) continue;
      if (this.#snake.has(food)) continue;
      this.#food.add(food);
      return;
    }
  }
  move(turn: Turn, speed: number) {
    const [head, heading] = this.#snake.head;
    const nextHeading: Heading = modP(heading + turn, 4);
    const nextHead: Point = {
      x: modP(nextHeading === Heading.East ? head.x + 1 : nextHeading === Heading.West ? head.x - 1 : head.x, this.width),
      y: modP(nextHeading === Heading.North ? head.y - 1 : nextHeading === Heading.South ? head.y + 1 : head.y, this.height),
    };
    if (this.#snake.has(nextHead)) throw new Error('crashed');
    this.#snake.set(nextHead, nextHeading);
    if (this.#food.has(nextHead)) {
      this.#score += this.#snake.size * speed;
      this.#food.delete(nextHead);
      this.addFood();
    } else this.#snake.delete(this.#snake.tail[0]);
  }
  *values(): Generator<[Point, ObjectType], undefined, undefined> {
    for (const point of this.#snake.keys()) {
      // console.debug('values snake', point);
      yield [point, ObjectType.Player];
    }
    for (const point of this.#food.keys()) {
      // console.debug('values food', point);
      yield [point, ObjectType.Food];
    }
  }
  dump() {
    return {
      food: this.#food.keys().toArray(),
      snake: this.#snake.keys().toArray(),
      head: this.#snake.head,
      tail: this.#snake.tail,
      score: this.#score,
      width: this.width,
      height: this.height,
    };
  }
}
