import { useLocalStorage } from './useLocalStorage';
import type { GameConfig } from '../types';

export function useGameConfig() {
  const [config, setConfig] = useLocalStorage<GameConfig>('gameConfig', { innings: 6 });

  const setInnings = (value: 5 | 6) => {
    setConfig({ ...config, innings: value });
  };

  return { config, setInnings };
}
