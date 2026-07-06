import { useEffect, type ReactNode } from 'react';

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-void/80 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full rounded-2xl border border-hairline bg-surface p-6 shadow-2xl shadow-black/50 ${
          wide ? 'max-w-5xl' : 'max-w-md'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-1 text-faint transition hover:bg-surface-raised hover:text-ink"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
