import { boolean, datetime, int, mysqlTable, text, tinyint, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  email: varchar('email', { length: 254 }).notNull().unique(),
  username: varchar('username', { length: 25 }).notNull().unique(),
  password: varchar('password', { length: 71 }).notNull(),
  isAdmin: boolean('is_admin').notNull().default(false),
  // User stats and leveling
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
  // Relationship progression
  exp: int('exp').notNull().default(0),
  // Public/Private and Avatar
  isPublic: tinyint('is_public').notNull().default(0),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  clonedFrom: int('cloned_from_character_id').references(() => characters.id),
  cloneCount: int('clone_count').notNull().default(0),
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
  updatedAt: datetime('updated_at').notNull(),
}, (table) => [
  uniqueIndex('one_summary_per_conversation').on(table.user, table.character),
]);

export const chatImages = mysqlTable('chat_images', {
  id: int('id').autoincrement().primaryKey(),
  user: int('user_id').notNull().references(() => users.id),
  character: int('character_id').notNull().references(() => characters.id),
  chatLog: int('chat_log_id').notNull().references(() => chatLogs.id),
  imageUrl: text('image_url').notNull(),
  sceneDescription: text('scene_description').notNull(),
  createdAt: datetime('created_at').notNull(),
});

