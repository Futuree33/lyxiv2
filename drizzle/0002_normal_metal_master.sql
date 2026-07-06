ALTER TABLE `chat_logs` ADD `idempotency_key` varchar(255);--> statement-breakpoint
ALTER TABLE `chat_logs` ADD CONSTRAINT `chat_logs_idempotency_key_unique` UNIQUE(`idempotency_key`);