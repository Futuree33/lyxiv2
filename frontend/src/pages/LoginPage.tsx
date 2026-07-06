import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5 rounded-2xl border border-hairline bg-surface p-8">
        <div className="space-y-1 text-center">
          <h1 className="font-display text-2xl font-semibold text-ink">Welcome back</h1>
          <p className="text-sm text-muted">Log in to keep talking with your companions.</p>
        </div>

        {error && (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
        )}

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-muted">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-hairline bg-void px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-hairline bg-void px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {loading ? 'Logging in…' : 'Log in'}
        </button>

        <p className="text-center text-sm text-faint">
          No account?{' '}
          <Link to="/register" className="text-accent hover:underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
