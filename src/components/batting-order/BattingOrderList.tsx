import { getBand } from '../../logic/batting-order';
import type { Player } from '../../types/index';
import styles from './BattingOrderList.module.css';

interface BattingOrderListProps {
  order: string[];
  players: Player[];
}

const bandStyleMap: Record<string, string> = {
  top: styles.top,
  middle: styles.middle,
  bottom: styles.bottom,
};

export function BattingOrderList({ order, players }: BattingOrderListProps) {
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const totalPlayers = order.length;

  return (
    <ol className={styles.list}>
      {order.map((playerId, index) => {
        const player = playerMap.get(playerId);
        const name = player?.name ?? 'Unknown';
        const band = getBand(index, totalPlayers);

        return (
          <li key={playerId} className={styles.item}>
            <span className={styles.position}>{index + 1}</span>
            <span className={styles.name}>{name}</span>
            <span className={`${styles.bandLabel} ${bandStyleMap[band]}`}>
              {band}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
