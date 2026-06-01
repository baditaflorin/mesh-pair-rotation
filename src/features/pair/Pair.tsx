import { useEffect, useMemo, useRef, useState } from "react";
import { useTone } from "@baditaflorin/mesh-common";
import { createRoomSync } from "../sync/yjsRoom";
import { createClockSync } from "../sync/clockSync";
import { maybeFetchTurnCredentials } from "../sync/iceConfig";
import {
  suggestPairs,
  recordPairings,
  pairKey,
  flipHalf,
  type Pair as PairTuple,
  type PairHistory,
} from "./matching";

type Sprint = {
  pairs: PairTuple[];
  lockedPairs?: PairTuple[];
  startedAt: number;
  flipIntervalMs: number;
};

type Props = {
  roomId: string;
  myName: string;
  flipIntervalMin: number;
};

function isoWeek(d: Date = new Date()): string {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.getTime();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  const week = 1 + Math.ceil((firstThursday - target.getTime()) / 604800000);
  return `${d.getUTCFullYear()}-W${week.toString().padStart(2, "0")}`;
}

export function PairView({ roomId, myName, flipIntervalMin }: Props) {
  const [armed, setArmed] = useState(false);
  const [roster, setRoster] = useState<string[]>([]);
  const [sprintId, setSprintId] = useState<string>(() => isoWeek());
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [history, setHistory] = useState<PairHistory>({});
  const [now, setNow] = useState(Date.now());
  const [peers, setPeers] = useState(0);
  const [proposed, setProposed] = useState<PairTuple[] | null>(null);
  const [proposedRest, setProposedRest] = useState<string[]>([]);
  const [locked, setLocked] = useState<Set<string>>(new Set());

  const tone = useTone();
  const prevHalfRef = useRef<number | null>(null);

  const meshHandle = useMemo(() => {
    if (!armed) return null;
    const room = createRoomSync(roomId);
    const clock = createClockSync(room.provider);
    return { room, clock };
  }, [armed, roomId]);

  useEffect(() => {
    if (!armed) return;
    void maybeFetchTurnCredentials();
  }, [armed]);

  useEffect(() => {
    return () => {
      meshHandle?.clock.destroy();
      meshHandle?.room.provider?.destroy();
    };
  }, [meshHandle]);

  // Bind Yjs.
  useEffect(() => {
    if (!meshHandle) return;
    const doc = meshHandle.room.doc;
    const yRoster = doc.getArray<string>("roster");
    const ySprints = doc.getMap<Sprint>("sprints");
    const yHistory = doc.getMap<{ lastPaired: number }>("history");

    const readRoster = () => setRoster(yRoster.toArray());
    const readSprint = () => setSprint((ySprints.get(sprintId) as Sprint | undefined) ?? null);
    const readHistory = () => {
      const out: PairHistory = {};
      yHistory.forEach((v, k) => {
        out[k] = v;
      });
      setHistory(out);
    };

    if (myName.trim() && !yRoster.toArray().includes(myName.trim())) {
      yRoster.push([myName.trim()]);
    }

    readRoster();
    readSprint();
    readHistory();
    yRoster.observe(readRoster);
    ySprints.observe(readSprint);
    yHistory.observe(readHistory);

    return () => {
      yRoster.unobserve(readRoster);
      ySprints.unobserve(readSprint);
      yHistory.unobserve(readHistory);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meshHandle, sprintId]);

  // Animation tick.
  useEffect(() => {
    if (!meshHandle) return;
    let frame = 0;
    const tick = () => {
      setNow(meshHandle.clock.meshNow());
      setPeers(meshHandle.clock.peerCount());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [meshHandle]);

  // Detect role flip via prevHalf (0 = first-listed drives, 1 = second-listed drives).
  useEffect(() => {
    if (!sprint) {
      prevHalfRef.current = null;
      return;
    }
    const half = flipHalf(now - sprint.startedAt, sprint.flipIntervalMs);
    if (prevHalfRef.current === null) {
      prevHalfRef.current = half;
      return;
    }
    if (half !== prevHalfRef.current) {
      prevHalfRef.current = half;
      // Vibrate if I'm in a pair.
      const inAPair = sprint.pairs.some(([a, b]) => a === myName.trim() || b === myName.trim());
      if (inAPair) {
        maybeVibrate([100, 60, 100]);
        tone.play({
          freq: 560,
          glideTo: 800,
          type: "triangle",
          duration: 0.18,
          gain: 0.06,
          attack: 0.02,
        });
      }
    }
  }, [now, sprint, myName]);

  const myPair = sprint?.pairs.find(([a, b]) => a === myName.trim() || b === myName.trim()) ?? null;

  const proposeNewPairs = () => {
    const lockedPairs: PairTuple[] = [];
    sprint?.pairs.forEach((p) => {
      if (locked.has(pairKey(p[0], p[1]))) lockedPairs.push(p);
    });
    const { pairs, rest } = suggestPairs(roster, history, Date.now(), lockedPairs);
    setProposed(pairs);
    setProposedRest(rest);
  };

  const confirmSprint = () => {
    if (!meshHandle || !proposed) return;
    const doc = meshHandle.room.doc;
    const ySprints = doc.getMap<Sprint>("sprints");
    const yHistory = doc.getMap<{ lastPaired: number }>("history");
    const next: Sprint = {
      pairs: proposed,
      lockedPairs: [],
      startedAt: Date.now(),
      flipIntervalMs: flipIntervalMin * 60_000,
    };
    doc.transact(() => {
      ySprints.set(sprintId, next);
      const updated = recordPairings(history, proposed, Date.now());
      Object.entries(updated).forEach(([k, v]) => yHistory.set(k, v));
    });
    setProposed(null);
    setProposedRest([]);
    setLocked(new Set());
  };

  const endSprint = () => {
    if (!meshHandle) return;
    meshHandle.room.doc.getMap("sprints").delete(sprintId);
  };

  const toggleLock = (a: string, b: string) => {
    const k = pairKey(a, b);
    const next = new Set(locked);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setLocked(next);
  };

  const arm = () => {
    void tone.resume();
    setArmed(true);
  };

  if (!armed) {
    return (
      <div className="pair-arm">
        <h1>mesh-pair-rotation</h1>
        <p>
          Pair-programming rotation manager. Suggest fresh pairs using a weighted-greedy match on
          the per-pair history; sync the driver-navigator role flip every {flipIntervalMin} minutes
          across both phones in each pair.
        </p>
        <p className="pair-arm-info">
          Joining as <code>{myName || "(no name set)"}</code> · sprint <code>{sprintId}</code>
        </p>
        <button type="button" className="pair-arm-button" onClick={arm} disabled={!myName.trim()}>
          {myName.trim() ? "Connect" : "Set your name first"}
        </button>
        <p className="pair-hint">
          Room <code>{roomId}</code> · use the ⚙ gear to set your name
        </p>
      </div>
    );
  }

  const elapsedMs = sprint ? Math.max(0, now - sprint.startedAt) : 0;
  const half = sprint ? flipHalf(elapsedMs, sprint.flipIntervalMs) : 0;
  const nextFlipMs = sprint ? sprint.flipIntervalMs - (elapsedMs % sprint.flipIntervalMs) : 0;

  return (
    <div className="pair-stage">
      <div className="pair-hud">
        <span>
          {peers + 1} {peers + 1 === 1 ? "phone" : "phones"}
        </span>
        <span aria-hidden="true">·</span>
        <span>sprint {sprintId}</span>
      </div>

      <h2 className="pair-section-head">Roster</h2>
      <div className="pair-roster">
        {roster.length === 0 && <em>No one yet — set your name in Settings.</em>}
        {roster.map((n) => (
          <span
            key={n}
            className={"pair-roster-chip" + (n === myName.trim() ? " pair-roster-me" : "")}
          >
            {n}
          </span>
        ))}
      </div>
      {roster.length < 2 && (
        <p className="pair-rest">
          Waiting for teammates — share this room (📡 top-right) so they join, then Suggest pairs.
        </p>
      )}

      <div className="pair-actions">
        <button type="button" onClick={proposeNewPairs} disabled={roster.length < 2}>
          Suggest pairs
        </button>
        {sprint && (
          <button type="button" onClick={endSprint}>
            End sprint
          </button>
        )}
      </div>

      {proposed && (
        <div className="pair-proposed">
          <h2 className="pair-section-head">Proposed pairs</h2>
          {proposed.map(([a, b]) => {
            const k = pairKey(a, b);
            const last = history[k]?.lastPaired ?? 0;
            const lastLabel = last ? `${Math.floor((Date.now() - last) / 86400000)}d ago` : "never";
            return (
              <div key={k} className="pair-card">
                <span>
                  <strong>{a}</strong> + <strong>{b}</strong>
                </span>
                <span className="pair-card-meta">last paired: {lastLabel}</span>
                <button
                  type="button"
                  className={"pair-lock" + (locked.has(k) ? " pair-lock-on" : "")}
                  onClick={() => toggleLock(a, b)}
                >
                  {locked.has(k) ? "locked" : "lock"}
                </button>
              </div>
            );
          })}
          {proposedRest.length > 0 && (
            <div className="pair-rest">resting: {proposedRest.join(", ")}</div>
          )}
          <div className="pair-actions">
            <button type="button" onClick={confirmSprint}>
              Confirm and start sprint
            </button>
          </div>
        </div>
      )}

      {sprint && !proposed && (
        <>
          <h2 className="pair-section-head">Sprint in progress</h2>
          {myPair && (
            <div className="pair-mine">
              <div className="pair-mine-names">
                <span className="pair-mine-name">{myPair[0]}</span>
                <span className="pair-mine-amp">+</span>
                <span className="pair-mine-name">{myPair[1]}</span>
              </div>
              <div className="pair-role">
                You are{" "}
                <strong className="pair-role-active">
                  {(half === 0 && myPair[0] === myName.trim()) ||
                  (half === 1 && myPair[1] === myName.trim())
                    ? "DRIVING"
                    : "NAVIGATING"}
                </strong>
              </div>
              <div className="pair-countdown">
                flip in {formatClock(Math.ceil(nextFlipMs / 1000))}
              </div>
            </div>
          )}
          <div className="pair-list">
            {sprint.pairs.map(([a, b]) => {
              const driver = half === 0 ? a : b;
              const isMine = a === myName.trim() || b === myName.trim();
              return (
                <div
                  key={pairKey(a, b)}
                  className={"pair-card pair-card-active" + (isMine ? " pair-card-mine" : "")}
                >
                  <span>
                    <strong>{driver}</strong> drives — <em>{driver === a ? b : a}</em> navigates
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function maybeVibrate(pattern: number[]) {
  try {
    if (typeof navigator.vibrate === "function") navigator.vibrate(pattern);
  } catch {
    /* noop */
  }
}

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
