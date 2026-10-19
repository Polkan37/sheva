import {
  type AnySQLiteColumn,
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

import { sql } from 'drizzle-orm';

export const rooms = sqliteTable(
  'rooms',
  {
    id: text('id').primaryKey(),

    name: text('name').notNull(),

    slug: text('slug').notNull(),

    displayOrder: integer('display_order')
      .notNull()
      .default(0),

    temperatureDeviceId: text(
      'temperature_device_id',
    ).references(
      (): AnySQLiteColumn => devices.id,
      {
        onDelete: 'set null',
        onUpdate: 'cascade',
      },
    ),

    humidityDeviceId: text(
      'humidity_device_id',
    ).references(
      (): AnySQLiteColumn => devices.id,
      {
        onDelete: 'set null',
        onUpdate: 'cascade',
      },
    ),

    createdAt: integer('created_at', {
      mode: 'timestamp_ms',
    }).notNull(),

    updatedAt: integer('updated_at', {
      mode: 'timestamp_ms',
    }).notNull(),
  },
  (table) => [
    uniqueIndex('rooms_name_uq').on(
      table.name,
    ),

    uniqueIndex('rooms_slug_uq').on(
      table.slug,
    ),

    index('rooms_display_order_idx').on(
      table.displayOrder,
    ),

    index(
      'rooms_temperature_device_idx',
    ).on(
      table.temperatureDeviceId,
    ),

    index(
      'rooms_humidity_device_idx',
    ).on(
      table.humidityDeviceId,
    ),
  ],
);

export const devices = sqliteTable(
  'devices',
  {
    id: text('id').primaryKey(),
    uid: text('uid').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    type: text('type').notNull(),

    macAddress: text('mac_address'),

    roomId: text('room_id').references(
      () => rooms.id,
      {
        onDelete: 'set null',
        onUpdate: 'cascade',
      },
    ),

    sampleIntervalSec: integer(
      'sample_interval_sec',
    )
      .notNull()
      .default(60),

    firmwareVersion: text(
      'firmware_version',
    ),

    lastSeenAt: integer('last_seen_at', {
      mode: 'timestamp_ms',
    }),

    createdAt: integer('created_at', {
      mode: 'timestamp_ms',
    }).notNull(),

    updatedAt: integer('updated_at', {
      mode: 'timestamp_ms',
    }).notNull(),
  },
  (table) => [
    uniqueIndex('devices_uid_uq').on(
      table.uid,
    ),

    uniqueIndex('devices_mac_address_uq')
      .on(table.macAddress),

    index('devices_room_idx').on(
      table.roomId,
    ),

    check(
      'devices_sample_interval_positive',
      sql`${table.sampleIntervalSec} > 0`,
    ),
  ],
);

export const thhomeData = sqliteTable(
  'thhome_data',
  {
    id: integer('id')
      .primaryKey({
        autoIncrement: true,
      }),

    deviceId: text('device_id')
      .notNull()
      .references(
        () => devices.id,
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      ),

    schemaVersion: integer(
      'schema_version',
    ).notNull(),

    messageId: text(
      'message_id',
    ).notNull(),

    sequence: integer('sequence'),

    capturedAt: integer(
      'captured_at',
      {
        mode: 'timestamp_ms',
      },
    ),

    receivedAt: integer(
      'received_at',
      {
        mode: 'timestamp_ms',
      },
    ).notNull(),

    temperatureC: real(
      'temperature_c',
    ).notNull(),

    humidityPct: real(
      'humidity_pct',
    ).notNull(),

    batteryVoltage: real(
      'battery_voltage',
    ),

    batteryPct: real(
      'battery_pct',
    ),

    rssiDbm: integer(
      'rssi_dbm',
    ),

    firmwareVersion: text(
      'firmware_version',
    ),
  },
  (table) => [
    uniqueIndex(
      'thhome_data_device_message_uq',
    ).on(
      table.deviceId,
      table.messageId,
    ),

    index(
      'thhome_data_device_received_idx',
    ).on(
      table.deviceId,
      table.receivedAt,
    ),

    check(
      'thhome_data_schema_version_positive',
      sql`${table.schemaVersion} > 0`,
    ),

    check(
      'thhome_data_sequence_non_negative',
      sql`${table.sequence} IS NULL OR ${table.sequence} >= 0`,
    ),

    check(
      'thhome_data_humidity_range',
      sql`${table.humidityPct} >= 0 AND ${table.humidityPct} <= 100`,
    ),

    check(
      'thhome_data_battery_pct_range',
      sql`${table.batteryPct} IS NULL OR (${table.batteryPct} >= 0 AND ${table.batteryPct} <= 100)`,
    ),
  ],
);

export const integrations = sqliteTable(
  "integrations",
  {
    id: text("id").primaryKey(),

    uid: text("uid").notNull().unique(),

    name: text("name").notNull(),
    type: text("type").notNull(),

    description: text("description"),

    enabled: integer("enabled", { mode: "boolean" })
      .notNull()
      .default(true),

    status: text("status")
      .notNull()
      .default("unknown"),

    lastSyncAt: text("last_sync_at"),
    lastError: text("last_error"),

    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    typeIdx: index("integrations_type_idx").on(table.type),
  })
);



export const powerOutages = sqliteTable(
  'power_outages',
  {
    id: integer('id').primaryKey({
      autoIncrement: true,
    }),

    deviceId: text('device_id')
      .notNull()
      .references(() => devices.id, {
        onDelete: 'cascade',
      }),

    status: text('status', {
      enum: ['online', 'offline', 'unknown'],
    })
      .notNull()
      .default('unknown'),

    startedAt: integer('started_at', {
      mode: 'timestamp_ms',
    }).notNull(),

    endedAt: integer('ended_at', {
      mode: 'timestamp_ms',
    }),
    
    lastCheckedAt: integer('last_checked_at', {
      mode: 'timestamp_ms',
    }),
  },
  (table) => [
    index('power_outages_device_started_idx').on(
      table.deviceId,
      table.startedAt,
    ),

    uniqueIndex('power_outages_active_uq')
      .on(table.deviceId)
      .where(sql`${table.endedAt} IS NULL`),

    check(
      'power_outages_valid_status',
      sql`${table.status} IN ('online', 'offline', 'unknown')`,
    ),

    check(
      'power_outages_valid_interval',
      sql`${table.endedAt} IS NULL OR ${table.endedAt} >= ${table.startedAt}`,
    ),
  ],
);

