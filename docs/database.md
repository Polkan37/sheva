
# SHEVA — Database Architecture

**Database:** SQLite  
**ORM:** Drizzle ORM  
**Status:** Active development  
**Last reviewed:** 2026-10-09  

---

## 1. Overview

SHEVA uses SQLite as its persistent storage for:

- Room configuration.
- IoT device registration and metadata.
- Environmental sensor measurements.
- External integration metadata.

The database schema is defined using Drizzle ORM.

The SQLite database is accessed directly by the Fastify backend through `better-sqlite3`.

The frontend and firmware do not access the database directly.

### Source Files

| File | Responsibility |
|---|---|
| `server/src/db/schema.ts` | Table definitions and constraints |
| `server/src/db/client.ts` | Database connection |
| `server/src/db/check.ts` | Diagnostic database query |
| `server/drizzle.config.ts` | Migration configuration |
| `server/drizzle/` | Migration files |
| `server/drizzle/meta/` | Migration metadata |

---

## 2. Database Configuration

The database file is configured through the server environment:

```env
DB_FILE_NAME=./data/iot.db
```

The database client initializes SQLite with the following pragmas:

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
```

### Foreign Keys

Foreign key enforcement maintains referential integrity between rooms, devices, and measurements.

### Write-Ahead Logging

WAL mode allows readers and a writer to operate concurrently under SQLite's concurrency model.

SQLite still supports only one active writer at a time.

### Busy Timeout

The configured busy timeout is 5000 milliseconds.

This allows SQLite to wait for temporary database locks rather than immediately failing.

---

## 3. Schema Overview

The current Drizzle schema contains four tables:

```text
rooms
  │
  │ room_id (devices)
  ▼
devices
  │
  │ device_id
  ▼
thhome_data


integrations
  (independent table)
```

Rooms additionally reference devices through `temperature_device_id` and `humidity_device_id`.

### Relationships

| Source | Target | Relationship |
|---|---|---|
| devices.room_id | rooms.id | Many devices to one room |
| rooms.temperature_device_id | devices.id | Optional temperature source |
| rooms.humidity_device_id | devices.id | Optional humidity source |
| thhome_data.device_id | devices.id | Many measurements to one device |

The `integrations` table currently has no foreign key relationships with the other tables.

---

## 4. Table: rooms

The `rooms` table represents logical locations in a home.

A room can contain multiple devices and can designate separate measurement sources for temperature and humidity.

### Schema

| Column | SQLite type | Nullable | Default | Description |
|---|---|---|---|---|
| id | TEXT | No | — | Primary key |
| name | TEXT | No | — | Display name |
| slug | TEXT | No | — | URL identifier |
| display_order | INTEGER | No | 0 | UI sorting order |
| temperature_device_id | TEXT | Yes | NULL | Temperature source device |
| humidity_device_id | TEXT | Yes | NULL | Humidity source device |
| created_at | INTEGER | No | — | Creation timestamp |
| updated_at | INTEGER | No | — | Update timestamp |

### Primary Key

```sql
PRIMARY KEY (id)
```

### Unique Indexes

```text
rooms_name_uq
rooms_slug_uq
```

### Other Indexes

```text
rooms_display_order_idx
rooms_temperature_device_idx
rooms_humidity_device_idx
```

### Foreign Keys

```text
temperature_device_id → devices.id
humidity_device_id    → devices.id
```

Both references use:

```text
ON DELETE SET NULL
ON UPDATE CASCADE
```

Deleting a referenced device does not delete the room.

Instead, the corresponding room measurement source becomes `NULL`.

### Timestamp Representation

The `created_at` and `updated_at` fields use Drizzle's `timestamp_ms` mode.

They are stored as integer Unix timestamps in milliseconds.

### Example Logical Record

```json
{
  "id": "room-uuid",
  "name": "Living room",
  "slug": "living-room",
  "displayOrder": 1,
  "temperatureDeviceId": "device-uuid",
  "humidityDeviceId": "device-uuid"
}
```

This is an illustrative representation of the schema, not a confirmed row from the running database.

### Room Measurements

Temperature and humidity values are not stored directly in `rooms`.

They are resolved from the latest matching records in `thhome_data`.

The corresponding API endpoint is:

```http
GET /api/rooms
```

A missing source device or measurement produces `null` for that metric.

---

## 5. Table: devices

The `devices` table maintains the registry of physical IoT devices.

A device can be associated with one room.

### Schema

| Column | SQLite type | Nullable | Default | Description |
|---|---|---|---|---|
| id | TEXT | No | — | Primary key |
| uid | TEXT | No | — | Unique external identifier |
| name | TEXT | No | — | Display name |
| description | TEXT | Yes | NULL | Optional description |
| type | TEXT | No | — | Device type |
| room_id | TEXT | Yes | NULL | Associated room |
| sample_interval_sec | INTEGER | No | 60 | Expected reporting interval |
| firmware_version | TEXT | Yes | NULL | Firmware version |
| last_seen_at | INTEGER | Yes | NULL | Latest accepted request time |
| created_at | INTEGER | No | — | Creation timestamp |
| updated_at | INTEGER | No | — | Update timestamp |

### Primary Key

```sql
PRIMARY KEY (id)
```

### Indexes

```text
devices_uid_uq
devices_room_idx
```

The `uid` field has a unique index.

### Foreign Key

```text
room_id → rooms.id
```

Referential actions:

```text
ON DELETE SET NULL
ON UPDATE CASCADE
```

Deleting a room does not delete its devices.

The corresponding `room_id` becomes `NULL`.

### Constraints

```sql
CHECK (sample_interval_sec > 0)
```

### ID vs UID

The database uses two separate identifiers.

**id**

- Internal database primary key.
- Used in foreign key relationships.
- Stored as TEXT.
- The application uses UUID-style values, but the schema does not enforce UUID formatting.

**uid**

- Unique identifier used by external API clients.
- Included in API paths.
- Used to identify a device sending telemetry.

Example:

```text
id  = "97c8d685-2c24-4945-b15c-ed170fff053e"

uid = "living-room-env-01"
```

The firmware uses `uid`, while measurement rows reference the internal device `id`.

### Device Types

Device type is stored as a string.

The initial environmental sensor is represented by:

```text
environment_sensor
```

The database does not enforce a fixed enumeration of device types.

Adding a new device type does not necessarily require changing the `devices` schema.

Its data storage and API handling may still require additional implementation.

### Online Status

There is no persistent `online` column.

The API calculates online status using:

```text
online =
  lastSeenAt != null
  AND
  (now - lastSeenAt)
    < sampleIntervalSec * 3 * 1000
```

The current online state is therefore a computed API property rather than stored data.

### Device Registration

The telemetry endpoint only accepts measurements from devices already registered in the database.

The tracked API does not provide a device registration endpoint.

Device creation must currently be handled outside the exposed API, for example through database setup or administrative scripts.

---

## 6. Table: thhome_data

The `thhome_data` table stores historical measurements from THHome environmental devices.

Each measurement belongs to one registered device.

### Schema

| Column | SQLite type | Nullable | Default | Description |
|---|---|---|---|---|
| id | INTEGER | No | AUTOINCREMENT | Primary key |
| device_id | TEXT | No | — | Device reference |
| schema_version | INTEGER | No | — | Payload schema version |
| message_id | TEXT | No | — | Idempotency identifier |
| sequence | INTEGER | Yes | NULL | Optional device sequence |
| captured_at | INTEGER | Yes | NULL | Device capture timestamp |
| received_at | INTEGER | No | — | Server reception timestamp |
| temperature_c | REAL | No | — | Temperature, °C |
| humidity_pct | REAL | No | — | Relative humidity, % |
| battery_voltage | REAL | Yes | NULL | Battery voltage, V |
| battery_pct | REAL | Yes | NULL | Estimated battery percentage |
| rssi_dbm | INTEGER | Yes | NULL | Wi-Fi RSSI |
| firmware_version | TEXT | Yes | NULL | Sending firmware version |

### Primary Key

```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
```

### Foreign Key

```text
device_id → devices.id
```

Referential actions:

```text
ON DELETE CASCADE
ON UPDATE CASCADE
```

Deleting a registered device deletes its associated THHome measurements.

This behavior is important for historical data retention and must be considered before deleting devices.

### Indexes

```text
thhome_data_device_message_uq
thhome_data_device_received_idx
```

The first index enforces uniqueness of:

```text
(device_id, message_id)
```

The second supports measurement retrieval by device and reception time.

### Constraints

```sql
CHECK (schema_version > 0)

CHECK (
  sequence IS NULL
  OR sequence >= 0
)

CHECK (
  humidity_pct >= 0
  AND humidity_pct <= 100
)

CHECK (
  battery_pct IS NULL
  OR (
    battery_pct >= 0
    AND battery_pct <= 100
  )
)
```

The API also validates measurement values before insertion.

The current request schema allows:

| Field | Accepted range |
|---|---|
| temperatureC | -50 to 100 |
| humidityPct | 0 to 100 |
| batteryVoltage | 0 to 6 |
| batteryPct | 0 to 100 |
| rssiDbm | -120 to 0 |

Temperature, battery voltage, and RSSI ranges are validated at the API layer but are not all duplicated as SQLite CHECK constraints.

### Message Idempotency

The combination:

```text
(device_id, message_id)
```

must be unique.

Repeated HTTP requests carrying the same message ID for the same device do not create duplicate measurement rows.

The server uses conflict handling to ignore duplicate inserts.

### Captured vs Received Time

Two timestamps serve different purposes.

**captured_at**

- Represents the time a device captured a measurement.
- Is supplied by the device when available.
- May be NULL.
- Uses millisecond timestamps in SQLite.

**received_at**

- Is generated by the server.
- Is required.
- Records when the measurement was received.
- Is used for historical ordering and analytics.

The current ESP32 firmware does not transmit `capturedAt`.

Consequently, current firmware readings generally have a NULL `captured_at` value.

### Measurement Example

```json
{
  "id": 123,
  "sequence": null,
  "capturedAt": null,
  "receivedAt": "2026-10-09T17:00:00.000Z",
  "temperatureC": 24.5,
  "humidityPct": 52.8,
  "batteryVoltage": 3.91,
  "batteryPct": 61.5,
  "rssiDbm": -57,
  "firmwareVersion": "2.0.0"
}
```

This example describes the retrieval API representation, not the raw SQLite row.

### Data Retention

The current code does not define:

- Measurement retention periods.
- Automatic deletion of old records.
- Data partitioning.
- Downsampled persistent tables.
- Scheduled data archiving.

Historical measurements accumulate until explicitly deleted.

---

## 7. Table: integrations

The `integrations` table stores configuration and metadata for external information services.

Unlike physical devices, integrations do not generate rows in `thhome_data`.

### Schema

| Column | SQLite type | Nullable | Default | Description |
|---|---|---|---|---|
| id | TEXT | No | — | Primary key |
| uid | TEXT | No | — | Unique integration identifier |
| name | TEXT | No | — | Display name |
| type | TEXT | No | — | Handler selection type |
| description | TEXT | Yes | NULL | Optional description |
| enabled | INTEGER | No | 1 | Boolean configuration flag |
| status | TEXT | No | 'unknown' | Stored status |
| last_sync_at | TEXT | Yes | NULL | Stored synchronization timestamp |
| last_error | TEXT | Yes | NULL | Stored error information |
| created_at | TEXT | No | — | Creation timestamp |
| updated_at | TEXT | No | — | Update timestamp |

### Primary Key

```sql
PRIMARY KEY (id)
```

### Indexes

```text
integrations_uid_unique
integrations_type_idx
```

The UID is unique.

The type index supports filtering or lookup by integration category.

### Data Types

The `enabled` field uses Drizzle's boolean mode for SQLite integers.

The timestamp-related integration columns are stored as TEXT.

This differs from the integer millisecond timestamps used for rooms, devices, and measurements.

### Integration UID vs Type

The `uid` field identifies a concrete integration in the frontend.

Examples:

```text
yasno
ukrhmc
```

The `type` field selects the backend data provider handler.

Current mappings:

| UID | Type | Handler |
|---|---|---|
| yasno | power_outages | getYasnoIntegrationData |
| ukrhmc | weather | getUkrHmcWeather |

The UID-to-type associations above describe the intended registered integrations, not database-enforced mappings.

### Provider Data

The database does not currently store:

- Yasno outage schedules.
- Yasno address resolution IDs.
- Weather forecast records.
- Historical weather observations.
- Provider response caches.

These values are generated or retrieved by integration services when requested.

### Enabled State

The `enabled` field is present in the database.

However, the current integration retrieval endpoint does not filter out disabled integrations or skip their provider handlers.

Therefore, the database flag does not currently enforce provider deactivation.

### Synchronization State

The table contains:

```text
status
last_sync_at
last_error
```

The current API does not implement a complete synchronization state lifecycle.

Provider-specific response fields can override metadata fields when constructing the API response.

The stored timestamps and error fields should not be interpreted as a complete synchronization audit trail.

### Integration Example

```json
{
  "id": "integration-uuid",
  "uid": "yasno",
  "name": "Yasno",
  "type": "power_outages",
  "description": "Power outage schedule",
  "enabled": true,
  "status": "unknown",
  "lastSyncAt": null,
  "lastError": null
}
```

This is a logical example of persisted integration metadata.

Provider-specific data is added by the API layer.

---

## 8. Referential Integrity

The schema uses three important deletion strategies.

### Room Deletion

```text
DELETE room
    │
    ▼
devices.room_id = NULL
```

The device remains registered.

### Device Deletion

```text
DELETE device
    ├── thhome_data → CASCADE DELETE
    ├── rooms.temperature_device_id → NULL
    └── rooms.humidity_device_id → NULL
```

Associated measurement history is removed.

Room source references are cleared.

### Integration Deletion

Deleting an integration does not directly modify rooms, devices, or measurements.

There are no integration foreign key relationships in the current schema.

---

## 9. Data Access Patterns

### 9.1 Get Rooms

Endpoint:

```http
GET /api/rooms
```

Access pattern:

1. Select rooms.
2. Sort by display order and name.
3. For each room, find the latest configured temperature measurement.
4. Find the latest configured humidity measurement.
5. Return room data with derived values.

The current implementation performs separate latest-measurement queries for each configured source.

### 9.2 Get Devices

Endpoint:

```http
GET /api/devices/
```

Access pattern:

1. Select registered devices.
2. Left join rooms.
3. Calculate online status.
4. Return device metadata.

### 9.3 Insert Measurement

Endpoint:

```http
POST /api/devices/:uid/measurements
```

Access pattern:

1. Look up device by UID.
2. Insert measurement with duplicate conflict handling.
3. Update device last-seen timestamp.
4. Commit transaction.

### 9.4 Get Measurements

Endpoint:

```http
GET /api/devices/:uid/measurements
```

Measurements are retrieved using the device ID.

Results are sorted newest first.

The API supports count-limited pagination.

### 9.5 Get Analytics

Endpoint:

```http
GET /api/devices/:uid/analytics
```

SQLite performs aggregate calculations over the requested period.

The API returns:

- Overall metric summaries.
- Time-bucketed summaries.
- Bucket sample counts.
- Requested and actual point counts.
- Effective bucket resolution.

The aggregation reads from `thhome_data` rather than maintaining separate summary tables.

### 9.6 Get Integrations

Endpoint:

```http
GET /api/integrations
```

Database metadata is loaded and enriched with external provider information.

The current implementation does not store the fetched provider results.

---

## 10. Database Migrations

Drizzle migrations are configured in:

```text
server/drizzle.config.ts
```

Relevant commands:

```bash
npm run db:generate
npm run db:migrate
npm run db:studio
```

### Tracked Migration History

| Migration | Purpose |
|---|---|
| 0000_previous_zemo | Referenced baseline; SQL file not committed |
| 0001_panoramic_vivisector | Rebuild rooms with additional fields and references |
| 0002_repair_rooms_schema | Add/repair room columns and indexes |
| 0003_past_corsair | Add device description |
| 0004_youthful_dormammu | Create integrations table |
| 0005_premium_doomsday | Add integrations type index |

### Migration Consistency Warning

The repository contains an inconsistent migration history.

The migration journal references:

```text
0000_previous_zemo
```

But the corresponding SQL file is absent from the tracked repository.

Additionally, migrations `0001` and `0002` both contain changes related to:

- Room slug.
- Room display order.
- Temperature source reference.
- Humidity source reference.
- Associated indexes.

Applying these migrations sequentially against a database without the expected baseline state may fail.

The current Drizzle schema describes the intended database structure, but committed migration files alone do not establish a verified clean-install procedure.

Before production deployment:

1. Recover or reconstruct the baseline migration.
2. Verify the expected state before each migration.
3. Resolve overlapping room migrations.
4. Test migrations against a disposable database.
5. Verify the resulting SQLite schema against `schema.ts`.

Do not alter existing production migration history without first backing up the database and establishing a migration strategy.

---

## 11. Database Backup

SQLite is stored in a local file configured by `DB_FILE_NAME`.

The application uses WAL mode, so copying only the main database file while writes are active may not produce a consistent backup.

A safe backup process should use SQLite's supported backup mechanisms.

Example using the SQLite command-line interface:

```bash
sqlite3 ./data/iot.db ".backup './data/iot-backup.db'"
```

The project currently does not implement an automated backup process.

For production use, regular backups and restoration testing are recommended.

---

## 12. Current Limitations

### Schema and Migrations

- Migration history is incomplete.
- Room migrations contain overlapping changes.
- UUID formatting is not enforced by SQLite constraints.
- Timestamp storage conventions differ between tables.

### Data Lifecycle

- No automatic measurement retention policy.
- No automatic backup.
- No persistent analytics cache.
- No audit log for record changes.

### Integration Persistence

- No provider response history.
- No persistent external API cache.
- No complete synchronization status management.
- The `enabled` flag is not enforced by the current endpoint.

### Query Performance

- Room measurements use per-room source queries.
- Large historical datasets may require retention or aggregation policies.
- Pagination uses SQL OFFSET.
- No additional materialized historical summaries are implemented.

---

## 13. Future Improvements

Potential improvements, not part of the current database implementation:

1. Establish a reproducible migration baseline.
2. Standardize timestamp storage conventions.
3. Introduce automated backup and recovery.
4. Add configurable measurement retention.
5. Optimize room measurement queries if needed.
6. Add integration synchronization state management.
7. Introduce persistent integration caching if required.
8. Add migration and data-integrity tests.
9. Add administrative device registration workflows.

The current four-table model is suitable for the existing application scope.

Additional tables should be introduced when new device types, persistence requirements, or query patterns justify them.

---

## 14. Documentation Scope

This document is based on the committed Drizzle schema, migration files, and backend route implementations at the reference commit.

The runtime contents of `iot.db` were not available for inspection.

Consequently, the document represents the code-defined schema and known migration history rather than a verified dump of a deployed database.
