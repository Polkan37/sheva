CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`uid` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`room_id` text,
	`sample_interval_sec` integer DEFAULT 60 NOT NULL,
	`firmware_version` text,
	`last_seen_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE cascade ON DELETE set null,
	CONSTRAINT "devices_sample_interval_positive" CHECK("devices"."sample_interval_sec" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `devices_uid_uq` ON `devices` (`uid`);--> statement-breakpoint
CREATE INDEX `devices_room_idx` ON `devices` (`room_id`);--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rooms_name_uq` ON `rooms` (`name`);--> statement-breakpoint
CREATE TABLE `thhome_data` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`device_id` text NOT NULL,
	`schema_version` integer NOT NULL,
	`message_id` text NOT NULL,
	`sequence` integer,
	`captured_at` integer,
	`received_at` integer NOT NULL,
	`temperature_c` real NOT NULL,
	`humidity_pct` real NOT NULL,
	`battery_voltage` real,
	`battery_pct` real,
	`rssi_dbm` integer,
	`firmware_version` text,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "thhome_data_schema_version_positive" CHECK("thhome_data"."schema_version" > 0),
	CONSTRAINT "thhome_data_sequence_non_negative" CHECK("thhome_data"."sequence" IS NULL OR "thhome_data"."sequence" >= 0),
	CONSTRAINT "thhome_data_humidity_range" CHECK("thhome_data"."humidity_pct" >= 0 AND "thhome_data"."humidity_pct" <= 100),
	CONSTRAINT "thhome_data_battery_pct_range" CHECK("thhome_data"."battery_pct" IS NULL OR ("thhome_data"."battery_pct" >= 0 AND "thhome_data"."battery_pct" <= 100))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `thhome_data_device_message_uq` ON `thhome_data` (`device_id`,`message_id`);--> statement-breakpoint
CREATE INDEX `thhome_data_device_received_idx` ON `thhome_data` (`device_id`,`received_at`);