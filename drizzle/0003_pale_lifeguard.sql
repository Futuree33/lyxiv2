CREATE TABLE `settings` (
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `is_admin` boolean DEFAULT false NOT NULL;