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
  [Symbol.iterator]() {
    return this.keys();
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
  [Symbol.iterator]() {
    return this.entries();
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
  *segments(): MapIterator<[Point, Heading, segment: number]> {
    let i = 0;
    for (const [point, heading] of super.entries().toArray().toReversed()) yield [point, heading, i++];
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

export enum FoodType {
  Standard,
  Special,
}

export class Game {
  #food = new PointMap<FoodType>();
  #snake = new Snake();
  #score = 0;
  #dead = false;
  #wrap = false;
  turn = Turn.None;
  #speed = 1;
  paused = false;
  #size = 12;
  #grow = false;
  labels = false;
  constructor() {
    this.reset();
  }
  get length(): number {
    return this.#snake.size;
  }
  get score(): number {
    return this.#score;
  }
  get dead(): boolean {
    return this.#dead;
  }
  get wrap(): boolean {
    return this.#wrap;
  }
  get stepTime(): number {
    return 50 * (11 - this.speed);
  }
  get speed(): number {
    return this.#speed;
  }
  get size(): number {
    return this.#size;
  }
  set size(value: number) {
    this.#size = Math.max(this.#size, value);
  }
  set speed(value: number) {
    this.#speed = Math.min(10, Math.max(1, value));
  }
  set wrap(value: boolean) {
    this.#wrap = value;
  }
  reset(): void {
    this.#food.clear();
    this.#snake.clear();
    this.#score = 0;
    this.#dead = false;
    this.turn = Turn.None;
    this.paused = false;
    this.#speed = 1;
    this.#size = 12;
    this.#snake.set({ x: 0, y: this.#size - 1 }, Heading.North);
    this.#snake.set({ x: 0, y: this.#size - 2 }, Heading.North);
    this.addFood();
    this.#grow = false;
    this.labels = false;
  }
  addFood(): void {
    while (true) {
      const food: Point = {
        x: Math.round(Math.random() * (this.#size - 1)),
        y: Math.round(Math.random() * (this.#size - 1)),
      };
      if (this.#food.has(food)) continue;
      if (this.#snake.has(food)) continue;
      this.#food.set(food, Math.random() > 0.9 ? FoodType.Special : FoodType.Standard);
      return;
    }
  }
  step(): boolean {
    const [head, heading] = this.#snake.head;
    const nextHeading: Heading = modP(heading + this.turn, 4);
    this.turn = Turn.None;
    const nextHead: Point = this.#wrap
      ? {
          x: modP(head.x + (nextHeading === Heading.East ? 1 : nextHeading === Heading.West ? -1 : 0), this.#size),
          y: modP(head.y + (nextHeading === Heading.North ? -1 : nextHeading === Heading.South ? 1 : 0), this.#size),
        }
      : {
          x: head.x + (nextHeading === Heading.East ? 1 : nextHeading === Heading.West ? -1 : 0),
          y: head.y + (nextHeading === Heading.North ? -1 : nextHeading === Heading.South ? 1 : 0),
        };
    if ((!this.#wrap && (nextHead.x < 0 || nextHead.x >= this.#size || nextHead.y < 0 || nextHead.y >= this.#size)) || this.#snake.has(nextHead)) {
      this.#dead = true;
      return false;
    }
    this.#snake.set(nextHead, nextHeading);
    if (this.#grow || this.#food.has(nextHead)) {
      this.#score += this.#snake.size * this.speed;
      this.#food.delete(nextHead);
      if (this.#food.size === 0) this.addFood();
      this.#grow = false;
    } else this.#snake.delete(this.#snake.tail[0]);
    return true;
  }
  food(): ReturnType<(typeof PointMap)['prototype']['entries']> {
    return this.#food.entries();
  }
  snake(): ReturnType<(typeof Snake)['prototype']['segments']> {
    return this.#snake.segments();
  }
  dump() {
    return {
      food: this.#food.keys().toArray(),
      snake: this.#snake.keys().toArray(),
      head: this.#snake.head,
      tail: this.#snake.tail,
      score: this.#score,
      size: this.#size,
      dead: this.dead,
    };
  }
  grow() {
    this.#grow = true;
  }
}
