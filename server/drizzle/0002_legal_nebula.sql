CREATE TABLE `yasno_schedules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`integration_id` text NOT NULL,
	`group` text NOT NULL,
	`date` text NOT NULL,
	`slots` text NOT NULL,
	`status` text NOT NULL,
	`updated_on` text,
	`fetched_at` integer NOT NULL,
	FOREIGN KEY (`integration_id`) REFERENCES `integrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `yasno_schedules_unique_idx` ON `yasno_schedules` (`integration_id`,`group`,`date`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`uid` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`enabled` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'unknown' NOT NULL,
	`last_sync_at` text,
	`last_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_integrations`("id", "uid", "name", "type", "description", "enabled", "status", "last_sync_at", "last_error", "created_at", "updated_at") SELECT "id", "uid", "name", "type", "description", "enabled", "status", "last_sync_at", "last_error", "created_at", "updated_at" FROM `integrations`;--> statement-breakpoint
DROP TABLE `integrations`;--> statement-breakpoint
ALTER TABLE `__new_integrations` RENAME TO `integrations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `integrations_uid_unique` ON `integrations` (`uid`);--> statement-breakpoint
CREATE INDEX `integrations_type_idx` ON `integrations` (`type`);