import { useEffect, useState } from "react";
import { PairView } from "./features/pair/Pair";
import { SettingsDrawer } from "./features/settings/SettingsDrawer";
import { appConfig } from "./shared/config";

const STORAGE = {
  room: `${appConfig.storagePrefix}:room`,
  name: `${appConfig.storagePrefix}:name`,
  flipMin: `${appConfig.storagePrefix}:flipIntervalMin`,
  lookback: `${appConfig.storagePrefix}:lookbackWeeks`,
};

function readString(key: string, fallback: string): string {
  return localStorage.getItem(key) ?? fallback;
}
function readNumber(key: string, fallback: number): number {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function App() {
  const [roomId, setRoomId] = useState(() => readString(STORAGE.room, "default"));
  const [name, setName] = useState(() => readString(STORAGE.name, ""));
  const [flipIntervalMin, setFlipIntervalMin] = useState(() => readNumber(STORAGE.flipMin, 25));
  const [lookbackWeeks, setLookbackWeeks] = useState(() => readNumber(STORAGE.lookback, 8));
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE.room, roomId);
  }, [roomId]);
  useEffect(() => {
    localStorage.setItem(STORAGE.name, name);
  }, [name]);
  useEffect(() => {
    localStorage.setItem(STORAGE.flipMin, String(flipIntervalMin));
  }, [flipIntervalMin]);
  useEffect(() => {
    localStorage.setItem(STORAGE.lookback, String(lookbackWeeks));
  }, [lookbackWeeks]);

  return (
    <div className="app-root">
      <PairView
        roomId={roomId}
        myName={name}
        flipIntervalMin={flipIntervalMin}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <button
        type="button"
        className="settings-fab"
        onClick={() => setSettingsOpen(true)}
        aria-label="Open settings"
      >
        ⚙
      </button>

      <div className="self-ref">
        <a href={appConfig.repositoryUrl} target="_blank" rel="noreferrer">
          source
        </a>
        <span aria-hidden="true">·</span>
        <a href={appConfig.paypalUrl} target="_blank" rel="noreferrer">
          tip ♥
        </a>
        <span aria-hidden="true">·</span>
        <span>
          v{appConfig.version} · {appConfig.commit}
        </span>
      </div>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        roomId={roomId}
        onRoomChange={setRoomId}
        name={name}
        onNameChange={setName}
        flipIntervalMin={flipIntervalMin}
        onFlipIntervalMinChange={setFlipIntervalMin}
        lookbackWeeks={lookbackWeeks}
        onLookbackWeeksChange={setLookbackWeeks}
      />
    </div>
  );
}
