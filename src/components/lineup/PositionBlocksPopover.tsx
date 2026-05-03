import { useEffect, useState } from 'react';
import type { Player, Position, PositionBlocks as PositionBlocksType } from '../../types';
import { getPositions } from '../../types';
import { useGameConfig } from '../../hooks/useGameConfig';
import styles from './PositionBlocksPopover.module.css';

interface PositionBlocksPopoverProps {
  presentPlayers: Player[];
  positionBlocks: PositionBlocksType;
  onToggleBlock: (playerId: string, position: Position) => void;
}

export function PositionBlocksPopover({
  presentPlayers,
  positionBlocks,
  onToggleBlock,
}: PositionBlocksPopoverProps) {
  const { config } = useGameConfig();
  const positions = getPositions(config.division);
  const [isOpen, setIsOpen] = useState(false);

  const totalBlocked = Object.values(positionBlocks).reduce(
    (sum, list) => sum + list.length,
    0,
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        className={`${styles.trigger}${totalBlocked > 0 ? ` ${styles.triggerActive}` : ''}`}
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span>Position Blocks</span>
        {totalBlocked > 0 && (
          <span className={styles.count} aria-label={`${totalBlocked} active`}>
            {totalBlocked}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={styles.backdrop}
          onClick={() => setIsOpen(false)}
          role="presentation"
        >
          <div
            className={styles.popover}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Position blocks"
          >
            <div className={styles.popoverHeader}>
              <span className={styles.popoverTitle}>Position Blocks</span>
              <button
                type="button"
                className={styles.popoverClose}
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <p className={styles.hint}>
              Tap a position to block a player from playing there.
            </p>

            {presentPlayers.length === 0 ? (
              <p className={styles.empty}>
                Mark players as present on the Game Setup tab first.
              </p>
            ) : (
              <div className={styles.body}>
                {presentPlayers.map((player) => (
                  <div key={player.id} className={styles.playerRow}>
                    <span className={styles.playerName}>{player.name}</span>
                    <div className={styles.chips}>
                      {positions.map((position) => {
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
            )}
          </div>
        </div>
      )}
    </>
  );
}
