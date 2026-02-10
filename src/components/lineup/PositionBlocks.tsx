import type { Player, Position, PositionBlocks as PositionBlocksType } from '../../types';
import { POSITIONS } from '../../types';
import styles from './PositionBlocks.module.css';

interface PositionBlocksProps {
  presentPlayers: Player[];
  positionBlocks: PositionBlocksType;
  onToggleBlock: (playerId: string, position: Position) => void;
}

export function PositionBlocks({
  presentPlayers,
  positionBlocks,
  onToggleBlock,
}: PositionBlocksProps) {
  const totalBlocked = Object.values(positionBlocks).reduce(
    (sum, positions) => sum + positions.length,
    0,
  );

  return (
    <div className={styles.positionBlocks}>
      <h3 className={styles.sectionTitle}>Position Blocks</h3>
      <p className={styles.hint}>
        Tap a position to block a player from playing there. Blocked positions
        show in red.
      </p>
      {presentPlayers.length === 0 ? (
        <p className={styles.hint}>
          Mark players as present on the Game Setup tab first.
        </p>
      ) : (
        <details className={styles.details}>
          <summary className={styles.summary}>
            Set position blocks ({totalBlocked} active)
          </summary>
          <div>
            {presentPlayers.map((player) => (
              <div key={player.id} className={styles.playerRow}>
                <span className={styles.playerName}>{player.name}</span>
                <div className={styles.chips}>
                  {POSITIONS.map((position) => {
                    const isBlocked =
                      positionBlocks[player.id]?.includes(position) ?? false;
                    return (
                      <button
                        key={position}
                        type="button"
                        aria-pressed={isBlocked}
                        className={`${styles.chip}${isBlocked ? ` ${styles.chipBlocked}` : ''}`}
                        onClick={() => onToggleBlock(player.id, position)}
                      >
                        {position}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
