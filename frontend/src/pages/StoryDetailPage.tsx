import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  FileText,
  Clock,
  Eye,
  Users,
  Sparkles,
  Lock,
  Trash2,
  BookOpen,
  Edit,
} from 'lucide-react';
import { api, type Story, type StoryChapter } from '../lib/api';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function StoryDetailPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const [story, setStory] = useState<Story | null>(null);
  const [chapters, setChapters] = useState<StoryChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generatingChapter, setGeneratingChapter] = useState(false);
  const [chapterPrompt, setChapterPrompt] = useState('');

  useEffect(() => {
    if (!storyId) return;
    loadStory();
  }, [storyId]);

  const loadStory = async () => {
    try {
      setLoading(true);
      const [storyData, chaptersData] = await Promise.all([
        api.getStory(Number(storyId)),
        api.getChapters(Number(storyId)),
      ]);
      setStory(storyData);
      setChapters(chaptersData);
    } catch (err) {
      console.error('Failed to load story:', err);
      alert('Failed to load story');
      navigate('/stories');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateChapter = async () => {
    if (!chapterPrompt.trim() || !storyId) return;

    try {
      setGeneratingChapter(true);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/stories/${storyId}/chapters/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ continuationPrompt: chapterPrompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate chapter');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      let currentEvent = '';

      // Read the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);

              if (currentEvent === 'done') {
                console.log('✅ Chapter generated:', parsed);
                setShowGenerateModal(false);
                setChapterPrompt('');
                setGeneratingChapter(false);
                await loadStory(); // Reload to get new chapter
                return;
              } else if (currentEvent === 'error') {
                throw new Error(parsed.message || 'Generation failed');
              } else if (currentEvent === 'token') {
                // Token streaming - just log for now
                console.log('Generating...', parsed.content);
              }
            } catch (e) {
              if (currentEvent === 'done' || currentEvent === 'error') {
                throw e;
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to generate chapter:', err);
      setGeneratingChapter(false);
      alert('Failed to generate chapter');
    }
  };

  const handleToggleVisibility = async () => {
    if (!story) return;

    try {
      await api.toggleStoryVisibility(story.id, !story.isPublic);
      await loadStory();
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
      alert('Failed to update visibility');
    }
  };

  const handleDelete = async () => {
    if (!story) return;

    if (!window.confirm(`Are you sure you want to delete "${story.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      await api.deleteStory(story.id);
      navigate('/stories');
    } catch (err) {
      console.error('Failed to delete story:', err);
      alert('Failed to delete story');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:px-10">
        <div className="h-64 animate-pulse rounded-xl border border-hairline bg-surface" />
      </div>
    );
  }

  if (!story) {
    return null;
  }

  const isPublic = story.isPublic === 1;

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:px-10">
      {/* Back Button */}
      <Link to="/stories" className="mb-6 flex items-center gap-2 text-muted transition hover:text-ink">
        <ArrowLeft size={20} />
        <span>Back to Stories</span>
      </Link>

      {/* Story Header */}
      <div className="mb-8 rounded-xl border border-hairline bg-surface p-8 animate-fade-in-up">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="font-display text-4xl font-bold text-ink md:text-5xl">{story.title}</h1>
            <p className="mt-2 text-lg text-muted">{story.description}</p>
            <p className="mt-1 text-sm text-faint">Created {formatDate(story.createdAt)}</p>
          </div>
        </div>

        {/* Genre Tags */}
        {story.genre && story.genre.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {story.genre.map((tag) => (
              <span key={tag} className="rounded-full bg-accent/20 px-3 py-1 text-sm text-accent">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-accent" />
            <span className="font-semibold text-ink">{story.chapterCount}</span>
            <span className="text-muted">chapters</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-accent" />
            <span className="font-semibold text-ink">{story.totalWordCount.toLocaleString()}</span>
            <span className="text-muted">words</span>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-accent" />
            <span className="font-semibold text-ink">{story.averageReadingTime}</span>
            <span className="text-muted">min read</span>
          </div>
          {isPublic && (
            <>
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-accent" />
                <span className="font-semibold text-ink">{story.viewCount}</span>
                <span className="text-muted">views</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-accent" />
                <span className="font-semibold text-ink">{story.cloneCount}</span>
                <span className="text-muted">clones</span>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleToggleVisibility}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition hover:scale-105 ${
              isPublic
                ? 'bg-presence/20 text-presence hover:bg-presence/30'
                : 'bg-gradient-to-r from-accent to-accent-2 text-white shadow-md hover:shadow-lg'
            }`}
          >
            {isPublic ? (
              <>
                <Lock size={16} />
                <span>Unpublish</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Publish</span>
              </>
            )}
          </button>

          <button
            onClick={handleDelete}
            className="flex items-center gap-2 rounded-lg bg-danger/20 px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger/30 hover:scale-105"
          >
            <Trash2 size={16} />
            <span>Delete Story</span>
          </button>
        </div>
      </div>

      {/* Chapters Section */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-ink">Chapters</h2>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg hover:scale-105"
        >
          <Plus size={16} />
          <span>Generate Next Chapter</span>
        </button>
      </div>

      {/* Chapters List */}
      {chapters.length === 0 ? (
        <p className="text-center text-muted py-12">No chapters yet. Generate the first chapter!</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          {chapters.map((chapter, index) => (
            <Link
              key={chapter.id}
              to={`/stories/${storyId}/read/${chapter.chapterNumber}`}
              className="card-hover group flex flex-col gap-3 rounded-xl border border-hairline bg-surface p-5 transition-all hover:border-accent/40 hover:shadow-lg hover:shadow-accent/10"
              style={{ animationDelay: `${(index + 1) * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-accent">Chapter {chapter.chapterNumber}</p>
                  <h3 className="mt-1 font-display text-lg font-bold text-ink group-hover:text-accent transition-colors">
                    {chapter.title}
                  </h3>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-muted">
                <div className="flex items-center gap-1">
                  <FileText size={12} />
                  <span>{chapter.wordCount.toLocaleString()} words</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>{chapter.readingTime} min</span>
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-hairline/50 pt-3">
                <span className="text-xs text-faint">{formatDate(chapter.createdAt)}</span>
                <span className="text-xs font-semibold text-accent group-hover:underline">Read →</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Generate Chapter Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-hairline bg-surface p-8 shadow-2xl animate-fade-in-up">
            <h3 className="mb-4 font-display text-2xl font-bold text-ink">Generate Next Chapter</h3>
            <p className="mb-6 text-muted">
              Describe what should happen in Chapter {chapters.length + 1}
            </p>

            <textarea
              value={chapterPrompt}
              onChange={(e) => setChapterPrompt(e.target.value)}
              placeholder="The hero continues their journey and faces a new challenge..."
              className="mb-6 w-full rounded-lg border-2 border-hairline bg-void px-4 py-3 text-base text-ink placeholder-faint outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/10"
              rows={6}
              disabled={generatingChapter}
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  setChapterPrompt('');
                }}
                disabled={generatingChapter}
                className="flex-1 rounded-lg border border-hairline px-4 py-3 text-sm font-semibold text-ink transition hover:bg-surface-raised disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateChapter}
                disabled={!chapterPrompt.trim() || generatingChapter}
                className="flex-1 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-50"
              >
                {generatingChapter ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Generating...
                  </span>
                ) : (
                  'Generate Chapter'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
