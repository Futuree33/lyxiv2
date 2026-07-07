import { useState, type FormEvent } from 'react';
import { X, Sparkles } from 'lucide-react';

interface ImagePromptModalProps {
  characterName: string;
  onGenerate: (prompt: string) => void;
  onClose: () => void;
  isGenerating: boolean;
}

export function ImagePromptModal({ characterName, onGenerate, onClose, isGenerating }: ImagePromptModalProps) {
  const [prompt, setPrompt] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onGenerate(prompt.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm animate-fade-in">
      <div className="relative mx-4 w-full max-w-lg rounded-2xl border border-hairline bg-surface shadow-2xl shadow-accent/10 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-accent-2/20">
              <Sparkles size={20} className="text-accent" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-ink">Generate Image</h2>
              <p className="text-sm text-muted">{characterName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="rounded-full p-2 text-muted transition hover:bg-surface-raised hover:text-ink disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-ink">
              Custom Prompt <span className="text-faint">(optional)</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the scene you want to generate... (leave blank for default portrait)"
              rows={4}
              disabled={isGenerating}
              className="w-full resize-none rounded-lg border border-hairline bg-void px-4 py-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
            />
            <p className="mt-2 text-xs text-muted">
              Examples: "sitting in a coffee shop", "wearing a red dress", "at the beach during sunset"
            </p>
          </div>

          {/* Info box */}
          <div className="mb-6 rounded-lg border border-accent/20 bg-accent/5 px-4 py-3">
            <p className="text-xs text-muted">
              <strong className="text-ink">Tip:</strong> If you leave the prompt blank, a default portrait will be
              generated using {characterName}'s physical description and art style.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="flex-1 rounded-lg border border-hairline bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-raised disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="flex-1 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-2.5 text-sm font-bold text-white pill-glow transition hover:brightness-110 disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'Generate Image'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
