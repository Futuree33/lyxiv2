CREATE TABLE `character_weekly_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`character_id` int NOT NULL,
	`week_start` datetime NOT NULL,
	`clone_count` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL,
	CONSTRAINT `character_weekly_stats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `relationship_levels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`character_id` int NOT NULL,
	`level` int NOT NULL DEFAULT 1,
	`exp` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `relationship_levels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`week_start` datetime NOT NULL,
	`lyxi_xp_gained` int NOT NULL DEFAULT 0,
	`creator_xp_gained` int NOT NULL DEFAULT 0,
	`highest_lyxi_level` int NOT NULL DEFAULT 1,
	`highest_creator_level` int NOT NULL DEFAULT 1,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `weekly_stats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `lyxi_level` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `lyxi_xp` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `creator_level` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `creator_xp` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `character_weekly_stats` ADD CONSTRAINT `character_weekly_stats_character_id_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `relationship_levels` ADD CONSTRAINT `relationship_levels_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `relationship_levels` ADD CONSTRAINT `relationship_levels_character_id_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `weekly_stats` ADD CONSTRAINT `weekly_stats_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;