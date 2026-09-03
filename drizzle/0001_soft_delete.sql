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
CREATE INDEX `invoice_items_deleted_idx` ON `invoice_items` (`is_deleted`);--> statement-breakpoint
CREATE TABLE `__products_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`sku` text NOT NULL,
	`hsn_code` text,
	`unit` text DEFAULT 'PCS' NOT NULL,
	`selling_price_paise` integer NOT NULL,
	`gst_rate` integer DEFAULT 0 NOT NULL,
	`stock_quantity` integer DEFAULT 0 NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__products_new` (`id`,`name`,`sku`,`hsn_code`,`unit`,`selling_price_paise`,`gst_rate`,`stock_quantity`,`is_deleted`,`created_at`,`updated_at`) SELECT `id`,`name`,`sku`,`hsn_code`,`unit`,`selling_price_paise`,`gst_rate`,`stock_quantity`,CASE WHEN `is_active` = 0 THEN 1 ELSE 0 END,`created_at`,`updated_at` FROM `products`;--> statement-breakpoint
DROP TABLE `products`;--> statement-breakpoint
ALTER TABLE `__products_new` RENAME TO `products`;--> statement-breakpoint
CREATE UNIQUE INDEX `products_sku_unique` ON `products` (`sku`);--> statement-breakpoint
CREATE INDEX `products_name_idx` ON `products` (`name`);--> statement-breakpoint
CREATE INDEX `products_deleted_idx` ON `products` (`is_deleted`);