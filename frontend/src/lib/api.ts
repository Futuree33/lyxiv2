const API_URL = import.meta.env.VITE_API_URL as string;

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
}

export interface ChatLogEntry {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface Me {
  id: number;
  email: string;
  username: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface UserStats {
  id: number;
  email: string;
  username: string;
  isAdmin: boolean;
  createdAt: string;
  stats: {
    level: number;
    xp: number;
    xpToNextLevel: number;
    charactersCreated: number;
    messagesSent: number;
  };
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

  sendMessage: (characterId: number, message: string, idempotencyKey: string) =>
    request<{ message: string; image?: { url: string; description: string }; expGained?: number }>('/chat/send-message', {
      method: 'POST',
      body: JSON.stringify({ characterId, message, idempotencyKey }),
    }),

  getCharacterImages: (characterId: number) => request<ChatImage[]>(`/chat/${characterId}/images`),

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
};
