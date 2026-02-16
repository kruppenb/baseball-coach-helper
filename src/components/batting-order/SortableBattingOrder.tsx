import { DragDropProvider } from '@dnd-kit/react';
import { isSortable } from '@dnd-kit/react/sortable';
import { SortableItem } from './SortableItem';
import type { Player } from '../../types/index';
import styles from './SortableBattingOrder.module.css';

interface SortableBattingOrderProps {
  order: string[];
  players: Player[];
  onReorder: (newOrder: string[]) => void;
}

export function SortableBattingOrder({
  order,
  players,
  onReorder,
}: SortableBattingOrderProps) {
  const playerMap = new Map(players.map(p => [p.id, p]));

  function handleDragEnd(
    event: Parameters<
      NonNullable<
        React.ComponentProps<typeof DragDropProvider>['onDragEnd']
      >
    >[0],
  ) {
    if (event.canceled) return;

    const { source } = event.operation;

    if (isSortable(source)) {
      const fromIndex = source.sortable.initialIndex;
      const toIndex = source.index;
      if (fromIndex !== toIndex) {
        const newOrder = [...order];
        const [removed] = newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, removed);
        onReorder(newOrder);
      }
    }
  }

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      <ol className={styles.list}>
        {order.map((playerId, index) => (
          <SortableItem
            key={playerId}
            id={playerId}
            index={index}
            name={playerMap.get(playerId)?.name ?? 'Unknown'}
          />
        ))}
      </ol>
    </DragDropProvider>
  );
}
