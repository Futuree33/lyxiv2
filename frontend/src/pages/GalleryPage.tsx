import { useEffect, useState } from 'react';
import { Image as ImageIcon, Calendar, User } from 'lucide-react';
import { api, ApiError, getImageUrl } from '../lib/api';
import { Avatar } from '../components/Avatar';
import { ImageViewerModal } from '../components/ImageViewerModal';

interface GalleryImage {
  id: number;
  imageUrl: string;
  sceneDescription: string;
  createdAt: string;
  characterId: number | null;
  characterName: string | null;
  characterAvatarUrl: string | null;
}

interface CharacterGallery {
  characterId: number;
  characterName: string;
  characterAvatarUrl: string | null;
  images: GalleryImage[];
}

export function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<GalleryImage | null>(null);

  useEffect(() => {
    api
      .getAllImages()
      .then((data) => {
        setImages(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Failed to load gallery');
        setLoading(false);
      });
  }, []);

  // Separate character images from camera models
  const characterImages = images.filter((img) => img.characterId !== null);
  const cameraModels = images.filter((img) => img.characterId === null);

  // Group character images by character
  const groupedByCharacter: CharacterGallery[] = characterImages.reduce((acc, img) => {
    if (img.characterId === null) return acc; // Skip nulls (shouldn't happen after filter)

    const existing = acc.find((g) => g.characterId === img.characterId);
    if (existing) {
      existing.images.push(img);
    } else {
      acc.push({
        characterId: img.characterId,
        characterName: img.characterName || 'Unknown',
        characterAvatarUrl: img.characterAvatarUrl,
        images: [img],
      });
    }
    return acc;
  }, [] as CharacterGallery[]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-sm text-muted">Loading your gallery...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-danger">{error}</p>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-accent-2/20">
          <ImageIcon size={40} className="text-accent" />
        </div>
        <div>
          <h2 className="mb-2 font-display text-xl font-semibold text-ink">No Images Yet</h2>
          <p className="text-sm text-muted">
            Start chatting with your companions to generate beautiful scenes!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      {/* Header */}
      <div className="w-full shrink-0 border-b border-hairline bg-surface/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <h1 className="mb-2 font-display text-3xl font-bold text-ink">Scene Gallery</h1>
          <p className="text-sm text-muted">All your AI-generated moments in one place</p>

          {/* Stats */}
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-accent/10 to-accent-2/10 px-4 py-2">
              <ImageIcon size={18} className="text-accent" />
              <div>
                <div className="text-lg font-semibold text-ink">{images.length}</div>
                <div className="text-xs text-muted">Total Images</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-accent-2/10 to-blue-500/10 px-4 py-2">
              <User size={18} className="text-accent-2" />
              <div>
                <div className="text-lg font-semibold text-ink">{characterImages.length}</div>
                <div className="text-xs text-muted">Character Scenes</div>
              </div>
            </div>
            {cameraModels.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-presence/10 to-accent/10 px-4 py-2">
                <ImageIcon size={18} className="text-presence" />
                <div>
                  <div className="text-lg font-semibold text-ink">{cameraModels.length}</div>
                  <div className="text-xs text-muted">Camera Models</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gallery Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          {/* Character Sections */}
          {groupedByCharacter.map((group, groupIdx) => (
            <div key={group.characterId} className="mb-12">
              {/* Character Header */}
              <div className="mb-6 flex items-center gap-3">
                <Avatar
                  name={group.characterName}
                  src={group.characterAvatarUrl}
                  size="md"
                  ring
                />
                <div className="flex-1">
                  <h2 className="font-display text-xl font-semibold text-ink">
                    {group.characterName}
                  </h2>
                  <p className="text-xs text-muted">
                    {group.images.length} {group.images.length === 1 ? 'scene' : 'scenes'}
                  </p>
                </div>
              </div>

              {/* Image Grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {group.images.map((img, idx) => (
                  <div
                    key={img.id}
                    className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl border border-hairline bg-surface transition-all hover:scale-105 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/20 animate-fade-in-up"
                    style={{ animationDelay: `${(groupIdx * 50) + (idx * 30)}ms` }}
                    onClick={() => setViewingImage(img)}
                  >
                    <img
                      src={getImageUrl(img.imageUrl)}
                      alt={img.sceneDescription}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-void/90 via-void/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="mb-2 line-clamp-2 text-xs text-ink/90">
                          {img.sceneDescription}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-faint">
                          <Calendar size={10} />
                          <span>{new Date(img.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Gradient Border Glow */}
                    <div className="pointer-events-none absolute -inset-0.5 rounded-xl bg-gradient-to-r from-accent to-accent-2 opacity-0 blur transition-opacity duration-300 group-hover:opacity-40" />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Camera Models Section */}
          {cameraModels.length > 0 && (
            <div className="mb-12">
              {/* Camera Models Header */}
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-presence/20 to-accent/20 ring-2 ring-presence/30">
                  <ImageIcon size={24} className="text-presence" />
                </div>
                <div className="flex-1">
                  <h2 className="font-display text-xl font-semibold text-ink">
                    Camera Models
                  </h2>
                  <p className="text-xs text-muted">
                    {cameraModels.length} custom {cameraModels.length === 1 ? 'photo' : 'photos'}
                  </p>
                </div>
              </div>

              {/* Image Grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {cameraModels.map((img, idx) => (
                  <div
                    key={img.id}
                    className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl border border-hairline bg-surface transition-all hover:scale-105 hover:border-presence/40 hover:shadow-xl hover:shadow-presence/20 animate-fade-in-up"
                    style={{ animationDelay: `${(groupedByCharacter.length * 50) + (idx * 30)}ms` }}
                    onClick={() => setViewingImage(img)}
                  >
                    <img
                      src={getImageUrl(img.imageUrl)}
                      alt={img.sceneDescription}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-void/90 via-void/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="mb-2 line-clamp-2 text-xs text-ink/90">
                          {img.sceneDescription}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-faint">
                          <Calendar size={10} />
                          <span>{new Date(img.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Gradient Border Glow (different color for camera models) */}
                    <div className="pointer-events-none absolute -inset-0.5 rounded-xl bg-gradient-to-r from-presence to-accent opacity-0 blur transition-opacity duration-300 group-hover:opacity-40" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Viewer Modal */}
      {viewingImage && (
        <ImageViewerModal
          imageUrl={getImageUrl(viewingImage.imageUrl)}
          description={viewingImage.sceneDescription}
          onClose={() => setViewingImage(null)}
        />
      )}
    </div>
  );
}
