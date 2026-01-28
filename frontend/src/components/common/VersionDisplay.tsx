import { useGameStore } from '../../state/gameStore';
import packageJson from '../../../package.json';
import './VersionDisplay.css';

export const VersionDisplay = () => {
  const gameId = useGameStore((state) => state.gameId);

  return (
    <div className="version-display">
      v{packageJson.version}
      {gameId && (
        <span
          className="game-id-badge"
          title={`Game ID: ${gameId} (click to copy)`}
          onClick={() => navigator.clipboard.writeText(gameId)}
          style={{
            marginLeft: '1rem',
            padding: '2px 6px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: '0.7rem',
            opacity: 0.6,
          }}
        >
          #{gameId.substring(0, 6)}
        </span>
      )}
    </div>
  );
};
