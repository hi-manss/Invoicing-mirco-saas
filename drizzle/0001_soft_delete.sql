ALTER TABLE `users` ADD `is_deleted` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `is_deleted` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `is_deleted` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `is_deleted` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `is_deleted` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `invoice_items` ADD `is_deleted` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `users_deleted_idx` ON `users` (`is_deleted`);--> statement-breakpoint
CREATE INDEX `products_deleted_idx` ON `products` (`is_deleted`);--> statement-breakpoint
CREATE INDEX `sessions_deleted_idx` ON `sessions` (`is_deleted`);--> statement-breakpoint
CREATE INDEX `customers_deleted_idx` ON `customers` (`is_deleted`);--> statement-breakpoint
CREATE INDEX `invoices_deleted_idx` ON `invoices` (`is_deleted`);--> statement-breakpoint
CREATE INDEX `invoice_items_deleted_idx` ON `invoice_items` (`is_deleted`);