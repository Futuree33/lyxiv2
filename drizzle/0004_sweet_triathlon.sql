CREATE TABLE `chat_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`character_id` int NOT NULL,
	`chat_log_id` int NOT NULL,
	`image_url` text NOT NULL,
	`scene_description` text NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `chat_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `characters` ADD `eye_color` varchar(50);--> statement-breakpoint
ALTER TABLE `characters` ADD `hair_color` varchar(50);--> statement-breakpoint
ALTER TABLE `characters` ADD `hair_style` varchar(100);--> statement-breakpoint
ALTER TABLE `characters` ADD `height` varchar(50);--> statement-breakpoint
ALTER TABLE `characters` ADD `build` varchar(50);--> statement-breakpoint
ALTER TABLE `characters` ADD `gender` varchar(50);--> statement-breakpoint
ALTER TABLE `characters` ADD `backstory` text;--> statement-breakpoint
ALTER TABLE `characters` ADD `relationship_to_user` varchar(200);--> statement-breakpoint
ALTER TABLE `chat_images` ADD CONSTRAINT `chat_images_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_images` ADD CONSTRAINT `chat_images_character_id_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_images` ADD CONSTRAINT `chat_images_chat_log_id_chat_logs_id_fk` FOREIGN KEY (`chat_log_id`) REFERENCES `chat_logs`(`id`) ON DELETE no action ON UPDATE no action;