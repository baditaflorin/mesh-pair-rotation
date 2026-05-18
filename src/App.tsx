import { useEffect, useState } from "react";
import { MeshShell } from "@baditaflorin/mesh-common";
import { PairView } from "./features/pair/Pair";
import { SettingsExtras } from "./features/settings/SettingsExtras";
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
    <MeshShell
      config={appConfig}
      roomId={roomId}
      onRoomChange={setRoomId}
      settingsExtras={
        <SettingsExtras
          name={name}
          onNameChange={setName}
          flipIntervalMin={flipIntervalMin}
          onFlipIntervalMinChange={setFlipIntervalMin}
          lookbackWeeks={lookbackWeeks}
          onLookbackWeeksChange={setLookbackWeeks}
        />
      }
    >
      <PairView roomId={roomId} myName={name} flipIntervalMin={flipIntervalMin} />
    </MeshShell>
  );
}
