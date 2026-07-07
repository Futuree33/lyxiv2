import { useState, type FormEvent } from 'react';
import { User, Lock, Image as ImageIcon, Save, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';

export function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile form
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Privacy setting
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false);

  async function handleUpdateProfile(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await api.updateProfile({ username, email });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Failed to update profile',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    setLoading(true);

    try {
      await api.changePassword({ currentPassword, newPassword });
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Failed to change password',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleTogglePrivacy() {
    setLoading(true);
    setMessage(null);

    try {
      const newPrivacyValue = !isPrivate;
      await api.updatePrivacy(newPrivacyValue);
      setIsPrivate(newPrivacyValue);
      setMessage({
        type: 'success',
        text: newPrivacyValue
          ? 'Your profile is now private. You won\'t appear on leaderboards.'
          : 'Your profile is now public. You\'ll appear on leaderboards!'
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Failed to update privacy',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 md:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-ink">Settings</h1>
        <p className="text-muted">Manage your account preferences</p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 rounded-lg border p-4 ${
            message.type === 'success'
              ? 'border-accent/40 bg-accent/10 text-accent'
              : 'border-danger/40 bg-danger/10 text-danger'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Profile Settings */}
        <div className="rounded-xl border border-hairline bg-surface p-6">
          <div className="mb-4 flex items-center gap-2">
            <User size={20} className="text-accent" />
            <h2 className="font-display text-xl font-semibold text-ink">Profile</h2>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-hairline bg-void px-4 py-2 text-ink transition focus:border-accent focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-muted">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-hairline bg-void px-4 py-2 text-ink transition focus:border-accent focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-6 py-2 font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              <Save size={18} />
              Save Profile
            </button>
          </form>
        </div>

        {/* Password Change */}
        <div className="rounded-xl border border-hairline bg-surface p-6">
          <div className="mb-4 flex items-center gap-2">
            <Lock size={20} className="text-accent" />
            <h2 className="font-display text-xl font-semibold text-ink">Change Password</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-hairline bg-void px-4 py-2 text-ink transition focus:border-accent focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-muted">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-hairline bg-void px-4 py-2 text-ink transition focus:border-accent focus:outline-none"
                minLength={8}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-muted">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-hairline bg-void px-4 py-2 text-ink transition focus:border-accent focus:outline-none"
                minLength={8}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-6 py-2 font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              <Lock size={18} />
              Change Password
            </button>
          </form>
        </div>

        {/* Privacy Settings */}
        <div className="rounded-xl border border-hairline bg-surface p-6">
          <div className="mb-4 flex items-center gap-2">
            <Shield size={20} className="text-accent" />
            <h2 className="font-display text-xl font-semibold text-ink">Privacy</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="mb-1 font-semibold text-ink">Private Account</h3>
                <p className="text-sm text-muted">
                  {isPrivate
                    ? 'Your profile is hidden. You won\'t appear on leaderboards or have a public profile page.'
                    : 'Your profile is public. You\'ll appear on leaderboards and have a public profile page.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleTogglePrivacy}
                disabled={loading}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 ${
                  isPrivate ? 'bg-accent' : 'bg-hairline'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isPrivate ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {!isPrivate && user?.username && (
              <div className="rounded-md border border-accent/20 bg-accent/5 px-3 py-2">
                <p className="text-sm text-ink">
                  <span className="text-muted">Your public profile:</span>{' '}
                  <a
                    href={`/profile/${user.username}`}
                    className="font-medium text-accent hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    /profile/{user.username}
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Account Info */}
        <div className="rounded-xl border border-hairline bg-surface p-6">
          <div className="mb-4 flex items-center gap-2">
            <ImageIcon size={20} className="text-accent" />
            <h2 className="font-display text-xl font-semibold text-ink">Account Info</h2>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted">Account Created</span>
              <span className="text-sm font-medium text-ink">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Unknown'}
              </span>
            </div>
            {user?.isAdmin && (
              <div className="rounded-md bg-accent/10 px-3 py-2 text-center text-sm font-medium text-accent">
                Administrator Account
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
