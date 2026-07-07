-- Add atmospheric context tracking fields to characters table
ALTER TABLE `characters` ADD `current_location` varchar(200);
ALTER TABLE `characters` ADD `current_scene_description` text;
ALTER TABLE `characters` ADD `current_mood` varchar(50);
ALTER TABLE `characters` ADD `time_of_day` varchar(20);

-- Add narrative arc tracking fields to characters table
ALTER TABLE `characters` ADD `narrative_arc` text;
ALTER TABLE `characters` ADD `story_beats` text;

-- Add intimacy progression fields to characters table
ALTER TABLE `characters` ADD `intimacy_level` int DEFAULT 0 NOT NULL;
ALTER TABLE `characters` ADD `intimate_memories` text;

-- Create scene_history table
CREATE TABLE `scene_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`character_id` int NOT NULL,
	`location` varchar(200),
	`scene_description` text,
	`mood` varchar(50),
	`time_of_day` varchar(20),
	`transition_type` varchar(50),
	`created_at` datetime NOT NULL,
	CONSTRAINT `scene_history_id` PRIMARY KEY(`id`)
);

-- Create narrator_messages table
CREATE TABLE `narrator_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`character_id` int NOT NULL,
	`type` varchar(50),
	`content` text,
	`inserted_after_message_id` int,
	`created_at` datetime NOT NULL,
	CONSTRAINT `narrator_messages_id` PRIMARY KEY(`id`)
);

-- Add foreign key constraints for scene_history
ALTER TABLE `scene_history` ADD CONSTRAINT `scene_history_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `scene_history` ADD CONSTRAINT `scene_history_character_id_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Add foreign key constraints for narrator_messages
ALTER TABLE `narrator_messages` ADD CONSTRAINT `narrator_messages_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `narrator_messages` ADD CONSTRAINT `narrator_messages_character_id_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `narrator_messages` ADD CONSTRAINT `narrator_messages_inserted_after_message_id_chat_logs_id_fk` FOREIGN KEY (`inserted_after_message_id`) REFERENCES `chat_logs`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
