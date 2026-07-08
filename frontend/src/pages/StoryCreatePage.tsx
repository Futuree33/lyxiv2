import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Book, Users as UsersIcon, Sparkles, Check } from 'lucide-react';
import { api } from '../lib/api';
import { useCharacters } from '../context/CharactersContext';
import { Avatar } from '../components/Avatar';

const POV_OPTIONS = [
  { value: 'first_person', label: 'First Person', description: 'I, me, my' },
  { value: 'third_person', label: 'Third Person', description: 'He, she, they' },
  { value: 'second_person', label: 'Second Person', description: 'You, your' },
];

const GENRE_PRESETS = [
  'Fantasy', 'Romance', 'Sci-Fi', 'Mystery', 'Thriller',
  'Horror', 'Adventure', 'Drama', 'Comedy', 'Historical',
];

const STEPS = ['Basic Info', 'Settings', 'Characters', 'Planning', 'Chapter 1'];

export function StoryCreatePage() {
  const navigate = useNavigate();
  const { characters } = useCharacters();
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);

  // Form data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pov, setPov] = useState('first_person');
  const [genres, setGenres] = useState<string[]>([]);
  const [plotIdea, setPlotIdea] = useState('');
  const [storyPlan, setStoryPlan] = useState('');
  const [selectedCharacters, setSelectedCharacters] = useState<number[]>([]);
  const [characterRoles, setCharacterRoles] = useState<Record<number, string>>({});
  const [firstChapterPrompt, setFirstChapterPrompt] = useState('');

  // Auto-save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      if (title || description) {
        api.saveDraft({
          title,
          description,
          pov,
          genres,
          plotIdea,
          storyPlan,
          selectedCharacters,
          characterRoles,
          firstChapterPrompt,
          step,
        }).catch(console.error);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [title, description, pov, genres, plotIdea, storyPlan, selectedCharacters, characterRoles, firstChapterPrompt, step]);

  // Load draft on mount
  useEffect(() => {
    api.getDraft().then((draft) => {
      if (draft?.draftData) {
        const data = draft.draftData;
        if (data.title) setTitle(data.title);
        if (data.description) setDescription(data.description);
        if (data.pov) setPov(data.pov);
        if (data.genres) setGenres(data.genres);
        if (data.plotIdea) setPlotIdea(data.plotIdea);
        if (data.storyPlan) setStoryPlan(data.storyPlan);
        if (data.selectedCharacters) setSelectedCharacters(data.selectedCharacters);
        if (data.characterRoles) setCharacterRoles(data.characterRoles);
        if (data.firstChapterPrompt) setFirstChapterPrompt(data.firstChapterPrompt);
        if (data.step) setStep(data.step);
      }
    }).catch(console.error);
  }, []);

  const toggleGenre = (genre: string) => {
    setGenres((prev) => (prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]));
  };

  const toggleCharacter = (id: number) => {
    setSelectedCharacters((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
    if (!selectedCharacters.includes(id)) {
      setCharacterRoles((prev) => ({ ...prev, [id]: 'supporting' }));
    }
  };

  const handleCreate = async () => {
    if (!firstChapterPrompt.trim()) {
      alert('Please provide a prompt for Chapter 1');
      return;
    }

    setCreating(true);
    try {
      const result = await api.createStory({
        title,
        description,
        pov,
        genre: genres,
        plotIdea,
        storyPlan,
        characterIds: selectedCharacters,
        characterRoles,
        firstChapterPrompt,
      });

      // Clear draft
      await api.deleteDraft().catch(console.error);

      // Navigate to story detail
      navigate(`/stories/${result.id}`);
    } catch (err) {
      console.error('Failed to create story:', err);
      alert('Failed to create story. Please try again.');
      setCreating(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0: return title.trim() && description.trim();
      case 1: return pov && genres.length > 0;
      case 2: return true; // Characters optional
      case 3: return true; // Planning optional
      case 4: return firstChapterPrompt.trim();
      default: return false;
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-10 md:px-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-4xl font-bold text-ink md:text-5xl">Create Story</h1>
        <p className="mt-2 text-lg text-muted">Bring your story to life with AI</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-10 flex items-center justify-between">
        {STEPS.map((label, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition ${
                index < step
                  ? 'bg-presence text-white'
                  : index === step
                  ? 'bg-accent text-white'
                  : 'bg-surface-raised text-muted'
              }`}
            >
              {index < step ? <Check size={16} /> : index + 1}
            </div>
            <span className={`hidden text-sm font-medium sm:block ${index === step ? 'text-ink' : 'text-muted'}`}>
              {label}
            </span>
            {index < STEPS.length - 1 && (
              <div className={`hidden h-0.5 w-12 sm:block ${index < step ? 'bg-presence' : 'bg-surface-raised'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Form Content */}
      <div className="rounded-xl border border-hairline bg-surface p-8 animate-fade-in-up">
        {/* Step 0: Basic Info */}
        {step === 0 && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl font-bold text-ink">Basic Information</h2>

            <div>
              <label className="mb-2 block text-sm font-semibold text-ink">Story Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="The Chronicles of Midnight"
                className="w-full rounded-lg border-2 border-hairline bg-void px-4 py-3 text-base text-ink placeholder-faint outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/10"
                maxLength={200}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-ink">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A thrilling adventure through time and space..."
                className="w-full rounded-lg border-2 border-hairline bg-void px-4 py-3 text-base text-ink placeholder-faint outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/10"
                rows={4}
                maxLength={2000}
              />
              <p className="mt-1 text-xs text-muted">{description.length}/2000 characters</p>
            </div>
          </div>
        )}

        {/* Step 1: Settings */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl font-bold text-ink">Story Settings</h2>

            <div>
              <label className="mb-3 block text-sm font-semibold text-ink">Point of View</label>
              <div className="grid gap-3 sm:grid-cols-3">
                {POV_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setPov(option.value)}
                    className={`rounded-lg border-2 p-4 text-left transition ${
                      pov === option.value
                        ? 'border-accent bg-accent/10'
                        : 'border-hairline bg-void hover:border-accent/40'
                    }`}
                  >
                    <p className="font-semibold text-ink">{option.label}</p>
                    <p className="text-sm text-muted">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-3 block text-sm font-semibold text-ink">Genres (Select 1-3)</label>
              <div className="flex flex-wrap gap-2">
                {GENRE_PRESETS.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      genres.includes(genre)
                        ? 'bg-accent text-white'
                        : 'bg-surface-raised text-muted hover:bg-accent/20'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Characters */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl font-bold text-ink">Include Characters</h2>
            <p className="text-muted">Select characters from your collection to include in this story (optional)</p>

            {characters && characters.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {characters.map((char) => {
                  const isSelected = selectedCharacters.includes(char.id);
                  return (
                    <button
                      key={char.id}
                      onClick={() => toggleCharacter(char.id)}
                      className={`flex items-start gap-3 rounded-lg border-2 p-4 text-left transition ${
                        isSelected ? 'border-accent bg-accent/10' : 'border-hairline bg-void hover:border-accent/40'
                      }`}
                    >
                      <Avatar name={char.name} src={char.avatarUrl} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ink">{char.name}</p>
                        <p className="text-sm text-muted line-clamp-2">{char.persona}</p>
                        {isSelected && (
                          <select
                            value={characterRoles[char.id] || 'supporting'}
                            onChange={(e) => {
                              e.stopPropagation();
                              setCharacterRoles((prev) => ({ ...prev, [char.id]: e.target.value }));
                            }}
                            className="mt-2 rounded border border-hairline bg-void px-2 py-1 text-sm text-ink"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="protagonist">Protagonist</option>
                            <option value="antagonist">Antagonist</option>
                            <option value="supporting">Supporting</option>
                            <option value="cameo">Cameo</option>
                          </select>
                        )}
                      </div>
                      {isSelected && <Check className="shrink-0 text-accent" size={20} />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted py-8">No characters available. You can create characters later!</p>
            )}
          </div>
        )}

        {/* Step 3: Planning */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl font-bold text-ink">Story Planning</h2>
            <p className="text-muted">Help the AI understand your vision (optional but recommended)</p>

            <div>
              <label className="mb-2 block text-sm font-semibold text-ink">Plot Idea</label>
              <textarea
                value={plotIdea}
                onChange={(e) => setPlotIdea(e.target.value)}
                placeholder="A lone hero discovers a hidden power that could save or destroy the world..."
                className="w-full rounded-lg border-2 border-hairline bg-void px-4 py-3 text-base text-ink placeholder-faint outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/10"
                rows={4}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-ink">Story Outline/Plan</label>
              <textarea
                value={storyPlan}
                onChange={(e) => setStoryPlan(e.target.value)}
                placeholder="Chapter 1: Discovery&#10;Chapter 2: Training&#10;Chapter 3: First Challenge&#10;..."
                className="w-full rounded-lg border-2 border-hairline bg-void px-4 py-3 text-base text-ink placeholder-faint outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/10"
                rows={8}
              />
            </div>
          </div>
        )}

        {/* Step 4: Chapter 1 Prompt */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl font-bold text-ink">Chapter 1 Prompt</h2>
            <p className="text-muted">Describe what should happen in the opening chapter</p>

            <div>
              <label className="mb-2 block text-sm font-semibold text-ink">Chapter 1 Instructions</label>
              <textarea
                value={firstChapterPrompt}
                onChange={(e) => setFirstChapterPrompt(e.target.value)}
                placeholder="Write the opening scene where the hero discovers their power. Start with them in their everyday life, then introduce the inciting incident..."
                className="w-full rounded-lg border-2 border-hairline bg-void px-4 py-3 text-base text-ink placeholder-faint outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/10"
                rows={6}
              />
            </div>

            {/* Review Summary */}
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
              <h3 className="mb-3 font-semibold text-ink">Review Your Story</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium text-ink">Title:</span> <span className="text-muted">{title}</span></p>
                <p><span className="font-medium text-ink">POV:</span> <span className="text-muted capitalize">{pov.replace('_', ' ')}</span></p>
                <p><span className="font-medium text-ink">Genres:</span> <span className="text-muted">{genres.join(', ')}</span></p>
                <p><span className="font-medium text-ink">Characters:</span> <span className="text-muted">{selectedCharacters.length} selected</span></p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => step > 0 && setStep(step - 1)}
            disabled={step === 0}
            className="flex items-center gap-2 rounded-lg border border-hairline px-6 py-3 text-sm font-semibold text-ink transition hover:bg-surface-raised disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={20} />
            <span>Back</span>
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => canProceed() && setStep(step + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Next</span>
              <ChevronRight size={20} />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={!canProceed() || creating}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Creating Story...</span>
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  <span>Create Story</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
