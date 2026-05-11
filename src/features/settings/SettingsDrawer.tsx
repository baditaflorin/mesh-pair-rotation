import { useEffect, useState } from "react";
import {
  loadSignalingUrl,
  loadTurnTokenUrl,
  resetIceServers,
  saveSignalingUrl,
  saveTurnTokenUrl,
} from "../sync/iceConfig";
import { appConfig } from "../../shared/config";

type Props = {
  open: boolean;
  onClose: () => void;
  roomId: string;
  onRoomChange: (next: string) => void;
  name: string;
  onNameChange: (next: string) => void;
  flipIntervalMin: number;
  onFlipIntervalMinChange: (next: number) => void;
  lookbackWeeks: number;
  onLookbackWeeksChange: (next: number) => void;
};

export function SettingsDrawer({
  open,
  onClose,
  roomId,
  onRoomChange,
  name,
  onNameChange,
  flipIntervalMin,
  onFlipIntervalMinChange,
  lookbackWeeks,
  onLookbackWeeksChange,
}: Props) {
  const [signaling, setSignaling] = useState(loadSignalingUrl());
  const [tokenUrl, setTokenUrl] = useState(loadTurnTokenUrl());

  useEffect(() => {
    if (open) {
      setSignaling(loadSignalingUrl());
      setTokenUrl(loadTurnTokenUrl());
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-drawer" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>Settings</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <label>
          <span>Room ID</span>
          <input value={roomId} onChange={(e) => onRoomChange(e.target.value)} />
        </label>

        <label>
          <span>Your name</span>
          <input value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="Alex" />
        </label>

        <label>
          <span>Flip interval (minutes)</span>
          <input
            type="number"
            min={5}
            max={120}
            step={5}
            value={flipIntervalMin}
            onChange={(e) => onFlipIntervalMinChange(Math.max(5, Number(e.target.value) || 25))}
          />
        </label>

        <label>
          <span>Lookback (weeks) for "freshness" scoring</span>
          <input
            type="number"
            min={1}
            max={52}
            value={lookbackWeeks}
            onChange={(e) => onLookbackWeeksChange(Math.max(1, Number(e.target.value) || 8))}
          />
        </label>

        <p className="settings-help">
          The matcher prefers pairings that have been apart the longest. Lookback is a soft hint —
          history older than K weeks is still considered, just outranked by anyone who's never
          paired.
        </p>

        <hr />

        <h3>Self-hosted infra (advanced)</h3>
        <p className="settings-help">
          Override the default signaling and TURN endpoints. Leave blank to use the built-in
          defaults (<code>{appConfig.signalingUrl}</code> and <code>{appConfig.turnTokenUrl}</code>
          ).
        </p>

        <label>
          <span>Signaling URL</span>
          <input
            value={signaling}
            onChange={(e) => setSignaling(e.target.value)}
            placeholder={appConfig.signalingUrl}
          />
        </label>

        <label>
          <span>TURN credentials URL</span>
          <input
            value={tokenUrl}
            onChange={(e) => setTokenUrl(e.target.value)}
            placeholder={appConfig.turnTokenUrl}
          />
        </label>

        <div className="settings-actions">
          <button
            type="button"
            onClick={() => {
              saveSignalingUrl(signaling);
              saveTurnTokenUrl(tokenUrl);
              onClose();
              location.reload();
            }}
          >
            Save and reload
          </button>
          <button
            type="button"
            onClick={() => {
              saveSignalingUrl("");
              saveTurnTokenUrl("");
              resetIceServers();
              onClose();
              location.reload();
            }}
          >
            Reset to defaults
          </button>
        </div>

        <hr />

        <footer className="settings-footer">
          <a href={appConfig.repositoryUrl} target="_blank" rel="noreferrer">
            source on github
          </a>
          <span>
            v{appConfig.version} · {appConfig.commit}
          </span>
        </footer>
      </div>
    </div>
  );
}
