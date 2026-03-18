import { useCloudStorage } from '../sync/useCloudStorage';
import type { GameConfig, Division } from '../types';

const defaultConfig: GameConfig = { division: 'AAA', innings: 5, pitchersPerGame: 3, catchersPerGame: 3 };

/** Maps division to its default inning count per VLL Local Rules */
const DIVISION_INNINGS: Record<Division, number> = {
  AAA: 5,
  Coast: 6,
  AA: 4,
};

export function useGameConfig() {
  const [stored, setConfig] = useCloudStorage<GameConfig>('gameConfig', defaultConfig, { endpoint: '/api/game-config', mode: 'singleton' });

  // Backward compatibility: older saved configs may lack the new fields.
  // Always derive innings from division — it's not independently configurable.
  const config: GameConfig = {
    ...defaultConfig,
    ...stored,
    innings: DIVISION_INNINGS[stored?.division ?? defaultConfig.division],
  };

  const setDivision = (division: Division) => {
    setConfig({ ...config, division, innings: DIVISION_INNINGS[division] });
  };

  const setPitchersPerGame = (value: number) => {
    setConfig({ ...config, pitchersPerGame: value });
  };

  const setCatchersPerGame = (value: number) => {
    setConfig({ ...config, catchersPerGame: value });
  };

  return { config, setDivision, setPitchersPerGame, setCatchersPerGame };
}
