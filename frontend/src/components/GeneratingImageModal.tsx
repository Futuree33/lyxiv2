import { ImagePlus } from 'lucide-react';

interface GeneratingImageModalProps {
  characterName: string;
}

export function GeneratingImageModal({ characterName }: GeneratingImageModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-hairline bg-surface p-8 shadow-2xl">
        {/* Animated gradient background */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/10 via-transparent to-accent-2/10 animate-pulse" />

        <div className="relative text-center">
          {/* Spinning icon */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center">
            <div className="absolute h-20 w-20 animate-spin rounded-full border-4 border-accent/20 border-t-accent" />
            <ImagePlus size={32} className="text-accent animate-pulse" />
          </div>

          {/* Text */}
          <h3 className="mb-2 font-display text-xl font-semibold text-ink">
            Generating Scene
          </h3>
          <p className="text-sm text-muted">
            Creating a beautiful moment with {characterName}...
          </p>

          {/* Loading dots */}
          <div className="mt-6 flex justify-center gap-2">
            <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-accent" />
          </div>
        </div>
      </div>
    </div>
  );
}
