ALTER TABLE `characters` ADD `long_term_memory` text;--> statement-breakpoint
ALTER TABLE `chat_summaries` ADD `created_at` datetime DEFAULT CURRENT_TIMESTAMP NOT NULL;