---
status: accepted
date: 2026-05-12
---

# 0002 — Weighted greedy matching, role-flip mesh-time

## Context

Pair-programming rotation has two coupled problems:

1. **Who pairs with whom?** Teams want a fair distribution where you
   don't pair with the same person repeatedly. With N=5..15 people and
   a per-pair history of "last paired at," we need a quick suggestion.
2. **When do roles flip mid-session?** The classic pomodoro is 25 min;
   both phones in the pair should agree on the flip moment and both
   should vibrate then.

## Decision

### Matching

A **weighted-greedy bipartite match** on the symmetric pair space:

- Score each candidate pair `(A, B)` by **time since last paired**
  (`now - history[key(A,B)].lastPaired`). A pair that's never met scores
  `+∞`.
- Sort candidates by descending score (with a small `mulberry32` tie-break
  seeded by `now`).
- Greedily pick pairs in order; once a person is matched, skip remaining
  candidates that include them.
- If the roster is odd, the leftover person goes to a "rest" slot.
- Locked pairs (manually pinned) bypass the matcher.

This is the same approach as `mesh-lunch-roulette`; it's not optimal
(true max-weight matching needs Hungarian or blossom), but on small
rosters (≤30) greedy lands within a few percent of optimal and is ~50
lines of code.

### Role flip

Roles flip every `flipIntervalMs` (configurable, default 25 min) using
mesh-time:

```ts
half = Math.floor((meshNow() - sprint.startedAt) / sprint.flipIntervalMs) % 2;
// half === 0 → first-listed name drives
// half === 1 → second-listed name drives
```

Each phone tracks the previous `half` value in a ref; when it changes,
the phone vibrates and beeps. Because both phones in a pair compute the
same value from the same Yjs-shared `startedAt`, they flip together to
within clock-sync precision.

## Consequences

- **Predictable cadence.** Every phone sees the same role at the same
  moment.
- **Resilient.** A phone joining mid-sprint immediately sees the correct
  role (`Math.floor` is well-defined from any `now`).
- **Greedy is good enough.** For 30+ people, consider a real matcher —
  but most teams using this app are 4–10 devs.

## Alternatives considered

- **Hungarian algorithm.** Optimal but ~200 lines and overkill at our
  scale.
- **Random shuffle.** Doesn't use history, so people pair with the same
  person too often.
- **Local setTimeout for role flip.** Doesn't survive phone reload; not
  mesh-aware.
