PRAGMA foreign_keys = OFF;

--> statement-breakpoint

CREATE TABLE `rooms_new` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `slug` text NOT NULL,
  `display_order` integer DEFAULT 0 NOT NULL,

  `temperature_device_id` text
    REFERENCES `devices`(`id`)
    ON UPDATE cascade
    ON DELETE set null,

  `humidity_device_id` text
    REFERENCES `devices`(`id`)
    ON UPDATE cascade
    ON DELETE set null,

  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

--> statement-breakpoint

INSERT INTO `rooms_new` (
  `id`,
  `name`,
  `slug`,
  `display_order`,
  `temperature_device_id`,
  `humidity_device_id`,
  `created_at`,
  `updated_at`
)
SELECT
  `id`,
  `name`,
  `id`,
  0,
  NULL,
  NULL,
  `created_at`,
  `updated_at`
FROM `rooms`;

--> statement-breakpoint

DROP TABLE `rooms`;

--> statement-breakpoint

ALTER TABLE `rooms_new`
RENAME TO `rooms`;

--> statement-breakpoint

CREATE UNIQUE INDEX `rooms_name_uq`
ON `rooms` (`name`);

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

--> statement-breakpoint

PRAGMA foreign_keys = ON;