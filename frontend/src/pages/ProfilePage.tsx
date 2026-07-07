import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Trophy, Award, Heart, Users, Copy, Calendar } from 'lucide-react';
import { api, ApiError, type PublicProfile, type Character } from '../lib/api';
import { Avatar } from '../components/Avatar';
import { PublicCharacterPreviewModal } from '../components/PublicCharacterPreviewModal';
import { NewCompanionModal } from '../components/NewCompanionModal';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getRelationshipLevel(exp: number = 0): number {
  return Math.floor(exp / 10) + 1;
}

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewCharacter, setPreviewCharacter] = useState<Character | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [cloneSource, setCloneSource] = useState<Character | null>(null);

  useEffect(() => {
    if (!username) {
      setError('Invalid profile URL');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    api
      .getProfileByUsername(username)
      .then(setProfile)
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load profile');
        }
      })
      .finally(() => setLoading(false));
  }, [username]);

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

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 md:px-10">
        <div className="h-32 animate-pulse rounded-xl bg-surface mb-6" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 md:px-10">
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-hairline px-6 py-16 text-center">
          <User size={64} className="text-faint" />
          <div>
            <h1 className="font-display text-2xl font-bold text-ink mb-2">
              {error || 'Profile Not Found'}
            </h1>
            <p className="text-muted">
              {error === 'This profile is private'
                ? 'This user has chosen to keep their profile private.'
                : "The profile you're looking for doesn't exist or has been removed."}
            </p>
          </div>
          <Link
            to="/"
            className="button-scale rounded-lg bg-gradient-to-r from-accent to-accent-2 px-6 py-2 font-semibold text-white transition hover:shadow-lg"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const lyxiXpProgress = (profile.lyxiXp % 100);
  const creatorXpProgress = (profile.creatorXp % 200) / 2; // Scale to 100

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 md:px-10">
      {/* Profile Header */}
      <div className="mb-8 overflow-hidden rounded-2xl border-2 border-accent/20 bg-gradient-to-br from-accent/10 via-surface to-accent-2/10 p-8 shadow-lg animate-fade-in-up">
        <div className="relative">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-gradient-to-br from-accent/30 to-accent-2/30 blur-3xl" />
          <div className="absolute -left-8 -bottom-8 h-40 w-40 rounded-full bg-gradient-to-br from-accent-2/30 to-accent/30 blur-3xl" />

          <div className="relative">
            <div className="flex items-center gap-6 mb-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-4xl font-bold text-white shadow-2xl ring-4 ring-accent/20">
                {profile.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h1 className="font-display text-4xl font-bold text-ink mb-2">
                  {profile.username}
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Calendar size={16} />
                  <span>Joined {formatDate(profile.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Level Stats */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Lyxi Level */}
              <div className="rounded-xl border border-hairline bg-surface/80 p-4 backdrop-blur-sm">
                <div className="mb-2 flex items-center gap-2">
                  <Trophy size={18} className="text-accent" />
                  <span className="text-sm font-semibold text-ink">Lyxi Level</span>
                </div>
                <div className="mb-2 text-3xl font-bold text-accent">{profile.lyxiLevel}</div>
                <div className="mb-1 h-2 overflow-hidden rounded-full bg-surface-raised">
                  <div
                    className="h-full bg-gradient-to-r from-accent to-accent-2 transition-all duration-500"
                    style={{ width: `${lyxiXpProgress}%` }}
                  />
                </div>
                <p className="text-xs text-faint">{profile.lyxiXp} XP</p>
              </div>

              {/* Creator Level */}
              <div className="rounded-xl border border-hairline bg-surface/80 p-4 backdrop-blur-sm">
                <div className="mb-2 flex items-center gap-2">
                  <Award size={18} className="text-accent-2" />
                  <span className="text-sm font-semibold text-ink">Creator Level</span>
                </div>
                <div className="mb-2 text-3xl font-bold text-accent-2">{profile.creatorLevel}</div>
                <div className="mb-1 h-2 overflow-hidden rounded-full bg-surface-raised">
                  <div
                    className="h-full bg-gradient-to-r from-accent-2 to-accent transition-all duration-500"
                    style={{ width: `${creatorXpProgress}%` }}
                  />
                </div>
                <p className="text-xs text-faint">{profile.creatorXp} XP</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Public Characters */}
      <section>
        <div className="mb-6">
          <h2 className="font-display text-2xl font-bold text-ink mb-2">
            Public Characters
          </h2>
          <p className="text-sm text-muted">
            {profile.publicCharacters.length === 0
              ? `${profile.username} hasn't published any characters yet.`
              : `Discover ${profile.username}'s published companions`}
          </p>
        </div>

        {profile.publicCharacters.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-hairline px-6 py-16 text-center">
            <Users size={48} className="text-faint" />
            <p className="text-muted">No public characters available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {profile.publicCharacters.map((character, index) => (
              <div
                key={character.id}
                onClick={() => handleClone(character)}
                className="card-hover group relative flex flex-col gap-3 rounded-xl border border-hairline bg-surface p-4 transition-all hover:border-accent/40 hover:shadow-lg hover:shadow-accent/10 cursor-pointer"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-3">
                  {character.avatarUrl ? (
                    <img
                      src={character.avatarUrl}
                      alt={character.name}
                      className="h-12 w-12 rounded-full object-cover ring-2 ring-accent/20 transition-all group-hover:scale-110 group-hover:ring-accent/40"
                    />
                  ) : (
                    <div className="h-12 w-12">
                      <Avatar name={character.name} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium text-ink group-hover:text-accent transition-colors">
                      {character.name}
                    </h3>
                    <p className="text-xs text-faint">{formatDate(character.createdAt)}</p>
                  </div>
                </div>

                <p className="line-clamp-2 text-sm text-muted group-hover:text-ink transition-colors">
                  {character.persona}
                </p>

                <div className="flex flex-wrap gap-2">
                  {character.cloneCount > 0 && (
                    <div className="flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                      <Users size={10} />
                      <span>{character.cloneCount} clones</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
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
