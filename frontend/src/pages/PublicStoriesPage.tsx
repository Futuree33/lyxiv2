import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, FileText, Users, Eye, Copy, Search } from 'lucide-react';
import { api, type Story } from '../lib/api';

const GENRE_FILTERS = ['All', 'Fantasy', 'Romance', 'Sci-Fi', 'Mystery', 'Thriller', 'Horror', 'Adventure', 'Drama'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'cloned', label: 'Most Cloned' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function PublicStoriesPage() {
  const navigate = useNavigate();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [cloningId, setCloningId] = useState<number | null>(null);

  useEffect(() => {
    loadStories();
  }, [selectedGenre, sortBy]);

  const loadStories = async () => {
    try {
      setLoading(true);
      const data = await api.getPublicStories(
        1,
        50,
        selectedGenre === 'All' ? undefined : selectedGenre,
        sortBy
      );
      setStories(data);
    } catch (err) {
      console.error('Failed to load public stories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async (storyId: number, title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm(`Clone "${title}"? This will create a copy in your library.`)) {
      return;
    }

    try {
      setCloningId(storyId);
      const result = await api.cloneStory(storyId);
      alert('Story cloned successfully!');
      navigate(`/stories/${result.id}`);
    } catch (err) {
      console.error('Failed to clone story:', err);
      alert('Failed to clone story');
    } finally {
      setCloningId(null);
    }
  };

  const filteredStories = stories.filter(
    (story) =>
      story.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      story.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 md:px-10">
      {/* Header */}
      <div className="mb-8">
        <Link to="/stories" className="mb-4 flex items-center gap-2 text-muted transition hover:text-ink">
          <ArrowLeft size={20} />
          <span>Back to My Stories</span>
        </Link>

        <h1 className="font-display text-4xl font-bold text-ink md:text-5xl">Public Stories</h1>
        <p className="mt-2 text-lg text-muted">Discover and clone stories from the community</p>
      </div>

      {/* Filters */}
      <div className="mb-8 space-y-4 rounded-xl border border-hairline bg-surface p-6">
        {/* Search */}
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search stories..."
            className="w-full rounded-lg border-2 border-hairline bg-void py-2 pl-10 pr-4 text-base text-ink placeholder-faint outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/10"
          />
        </div>

        {/* Genre Filters */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">Genre</label>
          <div className="flex flex-wrap gap-2">
            {GENRE_FILTERS.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedGenre === genre
                    ? 'bg-accent text-white'
                    : 'bg-surface-raised text-muted hover:bg-accent/20'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">Sort By</label>
          <div className="flex gap-2">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  sortBy === option.value
                    ? 'bg-accent text-white'
                    : 'bg-surface-raised text-muted hover:bg-accent/20'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl border border-hairline bg-surface" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredStories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen size={48} className="mb-4 text-muted" />
          <p className="text-lg font-semibold text-ink">No stories found</p>
          <p className="text-muted">Try adjusting your filters or search term</p>
        </div>
      )}

      {/* Stories Grid */}
      {!loading && filteredStories.length > 0 && (
        <div>
          <p className="mb-4 text-sm text-muted">
            {filteredStories.length} {filteredStories.length === 1 ? 'story' : 'stories'} found
          </p>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStories.map((story, index) => (
              <div
                key={story.id}
                className="card-hover group relative flex flex-col gap-4 rounded-xl border border-hairline bg-surface p-6 transition-all hover:border-accent/40 hover:shadow-lg hover:shadow-accent/10 animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Header */}
                <div>
                  <h3 className="mb-1 truncate font-display text-xl font-bold text-ink group-hover:text-accent transition-colors">
                    {story.title}
                  </h3>
                  <p className="text-xs text-muted">{formatDate(story.createdAt)}</p>
                </div>

                {/* Description */}
                <p className="line-clamp-3 text-sm text-muted leading-relaxed group-hover:text-ink transition-colors">
                  {story.description}
                </p>

                {/* Genre Tags */}
                {story.genre && story.genre.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {story.genre.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
                        {tag}
                      </span>
                    ))}
                    {story.genre.length > 3 && (
                      <span className="rounded-full bg-muted/20 px-2 py-0.5 text-xs text-muted">
                        +{story.genre.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className="flex flex-wrap gap-3 text-xs text-muted border-t border-hairline/50 pt-3">
                  <div className="flex items-center gap-1">
                    <FileText size={14} />
                    <span>{story.chapterCount} ch</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>{story.averageReadingTime}m</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye size={14} />
                    <span>{story.viewCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users size={14} />
                    <span>{story.cloneCount}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Link
                    to={`/stories/${story.id}/read/1`}
                    onClick={() => api.incrementStoryView(story.id).catch(console.error)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-accent bg-accent/10 px-3 py-2 text-sm font-semibold text-accent transition hover:bg-accent/20"
                  >
                    <BookOpen size={14} />
                    <span>Read</span>
                  </Link>

                  <button
                    onClick={(e) => handleClone(story.id, story.title, e)}
                    disabled={cloningId === story.id}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-3 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-50"
                  >
                    <Copy size={14} />
                    <span>Clone</span>
                  </button>
                </div>

                {/* Hover Overlay */}
                <Link
                  to={`/stories/${story.id}/read/1`}
                  onClick={() => api.incrementStoryView(story.id).catch(console.error)}
                  className="absolute inset-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-accent/90 to-accent-2/90 opacity-0 transition-all duration-300 group-hover:opacity-100"
                >
                  <span className="font-bold text-white text-lg shadow-lg flex items-center gap-2">
                    <BookOpen size={20} />
                    Read Story →
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
