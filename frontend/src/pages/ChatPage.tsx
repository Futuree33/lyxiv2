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
  Trash2,
} from 'lucide-react';
import { api, ApiError, type Character, getImageUrl } from '../lib/api';
import { Avatar } from '../components/Avatar';
import { ChatSettingsModal } from '../components/ChatSettingsModal';
import { ImagePromptModal } from '../components/ImagePromptModal';
import { GeneratingImageModal } from '../components/GeneratingImageModal';
import { ImageViewerModal } from '../components/ImageViewerModal';
import { AtmospherePanel } from '../components/AtmospherePanel';
import { NarratorMessage } from '../components/NarratorMessage';

const toolbarActions = [
  { label: 'NSFW', icon: EyeOff, className: 'border border-hairline bg-surface text-muted' },
  { label: 'Generate Image', icon: ImagePlus, className: 'bg-gradient-to-r from-accent to-danger text-white' },
  { label: 'Suggest Reply', icon: Lightbulb, className: 'bg-gradient-to-r from-accent-2 to-accent text-white' },
  { label: 'Write Story', icon: NotebookPen, className: 'bg-gradient-to-r from-accent-2 to-blue-500 text-white' },
  { label: 'Film', icon: Clapperboard, className: 'bg-presence text-void' },
];

interface DisplayMessage {
  id: string | number;
  role: 'user' | 'assistant' | 'narrator';
  content: string;
  pending?: boolean;
  failed?: boolean;
  idempotencyKey?: string;
  narratorType?: 'time_skip' | 'scene_transition' | 'mood_shift' | 'narrative_beat';
}

interface ChatImageData {
  id: number;
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
  const [showSettings, setShowSettings] = useState(false);
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [loadingGreeting, setLoadingGreeting] = useState(false);
  const [generatingManualImage, setGeneratingManualImage] = useState(false);
  const [viewingImage, setViewingImage] = useState<ChatImageData | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasRequestedGreeting = useRef(false);

  // Calculate visual intensity (0-100) from intimacy level and narrative tension
  const visualIntensity = character ? (() => {
    const intimacyLevel = character.intimacyLevel || 0;
    let narrativeTension = 5; // default
    if (character.narrativeArc) {
      try {
        const arc = JSON.parse(character.narrativeArc);
        narrativeTension = arc.tension || 5;
      } catch (e) {
        // ignore parse error
      }
    }
    return Math.min(100, (intimacyLevel * 5) + (narrativeTension * 3));
  })() : 0;

  const intensityClass = visualIntensity > 70
    ? 'intensity-high'
    : visualIntensity > 40
    ? 'intensity-medium'
    : 'intensity-low';

  useEffect(() => {
    setCharacter(null);
    setMessages([]);
    setImages([]);
    setLoadError(null);
    setCharacterExp(0);
    hasRequestedGreeting.current = false;
    Promise.all([api.getCharacter(id), api.getHistory(id), api.getNarratorMessages(id), api.getCharacterImages(id)])
      .then(([char, history, narratorMsgs, historicalImages]) => {
        setCharacter(char);
        setCharacterExp(char.exp || 0);

        // Merge narrator messages into the timeline
        const mergedMessages: DisplayMessage[] = [];
        const narratorByPosition = new Map<number | null, typeof narratorMsgs>();

        // Group narrator messages by insertedAfterMessageId
        for (const nm of narratorMsgs) {
          const key = nm.insertedAfterMessageId;
          if (!narratorByPosition.has(key)) {
            narratorByPosition.set(key, []);
          }
          narratorByPosition.get(key)!.push(nm);
        }

        // Insert narrator messages at the beginning if they have no insertedAfterMessageId
        const initialNarrators = narratorByPosition.get(null) || [];
        for (const nm of initialNarrators) {
          mergedMessages.push({
            id: `narrator-${nm.id}`,
            role: 'narrator',
            content: nm.content,
            narratorType: nm.type,
          });
        }

        // Merge history with narrator messages
        for (const msg of history) {
          mergedMessages.push(msg);

          // Insert narrator messages that come after this message
          const narratorsAfter = narratorByPosition.get(msg.id) || [];
          for (const nm of narratorsAfter) {
            mergedMessages.push({
              id: `narrator-${nm.id}`,
              role: 'narrator',
              content: nm.content,
              narratorType: nm.type,
            });
          }
        }

        setMessages(mergedMessages);

        // Load historical images and map them to their messages
        const imageData: ChatImageData[] = historicalImages.map((img) => ({
          id: img.id,
          url: img.imageUrl,
          description: img.sceneDescription,
          messageId: img.chatLogId,
        }));
        setImages(imageData);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Failed to load chat'));
  }, [id]);

  // Auto-request greeting if chat is empty
  useEffect(() => {
    if (character && messages.length === 0 && !loadingGreeting && !hasRequestedGreeting.current && !sending) {
      hasRequestedGreeting.current = true;
      setLoadingGreeting(true);
      setSending(true); // Show typing indicator
      api.getGreeting(id)
        .then((response) => {
          setMessages([{ id: 'greeting', role: 'assistant', content: response.message }]);
        })
        .catch((err) => {
          console.error('Failed to get greeting:', err);
          hasRequestedGreeting.current = false;
        })
        .finally(() => {
          setLoadingGreeting(false);
          setSending(false);
        });
    }
  }, [character, messages.length, id, loadingGreeting, sending]);

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
    setLoadingImage(false);

    const replyId = `${optimisticId}-reply`;
    let firstToken = true;

    // Mark user message as sent
    setMessages((prev) =>
      prev.map((m) => (m.id === optimisticId ? { ...m, pending: false, failed: false } : m))
    );

    try {
      await api.sendMessageStream(id, text, idempotencyKey, {
        onToken: (token) => {
          if (firstToken) {
            // On first token, hide typing indicator and add assistant message
            setSending(false);
            firstToken = false;
            setMessages((prev) => [
              ...prev,
              { id: replyId, role: 'assistant' as const, content: token },
            ]);
          } else {
            // Append subsequent tokens
            setMessages((prev) =>
              prev.map((m) =>
                m.id === replyId ? { ...m, content: m.content + token } : m
              )
            );
          }
        },
        onGeneratingImage: () => {
          setLoadingImage(true);
        },
        onImage: async (image) => {
          await reloadImages();
          setLoadingImage(false);
        },
        onExp: (amount) => {
          const oldExp = characterExp;
          const newExp = oldExp + amount;
          setExpAnimation({ from: oldExp, to: newExp, timestamp: Date.now() });
          setCharacterExp(newExp);
        },
        onDone: async () => {
          setSending(false);
          setLoadingImage(false);
          // Refresh character data to get updated atmospheric context
          try {
            const updatedCharacter = await api.getCharacter(id);
            setCharacter(updatedCharacter);

            // Refresh narrator messages to show any new narrator messages
            const narratorMsgs = await api.getNarratorMessages(id);

            // Re-merge narrator messages with current messages
            setMessages((currentMessages) => {
              // Filter out old narrator messages and regular messages only
              const regularMessages = currentMessages.filter(m => m.role !== 'narrator');
              const mergedMessages: DisplayMessage[] = [];
              const narratorByPosition = new Map<number | null, typeof narratorMsgs>();

              // Group narrator messages by insertedAfterMessageId
              for (const nm of narratorMsgs) {
                const key = nm.insertedAfterMessageId;
                if (!narratorByPosition.has(key)) {
                  narratorByPosition.set(key, []);
                }
                narratorByPosition.get(key)!.push(nm);
              }

              // Insert narrator messages at the beginning if they have no insertedAfterMessageId
              const initialNarrators = narratorByPosition.get(null) || [];
              for (const nm of initialNarrators) {
                mergedMessages.push({
                  id: `narrator-${nm.id}`,
                  role: 'narrator',
                  content: nm.content,
                  narratorType: nm.type,
                });
              }

              // Merge with narrator messages
              for (const msg of regularMessages) {
                mergedMessages.push(msg);

                // Insert narrator messages that come after this message
                const msgId = typeof msg.id === 'string' ? parseInt(msg.id) : msg.id;
                const narratorsAfter = narratorByPosition.get(msgId) || [];
                for (const nm of narratorsAfter) {
                  mergedMessages.push({
                    id: `narrator-${nm.id}`,
                    role: 'narrator',
                    content: nm.content,
                    narratorType: nm.type,
                  });
                }
              }

              return mergedMessages;
            });
          } catch (err) {
            console.error('Failed to refresh character data:', err);
          }
        },
        onError: (error) => {
          setError(error);
          setMessages((prev) =>
            prev.map((m) => (m.id === optimisticId ? { ...m, pending: false, failed: true } : m))
          );
          setSending(false);
          setLoadingImage(false);
        },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send message');
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...m, pending: false, failed: true } : m))
      );
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

  async function reloadImages() {
    try {
      const historicalImages = await api.getCharacterImages(id);
      const imageData: ChatImageData[] = historicalImages.map((img) => ({
        id: img.id,
        url: img.imageUrl,
        description: img.sceneDescription,
        messageId: img.chatLogId,
      }));
      setImages(imageData);
    } catch (err) {
      console.error('Failed to reload images:', err);
    }
  }

  async function handleGenerateImage(customPrompt: string) {
    if (generatingManualImage || !character) return;

    setGeneratingManualImage(true);
    setLoadingImage(true);
    try {
      await api.generateStandaloneImage(id, customPrompt);
      setShowImagePrompt(false);
      // Reload all images to get the new one with its ID
      await reloadImages();
    } catch (err) {
      console.error('Failed to generate image:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to generate image');
    } finally {
      setGeneratingManualImage(false);
      setLoadingImage(false);
    }
  }

  async function handleDeleteImage(imageId: number) {
    if (!confirm('Delete this image? This cannot be undone.')) return;

    try {
      await api.deleteImage(imageId);
      // Remove from state
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      // Close viewer if viewing the deleted image
      if (viewingImage?.id === imageId) {
        setViewingImage(null);
      }
    } catch (err) {
      console.error('Failed to delete image:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to delete image');
    }
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
    <div className={`flex min-h-0 w-full flex-1 ${intensityClass}`}>
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
                onClick={() => setShowSettings(true)}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-accent to-accent-2 px-3.5 py-2 text-xs font-semibold text-white pill-glow transition hover:brightness-110"
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
          {/* Atmospheric Context Panel */}
          {character && (
            <AtmospherePanel
              location={character.currentLocation}
              sceneDescription={character.currentSceneDescription}
              timeOfDay={character.timeOfDay}
              mood={character.currentMood}
            />
          )}

          {messages.length === 0 && !sending && !loadingGreeting && (
            <p className="pt-10 text-center text-sm text-faint">
              Waiting for {character?.name ?? 'your companion'} to say hello...
            </p>
          )}

          {messages.map((m) => {
            // Render narrator messages with special component
            if (m.role === 'narrator') {
              return (
                <NarratorMessage key={m.id} type={m.narratorType || 'scene_transition'} content={m.content} />
              );
            }

            // Render normal user/assistant messages
            return (
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
            );
          })}

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
                onClick={label === 'Generate Image' ? () => setShowImagePrompt(true) : undefined}
                disabled={label === 'Generate Image' ? generatingManualImage : true}
                title={label === 'Generate Image' ? 'Generate a custom image of your companion' : 'Coming soon'}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
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
              <div
                className="group relative animate-fade-in-up cursor-pointer"
                onClick={() => setViewingImage(featuredImage)}
              >
                <div className="aspect-[3/4] overflow-hidden rounded-xl relative">
                  <img
                    src={getImageUrl(featuredImage.url)}
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
                      className="group relative overflow-hidden rounded-lg border border-hairline bg-surface transition-all hover:border-accent/40 hover:shadow-lg hover:shadow-accent/10 animate-fade-in-up"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="aspect-square overflow-hidden cursor-pointer" onClick={() => setViewingImage(img)}>
                        <img
                          src={getImageUrl(img.url)}
                          alt={img.description}
                          className="h-full w-full object-cover transition-all duration-300 group-hover:scale-110"
                          loading="lazy"
                        />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-void/80 via-transparent opacity-0 transition group-hover:opacity-100 pointer-events-none">
                        <div className="absolute bottom-0 p-3">
                          <p className="text-xs text-ink/90 line-clamp-2">{img.description}</p>
                        </div>
                      </div>
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(img.id);
                        }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-danger p-2 text-white hover:bg-danger/80 shadow-lg"
                        title="Delete image"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      </aside>
      {/* END RIGHT: Image sidebar */}

      {/* Settings Modal */}
      {showSettings && character && (
        <ChatSettingsModal character={character} onClose={() => setShowSettings(false)} />
      )}

      {/* Image Prompt Modal */}
      {showImagePrompt && character && (
        <ImagePromptModal
          characterName={character.name}
          onGenerate={handleGenerateImage}
          onClose={() => setShowImagePrompt(false)}
          isGenerating={generatingManualImage}
        />
      )}

      {/* Generating Image Modal */}
      {generatingManualImage && character && (
        <GeneratingImageModal characterName={character.name} />
      )}

      {/* Image Viewer Modal */}
      {viewingImage && (
        <ImageViewerModal
          imageUrl={getImageUrl(viewingImage.url)}
          description={viewingImage.description}
          onClose={() => setViewingImage(null)}
        />
      )}
    </div>
  );
}
