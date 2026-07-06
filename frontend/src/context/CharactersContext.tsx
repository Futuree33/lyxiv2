import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError, type Character } from '../lib/api';

interface CharactersContextValue {
  characters: Character[] | null;
  error: string | null;
  refresh: () => Promise<void>;
  createCharacter: (data: Omit<Character, 'id' | 'createdAt'>) => Promise<Character>;
}

const CharactersContext = createContext<CharactersContextValue | null>(null);

export function CharactersProvider({ children }: { children: ReactNode }) {
  const [characters, setCharacters] = useState<Character[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setCharacters(await api.listCharacters());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load companions');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function createCharacter(data: Omit<Character, 'id' | 'createdAt'>) {
    const character = await api.createCharacter(data);
    setCharacters((prev) => (prev ? [character, ...prev] : [character]));
    return character;
  }

  return (
    <CharactersContext.Provider value={{ characters, error, refresh, createCharacter }}>
      {children}
    </CharactersContext.Provider>
  );
}

export function useCharacters() {
  const ctx = useContext(CharactersContext);
  if (!ctx) throw new Error('useCharacters must be used within CharactersProvider');
  return ctx;
}
