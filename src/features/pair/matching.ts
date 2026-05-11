/**
 * Weighted-greedy bipartite matching for pair-programming rotation.
 *
 * Goal: pair people who haven't paired recently, while keeping pairs
 * within an even-or-odd-sized roster. We score each candidate pair by
 * how long since they last paired (older = higher score), then run a
 * greedy match by descending score. If the roster is odd, one trio
 * (or a "rest" slot) emerges.
 *
 * This is the same algorithm as mesh-lunch-roulette's matcher, adapted
 * to pairs (k=2) and the per-pair history map.
 */

export type PairHistory = Record<string, { lastPaired: number }>;
export type Pair = [string, string];

const NEVER = 0;

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("::");
}

function score(a: string, b: string, history: PairHistory, now: number): number {
  const k = pairKey(a, b);
  const last = history[k]?.lastPaired ?? NEVER;
  if (last === NEVER) return Number.POSITIVE_INFINITY;
  return now - last;
}

/**
 * Suggest pairs given a roster + per-pair history.
 * `lockedPairs` (optional) are taken as-is and removed from the matching pool.
 * `seed` shuffles candidates when scores tie, to avoid deterministic stale orderings.
 */
export function suggestPairs(
  roster: string[],
  history: PairHistory,
  now: number = Date.now(),
  lockedPairs: Pair[] = [],
  seed: number = now,
): { pairs: Pair[]; rest: string[] } {
  const locked = new Set<string>();
  for (const [a, b] of lockedPairs) {
    locked.add(a);
    locked.add(b);
  }
  const pool = roster.filter((n) => !locked.has(n));

  // Build candidate scores.
  type Candidate = { a: string; b: string; s: number; tie: number };
  const candidates: Candidate[] = [];
  const rand = mulberry32(seed);
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const a = pool[i];
      const b = pool[j];
      if (a === undefined || b === undefined) continue;
      candidates.push({ a, b, s: score(a, b, history, now), tie: rand() });
    }
  }
  candidates.sort((x, y) => (y.s !== x.s ? y.s - x.s : x.tie - y.tie));

  const used = new Set<string>();
  const pairs: Pair[] = [...lockedPairs];
  for (const c of candidates) {
    if (used.has(c.a) || used.has(c.b)) continue;
    pairs.push([c.a, c.b]);
    used.add(c.a);
    used.add(c.b);
  }

  const rest = pool.filter((n) => !used.has(n));
  return { pairs, rest };
}

export function recordPairings(
  history: PairHistory,
  pairs: Pair[],
  at: number = Date.now(),
): PairHistory {
  const out: PairHistory = { ...history };
  for (const [a, b] of pairs) {
    out[pairKey(a, b)] = { lastPaired: at };
  }
  return out;
}

export { pairKey };

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
