---
status: accepted
date: 2026-05-12
---

# 0003 — Sprint as the period

## Context

When does a rotation start, end, and what carries over? The "active
pairings" period needs a natural boundary that matches how teams
actually work.

## Decision

A **sprint** is the unit of pairing. The default sprint ID is the ISO
week (`YYYY-Www`). Sprint IDs are free-form, so teams running
two-week sprints or kanban-with-arbitrary-cadence can pick their own.

Yjs structure:

```ts
Y.Array<string>("roster")                       // names
Y.Map<sprintId, Sprint>("sprints")              // current + recent
Y.Map<pairKey, { lastPaired: number }>("history")  // accumulates forever
```

`Sprint = { pairs: [name, name][], lockedPairs?, startedAt: number,
flipIntervalMs: number }`. Each sprint is a self-contained snapshot of
"these were the pairings, this was the role-flip cadence."

The **history** map accumulates across sprints. When a sprint is
confirmed, we update `history[pairKey] = { lastPaired: Date.now() }` for
every pair in the new sprint. The matcher reads history to score
candidate pairs.

`flipIntervalMs` is **per-sprint** configurable. A team that wants
30-minute rotations for a hairy debugging sprint, then 25-minute
rotations next week, can change the value in Settings when confirming
the next sprint.

## Consequences

- **Mental model match.** Teams think in "this sprint we paired Alice
  with Bob"; the data model agrees.
- **History never resets** by design. Even if you nuke a sprint, the
  history of who-paired-with-whom is preserved, so future suggestions
  stay fresh.
- **Sprint ID collisions.** If two teams use the same `roomId` and the
  same ISO week (likely), they'll see each other's pairings. Use a
  team-specific room ID.
- **No automatic sprint advancement.** When the ISO week rolls over,
  the new default sprintId points to an empty record. The team can
  reuse the previous sprint's pairings or run "Suggest pairs" for a
  fresh round.

## Alternatives considered

- **One long "ongoing" pairings record.** Loses the snapshot semantics
  and makes "show me last sprint's pairs" hard.
- **Server-stored history (Mode C).** Out of scope.
