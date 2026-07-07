import { X, Download } from 'lucide-react';

interface ImageViewerModalProps {
  imageUrl: string;
  description: string;
  onClose: () => void;
}

export function ImageViewerModal({ imageUrl, description, onClose }: ImageViewerModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/95 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-6xl max-h-[90vh] w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 flex items-center gap-2 rounded-full bg-surface/80 px-4 py-2 text-sm font-medium text-ink backdrop-blur transition hover:bg-surface"
        >
          <X size={18} />
          Close
        </button>

        {/* Image container */}
        <div className="relative overflow-hidden rounded-2xl border border-hairline bg-surface shadow-2xl">
          <img
            src={imageUrl}
            alt={description}
            className="w-full h-auto max-h-[80vh] object-contain"
          />

          {/* Gradient overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-void via-void/80 to-transparent p-6">
            <p className="text-sm text-ink/90 leading-relaxed">{description}</p>
          </div>
        </div>

        {/* Download button (optional) */}
        <div className="mt-4 flex justify-center">
          <a
            href={imageUrl}
            download
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent-2 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <Download size={16} />
            Download Image
          </a>
        </div>
      </div>
    </div>
  );
}
