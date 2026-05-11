# Privacy threat model — mesh-pair-rotation

## What other peers in the same room can see

- The **roster** — names of every connected peer (or whoever was added
  manually), stored in the shared Yjs document.
- **Current and past sprints** — the pairings, their start time, the
  flip interval.
- **Pair history** — when each pair (key = sorted-names joined by
  `::`) last paired.
- Your Yjs awareness `clientID` — a per-session 32-bit integer. Not
  tied to your name unless you typed in the roster.
- Mesh-time pings — your phone's `Date.now()` every 1.5 s, used for
  median-offset clock sync so role flips agree across the pair.

There is no audio, no video, no location, no message text — this is
all just structured pairings data.

## What stays local

- Your room ID, your typed name, your preferred flip interval, and the
  lookback weeks value live in `localStorage`.
- Your TURN/signaling overrides stay in `localStorage`.

## What the signaling server sees

`signaling-server` sees the room name (`mesh-pair-rotation:<roomId>`),
encrypted SDP exchanges, and the connecting peer's IP. It does not see
roster contents or pair history.

## What the TURN server sees

`coturn-hetzner` relays encrypted WebRTC bytes when peers can't connect
directly. It sees IPs and encrypted payloads it cannot decrypt.

## Permissions asked

- **Vibration (`navigator.vibrate`)** — best-effort, no permission
  prompt on most browsers.
- **Audio (`AudioContext`)** — created on the arm gesture for the
  role-flip chime, per iOS Safari requirements.

## Not in the threat model

- **Cross-room snooping.** If you share `roomId = "default"` with the
  world, anyone joining will see your team's pairings. Pick a unique
  `roomId` for your team.
- **History deletion.** There's no UI to wipe history. The Yjs CRDT
  preserves all operations; if you need fresh history, change the
  `roomId`.
