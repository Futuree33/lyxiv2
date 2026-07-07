import { useState, type FormEvent } from 'react';
import { Camera as CameraIcon, Download, Sparkles, User, Users } from 'lucide-react';
import { api, ApiError, getImageUrl, type Character } from '../lib/api';
import { useCharacters } from '../context/CharactersContext';

type Mode = 'character' | 'custom';

export function CameraPage() {
  const { characters } = useCharacters();
  const [mode, setMode] = useState<Mode>('character');
  const [selectedCharacters, setSelectedCharacters] = useState<number[]>([]);
  const [sceneDescription, setSceneDescription] = useState('');
  const [artStyle, setArtStyle] = useState<'realistic' | 'anime'>('realistic');
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<{ url: string; description: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Custom person form
  const [customPerson, setCustomPerson] = useState({
    gender: '',
    eyeColor: '',
    hairColor: '',
    hairStyle: '',
    height: '',
    build: '',
    ethnicity: '',
    age: undefined as number | undefined,
    clothing: '',
  });

  const toggleCharacter = (id: number) => {
    setSelectedCharacters((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    if (!sceneDescription.trim()) {
      setError('Please describe what you want to see');
      return;
    }

    if (mode === 'character' && selectedCharacters.length === 0) {
      setError('Please select at least one character');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const result = await api.generateCameraImage({
        mode,
        ...(mode === 'character' ? { characterIds: selectedCharacters } : { customPerson }),
        sceneDescription,
        artStyle,
      });

      setGeneratedImage(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to generate image');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      {/* Header */}
      <div className="w-full shrink-0 border-b border-hairline bg-surface/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2">
              <CameraIcon size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-ink">Camera</h1>
              <p className="text-sm text-muted">Advanced image generation studio</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Left: Controls */}
            <div className="space-y-6">
              {/* Mode Selector */}
              <div>
                <label className="mb-3 block text-sm font-medium text-muted">Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMode('character')}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition ${
                      mode === 'character'
                        ? 'border-accent bg-accent/10'
                        : 'border-hairline bg-surface hover:border-accent/40'
                    }`}
                  >
                    <Users size={24} className={mode === 'character' ? 'text-accent' : 'text-muted'} />
                    <span className="text-sm font-semibold text-ink">Character Mode</span>
                    <span className="text-xs text-faint">Use your companions</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('custom')}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition ${
                      mode === 'custom'
                        ? 'border-accent bg-accent/10'
                        : 'border-hairline bg-surface hover:border-accent/40'
                    }`}
                  >
                    <User size={24} className={mode === 'custom' ? 'text-accent' : 'text-muted'} />
                    <span className="text-sm font-semibold text-ink">Custom Mode</span>
                    <span className="text-xs text-faint">Create anyone</span>
                  </button>
                </div>
              </div>

              {/* Character Selection */}
              {mode === 'character' && (
                <div>
                  <label className="mb-3 block text-sm font-medium text-muted">
                    Select Characters ({selectedCharacters.length})
                  </label>
                  {characters && characters.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {characters.map((char) => (
                        <button
                          key={char.id}
                          type="button"
                          onClick={() => toggleCharacter(char.id)}
                          className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition ${
                            selectedCharacters.includes(char.id)
                              ? 'border-accent bg-accent/10'
                              : 'border-hairline bg-surface hover:border-accent/40'
                          }`}
                        >
                          <div className={`h-10 w-10 shrink-0 rounded-full bg-gradient-to-br ${
                            selectedCharacters.includes(char.id)
                              ? 'from-accent to-accent-2'
                              : 'from-accent/20 to-accent-2/20'
                          } flex items-center justify-center`}>
                            <span className="text-sm font-bold text-white">
                              {char.name.charAt(0)}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-ink">{char.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No characters yet. Create one first!</p>
                  )}
                </div>
              )}

              {/* Custom Person Form */}
              {mode === 'custom' && (
                <div className="space-y-4 rounded-xl border border-hairline bg-surface p-4">
                  <h3 className="font-semibold text-ink">Person Description</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-muted">Gender</label>
                      <input
                        type="text"
                        value={customPerson.gender}
                        onChange={(e) => setCustomPerson((prev) => ({ ...prev, gender: e.target.value }))}
                        placeholder="e.g., Female"
                        className="w-full rounded-md border border-hairline bg-surface-raised px-3 py-2 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-muted">Age</label>
                      <input
                        type="number"
                        value={customPerson.age || ''}
                        onChange={(e) => setCustomPerson((prev) => ({ ...prev, age: e.target.value ? Number(e.target.value) : undefined }))}
                        placeholder="e.g., 25"
                        className="w-full rounded-md border border-hairline bg-surface-raised px-3 py-2 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-muted">Eye Color</label>
                      <input
                        type="text"
                        value={customPerson.eyeColor}
                        onChange={(e) => setCustomPerson((prev) => ({ ...prev, eyeColor: e.target.value }))}
                        placeholder="e.g., Blue"
                        className="w-full rounded-md border border-hairline bg-surface-raised px-3 py-2 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-muted">Hair Color</label>
                      <input
                        type="text"
                        value={customPerson.hairColor}
                        onChange={(e) => setCustomPerson((prev) => ({ ...prev, hairColor: e.target.value }))}
                        placeholder="e.g., Blonde"
                        className="w-full rounded-md border border-hairline bg-surface-raised px-3 py-2 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-muted">Hair Style</label>
                      <input
                        type="text"
                        value={customPerson.hairStyle}
                        onChange={(e) => setCustomPerson((prev) => ({ ...prev, hairStyle: e.target.value }))}
                        placeholder="e.g., Long wavy"
                        className="w-full rounded-md border border-hairline bg-surface-raised px-3 py-2 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-muted">Build</label>
                      <input
                        type="text"
                        value={customPerson.build}
                        onChange={(e) => setCustomPerson((prev) => ({ ...prev, build: e.target.value }))}
                        placeholder="e.g., Athletic"
                        className="w-full rounded-md border border-hairline bg-surface-raised px-3 py-2 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="mb-1 block text-xs text-muted">Clothing</label>
                      <input
                        type="text"
                        value={customPerson.clothing}
                        onChange={(e) => setCustomPerson((prev) => ({ ...prev, clothing: e.target.value }))}
                        placeholder="e.g., Red dress"
                        className="w-full rounded-md border border-hairline bg-surface-raised px-3 py-2 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Scene Description */}
              <div>
                <label className="mb-2 block text-sm font-medium text-muted">Scene Description *</label>
                <textarea
                  value={sceneDescription}
                  onChange={(e) => setSceneDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe the scene you want to create... (e.g., standing on a beach at sunset, wearing a red dress, smiling at camera)"
                  className="w-full resize-none rounded-lg border border-hairline bg-surface-raised px-4 py-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>

              {/* Art Style */}
              <div>
                <label className="mb-3 block text-sm font-medium text-muted">Art Style</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setArtStyle('realistic')}
                    className={`rounded-lg border-2 p-3 text-sm font-semibold transition ${
                      artStyle === 'realistic'
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-hairline bg-surface text-ink hover:border-accent/40'
                    }`}
                  >
                    Realistic
                  </button>
                  <button
                    type="button"
                    onClick={() => setArtStyle('anime')}
                    className={`rounded-lg border-2 p-3 text-sm font-semibold transition ${
                      artStyle === 'anime'
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-hairline bg-surface text-ink hover:border-accent/40'
                    }`}
                  >
                    Anime
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
                  {error}
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-6 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                <Sparkles size={18} />
                {generating ? 'Generating...' : 'Generate Image'}
              </button>
            </div>

            {/* Right: Preview */}
            <div className="flex items-center justify-center rounded-xl border border-hairline bg-surface p-8">
              {generating ? (
                <div className="text-center">
                  <div className="mb-4 inline-block h-16 w-16 animate-spin rounded-full border-4 border-accent border-t-transparent" />
                  <p className="text-sm font-medium text-muted">Creating your masterpiece...</p>
                </div>
              ) : generatedImage ? (
                <div className="w-full space-y-4">
                  <div className="relative overflow-hidden rounded-lg">
                    <img
                      src={getImageUrl(generatedImage.url)}
                      alt={generatedImage.description}
                      className="w-full h-auto"
                    />
                  </div>
                  <a
                    href={getImageUrl(generatedImage.url)}
                    download
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-accent bg-accent/10 px-4 py-3 font-semibold text-accent transition hover:bg-accent/20"
                  >
                    <Download size={18} />
                    Download Image
                  </a>
                </div>
              ) : (
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-accent-2/20">
                    <CameraIcon size={40} className="text-accent" />
                  </div>
                  <p className="text-sm text-muted">Your generated image will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
