export function omit<Item extends object, Key extends Extract<keyof Item, string>, Return extends Omit<Item, Key>>(item: Item, keys: Key[]): Return {
  return Object.fromEntries(Object.entries(item).filter(([key]) => !keys.includes(key as Key))) as Return;
}

export function pick<Item extends object, Key extends Extract<keyof Item, string>, Return extends Pick<Item, Key>>(item: Item, keys: Key[]): Return {
  return Object.fromEntries(Object.entries(item).filter(([key]) => keys.includes(key as Key))) as Return;
}

export type Obj = Record<string | number | symbol, unknown>;

export function objectIsEqual(a: Obj, b: Obj): boolean {
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!Object.hasOwn(a, key) || !Object.hasOwn(b, key)) return false;
    if (typeof a[key] !== typeof b[key]) return false;
    if (typeof a[key] === 'object') {
      if (a[key] === null && b[key] === null) continue;
      if (a[key] === null || b[key] === null) return false;
      if (!objectIsEqual(a[key] as Obj, b[key] as Obj)) return false;
    } else if (a[key] !== b[key]) return false;
  }
  return true;
}

/** converts points to an svg path. not even close to optimal */
export function pointsToPath(points: [x: number, y: number][]): string {
  return points
    .map(([x, y], i, arr) => {
      const prev = arr[i - 1];
      // https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/d#path_commands
      if (prev) return `m${x - prev[0]},${y - prev[1]}h0`;
      return `M${x},${y}h0`;
    })
    .join('');
}

export function enumValues<Item extends Record<string, number | string>>(item: Item) {
  return Object.entries(item).filter(([key]) => Number.isNaN(Number(key))) as [string, number][];
}

export function lerp(left: number, right: number, steps: number, step: number): number {
  return left + ((right - left) / steps) * step;
}

export function modP(value: number, mod: number): number {
  const intermediate = value % mod;
  return intermediate + ((mod > 0 && intermediate < 0) || (mod < 0 && intermediate > 0) ? mod : 0);
}
