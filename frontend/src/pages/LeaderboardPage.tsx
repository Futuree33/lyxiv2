import { useEffect, useState } from 'react';
import { Trophy, Award, Heart, TrendingUp, Star, Clock } from 'lucide-react';
import { api } from '../lib/api';

interface PodiumEntry {
  userId: number;
  username: string;
  value: number;
  characterId?: number;
  characterName?: string;
}

interface ResetTime {
  nextReset: string;
  millisecondsUntilReset: number;
}

function Podium({
  title,
  icon,
  entries,
  valueLabel,
  gradient,
}: {
  title: string;
  icon: React.ReactNode;
  entries: PodiumEntry[];
  valueLabel: string;
  gradient: string;
}) {
  const positions = ['🥇', '🥈', '🥉'];

  return (
    <div className="rounded-xl border border-hairline bg-surface p-6">
      <div className="mb-4 flex items-center gap-2">
        <div className={`rounded-full bg-gradient-to-br ${gradient} p-2 text-white`}>
          {icon}
        </div>
        <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      </div>

      <div className="space-y-3">
        {entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-faint">No data yet</p>
        ) : (
          entries.map((entry, idx) => (
            <div
              key={entry.userId}
              className="flex items-center gap-3 rounded-lg bg-void p-3 transition hover:bg-surface-raised"
            >
              <span className="text-2xl">{positions[idx]}</span>
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-ink">{entry.username}</p>
                {entry.characterName && (
                  <p className="truncate text-xs text-muted">with {entry.characterName}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold text-accent">{entry.value.toLocaleString()}</p>
                <p className="text-xs text-faint">{valueLabel}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CountdownTimer({ resetTime }: { resetTime: ResetTime | null }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!resetTime) return;

    const updateTimer = () => {
      const ms = new Date(resetTime.nextReset).getTime() - Date.now();
      if (ms <= 0) {
        setTimeLeft('Resetting...');
        return;
      }

      const days = Math.floor(ms / (1000 * 60 * 60 * 24));
      const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((ms % (1000 * 60)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [resetTime]);

  if (!resetTime) return null;

  return (
    <div className="rounded-xl border border-hairline bg-gradient-to-br from-accent/10 via-surface to-accent-2/10 p-6 text-center">
      <div className="mb-2 flex items-center justify-center gap-2 text-muted">
        <Clock size={18} />
        <span className="text-sm font-medium">Weekly Reset In</span>
      </div>
      <p className="font-mono text-2xl font-bold text-ink">{timeLeft}</p>
      <p className="mt-1 text-xs text-faint">Monday 00:00:00 UTC</p>
    </div>
  );
}

export function LeaderboardPage() {
  const [tab, setTab] = useState<'lyxi' | 'creator'>('lyxi');
  const [loading, setLoading] = useState(true);
  const [resetTime, setResetTime] = useState<ResetTime | null>(null);

  // Lyxi tab data
  const [highestLevel, setHighestLevel] = useState<PodiumEntry[]>([]);
  const [mostXpWeek, setMostXpWeek] = useState<PodiumEntry[]>([]);
  const [highestRelationship, setHighestRelationship] = useState<PodiumEntry[]>([]);

  // Creator tab data
  const [highestCreatorLevel, setHighestCreatorLevel] = useState<PodiumEntry[]>([]);
  const [mostCreatorXpWeek, setMostCreatorXpWeek] = useState<PodiumEntry[]>([]);
  const [mostPopularWeek, setMostPopularWeek] = useState<PodiumEntry[]>([]);

  useEffect(() => {
    Promise.all([
      api.getLeaderboardResetTime(),
      api.getLeaderboardLyxiHighestLevel(),
      api.getLeaderboardLyxiMostXpWeek(),
      api.getLeaderboardLyxiHighestRelationship(),
      api.getLeaderboardCreatorHighestLevel(),
      api.getLeaderboardCreatorMostXpWeek(),
      api.getLeaderboardCreatorMostPopularWeek(),
    ])
      .then(([reset, lyxiLvl, lyxiXp, relationship, creatorLvl, creatorXp, popular]) => {
        setResetTime(reset);
        setHighestLevel(lyxiLvl);
        setMostXpWeek(lyxiXp);
        setHighestRelationship(relationship);
        setHighestCreatorLevel(creatorLvl);
        setMostCreatorXpWeek(creatorXp);
        setMostPopularWeek(popular);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="h-9 w-48 animate-pulse rounded bg-surface" />
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-ink">Leaderboard</h1>
        <p className="text-muted">Compete with the community</p>
      </div>

      {/* Timer */}
      <div className="mb-8">
        <CountdownTimer resetTime={resetTime} />
      </div>

      {/* Tabs */}
      <div className="mb-8 flex gap-2 rounded-xl border border-hairline bg-surface p-1">
        <button
          onClick={() => setTab('lyxi')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === 'lyxi'
              ? 'bg-gradient-to-r from-accent to-accent-2 text-white'
              : 'text-muted hover:text-ink'
          }`}
        >
          Lyxi
        </button>
        <button
          onClick={() => setTab('creator')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === 'creator'
              ? 'bg-gradient-to-r from-accent to-accent-2 text-white'
              : 'text-muted hover:text-ink'
          }`}
        >
          Creator
        </button>
      </div>

      {/* Lyxi Tab */}
      {tab === 'lyxi' && (
        <div className="grid gap-6 md:grid-cols-3">
          <Podium
            title="Highest Level Ever"
            icon={<Trophy size={20} />}
            entries={highestLevel}
            valueLabel="Level"
            gradient="from-accent to-accent-2"
          />
          <Podium
            title="Most XP This Week"
            icon={<TrendingUp size={20} />}
            entries={mostXpWeek}
            valueLabel="XP"
            gradient="from-accent-2 to-blue-500"
          />
          <Podium
            title="Highest Relationship"
            icon={<Heart size={20} />}
            entries={highestRelationship}
            valueLabel="Level"
            gradient="from-accent to-danger"
          />
        </div>
      )}

      {/* Creator Tab */}
      {tab === 'creator' && (
        <div className="grid gap-6 md:grid-cols-3">
          <Podium
            title="Highest Creator Level"
            icon={<Award size={20} />}
            entries={highestCreatorLevel}
            valueLabel="Level"
            gradient="from-presence to-accent"
          />
          <Podium
            title="Most XP This Week"
            icon={<TrendingUp size={20} />}
            entries={mostCreatorXpWeek}
            valueLabel="XP"
            gradient="from-accent to-accent-2"
          />
          <Podium
            title="Most Popular This Week"
            icon={<Star size={20} />}
            entries={mostPopularWeek}
            valueLabel="Clones"
            gradient="from-accent-2 to-blue-500"
          />
        </div>
      )}
    </div>
  );
}
