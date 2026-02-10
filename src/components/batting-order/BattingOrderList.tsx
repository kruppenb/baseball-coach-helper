import type { Player } from '../../types/index';
import styles from './BattingOrderList.module.css';

interface BattingOrderListProps {
  order: string[];
  players: Player[];
}

export function BattingOrderList({ order, players }: BattingOrderListProps) {
  const playerMap = new Map(players.map((p) => [p.id, p]));

  return (
    <ol className={styles.list}>
      {order.map((playerId, index) => {
        const player = playerMap.get(playerId);
        const name = player?.name ?? 'Unknown';

        return (
          <li key={playerId} className={styles.item}>
            <span className={styles.position}>{index + 1}</span>
            <span className={styles.name}>{name}</span>
          </li>
        );
      })}
    </ol>
  );
}
