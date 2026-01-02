import { modP } from '@/lib/utils';

// biome-ignore format: no
export const colourSchemes: [ l: number, a: number, b: number ][][] = [
  [ [ 46, 74, 1 ], [ 46, 74, 1 ], [ 45, 43, -26 ], [ 29, 32, -64 ], [ 29, 32, -64 ] ],
  [ [ 53, 80, 67 ], [ 75, 24, 79 ], [ 97, -22, 94 ], [ 46, -52, 50 ], [ 30, 59, -36 ] ],
  [ [ 77, -13, 72 ], [ 82, -0, 0 ], [ 41, 41, -43 ], [ 13, -0, 0 ] ],
  [ [ 64, -17, -25 ], [ 63, 24, 3 ], [ 82, -0, 0 ], [ 63, 24, 3 ], [ 64, -17, -25 ] ],
  [ [ 62, 39, -40 ], [ 100, -0, 0 ], [ 48, -35, 45 ] ],
  [ [ 67, 57, 1 ], [ 47, 80, -59 ], [ 16, -0, 0 ], [ 33, 41, -70 ] ],
  [ [ 76, -0, 0 ], [ 100, -0, 0 ], [ 90, -37, 48 ], [ 100, -0, 0 ], [ 76, -0, 0 ] ],
  [ [ 65, 51, 7 ], [ 76, 31, 1 ], [ 83, -0, 0 ], [ 84, -23, -20 ], [ 77, -23, -33 ], [ 95, -10, 50 ] ],
  [ [ 0, 0, 0 ], [ 68, -0, 0 ], [ 100, -0, 0 ], [ 30, 59, -36 ] ],
  [ [ 56, 83, -2 ], [ 87, -3, 87 ], [ 69, -10, -48 ] ]
]

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
  get(key: Point): Item | undefined {
    return this.#map.get(this.#packer.pack(key));
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

export class Game {
  #food = new PointMap<number | null>();
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
  #colour = 0;
  auto = false;
  #nextTurn: Turn | null = null;
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
  get minFood(): number {
    return Math.ceil(this.#size ** 2 / 100);
  }
  set size(value: number) {
    this.#size = Math.ceil(Math.max(this.#size, value) / 2) * 2;
  }
  set speed(value: number) {
    this.#speed = Math.min(10, Math.max(1, value));
  }
  set wrap(value: boolean) {
    this.#wrap = value;
  }
  reset(partial?: boolean): void {
    this.#food.clear();
    this.#snake.clear();
    if (!partial) this.#score = 0;
    this.#dead = false;
    this.turn = Turn.None;
    if (partial) this.paused = !this.auto;
    else this.paused = false;
    if (!partial) this.#speed = 1;
    if (!partial) this.#size = 12;
    this.#snake.set({ x: 0, y: this.#size - 1 }, Heading.North);
    this.#snake.set({ x: 0, y: this.#size - 2 }, Heading.North);
    this.addFood();
    this.#grow = false;
    if (!partial) this.#colour = 0;
    if (!partial) this.auto = false;
    this.#nextTurn = null;
  }
  addFood(special?: boolean): void {
    const colour = special || (typeof special === 'undefined' && Math.random() > 0.9) ? Math.floor(Math.random() * (colourSchemes.length - 0.0001)) : null;
    if (this.#food.size + this.#snake.size >= this.size ** 2) return;
    for (let i = 0; i < 1000; i++) {
      const food: Point = {
        x: Math.floor(Math.random() * (this.#size - 0.0001)),
        y: Math.floor(Math.random() * (this.#size - 0.0001)),
      };
      if (this.#food.has(food)) continue;
      if (this.#snake.has(food)) continue;
      this.#food.set(food, colour);
      return;
    }
  }
  fillFood(special?: boolean): void {
    for (let x = 0; x < this.size; ++x)
      for (let y = 0; y < this.size; ++y) {
        if (this.#snake.has({ x, y })) continue;
        this.#food.set(
          { x, y },
          special || (typeof special === 'undefined' && Math.random() > 0.9) ? Math.floor(Math.random() * (colourSchemes.length - 0.0001)) : null
        );
      }
  }
  step(): boolean {
    const [head, heading] = this.#snake.head;
    if (this.auto) {
      if (this.#nextTurn !== null) {
        this.turn = this.#nextTurn;
        this.#nextTurn = null;
      } else if (head.y === 0 && head.x < this.size - 1) {
        this.turn = Turn.Right;
        this.#nextTurn = Turn.Right;
      } else if (head.y === this.size - 2 && head.x < this.size - 2 && head.x > 0) {
        this.turn = Turn.Left;
        this.#nextTurn = Turn.Left;
      } else if (head.x === this.size - 1 && head.y === this.size - 1) {
        this.turn = Turn.Right;
        this.#nextTurn = Turn.None;
      } else if (head.x === 0 && head.y === this.size - 1) {
        this.turn = Turn.Right;
        this.#nextTurn = Turn.None;
      }
      console.debug(
        head,
        this.turn === Turn.Left ? 'l' : this.turn === Turn.Right ? 'r' : 'f',
        this.#nextTurn === Turn.Left ? 'l' : this.#nextTurn === Turn.Right ? 'r' : this.#nextTurn === Turn.None ? 'f' : this.#nextTurn
      );
    }
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
      const foodAt = this.#food.get(nextHead);
      this.#score += this.#snake.size * this.speed * (typeof foodAt === 'number' ? 10 : 1);
      this.#food.delete(nextHead);
      this.#grow = false;
      if (typeof foodAt === 'number') this.#colour = foodAt;
    } else this.#snake.delete(this.#snake.tail[0]);
    if (this.#snake.size === this.size * this.size) {
      ++this.speed;
      ++this.size;
      this.reset(true);
    }
    if (this.#food.size === 0 || (this.#food.size < this.minFood && Math.random() > 0.8)) this.addFood();
    return true;
  }
  food(): ReturnType<(typeof PointMap<number | null>)['prototype']['entries']> {
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
  get colour() {
    return this.#colour;
  }
  get colourScheme() {
    return colourSchemes[this.#colour];
  }
  nextColour() {
    if (this.#colour === colourSchemes.length - 1) this.#colour = 0;
    else ++this.#colour;
  }
}
