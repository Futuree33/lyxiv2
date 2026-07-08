import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  Type,
  X,
} from 'lucide-react';
import { api, type Story, type StoryChapter, type ReadingProgress } from '../lib/api';

const FONT_SIZES = {
  small: '1rem',
  medium: '1.125rem',
  large: '1.25rem',
};

export function StoryReaderPage() {
  const { storyId, chapterNumber } = useParams<{ storyId: string; chapterNumber?: string }>();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);

  const [story, setStory] = useState<Story | null>(null);
  const [chapter, setChapter] = useState<StoryChapter | null>(null);
  const [chapters, setChapters] = useState<StoryChapter[]>([]);
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [readingStartTime, setReadingStartTime] = useState<number>(Date.now());

  // Load font size from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('reader-font-size') as 'small' | 'medium' | 'large' | null;
    if (saved) setFontSize(saved);
  }, []);

  // Save font size to localStorage
  const changeFontSize = (size: 'small' | 'medium' | 'large') => {
    setFontSize(size);
    localStorage.setItem('reader-font-size', size);
  };

  // Load story and chapter
  useEffect(() => {
    if (!storyId) return;
    loadContent();
  }, [storyId, chapterNumber]);

  const loadContent = async () => {
    try {
      setLoading(true);
      const chapterNum = chapterNumber ? Number(chapterNumber) : 1;

      const [storyData, chaptersData, chapterData, progressData] = await Promise.all([
        api.getStory(Number(storyId)),
        api.getChapters(Number(storyId)),
        api.getChapter(Number(storyId), chapterNum),
        api.getReadingProgress(Number(storyId)).catch(() => null),
      ]);

      setStory(storyData);
      setChapters(chaptersData);
      setChapter(chapterData);
      setProgress(progressData);
      setReadingStartTime(Date.now());

      // Scroll to saved position
      if (progressData && progressData.lastChapterNumber === chapterNum && contentRef.current) {
        setTimeout(() => {
          if (contentRef.current) {
            const scrollTop = (progressData.scrollPosition / 100) * contentRef.current.scrollHeight;
            contentRef.current.scrollTop = scrollTop;
          }
        }, 100);
      }
    } catch (err) {
      console.error('Failed to load chapter:', err);
      alert('Failed to load chapter');
      navigate(`/stories/${storyId}`);
    } finally {
      setLoading(false);
    }
  };

  // Save reading progress periodically
  useEffect(() => {
    if (!chapter || !contentRef.current) return;

    const saveProgress = () => {
      const element = contentRef.current;
      if (!element) return;

      const scrollPosition = Math.round((element.scrollTop / element.scrollHeight) * 100);
      const readingTimeSeconds = Math.floor((Date.now() - readingStartTime) / 1000);

      api.updateReadingProgress(Number(storyId), {
        lastChapterNumber: chapter.chapterNumber,
        scrollPosition,
        readingTimeSeconds,
      }).catch(console.error);
    };

    const interval = setInterval(saveProgress, 5000); // Save every 5 seconds
    return () => clearInterval(interval);
  }, [storyId, chapter, readingStartTime]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && canGoPrev()) {
        handlePrevChapter();
      } else if (e.key === 'ArrowRight' && canGoNext()) {
        handleNextChapter();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chapter, chapters]);

  const canGoPrev = () => chapter && chapter.chapterNumber > 1;
  const canGoNext = () => chapter && chapters.length > chapter.chapterNumber;

  const handlePrevChapter = () => {
    if (!canGoPrev() || !chapter) return;
    navigate(`/stories/${storyId}/read/${chapter.chapterNumber - 1}`);
  };

  const handleNextChapter = () => {
    if (!canGoNext() || !chapter) return;
    navigate(`/stories/${storyId}/read/${chapter.chapterNumber + 1}`);
  };

  const handleCreateBookmark = async () => {
    if (!chapter || !contentRef.current) return;

    try {
      const scrollPosition = contentRef.current.scrollTop;
      await api.createBookmark(Number(storyId), {
        chapterId: chapter.id,
        chapterPosition: scrollPosition,
        note: bookmarkNote.trim() || undefined,
        color: 'accent',
      });
      setShowBookmarkModal(false);
      setBookmarkNote('');
      alert('Bookmark created!');
    } catch (err) {
      console.error('Failed to create bookmark:', err);
      alert('Failed to create bookmark');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!story || !chapter) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col bg-void">
      {/* Reader Toolbar */}
      <div className="flex items-center justify-between border-b border-hairline bg-surface px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            to={`/stories/${storyId}`}
            className="flex items-center gap-2 text-muted transition hover:text-ink"
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Back to Story</span>
          </Link>
          <div className="h-6 w-px bg-hairline" />
          <div>
            <p className="text-sm font-semibold text-ink">{story.title}</p>
            <p className="text-xs text-muted">
              Chapter {chapter.chapterNumber}: {chapter.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Font Size Controls */}
          <div className="flex items-center gap-1 rounded-lg border border-hairline bg-void p-1">
            <button
              onClick={() => changeFontSize('small')}
              className={`rounded px-2 py-1 text-xs font-semibold transition ${
                fontSize === 'small' ? 'bg-accent text-white' : 'text-muted hover:text-ink'
              }`}
              title="Small"
            >
              A-
            </button>
            <button
              onClick={() => changeFontSize('medium')}
              className={`rounded px-2 py-1 text-sm font-semibold transition ${
                fontSize === 'medium' ? 'bg-accent text-white' : 'text-muted hover:text-ink'
              }`}
              title="Medium"
            >
              A
            </button>
            <button
              onClick={() => changeFontSize('large')}
              className={`rounded px-2 py-1 text-base font-semibold transition ${
                fontSize === 'large' ? 'bg-accent text-white' : 'text-muted hover:text-ink'
              }`}
              title="Large"
            >
              A+
            </button>
          </div>

          {/* Bookmark Button */}
          <button
            onClick={() => setShowBookmarkModal(true)}
            className="rounded-lg border border-hairline bg-void p-2 text-muted transition hover:bg-surface hover:text-accent"
            title="Add bookmark"
          >
            <Bookmark size={20} />
          </button>
        </div>
      </div>

      {/* Reader Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-12">
        <article className="mx-auto max-w-3xl">
          <h1 className="mb-8 font-display text-4xl font-bold text-ink">
            Chapter {chapter.chapterNumber}: {chapter.title}
          </h1>

          <div
            className="story-reader-content prose prose-invert max-w-none"
            style={{ fontSize: FONT_SIZES[fontSize] }}
          >
            {chapter.content.split('\n\n').map((paragraph, index) => (
              <p key={index} className="mb-6 leading-relaxed text-ink">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Chapter Navigation */}
          <div className="mt-12 flex items-center justify-between border-t border-hairline pt-8">
            <button
              onClick={handlePrevChapter}
              disabled={!canGoPrev()}
              className="flex items-center gap-2 rounded-lg border border-hairline px-6 py-3 text-sm font-semibold text-ink transition hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} />
              <span>Previous Chapter</span>
            </button>

            <button
              onClick={handleNextChapter}
              disabled={!canGoNext()}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Next Chapter</span>
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Reading Stats */}
          <div className="mt-8 text-center text-sm text-muted">
            <p>{chapter.wordCount.toLocaleString()} words · {chapter.readingTime} min read</p>
          </div>
        </article>
      </div>

      {/* Bookmark Modal */}
      {showBookmarkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4">
          <div className="w-full max-w-md rounded-xl border border-hairline bg-surface p-6 shadow-2xl animate-fade-in-up">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-ink">Add Bookmark</h3>
              <button
                onClick={() => {
                  setShowBookmarkModal(false);
                  setBookmarkNote('');
                }}
                className="text-muted transition hover:text-ink"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mb-4 text-sm text-muted">
              Bookmark this location in Chapter {chapter.chapterNumber}
            </p>

            <textarea
              value={bookmarkNote}
              onChange={(e) => setBookmarkNote(e.target.value)}
              placeholder="Add a note (optional)"
              className="mb-4 w-full rounded-lg border-2 border-hairline bg-void px-4 py-3 text-sm text-ink placeholder-faint outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/10"
              rows={3}
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBookmarkModal(false);
                  setBookmarkNote('');
                }}
                className="flex-1 rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface-raised"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBookmark}
                className="flex-1 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
              >
                Save Bookmark
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
