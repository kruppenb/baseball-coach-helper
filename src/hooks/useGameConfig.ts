import { useCloudStorage } from '../sync/useCloudStorage';
import type { GameConfig } from '../types';

export function useGameConfig() {
  const [config, setConfig] = useCloudStorage<GameConfig>('gameConfig', { innings: 6 }, { endpoint: '/api/game-config', mode: 'singleton' });

  const setInnings = (value: 5 | 6) => {
    setConfig({ ...config, innings: value });
  };

  return { config, setInnings };
}
