import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BadgeCheck,
  Settings,
  EyeOff,
  ImagePlus,
  Lightbulb,
  NotebookPen,
  Clapperboard,
  SendHorizontal,
} from 'lucide-react';
import { api, ApiError, type Character } from '../lib/api';
import { Avatar } from '../components/Avatar';

const toolbarActions = [
  { label: 'NSFW', icon: EyeOff, className: 'border border-hairline bg-surface text-muted' },
  { label: 'Generate Image', icon: ImagePlus, className: 'bg-gradient-to-r from-accent to-danger text-white' },
  { label: 'Suggest Reply', icon: Lightbulb, className: 'bg-gradient-to-r from-accent-2 to-accent text-white' },
  { label: 'Write Story', icon: NotebookPen, className: 'bg-gradient-to-r from-accent-2 to-blue-500 text-white' },
  { label: 'Film', icon: Clapperboard, className: 'bg-presence text-void' },
];

interface DisplayMessage {
  id: string | number;
  role: 'user' | 'assistant';
  content: string;
  pending?: boolean;
  failed?: boolean;
  idempotencyKey?: string;
}

interface ChatImageData {
  url: string;
  description: string;
  messageId: string | number;
}

interface ExpAnimation {
  from: number;
  to: number;
  timestamp: number;
}

export function ChatPage() {
  const { characterId } = useParams();
  const id = Number(characterId);

  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [images, setImages] = useState<ChatImageData[]>([]);
  const [featuredImage, setFeaturedImage] = useState<ChatImageData | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [characterExp, setCharacterExp] = useState(0);
  const [expAnimation, setExpAnimation] = useState<ExpAnimation | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCharacter(null);
    setMessages([]);
    setLoadError(null);
    setCharacterExp(0);
    Promise.all([api.getCharacter(id), api.getHistory(id)])
      .then(([char, history]) => {
        setCharacter(char);
        setCharacterExp(char.exp || 0);
        setMessages(history);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Failed to load chat'));
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    if (images.length > 0) {
      setFeaturedImage(images[images.length - 1]);
    }
  }, [images]);

  async function send(text: string, idempotencyKey: string, optimisticId: string) {
    setSending(true);
    setError(null);
    setLoadingImage(true);
    try {
      const response = await api.sendMessage(id, text, idempotencyKey);
      const replyId = `${optimisticId}-reply`;

      setMessages((prev) => [
        ...prev.map((m) => (m.id === optimisticId ? { ...m, pending: false, failed: false } : m)),
        { id: replyId, role: 'assistant' as const, content: response.message },
      ]);

      // Handle image if present
      if (response.image) {
        setImages((prev) => [
          ...prev,
          {
            url: response.image!.url,
            description: response.image!.description,
            messageId: replyId,
          },
        ]);
      }

      // Handle EXP gain if present
      if (response.expGained !== undefined) {
        const oldExp = characterExp;
        const newExp = oldExp + response.expGained;
        setExpAnimation({ from: oldExp, to: newExp, timestamp: Date.now() });
        setCharacterExp(newExp);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send message');
      setMessages((prev) => prev.map((m) => (m.id === optimisticId ? { ...m, pending: false, failed: true } : m)));
    } finally {
      setSending(false);
      setLoadingImage(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    const idempotencyKey = crypto.randomUUID();
    const optimisticId = `pending-${idempotencyKey}`;
    setMessages((prev) => [
      ...prev,
      { id: optimisticId, role: 'user', content: text, pending: true, idempotencyKey },
    ]);
    send(text, idempotencyKey, optimisticId);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  }

  function retry(m: DisplayMessage) {
    if (!m.idempotencyKey || sending) return;
    setMessages((prev) => prev.map((msg) => (msg.id === m.id ? { ...msg, pending: true, failed: false } : msg)));
    send(m.content, m.idempotencyKey, m.id as string);
  }

  if (loadError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-danger">{loadError}</p>
        <Link to="/" className="text-sm text-accent hover:underline">
          Back to companions
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full flex-1">
      {/* LEFT: Chat column */}
      <div className="glow-field flex min-w-0 flex-1 flex-col">
        <div className="w-full shrink-0 border-b border-hairline">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 md:px-6">
          {character ? (
            <>
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative shrink-0">
                  <Avatar name={character.name} ring src={character.avatarUrl} />
                  <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-presence ring-2 ring-void" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h1 className="truncate font-display font-semibold text-ink">{character.name}</h1>
                    <BadgeCheck size={16} className="shrink-0 fill-accent text-void" />
                  </div>
                  <p className="text-xs text-presence">Online</p>
                  {/* EXP Bar */}
                  <div className="mt-1 flex items-center gap-2">
                    <div className="relative h-1.5 flex-1 max-w-[120px] overflow-hidden rounded-full bg-surface-raised">
                      <div
                        className="h-full bg-gradient-to-r from-accent to-accent-2 transition-all duration-1000 ease-out"
                        style={{
                          width: `${Math.min(100, ((characterExp % 100) / 100) * 100)}%`,
                        }}
                      />
                      {expAnimation && Date.now() - expAnimation.timestamp < 1000 && (
                        <div className="absolute inset-0 animate-pulse bg-accent/30" />
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-faint">
                      Lv.{Math.floor(characterExp / 100) + 1}
                    </span>
                  </div>
                </div>
              </div>
              <button
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-accent to-accent-2 px-3.5 py-2 text-xs font-semibold text-white pill-glow transition hover:brightness-110"
                title="Coming soon"
              >
                <Settings size={14} /> <span className="hidden sm:inline">Chat Settings</span>
              </button>
            </>
          ) : (
            <div className="h-10 w-40 animate-pulse rounded-md bg-surface" />
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 md:px-6">
          {messages.length === 0 && !sending && (
            <p className="pt-10 text-center text-sm text-faint">
              Say hi to {character?.name ?? 'your companion'} to get started.
            </p>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && character && <Avatar name={character.name} size="sm" src={character.avatarUrl} />}
              <div className="max-w-[75%]">
                <div
                  className={`rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? `bg-gradient-to-br from-accent to-accent-2 text-white ${
                          m.pending ? 'opacity-60 animate-pulse' : ''
                        } ${
                          m.failed ? '!bg-none !bg-danger shadow-lg shadow-danger/30' : 'shadow-md shadow-accent/20'
                        }`
                      : 'border border-hairline bg-surface-raised text-ink transition hover:border-hairline-soft hover:bg-surface'
                  }`}
                >
                  {m.content}
                </div>
                {m.failed && (
                  <button onClick={() => retry(m)} className="mt-1 text-xs text-danger hover:underline">
                    Failed to send · Retry
                  </button>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex items-end gap-2 justify-start">
              {character && <Avatar name={character.name} size="sm" src={character.avatarUrl} />}
              <div className="flex gap-1 rounded-2xl bg-surface-raised px-4 py-3">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="w-full shrink-0 border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 pt-3 pb-1 md:px-6">
          {error && (
            <div className="mb-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>
          )}

          <div className="flex gap-2 overflow-x-auto pb-3">
            {toolbarActions.map(({ label, icon: Icon, className }) => (
              <button
                key={label}
                type="button"
                title="Coming soon"
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition hover:brightness-110 ${className}`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="flex items-end gap-2 pb-4">
            <div className="relative flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder={`Message ${character?.name ?? ''}…`}
                className="flex-1 w-full resize-none rounded-full border border-hairline bg-surface px-4 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send"
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-accent to-accent-2 text-white transition hover:brightness-110 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 pill-glow"
            >
              <SendHorizontal size={18} />
            </button>
          </form>
        </div>
      </div>
      </div>
      {/* END LEFT: Chat column */}

      {/* RIGHT: Image sidebar */}
      <aside className="hidden lg:flex w-96 flex-col border-l border-hairline bg-void">
        {/* Header with gradient glow */}
        <div className="border-b border-hairline bg-void px-4 py-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent-2/5" />
          <div className="relative">
            <h2 className="font-display text-base font-semibold text-ink flex items-center gap-2">
              <Clapperboard size={18} className="text-accent" />
              Scene Gallery
            </h2>
            <p className="text-xs text-faint mt-1">
              AI-generated moments from your conversation
            </p>
          </div>
        </div>

        {/* Hero/Featured Image Section */}
        {(featuredImage || loadingImage) && (
          <div className="shrink-0 p-4">
            {loadingImage && !featuredImage ? (
              <div className="aspect-[3/4] overflow-hidden rounded-xl bg-surface-raised relative">
                <div className="absolute inset-0 loading-shimmer" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="mb-2 text-accent">
                      <ImagePlus size={32} className="animate-pulse mx-auto" />
                    </div>
                    <p className="text-sm text-muted">Generating scene...</p>
                  </div>
                </div>
              </div>
            ) : featuredImage ? (
              <div className="group relative animate-fade-in-up">
                <div className="aspect-[3/4] overflow-hidden rounded-xl relative">
                  <img
                    src={featuredImage.url}
                    alt={featuredImage.description}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-sm text-ink/90 line-clamp-3">{featuredImage.description}</p>
                  </div>
                </div>
                <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-accent to-accent-2 opacity-0 blur transition group-hover:opacity-30 pointer-events-none" />
              </div>
            ) : null}
          </div>
        )}

        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {images.length === 0 && !loadingImage && (
            <div className="flex h-full items-center justify-center p-8">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-accent-2/20">
                  <ImagePlus size={32} className="text-accent" />
                </div>
                <p className="text-sm text-muted mb-1">No scenes yet</p>
                <p className="text-xs text-faint">
                  Images will appear here as you chat
                </p>
              </div>
            </div>
          )}

          {images.length > 0 && (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {images.length > 1 ? 'Previous Scenes' : 'Current Scene'}
                </h3>
                {images.length > 1 && (
                  <span className="text-xs text-faint">{images.length - 1} more</span>
                )}
              </div>

              <div className="space-y-3">
                {images
                  .slice()
                  .reverse()
                  .slice(1)
                  .map((img, idx) => (
                    <div
                      key={idx}
                      className="group relative cursor-pointer overflow-hidden rounded-lg border border-hairline bg-surface transition-all hover:border-accent/40 hover:shadow-lg hover:shadow-accent/10 animate-fade-in-up"
                      style={{ animationDelay: `${idx * 50}ms` }}
                      onClick={() => setFeaturedImage(img)}
                    >
                      <div className="aspect-square overflow-hidden">
                        <img
                          src={img.url}
                          alt={img.description}
                          className="h-full w-full object-cover transition-all duration-300 group-hover:scale-110"
                          loading="lazy"
                        />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-void/80 via-transparent opacity-0 transition group-hover:opacity-100">
                        <div className="absolute bottom-0 p-3">
                          <p className="text-xs text-ink/90 line-clamp-2">{img.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      </aside>
      {/* END RIGHT: Image sidebar */}
    </div>
  );
}
