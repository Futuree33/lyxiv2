const API_URL = import.meta.env.VITE_API_URL as string;

export function getImageUrl(path: string): string {
  // If it's already a full URL or data URL, return as-is
  if (path.startsWith('http') || path.startsWith('data:')) {
    return path;
  }
  // Otherwise, prepend the base URL (without /api path)
  // API_URL is like "http://localhost:3001/api", we need "http://localhost:3001"
  const baseUrl = API_URL.replace(/\/api$/, '');
  return `${baseUrl}${path}`;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let token: string | null = localStorage.getItem('token');

export function setToken(next: string | null) {
  token = next;
  if (next) {
    localStorage.setItem('token', next);
  } else {
    localStorage.removeItem('token');
  }
}

export function getToken() {
  return token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.message ?? res.statusText, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export interface Character {
  id: number;
  name: string;
  persona: string;
  eyeColor?: string;
  hairColor?: string;
  hairStyle?: string;
  height?: string;
  build?: string;
  gender?: string;
  ethnicity?: string;
  age?: number;
  artStyle?: string;
  backstory?: string;
  relationshipToUser?: string;
  avatarUrl?: string;
  exp?: number;
  isPublic?: number;
  clonedFrom?: number;
  cloneCount?: number;
  createdAt: string;
  // Atmospheric context
  currentLocation?: string | null;
  currentSceneDescription?: string | null;
  currentMood?: string | null;
  timeOfDay?: string | null;
  intimacyLevel?: number;
  narrativeArc?: string | null; // JSON string
}

export interface ChatLogEntry {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface NarratorMessage {
  id: number;
  type: 'time_skip' | 'scene_transition' | 'mood_shift' | 'narrative_beat';
  content: string;
  insertedAfterMessageId: number | null;
  createdAt: string;
}

export interface Me {
  id: number;
  email: string;
  username: string;
  isAdmin: boolean;
  isPrivate: boolean;
  createdAt: string;
}

export interface UserStats {
  id: number;
  email: string;
  username: string;
  isAdmin: boolean;
  isPrivate: boolean;
  createdAt: string;
  stats: {
    // Dual level system
    lyxiLevel: number;
    lyxiXp: number;
    lyxiXpToNextLevel: number;
    creatorLevel: number;
    creatorXp: number;
    creatorXpToNextLevel: number;
    // Legacy
    level: number;
    xp: number;
    xpToNextLevel: number;
    // Stats
    charactersCreated: number;
    messagesSent: number;
  };
}

export interface PublicProfile {
  id: number;
  username: string;
  lyxiLevel: number;
  lyxiXp: number;
  creatorLevel: number;
  creatorXp: number;
  createdAt: string;
  publicCharacters: Array<{
    id: number;
    name: string;
    persona: string;
    avatarUrl?: string;
    cloneCount: number;
    createdAt: string;
  }>;
}

export interface Setting {
  key: string;
  value: string;
  updatedAt: string | null;
}

export interface ChatImage {
  id: number;
  chatLogId: number;
  imageUrl: string;
  sceneDescription: string;
  createdAt: string;
}

export const api = {
  register: (email: string, username: string, password: string) =>
    request<{ message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    }),

  login: (email: string, password: string) =>
    request<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<Me>('/auth/me'),

  getUserStats: () => request<UserStats>('/auth/stats'),

  adminListSettings: () => request<Setting[]>('/admin/settings'),

  adminUpdateSetting: (key: string, value: string) =>
    request<{ key: string; value: string }>(`/admin/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),

  listCharacters: () => request<Character[]>('/characters'),

  createCharacter: (data: Omit<Character, 'id' | 'createdAt'>) =>
    request<Character>('/characters', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getCharacter: (id: number) => request<Character>(`/characters/${id}`),

  getPublicCharacters: (page = 1, limit = 20) =>
    request<Character[]>(`/characters/public/all?page=${page}&limit=${limit}`),

  cloneCharacter: (id: number) =>
    request<Character>(`/characters/clone/${id}`, {
      method: 'POST',
    }),

  updateCharacterVisibility: (id: number, isPublic: boolean) =>
    request<{ success: boolean }>(`/characters/${id}/visibility`, {
      method: 'PATCH',
      body: JSON.stringify({ isPublic }),
    }),

  getHistory: (characterId: number) => request<ChatLogEntry[]>(`/chat/${characterId}/history`),

  getNarratorMessages: (characterId: number) => request<NarratorMessage[]>(`/chat/${characterId}/narrator-messages`),

  sendMessage: (characterId: number, message: string, idempotencyKey: string) =>
    request<{ message: string; image?: { url: string; description: string }; expGained?: number }>('/chat/send-message', {
      method: 'POST',
      body: JSON.stringify({ characterId, message, idempotencyKey }),
    }),

  sendMessageStream: async (
    characterId: number,
    message: string,
    idempotencyKey: string,
    callbacks: {
      onToken: (token: string) => void;
      onImage?: (image: { url: string; description: string }) => void;
      onExp?: (exp: number) => void;
      onGeneratingImage?: () => void;
      onDone: () => void;
      onError: (error: string) => void;
    },
  ) => {
    const response = await fetch(`${API_URL}/chat/send-message-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ characterId, message, idempotencyKey }),
    });

    if (!response.ok) {
      throw new ApiError('Failed to stream message', response.status);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            // Empty line resets event
            currentEvent = '';
            continue;
          }

          if (trimmed.startsWith('event: ')) {
            currentEvent = trimmed.slice(7);
            continue;
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));

              if (currentEvent === 'token') {
                callbacks.onToken(data.content);
              } else if (currentEvent === 'image') {
                callbacks.onImage?.(data);
              } else if (currentEvent === 'exp') {
                callbacks.onExp?.(data.amount);
              } else if (currentEvent === 'generating_image') {
                callbacks.onGeneratingImage?.();
              } else if (currentEvent === 'done') {
                callbacks.onDone();
                return;
              } else if (currentEvent === 'error') {
                callbacks.onError(data.message || 'Unknown error');
                return;
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }

      callbacks.onDone();
    } catch (error) {
      callbacks.onError(error instanceof Error ? error.message : 'Stream error');
    } finally {
      reader.releaseLock();
    }
  },

  getCharacterImages: (characterId: number) => request<ChatImage[]>(`/chat/${characterId}/images`),

  getAllImages: () =>
    request<
      Array<{
        id: number;
        imageUrl: string;
        sceneDescription: string;
        createdAt: string;
        characterId: number;
        characterName: string;
        characterAvatarUrl: string | null;
      }>
    >('/chat/images/all'),

  uploadAvatar: async (formData: FormData) => {
    const res = await fetch(`${API_URL}/upload/avatar`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(body.message ?? res.statusText, res.status);
    }

    return res.json() as Promise<{ url: string; filename: string }>;
  },

  generateCharacterAvatar: (data: { name: string; description: string }) =>
    request<{ url: string }>('/characters/generate-avatar', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  generateCharacterAvatarTurbo: (data: { name: string; description: string }) =>
    request<{ url: string }>('/characters/generate-avatar-turbo', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteCharacter: (id: number) =>
    request<{ success: boolean }>(`/characters/${id}`, {
      method: 'DELETE',
    }),

  getGreeting: (characterId: number) =>
    request<{ message: string }>(`/chat/${characterId}/greeting`),

  generateStandaloneImage: (characterId: number, prompt?: string) =>
    request<{ url: string; description: string }>(`/chat/${characterId}/generate-image`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),

  deleteImage: (imageId: number) =>
    request<{ success: boolean }>(`/chat/images/${imageId}`, {
      method: 'DELETE',
    }),

  generateCameraImage: (data: {
    mode: 'character' | 'custom';
    characterIds?: number[];
    customPerson?: {
      gender?: string;
      eyeColor?: string;
      hairColor?: string;
      hairStyle?: string;
      height?: string;
      build?: string;
      ethnicity?: string;
      age?: number;
      clothing?: string;
    };
    sceneDescription: string;
    artStyle?: 'realistic' | 'anime';
  }) =>
    request<{ url: string; description: string }>('/camera/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Leaderboard endpoints
  getLeaderboardResetTime: () =>
    request<{ nextReset: string; millisecondsUntilReset: number }>('/leaderboard/reset-time'),

  getLeaderboardLyxiHighestLevel: () =>
    request<Array<{ userId: number; username: string; value: number }>>('/leaderboard/lyxi/highest-level'),

  getLeaderboardLyxiMostXpWeek: () =>
    request<Array<{ userId: number; username: string; value: number }>>('/leaderboard/lyxi/most-xp-week'),

  getLeaderboardLyxiHighestRelationship: () =>
    request<Array<{ userId: number; username: string; value: number; characterId?: number; characterName?: string }>>('/leaderboard/lyxi/highest-relationship'),

  getLeaderboardCreatorHighestLevel: () =>
    request<Array<{ userId: number; username: string; value: number }>>('/leaderboard/creator/highest-level'),

  getLeaderboardCreatorMostXpWeek: () =>
    request<Array<{ userId: number; username: string; value: number }>>('/leaderboard/creator/most-xp-week'),

  getLeaderboardCreatorMostPopularWeek: () =>
    request<Array<{ userId: number; username: string; value: number; characterId?: number; characterName?: string }>>('/leaderboard/creator/most-popular-week'),

  // Settings endpoints
  updateProfile: (data: { username?: string; email?: string }) =>
    request<{ success: boolean }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ success: boolean }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePrivacy: (isPrivate: boolean) =>
    request<{ success: boolean; isPrivate: boolean }>('/auth/privacy', {
      method: 'PATCH',
      body: JSON.stringify({ isPrivate }),
    }),

  // Profile endpoints
  getProfileByUsername: (username: string) =>
    request<PublicProfile>(`/profile/username/${username}`),

  getProfileById: (id: number) =>
    request<PublicProfile>(`/profile/id/${id}`),
};
