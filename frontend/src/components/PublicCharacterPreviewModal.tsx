import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MessageCircle, Edit3, Heart, Users } from 'lucide-react';
import { Modal } from './Modal';
import { Avatar } from './Avatar';
import { api, ApiError, type Character } from '../lib/api';

function getRelationshipLevel(exp: number = 0): number {
  return Math.floor(exp / 10) + 1;
}

interface PublicCharacterPreviewModalProps {
  character: Character;
  onClose: () => void;
  onCustomize: (character: Character) => void;
}

export function PublicCharacterPreviewModal({
  character,
  onClose,
  onCustomize,
}: PublicCharacterPreviewModalProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStartChatting() {
    setLoading(true);
    setError(null);

    try {
      const clonedCharacter = await api.cloneCharacter(character.id);
      navigate(`/chat/${clonedCharacter.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to clone character');
      setLoading(false);
    }
  }

  function handleCustomize() {
    onCustomize(character);
    onClose();
  }

  return (
    <Modal title="" onClose={onClose}>
      <div className="flex flex-col gap-6">
        {/* Character Preview */}
        <div className="flex flex-col items-center gap-4 text-center">
          {character.avatarUrl ? (
            <img
              src={character.avatarUrl}
              alt={character.name}
              className="h-32 w-32 rounded-full object-cover ring-4 ring-accent/30 shadow-2xl shadow-accent/20"
            />
          ) : (
            <div className="h-32 w-32">
              <Avatar name={character.name} />
            </div>
          )}

          <div>
            <h2 className="font-display text-2xl font-bold text-ink mb-2">
              {character.name}
            </h2>
            {character.relationshipToUser && (
              <p className="text-sm text-accent mb-3">
                {character.relationshipToUser}
              </p>
            )}
            <p className="text-sm text-muted max-w-md line-clamp-3">
              {character.persona || character.backstory}
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-4 mt-2">
            {getRelationshipLevel(character.exp || 0) > 1 && (
              <div className="flex items-center gap-1.5 rounded-full bg-surface-raised px-3 py-1 text-sm">
                <Heart size={14} className="text-danger" />
                <span className="text-muted">Level {getRelationshipLevel(character.exp || 0)}</span>
              </div>
            )}
            {(character.cloneCount || 0) > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-surface-raised px-3 py-1 text-sm">
                <Users size={14} className="text-presence" />
                <span className="text-muted">{character.cloneCount} clones</span>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Action Prompt */}
        <div className="rounded-xl border border-hairline bg-surface-raised p-4">
          <p className="text-center text-sm font-medium text-ink mb-4">
            What would you like to do?
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleStartChatting}
              disabled={loading}
              className="button-scale flex-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-6 py-3 font-semibold text-white shadow-lg shadow-accent/30 transition-all hover:shadow-xl hover:shadow-accent/40 disabled:opacity-50"
            >
              <MessageCircle size={18} />
              Start Chatting
            </button>

            <button
              onClick={handleCustomize}
              disabled={loading}
              className="button-scale flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-accent bg-void px-6 py-3 font-semibold text-accent transition-all hover:bg-accent/10 disabled:opacity-50"
            >
              <Edit3 size={18} />
              Customize First
            </button>
          </div>

          <p className="mt-3 text-center text-xs text-faint">
            {loading ? 'Cloning character...' : 'Cloning will create your own copy to customize'}
          </p>
        </div>
      </div>
    </Modal>
  );
}
