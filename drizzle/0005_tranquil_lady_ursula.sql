ALTER TABLE `characters` ADD `is_public` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `avatar_url` varchar(500);--> statement-breakpoint
ALTER TABLE `characters` ADD `cloned_from_character_id` int;--> statement-breakpoint
ALTER TABLE `characters` ADD `clone_count` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `level` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `xp` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `messages_count` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `characters_created_count` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD CONSTRAINT `characters_cloned_from_character_id_characters_id_fk` FOREIGN KEY (`cloned_from_character_id`) REFERENCES `characters`(`id`) ON DELETE no action ON UPDATE no action;