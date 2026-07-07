import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  Heart,
  ChevronLeft,
  Home,
  Users,
  LayoutDashboard,
  Trophy,
  Sparkles,
  BookOpen,
  Camera,
  Image,
  Smartphone,
  Coins,
  Gift,
  ShieldCheck,
  MessageCircle,
  HelpCircle,
  Handshake,
  Settings,
} from 'lucide-react';
import { Avatar } from './Avatar';
import { NewCompanionModal } from './NewCompanionModal';
import { useCharacters } from '../context/CharactersContext';
import type { Me } from '../lib/api';

interface NavItem {
  label: string;
  to?: string;
  icon: ReactNode;
  badge?: 'NEW';
  soon?: boolean;
}

const primaryNav: NavItem[] = [
  { label: 'Home', to: '/', icon: <Home size={18} /> },
  { label: 'Characters', to: '/', icon: <Users size={18} /> },
  { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard size={18} />, badge: 'NEW' },
  { label: 'Leaderboard', to: '/leaderboard', icon: <Trophy size={18} />, badge: 'NEW' },
  { label: 'Gallery', to: '/gallery', icon: <Image size={18} />, badge: 'NEW' },
  { label: 'Camera', to: '/camera', icon: <Camera size={18} />, badge: 'NEW' },
  { label: 'Settings', to: '/settings', icon: <Settings size={18} /> },
  { label: 'Matchmaker', icon: <Sparkles size={18} />, soon: true },
  { label: 'Stories', icon: <BookOpen size={18} />, soon: true },
  { label: 'Phone', icon: <Smartphone size={18} />, soon: true },
  { label: 'Buy Tokens', icon: <Coins size={18} />, soon: true },
  { label: 'Level Rewards', icon: <Gift size={18} />, soon: true },
];

const secondaryNav: NavItem[] = [
  { label: 'Discord', icon: <MessageCircle size={18} />, soon: true },
  { label: 'FAQ', icon: <HelpCircle size={18} />, soon: true },
  { label: 'Affiliate', icon: <Handshake size={18} />, soon: true },
];

function NavRow({ item, onNavigate, collapsed }: { item: NavItem; onNavigate: () => void; collapsed: boolean }) {
  const content = (
    <>
      <span className="shrink-0 text-muted group-hover:text-ink">{item.icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate text-lg font-medium">{item.label}</span>
          {item.badge && (
            <span className="shrink-0 rounded-full bg-gradient-to-r from-accent to-danger px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
              {item.badge}
            </span>
          )}
        </>
      )}
    </>
  );

  const rowClasses =
    'group flex items-center gap-3 rounded-lg px-2.5 py-2 text-muted transition hover:bg-surface-raised hover:text-ink';

  if (item.soon || !item.to) {
    return (
      <div
        className={`${rowClasses} cursor-default opacity-60`}
        title="Coming soon"
        aria-disabled="true"
      >
        {content}
      </div>
    );
  }

  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        `${rowClasses} ${isActive ? 'bg-surface-raised text-ink' : ''}`
      }
    >
      {content}
    </NavLink>
  );
}

export function Sidebar({
  user,
  onLogout,
  mobileOpen,
  onNavigate,
}: {
  user: Me;
  onLogout: () => void;
  mobileOpen: boolean;
  onNavigate: () => void;
}) {
  const { characters, error } = useCharacters();
  const [showModal, setShowModal] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
    <aside
      className={`glow-field fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col border-r border-hairline bg-void transition-all duration-200 md:static md:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      } ${collapsed ? 'w-20' : 'w-72'}`}
    >
      <div className="flex items-center justify-between gap-2 px-5 py-5">
        <Link to="/" onClick={onNavigate} className="flex items-center gap-2 overflow-hidden">
          <Heart size={22} className="shrink-0 fill-accent text-accent" />
          {!collapsed && (
            <span className="font-display text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-accent-soft to-accent">
              LYXI.AI
            </span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="hidden shrink-0 rounded-md border border-hairline p-1 text-muted transition hover:text-ink md:block"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft size={16} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="px-4">
        <button
          onClick={() => setShowModal(true)}
          className={`flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-3 py-2.5 text-base font-semibold text-white pill-glow transition hover:brightness-110 ${
            collapsed ? 'px-2' : ''
          }`}
        >
          <span className="text-lg leading-none">+</span> {!collapsed && 'New companion'}
        </button>
      </div>

      <nav className="mt-5 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {primaryNav.map((item) => (
          <NavRow key={item.label} item={item} onNavigate={onNavigate} collapsed={collapsed} />
        ))}

        {!collapsed && (
          <>
            <p className="px-2 pt-4 pb-2 text-sm font-medium tracking-wide text-faint uppercase">Companions</p>
            {error && <p className="px-2 text-xs text-danger">{error}</p>}
            {characters === null && !error && <p className="px-2 text-xs text-faint">Loading…</p>}
            {characters?.length === 0 && (
              <p className="px-2 text-xs text-faint">No companions yet — create your first one.</p>
            )}
            {characters?.map((c) => (
              <NavLink
                key={c.id}
                to={`/chat/${c.id}`}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-2 py-2 transition ${
                    isActive ? 'bg-surface-raised' : 'hover:bg-surface-raised/60'
                  }`
                }
              >
                <Avatar name={c.name} size="sm" src={c.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium text-ink">{c.name}</p>
                  <p className="truncate text-sm text-faint">{c.persona}</p>
                </div>
              </NavLink>
            ))}
          </>
        )}

        {user.isAdmin && (
          <div className={collapsed ? '' : 'pt-2'}>
            <NavRow
              item={{ label: 'Admin Panel', to: '/admin', icon: <ShieldCheck size={18} /> }}
              onNavigate={onNavigate}
              collapsed={collapsed}
            />
          </div>
        )}

        <div className="mt-2 space-y-1 border-t border-hairline-soft pt-3">
          {secondaryNav.map((item) => (
            <NavRow key={item.label} item={item} onNavigate={onNavigate} collapsed={collapsed} />
          ))}
        </div>
      </nav>

      <div className="border-t border-hairline px-4 py-4">
        {!collapsed && (
          <div className="mb-3 flex items-center gap-2 text-base">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-presence" aria-hidden="true" />
            <span className="truncate text-muted">{user.username}</span>
          </div>
        )}
        <button
          onClick={onLogout}
          className="w-full rounded-md border border-hairline px-3 py-2 text-base text-muted transition hover:bg-surface-raised hover:text-ink"
        >
          {collapsed ? '⏻' : 'Log out'}
        </button>
      </div>
    </aside>

    {showModal && <NewCompanionModal onClose={() => setShowModal(false)} />}
    </>
  );
}
