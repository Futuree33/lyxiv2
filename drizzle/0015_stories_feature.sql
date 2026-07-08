-- Stories feature migration
-- Creates all tables needed for AI-powered story creation and reading

-- Create stories table
CREATE TABLE `stories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text NOT NULL,
	`pov` varchar(50) NOT NULL,
	`genre` varchar(500),
	`plot_idea` text,
	`story_plan` text,
	`chapter_count` int DEFAULT 0 NOT NULL,
	`total_word_count` int DEFAULT 0 NOT NULL,
	`average_reading_time` int DEFAULT 0 NOT NULL,
	`is_public` tinyint DEFAULT 0 NOT NULL,
	`cloned_from_story_id` int,
	`clone_count` int DEFAULT 0 NOT NULL,
	`view_count` int DEFAULT 0 NOT NULL,
	`cover_image_url` varchar(500),
	`status` varchar(20) DEFAULT 'draft' NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `stories_id` PRIMARY KEY(`id`)
);

-- Create story_chapters table
CREATE TABLE `story_chapters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`story_id` int NOT NULL,
	`chapter_number` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`continuation_prompt` text,
	`word_count` int DEFAULT 0 NOT NULL,
	`reading_time` int DEFAULT 0 NOT NULL,
	`temperature` varchar(10) DEFAULT '0.9',
	`created_at` datetime NOT NULL,
	CONSTRAINT `story_chapters_id` PRIMARY KEY(`id`)
);

-- Create story_characters junction table
CREATE TABLE `story_characters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`story_id` int NOT NULL,
	`character_id` int NOT NULL,
	`role` varchar(100),
	`character_snapshot` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `story_characters_id` PRIMARY KEY(`id`),
	CONSTRAINT `story_character_idx` UNIQUE(`story_id`,`character_id`)
);

-- Create story_reading_progress table
CREATE TABLE `story_reading_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`story_id` int NOT NULL,
	`last_chapter_id` int,
	`last_chapter_number` int DEFAULT 1 NOT NULL,
	`scroll_position` int DEFAULT 0 NOT NULL,
	`total_reading_time` int DEFAULT 0 NOT NULL,
	`chapters_completed` int DEFAULT 0 NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `story_reading_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_story_idx` UNIQUE(`user_id`,`story_id`)
);

-- Create story_bookmarks table
CREATE TABLE `story_bookmarks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`story_id` int NOT NULL,
	`chapter_id` int NOT NULL,
	`chapter_position` int NOT NULL,
	`snippet` text,
	`note` text,
	`color` varchar(20) DEFAULT 'accent',
	`created_at` datetime NOT NULL,
	CONSTRAINT `story_bookmarks_id` PRIMARY KEY(`id`)
);

-- Create story_weekly_stats table
CREATE TABLE `story_weekly_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`story_id` int NOT NULL,
	`week_start` datetime NOT NULL,
	`view_count` int DEFAULT 0 NOT NULL,
	`clone_count` int DEFAULT 0 NOT NULL,
	`read_count` int DEFAULT 0 NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `story_weekly_stats_id` PRIMARY KEY(`id`)
);

-- Create story_drafts table
CREATE TABLE `story_drafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`draft_data` text NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `story_drafts_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_draft_idx` UNIQUE(`user_id`)
);

-- Add foreign key constraints for stories
ALTER TABLE `stories` ADD CONSTRAINT `stories_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `stories` ADD CONSTRAINT `stories_cloned_from_story_id_stories_id_fk` FOREIGN KEY (`cloned_from_story_id`) REFERENCES `stories`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- Add foreign key constraints for story_chapters
ALTER TABLE `story_chapters` ADD CONSTRAINT `story_chapters_story_id_stories_id_fk` FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- Add foreign key constraints for story_characters
ALTER TABLE `story_characters` ADD CONSTRAINT `story_characters_story_id_stories_id_fk` FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `story_characters` ADD CONSTRAINT `story_characters_character_id_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- Add foreign key constraints for story_reading_progress
ALTER TABLE `story_reading_progress` ADD CONSTRAINT `story_reading_progress_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `story_reading_progress` ADD CONSTRAINT `story_reading_progress_story_id_stories_id_fk` FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `story_reading_progress` ADD CONSTRAINT `story_reading_progress_last_chapter_id_story_chapters_id_fk` FOREIGN KEY (`last_chapter_id`) REFERENCES `story_chapters`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- Add foreign key constraints for story_bookmarks
ALTER TABLE `story_bookmarks` ADD CONSTRAINT `story_bookmarks_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `story_bookmarks` ADD CONSTRAINT `story_bookmarks_story_id_stories_id_fk` FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `story_bookmarks` ADD CONSTRAINT `story_bookmarks_chapter_id_story_chapters_id_fk` FOREIGN KEY (`chapter_id`) REFERENCES `story_chapters`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- Add foreign key constraints for story_weekly_stats
ALTER TABLE `story_weekly_stats` ADD CONSTRAINT `story_weekly_stats_story_id_stories_id_fk` FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- Add foreign key constraints for story_drafts
ALTER TABLE `story_drafts` ADD CONSTRAINT `story_drafts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- Create indexes for better query performance
CREATE INDEX `stories_user_id_idx` ON `stories` (`user_id`);
CREATE INDEX `stories_is_public_idx` ON `stories` (`is_public`);
CREATE INDEX `stories_created_at_idx` ON `stories` (`created_at`);
CREATE INDEX `story_chapters_story_id_idx` ON `story_chapters` (`story_id`);
CREATE INDEX `story_chapters_chapter_number_idx` ON `story_chapters` (`chapter_number`);
CREATE INDEX `story_weekly_stats_story_week_idx` ON `story_weekly_stats` (`story_id`, `week_start`);
