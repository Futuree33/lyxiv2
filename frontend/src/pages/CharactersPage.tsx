import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Globe, Lock, Heart, TrendingUp, Star } from 'lucide-react';
import { useCharacters } from '../context/CharactersContext';
import { Avatar } from '../components/Avatar';
import { NewCompanionModal } from '../components/NewCompanionModal';
import { PublicCharacterPreviewModal } from '../components/PublicCharacterPreviewModal';
import { api, type Character } from '../lib/api';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getRelationshipLevel(exp: number = 0): number {
  return Math.floor(exp / 10) + 1;
}

export function CharactersPage() {
  const { characters, error } = useCharacters();
  const [showModal, setShowModal] = useState(false);
  const [cloneSource, setCloneSource] = useState<Character | null>(null);
  const [publicCharacters, setPublicCharacters] = useState<Character[] | null>(null);
  const [topCharacterId, setTopCharacterId] = useState<number | null>(null);
  const [previewCharacter, setPreviewCharacter] = useState<Character | null>(null);

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
    setPreviewCharacter(char);
  };

  const handleCustomizeCharacter = (char: Character) => {
    setCloneSource(char);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCloneSource(null);
  };

  const handleClosePreview = () => {
    setPreviewCharacter(null);
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

  // Show Hero section if no characters, otherwise show dashboard
  if (characters !== null && characters.length === 0) {
    return (
      <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 md:px-10">
        {/* Hero Section for New Users */}
        <div className="flex min-h-[70vh] flex-col items-center justify-center text-center animate-fade-in-up">
          <div className="mb-8 animate-float text-8xl">✨</div>
          <h1 className="font-display text-5xl font-bold text-ink mb-4 bg-gradient-to-r from-accent via-accent-2 to-accent bg-clip-text text-transparent md:text-6xl">
            Your AI Companions Await
          </h1>
          <p className="max-w-2xl text-xl text-muted mb-8 leading-relaxed">
            Create personalized AI companions with unique personalities, appearances, and backstories.
            Chat, generate scenes, and build meaningful connections.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="button-glow button-scale rounded-xl bg-gradient-to-r from-accent via-accent-2 to-accent animate-gradient px-8 py-4 text-lg font-bold text-white shadow-2xl shadow-accent/40 transition-all hover:shadow-3xl hover:shadow-accent/50"
          >
            Create Your First Companion
          </button>

          {/* Feature highlights */}
          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3 w-full max-w-4xl">
            <div className="rounded-xl border border-hairline bg-surface p-6 text-center">
              <div className="mb-3 text-3xl">💬</div>
              <h3 className="font-semibold text-ink mb-2">Dynamic Conversations</h3>
              <p className="text-sm text-muted">Chat naturally with AI companions that remember your history</p>
            </div>
            <div className="rounded-xl border border-hairline bg-surface p-6 text-center">
              <div className="mb-3 text-3xl">🎨</div>
              <h3 className="font-semibold text-ink mb-2">AI Scene Generation</h3>
              <p className="text-sm text-muted">Generate beautiful images of your companions in any scenario</p>
            </div>
            <div className="rounded-xl border border-hairline bg-surface p-6 text-center">
              <div className="mb-3 text-3xl">✨</div>
              <h3 className="font-semibold text-ink mb-2">Fully Customizable</h3>
              <p className="text-sm text-muted">Design every detail from appearance to personality traits</p>
            </div>
          </div>
        </div>

        {showModal && <NewCompanionModal onClose={handleCloseModal} prefillData={cloneSource} />}
      </div>
    );
  }

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
        ) : (
          <div className="space-y-6">
            {/* Top Character - Featured Card */}
            {characters.find((c) => c.id === topCharacterId) && (
              <Link
                to={`/chat/${topCharacterId}`}
                className="card-hover group relative block overflow-hidden rounded-2xl border-2 border-accent bg-gradient-to-br from-accent/10 via-surface to-accent-2/10 p-6 shadow-2xl shadow-accent/20 transition-all hover:shadow-3xl hover:shadow-accent/30 animate-fade-in-up"
              >
                <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br from-accent/30 to-accent-2/30 blur-3xl" />
                <div className="absolute -left-6 -bottom-6 h-32 w-32 rounded-full bg-gradient-to-br from-accent-2/30 to-accent/30 blur-3xl" />

                <div className="relative flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="flex items-center gap-4 flex-1">
                    {(() => {
                      const topChar = characters.find((c) => c.id === topCharacterId)!;
                      return (
                        <>
                          {topChar.avatarUrl ? (
                            <div className="relative">
                              <img
                                src={topChar.avatarUrl}
                                alt={topChar.name}
                                className="h-20 w-20 rounded-full object-cover ring-4 ring-accent shadow-2xl shadow-accent/40 transition-transform group-hover:scale-110 group-hover:rotate-3"
                              />
                              <div className="absolute -top-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-sm shadow-lg animate-pulse">
                                ⭐
                              </div>
                            </div>
                          ) : (
                            <div className="h-20 w-20">
                              <Avatar name={topChar.name} />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h2 className="truncate text-2xl font-bold text-accent transition-all group-hover:text-accent-2">
                                {topChar.name}
                              </h2>
                              <span className="shrink-0 rounded-full bg-gradient-to-r from-accent to-accent-2 px-2 py-0.5 text-xs font-bold text-white shadow-md">
                                Featured
                              </span>
                            </div>
                            <p className="line-clamp-2 text-sm text-muted mb-3">{topChar.persona}</p>

                            <div className="flex flex-wrap gap-3">
                              <div className="flex items-center gap-1.5 rounded-full bg-surface/80 px-3 py-1 text-sm backdrop-blur-sm">
                                <Heart size={14} className="text-danger" />
                                <span className="font-semibold text-ink">Level {getRelationshipLevel(topChar.exp || 0)}</span>
                              </div>
                              <div className="flex items-center gap-1.5 rounded-full bg-surface/80 px-3 py-1 text-sm backdrop-blur-sm">
                                <TrendingUp size={14} className="text-accent" />
                                <span className="text-muted">{topChar.exp || 0} EXP</span>
                              </div>
                              {topChar.isPublic && (topChar.cloneCount || 0) > 0 && (
                                <div className="flex items-center gap-1.5 rounded-full bg-surface/80 px-3 py-1 text-sm backdrop-blur-sm">
                                  <Users size={14} className="text-presence" />
                                  <span className="text-muted">{topChar.cloneCount} clones</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleToggleVisibility(characters.find((c) => c.id === topCharacterId)!, e)}
                      className="button-scale rounded-full bg-surface/80 p-3 backdrop-blur-sm transition hover:bg-surface hover:scale-110"
                      title={characters.find((c) => c.id === topCharacterId)?.isPublic ? 'Make private' : 'Make public'}
                    >
                      {characters.find((c) => c.id === topCharacterId)?.isPublic ? (
                        <Globe size={18} className="text-presence" />
                      ) : (
                        <Lock size={18} className="text-faint" />
                      )}
                    </button>
                    <span className="rounded-full bg-gradient-to-r from-accent to-accent-2 px-6 py-3 text-sm font-bold text-white shadow-lg opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:shadow-xl">
                      Continue →
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* Other Characters Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {characters.filter((c) => c.id !== topCharacterId).map((c, index) => (
                <Link
                  key={c.id}
                  to={`/chat/${c.id}`}
                  className="card-hover group relative flex flex-col gap-3 rounded-xl border border-hairline bg-surface p-4 transition-all hover:border-accent/40 hover:shadow-lg hover:shadow-accent/10"
                  style={{ animationDelay: `${(index + 1) * 50}ms` }}
                >
                  <div className="flex items-center gap-3">
                    {c.avatarUrl ? (
                      <img
                        src={c.avatarUrl}
                        alt={c.name}
                        className="h-12 w-12 rounded-full object-cover ring-2 ring-accent/20 transition-all group-hover:ring-accent/40 group-hover:scale-105"
                      />
                    ) : (
                      <Avatar name={c.name} />
                    )}
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-medium text-ink transition-colors group-hover:text-accent">
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

                  <div className="flex flex-wrap gap-2 mt-1">
                    <div className="flex items-center gap-1 rounded-full bg-surface-raised px-2 py-0.5 text-xs text-muted">
                      <Heart size={10} className="text-danger" />
                      <span>Lvl {getRelationshipLevel(c.exp || 0)}</span>
                    </div>
                    {c.isPublic && (c.cloneCount || 0) > 0 && (
                      <div className="flex items-center gap-1 rounded-full bg-surface-raised px-2 py-0.5 text-xs text-presence">
                        <Users size={10} />
                        <span>{c.cloneCount} clones</span>
                      </div>
                    )}
                  </div>

                  <span className="mt-auto text-sm font-medium text-accent opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1">
                    Continue chat →
                  </span>
                </Link>
              ))}
            </div>
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
            {publicCharacters.map((c, index) => {
              const isFeatured = (c.cloneCount || 0) >= 5;
              return (
                <div
                  key={c.id}
                  onClick={() => handleClone(c)}
                  className={`card-hover group relative flex flex-col gap-3 rounded-xl border p-4 transition-all cursor-pointer ${
                    isFeatured
                      ? 'border-accent/40 bg-gradient-to-br from-accent/5 to-accent-2/5 shadow-md shadow-accent/10'
                      : 'border-hairline bg-surface hover:border-accent/30'
                  }`}
                  style={{ animationDelay: `${(index + 5) * 50}ms` }}
                >
                  {isFeatured && (
                    <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-xs shadow-lg animate-pulse">
                      ✨
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    {c.avatarUrl ? (
                      <img
                        src={c.avatarUrl}
                        alt={c.name}
                        className="h-12 w-12 rounded-full object-cover ring-2 ring-accent/20 transition-all group-hover:scale-110 group-hover:ring-accent/40 group-hover:shadow-lg group-hover:shadow-accent/20"
                      />
                    ) : (
                      <div className="h-12 w-12">
                        <Avatar name={c.name} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-medium text-ink group-hover:text-accent transition-colors">
                        {c.name}
                      </h3>
                      <p className="text-xs text-faint">{formatDate(c.createdAt)}</p>
                    </div>
                  </div>

                  <p className="line-clamp-2 text-sm text-muted group-hover:text-ink transition-colors">{c.persona}</p>

                  <div className="flex flex-wrap gap-2">
                    {getRelationshipLevel(c.exp || 0) > 1 && (
                      <div className="flex items-center gap-1 rounded-full bg-surface-raised px-2 py-0.5 text-xs text-muted">
                        <Star size={10} className="text-accent" />
                        <span>Lvl {getRelationshipLevel(c.exp || 0)}</span>
                      </div>
                    )}
                    {(c.cloneCount || 0) > 0 && (
                      <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                        isFeatured ? 'bg-accent/20 text-accent font-medium' : 'bg-surface-raised text-faint'
                      }`}>
                        <Users size={10} />
                        <span>{c.cloneCount} clones</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {showModal && <NewCompanionModal onClose={handleCloseModal} prefillData={cloneSource} />}
      {previewCharacter && (
        <PublicCharacterPreviewModal
          character={previewCharacter}
          onClose={handleClosePreview}
          onCustomize={handleCustomizeCharacter}
        />
      )}
    </div>
  );
}
