import { boolean, datetime, int, mysqlTable, text, tinyint, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  email: varchar('email', { length: 254 }).notNull().unique(),
  username: varchar('username', { length: 25 }).notNull().unique(),
  password: varchar('password', { length: 71 }).notNull(),
  isAdmin: boolean('is_admin').notNull().default(false),
  isPrivate: boolean('is_private').notNull().default(false),
  // Dual leveling system
  lyxiLevel: int('lyxi_level').notNull().default(1),
  lyxiXp: int('lyxi_xp').notNull().default(0),
  creatorLevel: int('creator_level').notNull().default(1),
  creatorXp: int('creator_xp').notNull().default(0),
  // Legacy fields (kept for backward compatibility)
  level: int('level').notNull().default(1),
  xp: int('xp').notNull().default(0),
  messagesCount: int('messages_count').notNull().default(0),
  charactersCreatedCount: int('characters_created_count').notNull().default(0),
  createdAt: datetime('created_at').notNull(),
});

export const settings = mysqlTable('settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: text('value').notNull(),
  updatedAt: datetime('updated_at').notNull(),
});

export const loginLog = mysqlTable('login_logs', {
  id: int('id').autoincrement().primaryKey(),
  user: int('user_id').notNull().references(() => users.id),
  ip_address: varchar('ip_address', { length: 45 }).notNull(),
  userAgent: varchar('user_agent', { length: 255 }).notNull(),
  timestamp: datetime('timestamp').notNull(),
});

export const characters = mysqlTable('characters', {
  id: int('id').autoincrement().primaryKey(),
  user: int('user_id').notNull().references(() => users.id),
  name: varchar('name', { length: 50 }).notNull(),
  persona: text('persona').notNull(),
  // Physical appearance
  eyeColor: varchar('eye_color', { length: 50 }),
  hairColor: varchar('hair_color', { length: 50 }),
  hairStyle: varchar('hair_style', { length: 100 }),
  height: varchar('height', { length: 50 }),
  build: varchar('build', { length: 50 }),
  gender: varchar('gender', { length: 50 }),
  ethnicity: varchar('ethnicity', { length: 50 }),
  age: int('age'),
  artStyle: varchar('art_style', { length: 20 }),
  // Context
  backstory: text('backstory'),
  relationshipToUser: varchar('relationship_to_user', { length: 200 }),
  // Memory system
  longTermMemory: text('long_term_memory'),
  // Relationship progression
  exp: int('exp').notNull().default(0),
  // Public/Private and Avatar
  isPublic: tinyint('is_public').notNull().default(0),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  clonedFrom: int('cloned_from_character_id').references(() => characters.id),
  cloneCount: int('clone_count').notNull().default(0),
  // Atmospheric context tracking
  currentLocation: varchar('current_location', { length: 200 }),
  currentSceneDescription: text('current_scene_description'),
  currentMood: varchar('current_mood', { length: 50 }),
  timeOfDay: varchar('time_of_day', { length: 20 }),
  // Narrative arc tracking
  narrativeArc: text('narrative_arc'), // JSON: { arc: string, beat: number, tension: number, lastUpdate: string }
  storyBeats: text('story_beats'), // Accumulated narrative milestones
  // Intimacy progression (no gates, just tracking)
  intimacyLevel: int('intimacy_level').notNull().default(0), // 0-10 scale
  intimateMemories: text('intimate_memories'), // Special memory bank for intimate moments
  createdAt: datetime('created_at').notNull(),
});

export const chatLogs = mysqlTable('chat_logs', {
  id: int('id').autoincrement().primaryKey(),
  user: int('user_id').notNull().references(() => users.id),
  character: int('character_id').notNull().references(() => characters.id),
  role: varchar('role', { length: 20 }).notNull(),
  content: text('content').notNull(),
  compacted: boolean('compacted').notNull().default(false),
  idempotencyKey: varchar('idempotency_key', { length: 255 }).unique(),
  createdAt: datetime('created_at').notNull(),
});

export const chatSummaries = mysqlTable('chat_summaries', {
  id: int('id').autoincrement().primaryKey(),
  user: int('user_id').notNull().references(() => users.id),
  character: int('character_id').notNull().references(() => characters.id),
  summary: text('summary').notNull(),
  lastLog: int('last_log_id').notNull().references(() => chatLogs.id),
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull(),
});

export const chatImages = mysqlTable('chat_images', {
  id: int('id').autoincrement().primaryKey(),
  user: int('user_id').notNull().references(() => users.id),
  character: int('character_id').references(() => characters.id), // Nullable for camera models
  chatLog: int('chat_log_id').references(() => chatLogs.id), // Nullable for standalone images
  imageUrl: text('image_url').notNull(),
  sceneDescription: text('scene_description').notNull(),
  createdAt: datetime('created_at').notNull(),
});

export const weeklyStats = mysqlTable('weekly_stats', {
  id: int('id').autoincrement().primaryKey(),
  user: int('user_id').notNull().references(() => users.id),
  weekStart: datetime('week_start').notNull(), // Monday 00:00:00 UTC
  lyxiXpGained: int('lyxi_xp_gained').notNull().default(0),
  creatorXpGained: int('creator_xp_gained').notNull().default(0),
  highestLyxiLevel: int('highest_lyxi_level').notNull().default(1),
  highestCreatorLevel: int('highest_creator_level').notNull().default(1),
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull(),
});

export const characterWeeklyStats = mysqlTable('character_weekly_stats', {
  id: int('id').autoincrement().primaryKey(),
  character: int('character_id').notNull().references(() => characters.id),
  weekStart: datetime('week_start').notNull(),
  cloneCount: int('clone_count').notNull().default(0),
  createdAt: datetime('created_at').notNull(),
});

export const relationshipLevels = mysqlTable('relationship_levels', {
  id: int('id').autoincrement().primaryKey(),
  user: int('user_id').notNull().references(() => users.id),
  character: int('character_id').notNull().references(() => characters.id),
  level: int('level').notNull().default(1),
  exp: int('exp').notNull().default(0),
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull(),
}, (table) => ({
  userCharacterIdx: uniqueIndex('user_character_idx').on(table.user, table.character),
}));

export const sceneHistory = mysqlTable('scene_history', {
  id: int('id').autoincrement().primaryKey(),
  user: int('user_id').notNull().references(() => users.id),
  character: int('character_id').notNull().references(() => characters.id),
  location: varchar('location', { length: 200 }),
  sceneDescription: text('scene_description'),
  mood: varchar('mood', { length: 50 }),
  timeOfDay: varchar('time_of_day', { length: 20 }),
  transitionType: varchar('transition_type', { length: 50 }), // 'natural', 'time_skip', 'location_change'
  createdAt: datetime('created_at').notNull(),
});

export const narratorMessages = mysqlTable('narrator_messages', {
  id: int('id').autoincrement().primaryKey(),
  user: int('user_id').notNull().references(() => users.id),
  character: int('character_id').notNull().references(() => characters.id),
  type: varchar('type', { length: 50 }), // 'time_skip', 'scene_transition', 'mood_shift'
  content: text('content'),
  insertedAfterMessageId: int('inserted_after_message_id').references(() => chatLogs.id), // Where it appears in chat
  createdAt: datetime('created_at').notNull(),
});

// Stories feature tables
export const stories = mysqlTable('stories', {
  id: int('id').autoincrement().primaryKey(),
  user: int('user_id').notNull().references(() => users.id),
  // Story metadata
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
  pov: varchar('pov', { length: 50 }).notNull(), // 'first_person', 'third_person', 'second_person'
  genre: varchar('genre', { length: 500 }), // JSON array of tags: ["fantasy", "romance", "adventure"]
  plotIdea: text('plot_idea'),
  storyPlan: text('story_plan'),
  // Story statistics
  chapterCount: int('chapter_count').notNull().default(0),
  totalWordCount: int('total_word_count').notNull().default(0),
  averageReadingTime: int('average_reading_time').notNull().default(0), // minutes
  // Public sharing
  isPublic: tinyint('is_public').notNull().default(0),
  clonedFrom: int('cloned_from_story_id').references(() => stories.id),
  cloneCount: int('clone_count').notNull().default(0),
  viewCount: int('view_count').notNull().default(0),
  // Cover image
  coverImageUrl: varchar('cover_image_url', { length: 500 }),
  // Status tracking
  status: varchar('status', { length: 20 }).notNull().default('draft'), // 'draft', 'in_progress', 'completed', 'abandoned'
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull(),
});

export const storyChapters = mysqlTable('story_chapters', {
  id: int('id').autoincrement().primaryKey(),
  story: int('story_id').notNull().references(() => stories.id),
  // Chapter metadata
  chapterNumber: int('chapter_number').notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content').notNull(),
  // Generation metadata
  continuationPrompt: text('continuation_prompt'),
  wordCount: int('word_count').notNull().default(0),
  readingTime: int('reading_time').notNull().default(0), // estimated minutes
  // AI generation settings
  temperature: varchar('temperature', { length: 10 }).default('0.9'),
  createdAt: datetime('created_at').notNull(),
});

export const storyCharacters = mysqlTable('story_characters', {
  id: int('id').autoincrement().primaryKey(),
  story: int('story_id').notNull().references(() => stories.id),
  character: int('character_id').notNull().references(() => characters.id),
  role: varchar('role', { length: 100 }), // 'protagonist', 'antagonist', 'supporting', 'cameo'
  characterSnapshot: text('character_snapshot'), // JSON snapshot of character at time of story creation
  createdAt: datetime('created_at').notNull(),
}, (table) => ({
  storyCharacterIdx: uniqueIndex('story_character_idx').on(table.story, table.character),
}));

export const storyReadingProgress = mysqlTable('story_reading_progress', {
  id: int('id').autoincrement().primaryKey(),
  user: int('user_id').notNull().references(() => users.id),
  story: int('story_id').notNull().references(() => stories.id),
  // Progress tracking
  lastChapterId: int('last_chapter_id').references(() => storyChapters.id),
  lastChapterNumber: int('last_chapter_number').notNull().default(1),
  scrollPosition: int('scroll_position').notNull().default(0), // percentage 0-100
  // Reading statistics
  totalReadingTime: int('total_reading_time').notNull().default(0), // seconds
  chaptersCompleted: int('chapters_completed').notNull().default(0),
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull(),
}, (table) => ({
  userStoryIdx: uniqueIndex('user_story_idx').on(table.user, table.story),
}));

export const storyBookmarks = mysqlTable('story_bookmarks', {
  id: int('id').autoincrement().primaryKey(),
  user: int('user_id').notNull().references(() => users.id),
  story: int('story_id').notNull().references(() => stories.id),
  chapter: int('chapter_id').notNull().references(() => storyChapters.id),
  // Bookmark details
  chapterPosition: int('chapter_position').notNull(), // character position in chapter text
  snippet: text('snippet'), // Text snippet around bookmark for context
  note: text('note'), // User's personal note
  color: varchar('color', { length: 20 }).default('accent'), // 'accent', 'warn', 'presence'
  createdAt: datetime('created_at').notNull(),
});

export const storyWeeklyStats = mysqlTable('story_weekly_stats', {
  id: int('id').autoincrement().primaryKey(),
  story: int('story_id').notNull().references(() => stories.id),
  weekStart: datetime('week_start').notNull(),
  // Weekly metrics
  viewCount: int('view_count').notNull().default(0),
  cloneCount: int('clone_count').notNull().default(0),
  readCount: int('read_count').notNull().default(0), // unique readers
  createdAt: datetime('created_at').notNull(),
});

export const storyDrafts = mysqlTable('story_drafts', {
  id: int('id').autoincrement().primaryKey(),
  user: int('user_id').notNull().references(() => users.id),
  // Draft data (JSON)
  draftData: text('draft_data').notNull(),
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull(),
}, (table) => ({
  userDraftIdx: uniqueIndex('user_draft_idx').on(table.user), // One draft per user
}));

