import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CharactersProvider } from '../context/CharactersContext';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function Layout() {
  const { user, loading, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  if (loading) return null;

  if (!user) {
    return (
      <div className="flex h-svh flex-col overflow-y-auto">
        <header className="flex items-center justify-center px-6 py-8">
          <Link to="/" className="font-display text-xl font-semibold tracking-tight text-ink">
            lyxi<span className="text-accent">.</span>
          </Link>
        </header>
        <main className="flex flex-1 flex-col">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <CharactersProvider>
      <div className="flex h-svh bg-void overflow-hidden">
        <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-hairline bg-void/95 px-4 py-3 backdrop-blur md:hidden">
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-2 text-muted hover:text-ink"
          >
            <span className="sr-only">Open menu</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <Link to="/" className="font-display text-lg font-semibold text-ink">
            lyxi<span className="text-accent">.</span>
          </Link>
          <div className="w-9" />
        </div>

        {mobileNavOpen && (
          <button
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
            className="fixed inset-0 z-30 bg-void/70 md:hidden"
          />
        )}

        <Sidebar
          user={user}
          onLogout={logout}
          mobileOpen={mobileNavOpen}
          onNavigate={() => setMobileNavOpen(false)}
        />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col pt-14 md:pt-0">
          <TopBar user={user} />
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </CharactersProvider>
  );
}
