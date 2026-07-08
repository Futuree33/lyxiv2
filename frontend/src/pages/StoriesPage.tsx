import { Link } from 'react-router-dom';
import { BookOpen, Plus, Clock, FileText, Eye, Users, Sparkles, Trash2, Lock } from 'lucide-react';
import { useStories } from '../context/StoriesContext';
import { api } from '../lib/api';
import { useState } from 'react';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getStatusBadge(status: string) {
  const badges = {
    draft: { label: 'Draft', class: 'bg-muted/20 text-muted' },
    in_progress: { label: 'In Progress', class: 'bg-accent/20 text-accent' },
    completed: { label: 'Completed', class: 'bg-presence/20 text-presence' },
    abandoned: { label: 'Abandoned', class: 'bg-danger/20 text-danger' },
  };
  return badges[status as keyof typeof badges] || badges.draft;
}

export function StoriesPage() {
  const { stories, loading, error, refresh } = useStories();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (storyId: number, title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(storyId);
      await api.deleteStory(storyId);
      await refresh();
    } catch (err) {
      console.error('Failed to delete story:', err);
      alert('Failed to delete story');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleVisibility = async (storyId: number, isPublic: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await api.toggleStoryVisibility(storyId, !isPublic);
      await refresh();
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
      alert('Failed to update story visibility');
    }
  };

  // Empty state for new users
  if (stories !== null && stories.length === 0) {
    return (
      <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 md:px-10">
        <div className="flex min-h-[70vh] flex-col items-center justify-center text-center animate-fade-in-up">
          <div className="mb-8 animate-float text-8xl">📖</div>
          <h1 className="font-display text-5xl font-bold text-ink mb-4 bg-gradient-to-r from-accent via-accent-2 to-accent bg-clip-text text-transparent md:text-6xl">
            Your Story Library
          </h1>
          <p className="max-w-2xl text-xl text-muted mb-8 leading-relaxed">
            Create immersive multi-chapter stories powered by AI. Include your characters, guide the narrative, and share your creations with the world.
          </p>
          <Link
            to="/stories/create"
            className="button-scale flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:shadow-xl transition hover:scale-105"
          >
            <Plus size={24} />
            <span>Create Your First Story</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 md:px-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="font-display text-4xl font-bold text-ink md:text-5xl">Stories</h1>
          <p className="mt-2 text-lg text-muted">Your AI-powered story collection</p>
        </div>
        <Link
          to="/stories/create"
          className="button-scale flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-6 py-3 text-base font-semibold text-white shadow-md hover:shadow-lg transition hover:scale-105"
        >
          <Plus size={20} />
          <span>New Story</span>
        </Link>
      </div>

      {/* Quick Links */}
      <div className="mb-8 flex gap-3 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        <Link
          to="/stories/public"
          className="flex items-center gap-2 rounded-lg border border-hairline bg-surface px-4 py-2 text-sm font-medium text-muted transition hover:border-accent/40 hover:text-ink"
        >
          <Users size={16} />
          <span>Browse Public Stories</span>
        </Link>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl border border-hairline bg-surface" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-danger">
          <p className="font-semibold">Failed to load stories</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Stories Grid */}
      {stories && stories.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          {stories.map((story, index) => {
            const statusBadge = getStatusBadge(story.status);
            const isPublic = story.isPublic === 1;

            return (
              <div
                key={story.id}
                className="card-hover group relative flex flex-col gap-4 rounded-xl border border-hairline bg-surface p-6 transition-all hover:border-accent/40 hover:shadow-lg hover:shadow-accent/10"
                style={{ animationDelay: `${(index + 1) * 50}ms` }}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <Link to={`/stories/${story.id}`} className="flex-1 min-w-0">
                    <h3 className="truncate font-display text-xl font-bold text-ink group-hover:text-accent transition-colors">
                      {story.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted">{formatDate(story.createdAt)}</p>
                  </Link>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${statusBadge.class}`}>
                    {statusBadge.label}
                  </span>
                </div>

                {/* Description */}
                <Link to={`/stories/${story.id}`} className="flex-1">
                  <p className="line-clamp-3 text-sm text-muted leading-relaxed group-hover:text-ink transition-colors">
                    {story.description}
                  </p>
                </Link>

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
                    <span>{story.chapterCount} chapters</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>{story.averageReadingTime} min read</span>
                  </div>
                  {isPublic && (
                    <>
                      <div className="flex items-center gap-1">
                        <Eye size={14} />
                        <span>{story.viewCount} views</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users size={14} />
                        <span>{story.cloneCount} clones</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={(e) => handleToggleVisibility(story.id, isPublic, e)}
                    className={`button-scale flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition hover:scale-105 ${
                      isPublic
                        ? 'bg-presence/20 text-presence hover:bg-presence/30'
                        : 'bg-gradient-to-r from-accent to-accent-2 text-white shadow-md hover:shadow-lg'
                    }`}
                  >
                    {isPublic ? (
                      <>
                        <Lock size={14} />
                        <span>Unpublish</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>Publish</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={(e) => handleDelete(story.id, story.title, e)}
                    disabled={deletingId === story.id}
                    className="button-scale rounded-lg bg-danger/20 px-3 py-2 text-danger transition hover:bg-danger/30 hover:scale-105 disabled:opacity-50"
                    title="Delete story"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Continue Reading Overlay */}
                <Link
                  to={`/stories/${story.id}`}
                  className="absolute inset-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-accent/90 to-accent-2/90 opacity-0 transition-all duration-300 group-hover:opacity-100"
                >
                  <span className="font-bold text-white text-lg shadow-lg flex items-center gap-2">
                    <BookOpen size={20} />
                    View Story →
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
