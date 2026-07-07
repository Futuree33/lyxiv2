import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Trash2, Volume2, Eye, Bell, Palette } from 'lucide-react';
import { api, type Character } from '../lib/api';

interface ChatSettingsModalProps {
  character: Character;
  onClose: () => void;
}

export function ChatSettingsModal({ character, onClose }: ChatSettingsModalProps) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function handleDelete() {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setDeleting(true);
    try {
      await api.deleteCharacter(character.id);
      navigate('/');
    } catch (error) {
      console.error('Failed to delete character:', error);
      alert('Failed to delete character. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm animate-fade-in">
      <div className="relative mx-4 w-full max-w-2xl rounded-2xl border border-hairline bg-surface shadow-2xl shadow-accent/10 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-accent-2/20">
              <Palette size={20} className="text-accent" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-ink">Chat Settings</h2>
              <p className="text-sm text-muted">{character.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted transition hover:bg-surface-raised hover:text-ink"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Settings Grid */}
          <div className="space-y-4">
            <SettingItem
              icon={<Volume2 size={18} />}
              label="Voice Messages"
              description="Enable voice responses from your companion"
              badge="Coming Soon"
            />

            <SettingItem
              icon={<Eye size={18} />}
              label="NSFW Content"
              description="Allow mature content in conversations"
              badge="Coming Soon"
            />

            <SettingItem
              icon={<Bell size={18} />}
              label="Notifications"
              description="Get notified when your companion misses you"
              badge="Coming Soon"
            />

            <SettingItem
              icon={<Palette size={18} />}
              label="Chat Theme"
              description="Customize colors and appearance"
              badge="Coming Soon"
            />
          </div>

          {/* Danger Zone */}
          <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
            <div className="mb-3">
              <h3 className="font-semibold text-danger flex items-center gap-2">
                <Trash2 size={16} />
                Danger Zone
              </h3>
              <p className="text-sm text-muted mt-1">
                This action cannot be undone. All messages and images will be permanently deleted.
              </p>
            </div>

            {!showDeleteConfirm ? (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg border border-danger bg-danger/10 px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger/20 disabled:opacity-50"
              >
                Delete Character
              </button>
            ) : (
              <div className="space-y-3 animate-fade-in">
                <p className="text-sm font-semibold text-danger">
                  Are you absolutely sure? This will permanently delete {character.name} and all associated data.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete Forever'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="flex-1 rounded-lg border border-hairline bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface-raised disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-hairline px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-hairline bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface-raised"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface SettingItemProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  badge?: string;
}

function SettingItem({ icon, label, description, badge }: SettingItemProps) {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-hairline bg-surface p-4 transition hover:border-accent/30 opacity-60 cursor-not-allowed">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-raised text-muted">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-ink">{label}</h4>
          {badge && (
            <span className="rounded-full bg-faint/20 px-2 py-0.5 text-xs font-medium text-faint">
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm text-muted mt-0.5">{description}</p>
      </div>
    </div>
  );
}
