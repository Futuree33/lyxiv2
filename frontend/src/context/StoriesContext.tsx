import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError, type Story } from '../lib/api';

interface StoriesContextValue {
  stories: Story[] | null;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const StoriesContext = createContext<StoriesContextValue | null>(null);

export function StoriesProvider({ children }: { children: ReactNode }) {
  const [stories, setStories] = useState<Story[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.listMyStories();
      setStories(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load stories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <StoriesContext.Provider value={{ stories, error, loading, refresh }}>
      {children}
    </StoriesContext.Provider>
  );
}

export function useStories() {
  const ctx = useContext(StoriesContext);
  if (!ctx) throw new Error('useStories must be used within StoriesProvider');
  return ctx;
}
