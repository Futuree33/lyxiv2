import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Users, Globe, Lock } from 'lucide-react';
import { useCharacters } from '../context/CharactersContext';
import { Avatar } from '../components/Avatar';
import { NewCompanionModal } from '../components/NewCompanionModal';
import { api, type Character } from '../lib/api';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function CharactersPage() {
  const { characters, error } = useCharacters();
  const [showModal, setShowModal] = useState(false);
  const [cloneSource, setCloneSource] = useState<Character | null>(null);
  const [publicCharacters, setPublicCharacters] = useState<Character[] | null>(null);
  const [topCharacterId, setTopCharacterId] = useState<number | null>(null);

  useEffect(() => {
    api
      .getPublicCharacters()
      .then(setPublicCharacters)
      .catch((err) => console.error('Failed to load public characters:', err));
  }, []);

  // Determine top character (most recently chatted with)
  useEffect(() => {
    if (characters && characters.length > 0) {
      // For now, use the first character as top. In production, you'd query message counts
      // or last interaction time from the backend
      setTopCharacterId(characters[0].id);
    }
  }, [characters]);

  const handleClone = (char: Character) => {
    setCloneSource(char);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCloneSource(null);
  };

  const handleToggleVisibility = async (char: Character, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation();

    try {
      const newVisibility = !char.isPublic;
      await api.updateCharacterVisibility(char.id, newVisibility);

      // Trigger a refetch
      window.location.reload();
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
      alert('Failed to update character visibility');
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 md:px-10">
      {/* Your Characters Section */}
      <section className="mb-12">
        <div className="mb-8 flex items-center justify-between gap-4 animate-fade-in-up">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink">Your Characters</h1>
            <p className="mt-1 text-sm text-muted">Manage your AI companions</p>
          </div>
          <button
            onClick={() => {
              setCloneSource(null);
              setShowModal(true);
            }}
            className="button-glow button-scale hidden shrink-0 rounded-lg bg-gradient-to-r from-accent via-accent-2 to-accent animate-gradient px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-accent/30 transition-all hover:shadow-xl hover:shadow-accent/40 sm:block"
          >
            + New Companion
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        {characters === null ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl border border-hairline bg-surface" />
            ))}
          </div>
        ) : characters.length === 0 ? (
          <div className="animate-fade-in-up flex flex-col items-center gap-5 rounded-2xl border border-dashed border-accent/30 bg-gradient-to-br from-accent/5 via-transparent to-accent-2/5 px-6 py-20 text-center shadow-lg">
            <div className="animate-float text-6xl">✨</div>
            <div>
              <p className="font-display text-2xl font-bold text-ink">No companions yet</p>
              <p className="mt-2 max-w-sm text-sm text-muted">
                Give your first companion a name and a personality, then start talking.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="button-glow button-scale rounded-lg bg-gradient-to-r from-accent via-accent-2 to-accent animate-gradient px-6 py-3 text-sm font-bold text-white shadow-xl shadow-accent/30 transition-all hover:shadow-2xl hover:shadow-accent/40"
            >
              Create your first companion
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {characters.map((c, index) => {
              const isTopCharacter = c.id === topCharacterId;
              return (
                <Link
                  key={c.id}
                  to={`/chat/${c.id}`}
                  className={`card-hover group relative flex flex-col gap-3 rounded-xl border p-4 transition ${
                    isTopCharacter
                      ? 'border-accent bg-gradient-to-br from-surface via-surface to-accent/5 shadow-lg shadow-accent/10 ring-2 ring-accent/30'
                      : 'border-hairline bg-surface'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                {isTopCharacter && (
                  <div className="absolute -right-2 -top-2 rounded-full bg-gradient-to-r from-accent to-accent-2 px-3 py-1 text-xs font-bold text-white shadow-lg shadow-accent/50 animate-fade-in-up">
                    ⭐ Top
                  </div>
                )}
                <div className="flex items-center gap-3">
                  {c.avatarUrl ? (
                    <img
                      src={c.avatarUrl}
                      alt={c.name}
                      className={`h-12 w-12 rounded-full object-cover ring-2 transition-all ${
                        isTopCharacter ? 'ring-accent shadow-lg shadow-accent/30' : 'ring-accent/20'
                      }`}
                    />
                  ) : (
                    <Avatar name={c.name} />
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className={`truncate font-medium ${isTopCharacter ? 'text-accent' : 'text-ink'}`}>
                      {c.name}
                    </h2>
                    <p className="text-xs text-faint">Since {formatDate(c.createdAt)}</p>
                  </div>
                  <button
                    onClick={(e) => handleToggleVisibility(c, e)}
                    className="button-scale shrink-0 rounded-full bg-surface-raised p-2 transition hover:bg-hairline hover:scale-110"
                    title={c.isPublic ? 'Make private' : 'Make public'}
                  >
                    {c.isPublic ? (
                      <Globe size={16} className="text-presence" />
                    ) : (
                      <Lock size={16} className="text-faint" />
                    )}
                  </button>
                </div>
                <p className="line-clamp-2 text-sm text-muted">{c.persona}</p>
                {c.isPublic && (c.cloneCount || 0) > 0 && (
                  <div className="flex items-center gap-1 text-xs text-presence">
                    <Users size={12} />
                    <span>Cloned {c.cloneCount || 0} times</span>
                  </div>
                )}
                <span className="mt-auto text-sm font-medium text-accent opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1">
                  Continue chat →
                </span>
              </Link>
            );
          })}
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="relative mb-12 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-hairline" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-void px-6 py-1 text-sm font-semibold text-muted rounded-full border border-hairline shadow-lg">
            ✨ Public Library
          </span>
        </div>
      </div>

      {/* Public Characters Section */}
      <section>
        <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <h2 className="font-display text-2xl font-bold text-ink">Discover Characters</h2>
          <p className="mt-1 text-sm text-muted">
            Browse and clone popular companions created by the community
          </p>
        </div>

        {publicCharacters === null ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl border border-hairline bg-surface" />
            ))}
          </div>
        ) : publicCharacters.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-hairline px-6 py-16 text-center">
            <p className="font-display text-lg text-ink">No public characters yet</p>
            <p className="max-w-sm text-sm text-muted">
              Be the first to make your companion public for others to discover!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {publicCharacters.map((c, index) => (
              <div
                key={c.id}
                className="card-hover group relative flex flex-col gap-3 rounded-xl border border-hairline bg-surface p-4 transition"
                style={{ animationDelay: `${(index + 5) * 50}ms` }}
              >
                <div className="flex items-center gap-3">
                  {c.avatarUrl ? (
                    <img
                      src={c.avatarUrl}
                      alt={c.name}
                      className="h-12 w-12 rounded-full object-cover ring-2 ring-accent/20 transition-transform group-hover:scale-110 group-hover:ring-accent/40"
                    />
                  ) : (
                    <Avatar name={c.name} />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium text-ink group-hover:text-accent transition-colors">
                      {c.name}
                    </h3>
                    <p className="text-xs text-faint">{formatDate(c.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => handleClone(c)}
                    className="button-scale shrink-0 rounded-full bg-gradient-to-br from-accent/10 to-accent-2/10 p-2 text-accent transition-all hover:from-accent/20 hover:to-accent-2/20 hover:shadow-lg hover:shadow-accent/20"
                    title="Clone this character"
                  >
                    <Copy size={16} />
                  </button>
                </div>
                <p className="line-clamp-2 text-sm text-muted">{c.persona}</p>
                {(c.cloneCount || 0) > 0 && (
                  <div className="flex items-center gap-1 text-xs text-faint">
                    <Users size={12} />
                    <span>Cloned {c.cloneCount || 0} times</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {showModal && <NewCompanionModal onClose={handleCloseModal} prefillData={cloneSource} />}
    </div>
  );
}
