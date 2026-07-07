import { useState, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, Upload, Sparkles, Wand2, Check, X, Plus } from 'lucide-react';
import { Modal } from './Modal';
import { useCharacters } from '../context/CharactersContext';
import { api, ApiError, type Character } from '../lib/api';

type Step = 1 | 2 | 3 | 4 | 5;

interface FormData {
  name: string;
  gender: string;
  relationshipToUser: string;
  eyeColor: string;
  hairColor: string;
  hairStyle: string;
  height: string;
  build: string;
  ethnicity: string;
  artStyle: 'realistic' | 'anime' | '';
  age: string;
  hobbies: string[];
  likes: string[];
  traits: string[];
  backstory: string;
  avatarUrl?: string;
}

const PRESET_HOBBIES = ['Gaming', 'Reading', 'Cooking', 'Sports', 'Music', 'Art', 'Travel', 'Movies', 'Anime', 'Photography', 'Writing', 'Dancing'];
const PRESET_LIKES = ['Coffee', 'Tea', 'Cats', 'Dogs', 'Nature', 'Technology', 'Fashion', 'Food', 'Sci-Fi', 'Fantasy', 'Romance', 'Mystery'];
const PRESET_TRAITS = ['Friendly', 'Shy', 'Confident', 'Playful', 'Serious', 'Caring', 'Witty', 'Energetic', 'Calm', 'Curious', 'Loyal', 'Adventurous', 'Mysterious', 'Flirty'];

// Parse persona string to extract traits, hobbies, and likes
function parsePersona(persona?: string): { traits: string[]; hobbies: string[]; likes: string[] } {
  if (!persona) return { traits: [], hobbies: [], likes: [] };

  const result = { traits: [] as string[], hobbies: [] as string[], likes: [] as string[] };

  // Match patterns like "Personality: Friendly, Witty. Hobbies: Gaming, Reading. Likes: Coffee, Cats."
  const personalityMatch = persona.match(/Personality:\s*([^.]+)/i);
  const hobbiesMatch = persona.match(/Hobbies:\s*([^.]+)/i);
  const likesMatch = persona.match(/Likes:\s*([^.]+)/i);

  if (personalityMatch) {
    result.traits = personalityMatch[1].split(',').map(s => s.trim()).filter(Boolean);
  }
  if (hobbiesMatch) {
    result.hobbies = hobbiesMatch[1].split(',').map(s => s.trim()).filter(Boolean);
  }
  if (likesMatch) {
    result.likes = likesMatch[1].split(',').map(s => s.trim()).filter(Boolean);
  }

  return result;
}

function TagInput({
  label,
  emoji,
  values,
  presets,
  onChange,
  placeholder,
}: {
  label: string;
  emoji: string;
  values: string[];
  presets: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [inputValue, setInputValue] = useState('');
  const [showPresets, setShowPresets] = useState(false);

  const addValue = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
      setInputValue('');
    }
  };

  const removeValue = (value: string) => {
    onChange(values.filter((v) => v !== value));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addValue(inputValue);
    }
  };

  const filteredPresets = presets.filter((p) => !values.includes(p));

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-ink">
        {emoji} {label}
      </label>

      {/* Selected tags */}
      {values.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-3 py-1 text-sm font-medium text-accent animate-fade-in-up"
            >
              {value}
              <button
                type="button"
                onClick={() => removeValue(value)}
                className="hover:text-accent-soft transition-colors"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowPresets(true)}
          onBlur={() => setTimeout(() => setShowPresets(false), 200)}
          placeholder={placeholder}
          className="w-full rounded-lg border-2 border-hairline bg-void px-4 py-2.5 text-sm text-ink placeholder-faint outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/10"
        />
        {inputValue && (
          <button
            type="button"
            onClick={() => addValue(inputValue)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-accent p-1.5 text-white hover:bg-accent-soft transition-colors"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Preset suggestions */}
      {showPresets && filteredPresets.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {filteredPresets.slice(0, 8).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => addValue(preset)}
              className="button-scale rounded-full border border-hairline bg-surface px-3 py-1 text-xs font-medium text-muted hover:border-accent/40 hover:text-accent transition-all"
            >
              + {preset}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function NewCompanionModal({
  onClose,
  prefillData,
}: {
  onClose: () => void;
  prefillData?: Character | null;
}) {
  const { createCharacter } = useCharacters();
  const navigate = useNavigate();
  const isCloning = Boolean(prefillData);

  // Parse persona to extract tags when cloning
  const parsedPersona = prefillData ? parsePersona(prefillData.persona) : { traits: [], hobbies: [], likes: [] };

  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<FormData>({
    name: prefillData?.name || '',
    gender: prefillData?.gender || '',
    relationshipToUser: prefillData?.relationshipToUser || '',
    eyeColor: prefillData?.eyeColor || '',
    hairColor: prefillData?.hairColor || '',
    hairStyle: prefillData?.hairStyle || '',
    height: prefillData?.height || '',
    build: prefillData?.build || '',
    ethnicity: prefillData?.ethnicity || '',
    artStyle: (prefillData?.artStyle as 'realistic' | 'anime' | '') || '',
    age: prefillData?.age?.toString() || '',
    hobbies: parsedPersona.hobbies,
    likes: parsedPersona.likes,
    traits: parsedPersona.traits,
    backstory: prefillData?.backstory || '',
    avatarUrl: prefillData?.avatarUrl || undefined,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Live preview states
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(prefillData?.avatarUrl || null);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [previewLocked, setPreviewLocked] = useState(false);

  // Avatar selection states
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  function updateField(field: keyof FormData, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  // Build persona from tags
  function buildPersona(): string {
    const parts = [];

    if (formData.traits.length > 0) {
      parts.push(`Personality: ${formData.traits.join(', ')}`);
    }

    if (formData.hobbies.length > 0) {
      parts.push(`Hobbies: ${formData.hobbies.join(', ')}`);
    }

    if (formData.likes.length > 0) {
      parts.push(`Likes: ${formData.likes.join(', ')}`);
    }

    return parts.join('. ');
  }

  // Generate live preview based on current form data
  async function generateLivePreview() {
    if (!formData.name.trim()) return;

    setGeneratingPreview(true);
    setError(null);

    try {
      const styleSuffix = formData.artStyle === 'anime'
        ? ', anime style, manga art'
        : ', photorealistic, professional photography';

      const description = [
        formData.age ? `${formData.age} years old` : '',
        formData.ethnicity || '',
        formData.gender || 'person',
        formData.eyeColor ? `${formData.eyeColor} eyes` : '',
        formData.hairColor && formData.hairStyle
          ? `${formData.hairColor} ${formData.hairStyle} hair`
          : formData.hairColor
          ? `${formData.hairColor} hair`
          : '',
        formData.build ? `${formData.build} build` : '',
      ]
        .filter(Boolean)
        .join(', ');

      const result = await api.generateCharacterAvatarTurbo({
        name: formData.name,
        description: (description || 'person') + styleSuffix,
      });

      setLivePreviewUrl(result.url);
    } catch (err) {
      console.error('Preview generation failed:', err);
    } finally {
      setGeneratingPreview(false);
    }
  }

  // Generate preview when moving to certain steps (only if not locked)
  useEffect(() => {
    if (step >= 2 && formData.name.trim() && !isCloning && !previewLocked) {
      generateLivePreview();
    }
  }, [step]);

  // Auto-select the generated preview when reaching step 5
  useEffect(() => {
    if (step === 5 && livePreviewUrl && !formData.avatarUrl) {
      setFormData(prev => ({ ...prev, avatarUrl: livePreviewUrl }));
    }
  }, [step, livePreviewUrl]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (step < 5) {
      setStep(((step + 1) as Step));
      return;
    }

    // Final submission
    setError(null);
    setLoading(true);
    try {
      let character;
      if (isCloning && prefillData) {
        character = await api.cloneCharacter(prefillData.id);
      } else {
        const persona = buildPersona();
        character = await createCharacter({
          ...formData,
          age: formData.age ? parseInt(formData.age) : undefined,
          persona,
          avatarUrl: formData.avatarUrl || undefined
        });
      }
      onClose();
      navigate(`/chat/${character.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create companion');
    } finally {
      setLoading(false);
    }
  }

  async function handleKeepPreview() {
    if (livePreviewUrl) {
      setFormData(prev => ({ ...prev, avatarUrl: livePreviewUrl }));
    }
  }

  async function handleRegenerateHQ() {
    setGeneratingPreview(true);
    setError(null);
    try {
      const styleSuffix = formData.artStyle === 'anime'
        ? ', anime style, manga art, high quality'
        : ', photorealistic, professional photography, high quality';

      const description = [
        formData.age ? `${formData.age} years old` : '',
        formData.ethnicity || '',
        formData.gender || 'person',
        formData.eyeColor ? `${formData.eyeColor} eyes` : '',
        formData.hairColor && formData.hairStyle
          ? `${formData.hairColor} ${formData.hairStyle} hair`
          : '',
        formData.build ? `${formData.build} build` : '',
      ]
        .filter(Boolean)
        .join(', ');

      const result = await api.generateCharacterAvatar({
        name: formData.name,
        description: (description || 'person') + styleSuffix,
      });
      setLivePreviewUrl(result.url);
      setFormData(prev => ({ ...prev, avatarUrl: result.url }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to generate high-quality image');
    } finally {
      setGeneratingPreview(false);
    }
  }

  async function handleUploadImage() {
    if (avatarFile) {
      try {
        const uploadData = new FormData();
        uploadData.append('file', avatarFile);
        const result = await api.uploadAvatar(uploadData);
        setFormData(prev => ({ ...prev, avatarUrl: result.url }));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to upload image');
      }
    }
  }

  const canProceed =
    step === 1 ? formData.name.trim() :
    step === 4 ? (formData.traits.length > 0 || formData.hobbies.length > 0 || formData.likes.length > 0) :
    step === 5 ? !!formData.avatarUrl || uploadPreview :
    true;

  const stepTitles = [
    '👋 Basic Info',
    '✨ Appearance',
    '🌍 Demographics & Style',
    '💭 Personality',
    '🎨 Finalize Avatar',
  ];

  return (
    <Modal
      title={isCloning ? `Cloning: ${prefillData?.name}` : stepTitles[step - 1]}
      onClose={onClose}
      wide
    >
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left side - Form */}
        <div className="flex-1 max-h-[70vh] overflow-y-auto pr-2">
          <form onSubmit={handleSubmit} className="space-y-5">
            {isCloning && (
              <div className="animate-fade-in-up rounded-lg border border-accent/40 bg-gradient-to-r from-accent/10 to-accent-2/10 px-4 py-3 text-sm text-accent">
                ✨ Cloning "{prefillData?.name}"
              </div>
            )}
            {error && (
              <div className="animate-fade-in-up rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
                ⚠️ {error}
              </div>
            )}

            {/* Step indicator */}
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                    s === step
                      ? 'bg-gradient-to-r from-accent to-accent-2 shadow-lg shadow-accent/30'
                      : s < step
                      ? 'bg-accent/50'
                      : 'bg-hairline'
                  }`}
                />
              ))}
            </div>

            <div className="text-center">
              <p className="text-xs font-medium text-faint">Step {step} of 5</p>
            </div>

            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in-up">
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink">
                    💫 Name <span className="text-danger">*</span>
                  </label>
                  <input
                    required
                    autoFocus
                    maxLength={50}
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="e.g., Luna, Alex, Kai..."
                    className="w-full rounded-lg border-2 border-hairline bg-void px-4 py-3 text-base text-ink placeholder-faint outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-ink">⚧️ Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => updateField('gender', e.target.value)}
                    className="w-full rounded-lg border-2 border-hairline bg-void px-4 py-3 text-base text-ink outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/10"
                  >
                    <option value="">Not specified</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="non-binary">Non-binary</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-ink">🤝 Relationship</label>
                  <select
                    value={formData.relationshipToUser}
                    onChange={(e) => updateField('relationshipToUser', e.target.value)}
                    className="w-full rounded-lg border-2 border-hairline bg-void px-4 py-3 text-base text-ink outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/10"
                  >
                    <option value="">Choose...</option>
                    <option value="best friend">Best Friend</option>
                    <option value="childhood friend">Childhood Friend</option>
                    <option value="romantic partner">Romantic Partner</option>
                    <option value="mentor">Mentor</option>
                    <option value="sibling">Sibling</option>
                    <option value="stranger">Stranger</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 2: Appearance */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink">👁️ Eyes</label>
                    <select
                      value={formData.eyeColor}
                      onChange={(e) => updateField('eyeColor', e.target.value)}
                      className="w-full rounded-lg border-2 border-hairline bg-void px-3 py-2.5 text-sm text-ink outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/10"
                    >
                      <option value="">Any</option>
                      <option value="blue">Blue</option>
                      <option value="green">Green</option>
                      <option value="brown">Brown</option>
                      <option value="hazel">Hazel</option>
                      <option value="amber">Amber</option>
                      <option value="gray">Gray</option>
                      <option value="violet">Violet</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink">💇 Hair Color</label>
                    <select
                      value={formData.hairColor}
                      onChange={(e) => updateField('hairColor', e.target.value)}
                      className="w-full rounded-lg border-2 border-hairline bg-void px-3 py-2.5 text-sm text-ink outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/10"
                    >
                      <option value="">Any</option>
                      <option value="black">Black</option>
                      <option value="brown">Brown</option>
                      <option value="blonde">Blonde</option>
                      <option value="red">Red</option>
                      <option value="white">White</option>
                      <option value="pink">Pink</option>
                      <option value="blue">Blue</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-ink">💈 Hair Style</label>
                  <select
                    value={formData.hairStyle}
                    onChange={(e) => updateField('hairStyle', e.target.value)}
                    className="w-full rounded-lg border-2 border-hairline bg-void px-4 py-2.5 text-sm text-ink outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/10"
                  >
                    <option value="">Any</option>
                    <option value="long and straight">Long & Straight</option>
                    <option value="long and wavy">Long & Wavy</option>
                    <option value="short">Short</option>
                    <option value="pixie cut">Pixie Cut</option>
                    <option value="bob cut">Bob Cut</option>
                    <option value="ponytail">Ponytail</option>
                    <option value="braided">Braided</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-ink">💪 Build</label>
                  <select
                    value={formData.build}
                    onChange={(e) => updateField('build', e.target.value)}
                    className="w-full rounded-lg border-2 border-hairline bg-void px-4 py-2.5 text-sm text-ink outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/10"
                  >
                    <option value="">Any</option>
                    <option value="slim">Slim</option>
                    <option value="athletic">Athletic</option>
                    <option value="average">Average</option>
                    <option value="muscular">Muscular</option>
                    <option value="curvy">Curvy</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 3: Demographics & Style */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in-up">
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink">🌍 Ethnicity</label>
                  <select
                    value={formData.ethnicity}
                    onChange={(e) => updateField('ethnicity', e.target.value)}
                    className="w-full rounded-lg border-2 border-hairline bg-void px-4 py-2.5 text-sm text-ink outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/10"
                  >
                    <option value="">Any</option>
                    <option value="East Asian">East Asian</option>
                    <option value="South Asian">South Asian</option>
                    <option value="Southeast Asian">Southeast Asian</option>
                    <option value="European">European</option>
                    <option value="African">African</option>
                    <option value="Latino/Hispanic">Latino/Hispanic</option>
                    <option value="Middle Eastern">Middle Eastern</option>
                    <option value="Native American">Native American</option>
                    <option value="Pacific Islander">Pacific Islander</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-ink">🎨 Art Style</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateField('artStyle', 'realistic')}
                      className={`button-scale rounded-lg border-2 p-4 text-left transition-all ${
                        formData.artStyle === 'realistic'
                          ? 'border-accent bg-accent/10 ring-2 ring-accent/30'
                          : 'border-hairline hover:border-accent/40'
                      }`}
                    >
                      <div className="text-2xl mb-1">📸</div>
                      <p className="font-semibold text-ink">Realistic</p>
                      <p className="text-xs text-muted">Photo-realistic style</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateField('artStyle', 'anime')}
                      className={`button-scale rounded-lg border-2 p-4 text-left transition-all ${
                        formData.artStyle === 'anime'
                          ? 'border-accent bg-accent/10 ring-2 ring-accent/30'
                          : 'border-hairline hover:border-accent/40'
                      }`}
                    >
                      <div className="text-2xl mb-1">🎌</div>
                      <p className="font-semibold text-ink">Anime</p>
                      <p className="text-xs text-muted">Anime/manga style</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-ink">🎂 Age</label>
                  <input
                    type="number"
                    min="18"
                    max="100"
                    value={formData.age}
                    onChange={(e) => updateField('age', e.target.value)}
                    placeholder="e.g., 25"
                    className="w-full rounded-lg border-2 border-hairline bg-void px-4 py-2.5 text-sm text-ink placeholder-faint outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/10"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Personality */}
            {step === 4 && (
              <div className="space-y-4 animate-fade-in-up">
                <p className="text-center text-sm text-muted mb-3">
                  Click presets or type your own and press Enter
                </p>

                <TagInput
                  label="Personality Traits"
                  emoji="💭"
                  values={formData.traits}
                  presets={PRESET_TRAITS}
                  onChange={(v) => updateField('traits', v)}
                  placeholder="e.g., Friendly, Witty..."
                />

                <TagInput
                  label="Hobbies & Interests"
                  emoji="🎮"
                  values={formData.hobbies}
                  presets={PRESET_HOBBIES}
                  onChange={(v) => updateField('hobbies', v)}
                  placeholder="e.g., Gaming, Reading..."
                />

                <TagInput
                  label="Likes & Preferences"
                  emoji="❤️"
                  values={formData.likes}
                  presets={PRESET_LIKES}
                  onChange={(v) => updateField('likes', v)}
                  placeholder="e.g., Coffee, Cats..."
                />

                <div>
                  <label className="mb-2 block text-sm font-medium text-ink">📖 Backstory</label>
                  <textarea
                    maxLength={2000}
                    rows={4}
                    value={formData.backstory}
                    onChange={(e) => updateField('backstory', e.target.value)}
                    placeholder="Their history and experiences..."
                    className="w-full resize-none rounded-lg border-2 border-hairline bg-void px-4 py-3 text-sm text-ink placeholder-faint outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/10"
                  />
                  <p className="mt-1 text-xs text-faint">{formData.backstory.length}/2000</p>
                </div>
              </div>
            )}

            {/* Step 5: Avatar Choice */}
            {step === 5 && (
              <div className="space-y-5 animate-fade-in-up">
                <div className="text-center">
                  <p className="text-lg font-bold text-ink mb-2">Choose Your Avatar</p>
                  <p className="text-sm text-muted">Pick an option below</p>
                </div>

                {/* Option 1: Keep Generated */}
                {livePreviewUrl && !uploadPreview && (
                  <button
                    type="button"
                    onClick={handleKeepPreview}
                    className={`button-scale w-full rounded-lg border-2 p-4 text-left transition-all ${
                      formData.avatarUrl === livePreviewUrl
                        ? 'border-accent bg-accent/10 ring-2 ring-accent/30'
                        : 'border-hairline hover:border-accent/40 hover:bg-surface-raised'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2">
                        <Check size={20} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-ink">Use Generated Preview</p>
                        <p className="text-xs text-muted">Fast & ready to go</p>
                      </div>
                      {formData.avatarUrl === livePreviewUrl && (
                        <div className="text-accent">✓</div>
                      )}
                    </div>
                  </button>
                )}

                {/* Option 2: Better Quality */}
                <button
                  type="button"
                  onClick={handleRegenerateHQ}
                  disabled={generatingPreview}
                  className="button-scale w-full rounded-lg border-2 border-hairline p-4 text-left transition-all hover:border-accent/40 hover:bg-surface-raised disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent-2 to-presence">
                      <Sparkles size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-ink">
                        {generatingPreview ? 'Generating...' : 'Generate High Quality'}
                      </p>
                      <p className="text-xs text-muted">Better model, takes ~30s</p>
                    </div>
                  </div>
                </button>

                {/* Option 3: Upload */}
                <label className="button-scale block w-full cursor-pointer rounded-lg border-2 border-hairline p-4 text-left transition-all hover:border-accent/40 hover:bg-surface-raised">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-warn to-danger">
                      <Upload size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-ink">Upload Custom Image</p>
                      <p className="text-xs text-muted">Use your own photo</p>
                    </div>
                    {uploadPreview && <div className="text-accent">✓</div>}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setAvatarFile(file);
                        const url = URL.createObjectURL(file);
                        setUploadPreview(url);
                        setLivePreviewUrl(url);
                        handleUploadImage();
                      }
                    }}
                  />
                </label>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 pt-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(((step - 1) as Step))}
                  className="button-scale flex-1 rounded-lg border-2 border-hairline bg-void px-4 py-3 text-sm font-semibold text-muted transition-all hover:border-accent/40 hover:bg-surface hover:text-ink"
                >
                  ← Back
                </button>
              )}
              <button
                type="submit"
                disabled={!canProceed || loading}
                className="button-glow button-scale flex-1 rounded-lg bg-gradient-to-r from-accent via-accent-2 to-accent animate-gradient px-4 py-3 text-sm font-bold text-white shadow-lg shadow-accent/30 transition-all hover:shadow-xl hover:shadow-accent/40 disabled:opacity-50"
              >
                {loading ? '✨ Creating...' : step === 5 ? '🎉 Create' : 'Next →'}
              </button>
            </div>
          </form>
        </div>

        {/* Right side - Live Preview */}
        <div className="lg:w-80 flex-shrink-0">
          <div className="sticky top-6 space-y-3 animate-fade-in-up">
            <div className="rounded-lg border border-hairline bg-surface p-4">
              <p className="mb-3 text-center text-sm font-semibold text-ink">
                {formData.name ? `${formData.name}'s Preview` : 'Live Preview'}
              </p>

              <div className="relative">
                {step === 1 ? (
                  <div className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-hairline bg-gradient-to-br from-accent/5 via-accent-2/5 to-accent/5">
                    <div className="text-center px-4">
                      <Sparkles size={48} className="mx-auto mb-3 text-accent/40 animate-pulse" />
                      <p className="text-sm font-medium text-ink mb-1">Preview Coming Soon</p>
                      <p className="text-xs text-faint">Fill in details to see a live preview</p>
                    </div>
                  </div>
                ) : generatingPreview ? (
                  <div className="flex aspect-square items-center justify-center rounded-lg bg-gradient-to-br from-accent/20 to-accent-2/20 animate-pulse">
                    <div className="text-center">
                      <Wand2 size={40} className="mx-auto mb-2 animate-spin text-accent" />
                      <p className="text-sm font-medium text-accent">Generating...</p>
                    </div>
                  </div>
                ) : livePreviewUrl ? (
                  <div className="relative">
                    <img
                      src={livePreviewUrl}
                      alt="Character preview"
                      className="aspect-square w-full rounded-lg object-cover ring-2 ring-accent/30 shadow-xl shadow-accent/20 transition-all"
                    />
                    {previewLocked && (
                      <div className="absolute top-2 right-2 rounded-full bg-accent px-2 py-1 text-xs font-bold text-white shadow-lg">
                        🔒 Locked
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-hairline bg-surface-raised">
                    <div className="text-center">
                      <ImagePlus size={40} className="mx-auto mb-2 text-faint" />
                      <p className="text-sm text-faint">Preview will appear here</p>
                    </div>
                  </div>
                )}
              </div>

              {livePreviewUrl && !previewLocked && step < 5 && (
                <button
                  type="button"
                  onClick={() => setPreviewLocked(true)}
                  className="button-scale mt-3 w-full rounded-lg border-2 border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition-all hover:border-accent hover:bg-accent/20"
                >
                  🔒 Hold this look
                </button>
              )}

              {previewLocked && step < 5 && (
                <button
                  type="button"
                  onClick={() => setPreviewLocked(false)}
                  className="button-scale mt-3 w-full rounded-lg border-2 border-hairline bg-surface-raised px-4 py-2 text-sm font-semibold text-muted transition-all hover:border-accent/40 hover:text-ink"
                >
                  🔓 Unlock preview
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
