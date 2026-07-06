import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';

export function RegisterPage() {
  const { register, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(email, username, password);
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
          <h1 className="font-display text-2xl font-semibold text-ink">Create an account</h1>
          <p className="text-sm text-muted">Build a companion and start chatting.</p>
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
            <label className="mb-1 block text-sm text-muted">Username</label>
            <input
              type="text"
              required
              minLength={4}
              maxLength={25}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border border-hairline bg-void px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              placeholder="coolusername"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">Password</label>
            <input
              type="password"
              required
              minLength={6}
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
          {loading ? 'Creating account…' : 'Register'}
        </button>

        <p className="text-center text-sm text-faint">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
