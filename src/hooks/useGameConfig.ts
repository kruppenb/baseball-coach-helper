import { useCloudStorage } from '../sync/useCloudStorage';
import type { GameConfig, Division } from '../types';

const defaultConfig: GameConfig = { division: 'AAA', innings: 5, pitchersPerGame: 3, catchersPerGame: 3 };

/** Maps division to its default inning count per VLL Local Rules */
const DIVISION_INNINGS: Record<Division, 5 | 6> = {
  AAA: 5,
  Coast: 6,
};

export function useGameConfig() {
  const [stored, setConfig] = useCloudStorage<GameConfig>('gameConfig', defaultConfig, { endpoint: '/api/game-config', mode: 'singleton' });

  // Backward compatibility: older saved configs may lack the new fields
  const config: GameConfig = {
    ...defaultConfig,
    ...stored,
  };

  const setDivision = (division: Division) => {
    setConfig({ ...config, division, innings: DIVISION_INNINGS[division] });
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

  return { config, setDivision, setInnings, setPitchersPerGame, setCatchersPerGame };
}
