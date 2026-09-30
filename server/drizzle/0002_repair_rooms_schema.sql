ALTER TABLE `rooms`
ADD `slug` text NOT NULL DEFAULT '';

--> statement-breakpoint

UPDATE `rooms`
SET `slug` = `id`
WHERE `slug` = '';

--> statement-breakpoint

ALTER TABLE `rooms`
ADD `display_order` integer DEFAULT 0 NOT NULL;

--> statement-breakpoint

ALTER TABLE `rooms`
ADD `temperature_device_id` text
REFERENCES `devices`(`id`)
ON UPDATE cascade
ON DELETE set null;

--> statement-breakpoint

ALTER TABLE `rooms`
ADD `humidity_device_id` text
REFERENCES `devices`(`id`)
ON UPDATE cascade
ON DELETE set null;

--> statement-breakpoint

CREATE UNIQUE INDEX `rooms_slug_uq`
ON `rooms` (`slug`);

--> statement-breakpoint

CREATE INDEX `rooms_display_order_idx`
ON `rooms` (`display_order`);

--> statement-breakpoint

CREATE INDEX `rooms_temperature_device_idx`
ON `rooms` (`temperature_device_id`);

--> statement-breakpoint

CREATE INDEX `rooms_humidity_device_idx`
ON `rooms` (`humidity_device_id`);