export interface Player {
  id: string;
  name: string;
  isPresent: boolean;
}

export interface GameConfig {
  innings: 5 | 6;
}

export type TabId = 'roster' | 'game-setup' | 'lineup' | 'history';
