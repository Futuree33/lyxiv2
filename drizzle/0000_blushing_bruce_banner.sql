CREATE TABLE `login_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`ip_address` varchar(45) NOT NULL,
	`user_agent` varchar(255) NOT NULL,
	`timestamp` datetime NOT NULL,
	CONSTRAINT `login_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(254) NOT NULL,
	`username` varchar(25) NOT NULL,
	`password` varchar(71) NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
ALTER TABLE `login_logs` ADD CONSTRAINT `login_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;