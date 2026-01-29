import { useGameStore } from '../../state/gameStore';
import './WaveInfo.css';

export const WaveInfo = () => {
  const wave = useGameStore((state) => state.wave);
  const isPlaying = useGameStore((state) => state.isPlaying);
  const gameSpeed = useGameStore((state) => state.gameSpeed);

  return (
    <div className="wave-info">
      <div className="wave-number">
        <span className="wave-label">WAVE</span>
        <span className="wave-value">{wave}</span>
        <span className="wave-label">of ∞</span>
      </div>
      {isPlaying && (
        <div className={`wave-status active ${gameSpeed === 3 ? 'fast' : ''}`}>In Progress</div>
      )}
      {!isPlaying && wave > 0 && <div className="wave-status complete">Complete</div>}
    </div>
  );
};
