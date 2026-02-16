import { useDraggable, useDroppable } from '@dnd-kit/react';
import type { Position } from '../../types/index';
import styles from './DraggableLineupGrid.module.css';

interface DraggableCellProps {
  inning: number;
  position: Position;
  playerId: string;
  playerName: string;
  hasError: boolean;
}

export function DraggableCell({
  inning,
  position,
  playerId,
  playerName,
  hasError,
}: DraggableCellProps) {
  const { ref: dragRef, handleRef, isDragSource } = useDraggable({
    id: `drag-${inning}-${position}`,
    data: { inning, position, playerId, playerName },
  });

  const { ref: dropRef, isDropTarget } = useDroppable({
    id: `drop-${inning}-${position}`,
    data: { inning, position, playerId },
    accept: (source) => source?.data?.inning === inning,
  });

  const cellClass = [
    styles.cell,
    hasError ? styles.errorCell : '',
    isDropTarget ? styles.dropTarget : '',
  ]
    .filter(Boolean)
    .join(' ');

  const wrapperClass = [
    styles.draggableWrapper,
    isDragSource ? styles.dragging : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={dropRef} className={cellClass}>
      <div ref={dragRef} className={wrapperClass}>
        <span
          ref={handleRef}
          className={styles.dragHandle}
          aria-label="Drag to swap position"
        >
          &#x2630;
        </span>
        <span className={styles.playerName}>{playerName}</span>
      </div>
    </div>
  );
}
