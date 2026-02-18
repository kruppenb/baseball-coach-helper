import { useDraggable, useDroppable } from '@dnd-kit/react';
import styles from './DraggableLineupGrid.module.css';

interface BenchPlayerChipProps {
  inning: number;
  playerId: string;
  playerName: string;
}

export function BenchPlayerChip({
  inning,
  playerId,
  playerName,
}: BenchPlayerChipProps) {
  const { ref: dragRef, isDragSource } = useDraggable({
    id: `bench-drag-${inning}-${playerId}`,
    data: { inning, playerId, playerName, isBench: true },
  });

  const { ref: dropRef, isDropTarget } = useDroppable({
    id: `bench-drop-${inning}-${playerId}`,
    data: { inning, playerId, isBench: true },
    accept: (source) =>
      source?.data?.inning === inning && !source?.data?.isBench,
  });

  const chipClass = [
    styles.benchChip,
    isDragSource ? styles.benchChipDragging : '',
    isDropTarget ? styles.benchDropTarget : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={dropRef} className={chipClass}>
      <div ref={dragRef} className={styles.benchChipInner}>
        <span className={styles.dragHandle} aria-label="Drag to swap position">
          &#x2630;
        </span>
        <span>{playerName}</span>
      </div>
    </div>
  );
}
