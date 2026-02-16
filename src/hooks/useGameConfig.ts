import { useCloudStorage } from '../sync/useCloudStorage';
import type { GameConfig } from '../types';

const defaultConfig: GameConfig = { innings: 6, pitchersPerGame: 3, catchersPerGame: 3 };

export function useGameConfig() {
  const [stored, setConfig] = useCloudStorage<GameConfig>('gameConfig', defaultConfig, { endpoint: '/api/game-config', mode: 'singleton' });

  // Backward compatibility: older saved configs may lack the new fields
  const config: GameConfig = {
    ...defaultConfig,
    ...stored,
  };

  const setInnings = (value: 5 | 6) => {
    setConfig({ ...config, innings: value });
  };

  const setPitchersPerGame = (value: number) => {
    setConfig({ ...config, pitchersPerGame: value });
  };

  const setCatchersPerGame = (value: number) => {
    setConfig({ ...config, catchersPerGame: value });
  };

  return { config, setInnings, setPitchersPerGame, setCatchersPerGame };
}
