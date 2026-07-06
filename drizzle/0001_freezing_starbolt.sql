CREATE TABLE `characters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(50) NOT NULL,
	`persona` text NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `characters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`character_id` int NOT NULL,
	`role` varchar(20) NOT NULL,
	`content` text NOT NULL,
	`compacted` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL,
	CONSTRAINT `chat_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_summaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`character_id` int NOT NULL,
	`summary` text NOT NULL,
	`last_log_id` int NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `chat_summaries_id` PRIMARY KEY(`id`),
	CONSTRAINT `one_summary_per_conversation` UNIQUE(`user_id`,`character_id`)
);
--> statement-breakpoint
ALTER TABLE `characters` ADD CONSTRAINT `characters_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_logs` ADD CONSTRAINT `chat_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_logs` ADD CONSTRAINT `chat_logs_character_id_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_summaries` ADD CONSTRAINT `chat_summaries_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_summaries` ADD CONSTRAINT `chat_summaries_character_id_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_summaries` ADD CONSTRAINT `chat_summaries_last_log_id_chat_logs_id_fk` FOREIGN KEY (`last_log_id`) REFERENCES `chat_logs`(`id`) ON DELETE no action ON UPDATE no action;