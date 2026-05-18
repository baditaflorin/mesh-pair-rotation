type Props = {
  name: string;
  onNameChange: (next: string) => void;
  flipIntervalMin: number;
  onFlipIntervalMinChange: (next: number) => void;
  lookbackWeeks: number;
  onLookbackWeeksChange: (next: number) => void;
};

export function SettingsExtras({
  name,
  onNameChange,
  flipIntervalMin,
  onFlipIntervalMinChange,
  lookbackWeeks,
  onLookbackWeeksChange,
}: Props) {
  return (
    <>
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
        history older than K weeks is still considered, just outranked by anyone who's never paired.
      </p>
    </>
  );
}
