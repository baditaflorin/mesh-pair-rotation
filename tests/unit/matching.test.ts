import { describe, expect, it } from "vitest";
import { suggestPairs, recordPairings, pairKey, flipHalf } from "../../src/features/pair/matching";

const DAY = 86_400_000;

describe("suggestPairs — weighted-greedy freshness matching", () => {
  it("pairs everyone exactly once on an even roster", () => {
    const { pairs, rest } = suggestPairs(["A", "B", "C", "D"], {}, 1000);
    const matched = pairs.flat().sort();
    expect(matched).toEqual(["A", "B", "C", "D"]);
    expect(rest).toEqual([]);
  });

  it("leaves exactly one person resting on an odd roster", () => {
    const { pairs, rest } = suggestPairs(["A", "B", "C"], {}, 1000);
    expect(pairs).toHaveLength(1);
    expect(rest).toHaveLength(1);
  });

  it("prefers the stalest pairing over a more-recent one when both are matchable", () => {
    const now = 100 * DAY;
    // Two candidates for A: A+B paired yesterday, A+C paired 30 days ago.
    // Every pair here has history, so freshness (not +Infinity) decides.
    const history = {
      [pairKey("A", "B")]: { lastPaired: now - 1 * DAY },
      [pairKey("A", "C")]: { lastPaired: now - 30 * DAY },
      [pairKey("B", "C")]: { lastPaired: now - 1 * DAY },
    };
    const { pairs } = suggestPairs(["A", "B", "C"], history, now);
    const keys = pairs.map(([a, b]) => pairKey(a, b));
    // A+C is the stalest pair (30d) → matched; B is left resting.
    expect(keys).toContain(pairKey("A", "C"));
    expect(keys).not.toContain(pairKey("A", "B"));
  });

  it("avoids re-pairing people who paired most recently", () => {
    const now = 100 * DAY;
    // A+B and C+D paired yesterday; A+C, A+D, B+C, B+D never paired.
    const history = {
      [pairKey("A", "B")]: { lastPaired: now - 1 * DAY },
      [pairKey("C", "D")]: { lastPaired: now - 1 * DAY },
    };
    const { pairs } = suggestPairs(["A", "B", "C", "D"], history, now);
    const keys = pairs.map(([a, b]) => pairKey(a, b));
    // Never-paired (score +Infinity) outranks the 1-day-old pairs, so neither
    // recent pairing is reused.
    expect(keys).not.toContain(pairKey("A", "B"));
    expect(keys).not.toContain(pairKey("C", "D"));
  });

  it("treats never-paired people as the highest priority (score = +Infinity)", () => {
    const now = 100 * DAY;
    // A+B and A+C have history; B+C have NEVER paired → must be matched.
    const history = {
      [pairKey("A", "B")]: { lastPaired: now - 50 * DAY },
      [pairKey("A", "C")]: { lastPaired: now - 50 * DAY },
    };
    const { pairs } = suggestPairs(["A", "B", "C"], history, now);
    const keys = pairs.map(([a, b]) => pairKey(a, b));
    expect(keys).toContain(pairKey("B", "C"));
  });

  it("keeps locked pairs intact and matches the rest around them", () => {
    const { pairs } = suggestPairs(["A", "B", "C", "D"], {}, 1000, [["A", "B"]]);
    expect(pairs).toContainEqual(["A", "B"]);
    // C and D are the only ones left, so they must pair.
    expect(pairs.map(([a, b]) => pairKey(a, b))).toContain(pairKey("C", "D"));
  });
});

describe("recordPairings", () => {
  it("stamps every pair with the given timestamp without mutating the input", () => {
    const before = {};
    const after = recordPairings(before, [["A", "B"]], 4242);
    expect(after[pairKey("A", "B")]).toEqual({ lastPaired: 4242 });
    expect(before).toEqual({}); // immutability
  });
});

describe("flipHalf — cross-phone driver/navigator agreement", () => {
  it("starts on half 0 (first-listed drives) at sprint start", () => {
    expect(flipHalf(0, 1500)).toBe(0);
    expect(flipHalf(10, 1500)).toBe(0);
  });

  it("flips to half 1 after one interval, back to 0 after two", () => {
    expect(flipHalf(1500, 1500)).toBe(1);
    expect(flipHalf(3000, 1500)).toBe(0);
    expect(flipHalf(4500, 1500)).toBe(1);
  });

  it("clamps negative elapsed to half 0 — the cross-phone desync bug", () => {
    // Clock-sync skew can make one phone read a few ms BEFORE startedAt.
    // A bare Math.floor(-1 / n) % 2 returns -1 in JS, flipping the driver and
    // desyncing the pair. flipHalf must return 0 so both phones agree.
    expect(flipHalf(-1, 1500)).toBe(0);
    expect(flipHalf(-1000, 1500)).toBe(0);
    expect(Math.floor(-1 / 1500) % 2).toBe(-1); // documents the trap being guarded
  });

  it("never returns a negative half for any input", () => {
    for (const e of [-5000, -1, 0, 1, 1499, 1500, 9999, 60_000]) {
      expect(flipHalf(e, 1500)).toBeGreaterThanOrEqual(0);
    }
  });
});
