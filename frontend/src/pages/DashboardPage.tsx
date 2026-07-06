import { useEffect, useState } from 'react';
import { Trophy, MessageCircle, Users, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, type UserStats } from '../lib/api';

function StatCard({
  icon,
  label,
  value,
  subtitle,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtitle: string;
  gradient: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-hairline bg-surface p-6 transition-all hover:border-accent/40 hover:shadow-lg hover:shadow-accent/10">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-2 text-3xl font-bold text-ink">{value.toLocaleString()}</p>
          <p className="mt-1 text-xs text-faint">{subtitle}</p>
        </div>
        <div className={`rounded-full bg-gradient-to-br ${gradient} p-3 text-white`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getUserStats()
      .then(setStats)
      .catch((err) => setError(err.message || 'Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <div className="h-9 w-48 animate-pulse rounded bg-surface" />
          <div className="mt-2 h-5 w-64 animate-pulse rounded bg-surface" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-xl border border-danger/40 bg-danger/10 p-6 text-center">
          <p className="text-danger">{error || 'Failed to load dashboard'}</p>
        </div>
      </div>
    );
  }

  const xpProgress = (stats.stats.xp % 100);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-ink">Dashboard</h1>
        <p className="text-muted">Welcome back, {user?.username}!</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Level Card */}
        <StatCard
          icon={<Trophy size={24} />}
          label="Level"
          value={stats.stats.level}
          subtitle={`${stats.stats.xp} XP • ${stats.stats.xpToNextLevel} to next level`}
          gradient="from-accent to-accent-2"
        />

        {/* Messages Card */}
        <StatCard
          icon={<MessageCircle size={24} />}
          label="Messages"
          value={stats.stats.messagesSent}
          subtitle="Total conversations"
          gradient="from-accent-2 to-blue-500"
        />

        {/* Characters Card */}
        <StatCard
          icon={<Users size={24} />}
          label="Characters"
          value={stats.stats.charactersCreated}
          subtitle="Companions created"
          gradient="from-accent to-danger"
        />

        {/* Images Generated (placeholder for now) */}
        <StatCard
          icon={<ImageIcon size={24} />}
          label="Scenes"
          value={0}
          subtitle="AI images created"
          gradient="from-presence to-accent-2"
        />
      </div>

      {/* XP Progress Bar */}
      <div className="mt-8 rounded-xl border border-hairline bg-surface p-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-muted">Level {stats.stats.level} Progress</h2>
            <p className="text-xs text-faint">Keep chatting and creating to level up!</p>
          </div>
          <span className="text-sm font-semibold text-ink">{xpProgress}/100 XP</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-surface-raised">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent-2 transition-all duration-500"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
      </div>

      {/* Account Info */}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-hairline bg-surface p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-ink">Account Info</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted">Username</span>
              <span className="text-sm font-medium text-ink">{stats.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted">Email</span>
              <span className="text-sm font-medium text-ink">{stats.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted">Member since</span>
              <span className="text-sm font-medium text-ink">
                {new Date(stats.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            {stats.isAdmin && (
              <div className="mt-2 rounded-md bg-accent/10 px-3 py-2 text-center text-sm font-medium text-accent">
                Administrator
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-hairline bg-surface p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-ink">Quick Actions</h2>
          <div className="space-y-2">
            <a
              href="/"
              className="block rounded-lg border border-hairline bg-void px-4 py-3 text-sm font-medium text-ink transition hover:border-accent/40 hover:bg-surface-raised"
            >
              View Your Characters
            </a>
            <button
              className="w-full rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              onClick={() => (window.location.href = '/')}
            >
              Create New Companion
            </button>
          </div>
        </div>
      </div>

      {/* Tips Section */}
      <div className="mt-8 rounded-xl border border-hairline bg-gradient-to-br from-accent/5 via-transparent to-accent-2/5 p-6">
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">💡 Level Up Tips</h2>
        <ul className="space-y-2 text-sm text-muted">
          <li className="flex items-start gap-2">
            <span className="text-accent">•</span>
            <span>Send messages to earn <strong className="text-ink">5 XP</strong> per message</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent">•</span>
            <span>Create new characters to earn <strong className="text-ink">50 XP</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent">•</span>
            <span>Each level requires <strong className="text-ink">100 XP</strong> to reach</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
