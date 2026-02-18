import { useSortable } from '@dnd-kit/react/sortable';
import styles from './SortableBattingOrder.module.css';

interface SortableItemProps {
  id: string;
  index: number;
  name: string;
  lastPosition?: number;
}

export function SortableItem({ id, index, name, lastPosition }: SortableItemProps) {
  const { ref, isDragSource } = useSortable({ id, index });

  return (
    <li ref={ref} className={`${styles.item} ${isDragSource ? styles.dragging : ''}`}>
      <span className={styles.dragHandle} aria-label="Drag to reorder">
        &#x2630;
      </span>
      <span className={styles.position}>{index + 1}</span>
      <span className={styles.name}>{name}</span>
      {lastPosition != null && (
        <span className={styles.lastPos}>was #{lastPosition + 1}</span>
      )}
    </li>
  );
}
