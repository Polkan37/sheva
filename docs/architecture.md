
# SHEVA — System Architecture

**Project:** Home Monitoring System  
**Status:** Active development  
**Last reviewed:** 2026-10-09  
**Reference commit:** `aeb387bf825f5a61d10fb629933ee28272da7d36`  
**Firmware version:** 0.2.0

---

## 1. Overview

SHEVA is a local-first home monitoring system that combines data from physical IoT devices with external information services.

The system currently provides:

- Indoor temperature and humidity monitoring.
- Battery-powered ESP32 sensor nodes.
- Battery voltage and charge estimation.
- Device connectivity status.
- Historical measurement storage and analytics.
- Room-based monitoring.
- An interactive apartment floor plan.
- Electricity outage schedules through Yasno.
- Weather information and forecasts through UkrHMC.
- A responsive web dashboard.

The core IoT functionality operates over the local network. External integrations require Internet connectivity.

### System architecture

```text
                   SYSTEM

  HARDWARE
  ┌─────────────────────────────────┐
  │ ESP32-C6-Zero                  │
  │                                 │
  │ SHT40        Temperature        │
  │              Humidity           │
  │                                 │
  │ INA219       Battery voltage    │
  │                                 │
  │ Firmware 0.2.0                  │
  └────────────────┬────────────────┘
                   │
                   │ Wi-Fi / HTTP POST
                   ▼
  BACKEND
  ┌─────────────────────────────────┐
  │ Node.js + Fastify + TypeScript  │
  │                                 │
  │ Device and room management      │
  │ Measurement ingestion           │
  │ Analytics                       │
  │ External integration services   │
  └──────────────┬──────────────────┘
     ▲        ▲  │         ▲
     │        |  ▼         |
     │ ┌─────────────┐  ┌───────────┐
     │ │ SQLite      │  │ External  │
     │ │             │  │ APIs      │
     │ │             │  │           │
     │ │ Devices     │  │ Yasno     │
     │ │ Rooms       │  │ UkrHMC    │
     │ │ THHome data │  │           │
     │ │ Integrations│  │           │
     │ └─────────────┘  └───────────┘
     │
     │  HTTP GET
     │           
     │              FRONTEND
  ┌──┴──────────────────────────────┐
  │ React + TypeScript + Vite       │
  │                                 │
  │ Home dashboard                  │
  │ Room pages                      │
  │ Device pages                    │
  │ Integration pages               │
  │ Charts and floor plan           │
  └─────────────────────────────────┘
```

---

## 2. Technology Stack

### Firmware

| Component | Technology |
|---|---|
| Microcontroller | ESP32-C6-Zero |
| Language | C++ |
| Framework | Arduino |
| Build system | PlatformIO |
| Temperature and humidity | SHT40 |
| Voltage monitoring | INA219 |
| Communication | Wi-Fi |
| Protocol | HTTP/JSON |

### Backend

| Component | Technology |
|---|---|
| Runtime | Node.js |
| Language | TypeScript |
| HTTP framework | Fastify 5 |
| API validation | TypeBox |
| Database | SQLite |
| Database driver | better-sqlite3 |
| ORM | Drizzle ORM |
| Schema migrations | drizzle-kit |

### Frontend

| Component | Technology |
|---|---|
| UI library | React 19 |
| Language | TypeScript |
| Build tool | Vite 8 |
| Routing | React Router 7 |
| Charts | Chart.js |
| Icons | Lucide React |
| Styling | CSS and CSS Modules |

No external state-management framework is currently required.

---

## 3. Repository Structure

```text
sheva/
├── client/
│   ├── src/
│   │   ├── assets/
│   │   ├── entities/
│   │   │   └── Integration/
│   │   ├── features/
│   │   │   ├── Card/
│   │   │   ├── Devices/
│   │   │   │   └── THHome/
│   │   │   ├── Header/
│   │   │   ├── Integrations/
│   │   │   │   ├── Ukrhmc/
│   │   │   │   └── Yasno/
│   │   │   └── Plan/
│   │   ├── pages/
│   │   │   ├── devices/
│   │   │   ├── home/
│   │   │   ├── integrations/
│   │   │   ├── room/
│   │   │   └── settings/
│   │   ├── shared/
│   │   │   ├── api/
│   │   │   ├── hooks/
│   │   │   └── lib/
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
│
├── server/
│   ├── drizzle/
│   │   └── meta/
│   ├── src/
│   │   ├── config/
│   │   ├── db/
│   │   ├── routes/
│   │   ├── services/
│   │   │   └── integrations/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── drizzle.config.ts
│   └── package.json
│
├── firmware/
│   └── esp32/
│       ├── include/
│       ├── lib/
│       ├── src/
│       │   └── main.cpp
│       └── platformio.ini
│
└── docs/
    ├── architecture.md
    └── database.md
```

The repository separates firmware, backend, and frontend. Each component has its own build and runtime configuration.

---

## 4. Firmware Architecture

### 4.1 Hardware

The initial environmental sensor consists of:

- ESP32-C6-Zero microcontroller.
- SHT40 temperature/humidity sensor.
- INA219 voltage monitoring module.
- Rechargeable Li-ion battery and associated charging/protection hardware.

The sensors communicate over the I²C bus.

| Signal | ESP32 GPIO |
|---|---|
| SDA | GPIO21 |
| SCL | GPIO22 |

The SHT40 and INA219 share the same I²C bus.

### 4.2 Measurement Lifecycle

The firmware performs the following operations:

1. Initialize the I²C bus and sensors.
2. Read battery voltage.
3. Check battery protection thresholds.
4. Read temperature and humidity.
5. Connect to the local Wi-Fi network.
6. Generate a unique message identifier.
7. Serialize a JSON payload.
8. Send the measurement to the backend.
9. Disable Wi-Fi.
10. Enter a timed waiting state or deep sleep.

The cycle repeats after the configured interval.

### 4.3 Measurement Payload

The current firmware transmits the following structure:

```json
{
  "schemaVersion": 1,
  "messageId": "UNIQUE_MESSAGE_ID",
  "temperatureC": 24.5,
  "humidityPct": 52.8,
  "batteryVoltage": 3.91,
  "batteryPct": 61.5,
  "rssiDbm": -57,
  "firmwareVersion": "2.0.0"
}
```

The device UID is part of the HTTP endpoint rather than the JSON body:

```http
POST /api/devices/:uid/measurements
Content-Type: application/json
```

The server also supports optional `sequence` and `capturedAt` fields, but the current firmware does not send them.

### 4.4 Transmission and Retry Behavior

Current firmware configuration:

| Setting | Value |
|---|---|
| Normal interval | 60 seconds |
| Error interval | 60 seconds |
| Low battery interval | 300 seconds |
| Wi-Fi timeout | 15 seconds |
| HTTP timeout | 5 seconds |
| HTTP attempts | 2 |

A single message ID is reused across HTTP retry attempts.

The backend uses this identifier to recognize duplicate measurements.

HTTP status codes 200 and 201 are considered successful.

### 4.5 Battery Management

Battery voltage is calculated using INA219 bus and shunt voltage readings.

Battery percentage is estimated through piecewise-linear interpolation between voltage and charge percentage reference points.

The firmware implements battery protection with hysteresis:

| Parameter | Threshold |
|---|---|
| Protection activation | <= 3.35 V |
| Protection recovery | >= 3.65 V |

When protection is active:

- Wi-Fi communication is skipped.
- Environmental measurements are not transmitted.
- The next cycle occurs after 300 seconds.

The protection state is stored in RTC memory.

Battery percentage estimation is approximate and does not represent direct measurement of remaining battery capacity.

Firmware-level low-voltage protection does not replace battery protection circuitry.

### 4.6 Deep Sleep

The firmware supports ESP32 timer-based deep sleep.

When a USB Serial/JTAG host is connected, the firmware keeps the device awake and uses a timed loop instead.

This allows serial debugging without repeatedly losing the USB connection during deep-sleep cycles.

### 4.7 Current Limitations

- Only one physical sensor implementation is present.
- Device UID is configured in firmware.
- Wi-Fi settings require firmware configuration.
- OTA firmware updates are not implemented.
- Telemetry uses HTTP without application-level device authentication.
- Battery percentage is voltage-derived rather than measured through a fuel gauge.

---

## 5. Backend Architecture

The server is a single Fastify application implemented in TypeScript.

### 5.1 Application Initialization

`server/src/server.ts` starts the HTTP server.

`server/src/app.ts` constructs the Fastify instance and registers route modules.

The server listens on:

```text
0.0.0.0:3000
```

### 5.2 Route Modules

| Module | Responsibility |
|---|---|
| health.routes.ts | Health endpoint |
| rooms.routes.ts | Room information |
| devices.routes.ts | Device listing and status |
| measurements.routes.ts | Measurement ingestion and retrieval |
| analytics.routes.ts | Measurement aggregation |
| integrations.routes.ts | External integration data |

### 5.3 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health status |
| GET | `/api/rooms` | Rooms and latest room measurements |
| GET | `/api/devices/` | Registered devices |
| POST | `/api/devices/:uid/measurements` | Submit measurement |
| GET | `/api/devices/:uid/measurements` | Retrieve measurements |
| GET | `/api/devices/:uid/analytics` | Aggregated statistics |
| GET | `/api/integrations` | Registered integrations with provider data |

### 5.4 Measurement Ingestion

The ingestion endpoint validates the payload using TypeBox.

Processing flow:

1. Validate URL parameters and request body.
2. Find the registered device using its UID.
3. Reject unknown devices with HTTP 404.
4. Create a server-side reception timestamp.
5. Insert the measurement within a transaction.
6. Ignore duplicate `(device_id, message_id)` combinations.
7. Update device `lastSeenAt` and `updatedAt`.
8. Return the ingestion result.

Successful responses:

**New measurement:**

```json
{
  "accepted": true,
  "duplicate": false,
  "readingId": 123
}
```

**Duplicate measurement:**

```json
{
  "accepted": true,
  "duplicate": true
}
```

The database uniqueness constraint provides idempotency for repeated message IDs.

### 5.5 Device Status

The device's online state is calculated dynamically.

A device is considered online when:

```text
currentTime - lastSeenAt
    < sampleIntervalSec * 3
```

The online state is not stored as a separate database column.

This approach avoids maintaining an additional persistent connectivity status.

The configured sampling interval must reflect the device's actual reporting behavior to make the online indicator meaningful.

### 5.6 Measurement Retrieval

```http
GET /api/devices/:uid/measurements
```

Supported query parameters:

| Parameter | Description |
|---|---|
| amount | Required: `latest` or integer 1–1000 |
| startNumber | Optional, one-based pagination offset |

Examples:

```http
GET /api/devices/:uid/measurements?amount=latest

GET /api/devices/:uid/measurements?amount=100&startNumber=101
```

Results are ordered by:

1. `receivedAt DESC`
2. `id DESC`

The response includes total record count, pagination metadata, and measurements.

### 5.7 Analytics

```http
GET /api/devices/:uid/analytics
```

The endpoint supports two mutually exclusive query modes.

**Predefined period:**

```http
GET /api/devices/:uid/analytics?range=24h&points=200
```

Supported periods:

- 1h
- 6h
- 24h
- 7d
- 30d

**Explicit time interval:**

```http
GET /api/devices/:uid/analytics?from=2026-10-01T00:00:00Z&to=2026-10-02T00:00:00Z&points=200
```

The two modes cannot be combined.

The `points` parameter defaults to 200 and supports values between 20 and 500.

Analytics are calculated in SQLite.

The endpoint computes:

- Number of measurements.
- Average value.
- Minimum value.
- Maximum value.

Supported metrics:

- Temperature.
- Humidity.
- Battery voltage.
- Battery percentage.
- Wi-Fi RSSI.

Measurements are grouped into time buckets.

Bucket resolution depends on the requested time range, number of points, and device sampling interval.

The response contains an overall summary and aggregated time-series points.

The time interval is inclusive of `from` and exclusive of `to`.

### 5.8 Room Measurements

`GET /api/rooms` returns registered rooms sorted by display order and name.

A room may reference separate devices for temperature and humidity.

For each configured source, the server retrieves the latest corresponding measurement.

Consequently:

- Room temperature and humidity can originate from different devices.
- Missing measurement sources return `null`.
- Rooms do not store duplicated current measurement values.

---

## 6. External Integrations

External integrations extend SHEVA beyond physical IoT sensors.

### 6.1 Integration Registry

Integration handling is implemented in:

```text
server/src/services/integrations/
├── yasno.ts
└── ukrhmc.ts
```

The registry maps integration types to provider handlers.

| Integration type | Handler |
|---|---|
| power_outages | getYasnoIntegrationData |
| weather | getUkrHmcWeather |

The `weather.ts` file currently contains a placeholder implementation and is not used by the registry.

### 6.2 Integration Retrieval

```http
GET /api/integrations
```

The server:

1. Retrieves integration metadata from SQLite.
2. Determines the handler from each integration's `type`.
3. Requests provider-specific data.
4. Combines metadata with provider data.
5. Returns the integration collection.

Providers are accessed during HTTP request processing.

Provider responses are not stored as separate historical records.

### 6.3 Yasno

The Yasno service retrieves electricity outage information.

It supports:

- Resolving a configured street.
- Resolving a configured house.
- Determining electricity outage group/subgroup.
- Fetching published schedules.
- Reading today's and tomorrow's schedule.
- Determining the next planned shutdown.
- Determining the next planned restoration.
- Returning provider address and schedule status.

Configuration:

```env
YASNO_REGION_ID=
YASNO_DSO_ID=
YASNO_STREET=
YASNO_HOUSE=
```

Resolved street and house IDs are cached in server process memory.

The cache is cleared when an integration retrieval error occurs.

The cache is not persistent and is not shared between server instances.

### 6.4 UkrHMC Weather

Weather data comes from an external UkrHMC endpoint.

Configuration:

```env
LOCATION=Kyiv
LATITUDE=50.4501
LONGITUDE=30.5234
```

Returned information includes:

**Current conditions**

- Temperature.
- Weather condition and code.
- Relative humidity.
- Atmospheric pressure.
- Precipitation.
- Wind speed and direction.
- Dew point.
- Day/night indicator.

**Forecast**

- Date.
- Minimum temperature.
- Maximum temperature.
- Weather condition.
- Precipitation.

The service groups hourly forecast data into daily summaries and returns up to 10 days, subject to data availability from the provider.

### 6.5 Integration Limitations

The integration architecture currently has several limitations:

- Provider data is fetched when requested.
- No persistent provider response cache exists.
- There is no background synchronization scheduler.
- Integration status fields are not consistently maintained after requests.
- The `enabled` field does not currently prevent provider fetching.
- One provider failure can cause the overall integrations request to fail.
- Unknown integration types return metadata without specialized data.

These are implementation limitations, not guaranteed application features.

---

## 7. Frontend Architecture

The frontend is a React single-page application using feature-oriented organization.

### 7.1 Routing

Routing is defined in `client/src/App.tsx`.

| Route | Component | Purpose |
|---|---|---|
| `/` | HomePage | Main dashboard |
| `/devices` | DevicesPage | Devices and measurements |
| `/settings` | SettingsPage | Settings placeholder |
| `/integrations/:uid` | IntegrationPage | Integration details |
| `/:slug` | RoomPage | Individual room |

Device selection uses a URL query parameter:

```text
/devices?uid=living-room-env-01
```

Room pages use the room slug directly:

```text
/living-room
/bedroom
/bathroom
```

### 7.2 Home Dashboard

The home page combines:

- Interactive apartment floor plan.
- Room cards.
- Room hover highlighting.
- Integration cards.

Room data is loaded through `useRooms`.

The active room is managed through local React state and shared between the floor plan and room cards.

### 7.3 Device Views

Device pages use a generic device collection with type-specific rendering.

The THHome feature provides the implemented temperature/humidity device interface.

It contains:

- Current measurements.
- Battery state visualization.
- Device statistics.
- Historical charts.

The device list and selected device view are separate components.

### 7.4 Integration Views

Integration UI components are registered in:

```text
client/src/features/Integrations/config.ts
```

The configuration maps integration UIDs to specialized card and page components.

Currently supported UIDs:

- `yasno`
- `ukrhmc`

This allows different integrations to have their own presentation while sharing the integration collection endpoint.

### 7.5 Data Access Layer

The frontend API layer is located in:

```text
client/src/shared/api/
├── analytics.ts
├── client.ts
├── devices.ts
├── integrations.ts
├── measurements.ts
└── rooms.ts
```

Reusable data-loading hooks:

```text
client/src/shared/hooks/
├── useDevices.ts
├── useIntegrations.ts
├── useMeasurements.ts
└── useRooms.ts
```

Responsibilities:

- API modules perform HTTP requests and define response types.
- Hooks manage React state and request lifecycle.
- Pages compose features and select data.
- Features render domain-specific UI.

The current hooks use React state and effects.

There is no shared query cache or central real-time subscription layer.

### 7.6 API Configuration

The shared API client reads:

```typescript
import.meta.env.VITE_API_URL
```

However, some API modules use relative `/api/...` URLs directly.

This means deployment configuration must provide a compatible API origin or reverse-proxy setup.

The tracked client `.env.example` uses `API_URL`, which does not match the variable expected by the shared API client.

This inconsistency should be corrected separately.

---

## 8. Database Architecture

SHEVA currently defines four tables:

| Table | Purpose |
|---|---|
| rooms | Room metadata and measurement source references |
| devices | Physical IoT device registry |
| thhome_data | Environmental measurements |
| integrations | External integration metadata and configuration state |

The database uses SQLite and Drizzle ORM.

SQLite is configured with:

```text
foreign_keys = ON
journal_mode = WAL
busy_timeout = 5000
```

The schema and migration details are documented in:

[database.md](./database.md)

---

## 9. Security

### Current Implementation

The system is primarily designed for use on a trusted local network.

Existing protections include:

- Request schema validation.
- Database constraints.
- Foreign key enforcement.
- Duplicate-message prevention.
- External API request timeouts where implemented.

Production deployment on untrusted networks requires additional security controls.

---

## 10. Deployment

The server requires a configured database file path:

```env
DB_FILE_NAME=./data/iot.db
```

### Backend

```bash
cd server
npm install
npm run dev
```

Production build:

```bash
npm run build
npm start
```

### Frontend

```bash
cd client
npm install
npm run dev
```

Production build:

```bash
npm run build
```

### Firmware

The firmware is built and uploaded using PlatformIO.

The current PlatformIO configuration contains machine-specific USB port paths, which may need adjustment on another computer.

---

## 11. Known Technical Limitations

### Database migrations

The migration journal references a baseline migration named `0000_previous_zemo`, but the corresponding SQL file is not present in the committed repository.

Room migrations also require review because two migration files address overlapping schema changes.

A clean migration path must be verified before relying on fresh installations.

### Backend

- No device authentication.
- No explicit per-device API rate limiting.
- External integration requests are not isolated from one another.
- No background integration refresh.
- No persistent third-party API cache.

### Frontend

- No centralized server-state caching.
- No WebSocket or Server-Sent Events channel.
- Inconsistent API base URL handling.
- Settings page is not a complete configuration interface.
- Integration and device data are loaded through independent hooks.

### Firmware

- Device configuration is compiled into firmware.
- No OTA update mechanism.
- No secure provisioning flow.
- Voltage-based battery estimation.
- Only one implemented physical device type.

### Testing and Operations

- No committed automated test suite was identified.
- No complete deployment automation is present.
- No documented database backup/restore automation.
- No centralized monitoring or alerting infrastructure.

---

## 12. Future Development

Potential improvements, not part of the current implementation:

1. Repair and verify clean database migrations.
2. Introduce device authentication.
3. Standardize frontend API requests and error handling.
4. Add integration refresh scheduling and caching.
5. Respect the integration `enabled` state.
6. Add per-integration error isolation.
7. Implement device provisioning and configuration.
8. Add automated tests.
9. Add data retention and database backup policies.
10. Introduce additional device types and integrations.

The architecture should remain modular without adding distributed infrastructure until actual requirements justify it.

---

## 13. Documentation Scope

This document describes the code committed to the referenced revision.

It does not verify:

- The current contents of an external or ignored SQLite database.
- Locally stored secrets.
- Production deployment behavior.
- Actual battery runtime.
- Hardware assembly quality.
- External provider uptime or accuracy.

Implementation details should be updated when the corresponding code changes.
