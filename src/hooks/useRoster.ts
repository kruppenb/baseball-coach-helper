import { useLocalStorage } from './useLocalStorage';
import type { Player } from '../types';

function autoCapitalize(name: string): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function useRoster() {
  const [players, setPlayers] = useLocalStorage<Player[]>('roster', []);

  const sortedPlayers = [...players].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const addPlayer = (name: string): { success: boolean; error?: string } => {
    const capitalized = autoCapitalize(name.trim());
    if (capitalized === '') return { success: false, error: 'Name cannot be empty' };

    const isDuplicate = players.some(
      (p) => p.name.toLowerCase() === capitalized.toLowerCase()
    );
    if (isDuplicate) return { success: false, error: `${capitalized} is already on the roster` };

    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name: capitalized,
      isPresent: true,
    };
    setPlayers([...players, newPlayer]);
    return { success: true };
  };

  const renamePlayer = (id: string, newName: string) => {
    const capitalized = autoCapitalize(newName.trim());
    setPlayers(players.map((p) => (p.id === id ? { ...p, name: capitalized } : p)));
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter((p) => p.id !== id));
  };

  const togglePresent = (id: string) => {
    setPlayers(
      players.map((p) => (p.id === id ? { ...p, isPresent: !p.isPresent } : p))
    );
  };

  const resetAttendance = () => {
    setPlayers(players.map((p) => ({ ...p, isPresent: true })));
  };

  return {
    players: sortedPlayers,
    playerCount: players.length,
    presentCount: players.filter((p) => p.isPresent).length,
    addPlayer,
    renamePlayer,
    removePlayer,
    togglePresent,
    resetAttendance,
  };
}
