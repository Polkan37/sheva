# Home Environment Monitoring System
## Technical Design Document (TLD)

**Status:** Draft  
**Version:** 0.1  
**Last updated:** 2026-09-14

---

## 1. Overview

Home Environment Monitoring System is a local-first IoT system for monitoring environmental conditions inside a home.

Battery-powered ESP32 sensor nodes collect environmental data such as temperature and relative humidity and transmit measurements over the local Wi-Fi network. A local server receives, validates, stores, and exposes sensor measurements through an API.

A web dashboard provides current measurements, historical data, device status, and an interactive 2D apartment floor plan. The system is intended to operate without requiring public Internet access or third-party cloud infrastructure.

The initial implementation focuses on establishing a complete vertical data flow:

`Sensor → ESP32 → Wi-Fi → Local API → Database → Dashboard`

---

## 2. Goals

The initial system should:

- collect temperature measurements;
- collect relative humidity measurements;
- monitor sensor-node battery state;
- support multiple independent sensor nodes;
- periodically transmit measurements to a local server;
- store historical measurements;
- expose device and measurement data through an API;
- display current readings in a web dashboard;
- associate sensor nodes with rooms;
- visualize rooms on an interactive apartment floor plan;
- indicate whether a sensor node is online or offline;
- operate inside the local network without depending on cloud infrastructure.

---

## 3. Non-goals

The initial version will not provide:

- public Internet access to the dashboard;
- cloud storage;
- native mobile applications;
- Zigbee communication;
- remote actuator/device control;
- machine-learning predictions;
- Home Assistant integration;
- complex user/role management;
- production-scale distributed infrastructure.

These features may be considered in future versions but must not block the MVP.

---

## 4. Requirements

### 4.1 Functional Requirements

**FR-01:** A sensor node shall measure temperature.

**FR-02:** A sensor node shall measure relative humidity.

**FR-03:** A sensor node shall report battery/power information.

**FR-04:** A sensor node shall periodically send measurements to the server.

**FR-05:** Each measurement shall identify the originating device.

**FR-06:** The server shall validate incoming measurements.

**FR-07:** The server shall persist valid measurements.

**FR-08:** The server shall expose registered devices through an API.

**FR-09:** The server shall expose the latest measurement for a device.

**FR-10:** The server shall expose historical measurements for a device.

**FR-11:** The dashboard shall display the latest environmental measurements.

**FR-12:** The dashboard shall associate devices with rooms.

**FR-13:** The dashboard shall display device status.

**FR-14:** The dashboard shall provide an interactive apartment floor plan.

**FR-15:** The system shall support adding additional sensor nodes.

### 4.2 Non-functional Requirements

**NFR-01:** The core system shall operate without Internet connectivity.

**NFR-02:** Sensor nodes shall support battery-powered operation.

**NFR-03:** Historical measurements shall survive server restarts.

**NFR-04:** Adding a sensor node shall not require modifying firmware of existing devices.

**NFR-05:** The dashboard shall be accessible from devices connected to the home LAN.

**NFR-06:** Components should remain replaceable where practical; for example, changing the database should not require rewriting ESP32 firmware.

**NFR-07:** The MVP should minimize infrastructure and hardware dependencies.

**NFR-08:** Failures of an individual sensor node shall not prevent other nodes from operating.

---

## 5. System Architecture

### 5.1 High-Level Architecture

```text
┌──────────────────────────────┐
│ Sensor Node                  │
│                              │
│ SHT40 ─────┐                 │
│            ├── ESP32         │
│ INA219 ────┘       │         │
│                    │ Wi-Fi   │
└────────────────────┼─────────┘
                     │
                     ▼
               Home Wi-Fi LAN
                     │
                     ▼
┌──────────────────────────────┐
│ Local Server                 │
│                              │
│ HTTP API                     │
│      │                       │
│      ▼                       │
│ Application / Services       │
│      │                       │
│      ▼                       │
│ Database                     │
└──────────────┬───────────────┘
               │
               │ HTTP
               ▼
┌──────────────────────────────┐
│ Web Dashboard                │
│                              │
│ • Current readings           │
│ • Historical data            │
│ • Device status              │
│ • Apartment floor plan       │
└──────────────────────────────┘
```

### 5.2 Main Components

#### Sensor Node

Responsible for:

- reading physical sensors;
- obtaining power/battery information;
- connecting to the local Wi-Fi network;
- constructing measurement payloads;
- transmitting measurements to the server;
- handling temporary communication failures.

#### Local Server

Responsible for:

- accepting measurements from sensor nodes;
- validating incoming data;
- storing measurements;
- managing device metadata;
- exposing data to dashboard clients;
- determining device status where appropriate.

The production server is intended to run on a Raspberry Pi. During development, the same application may run locally on a laptop.

#### Database

Responsible for persistent storage of:

- devices;
- device metadata;
- measurements;
- timestamps;
- room associations.

#### Web Dashboard

Responsible for:

- presenting current measurements;
- presenting historical measurements;
- displaying sensor/device state;
- mapping devices to rooms;
- rendering an interactive 2D apartment plan.

---

## 6. Sensor Node Architecture

### 6.1 Hardware

Planned hardware:

- ESP32 — main controller and Wi-Fi communication;
- SHT40 — temperature and relative humidity sensor;
- INA219 — voltage/current/power monitoring;
- TP4056 — Li-ion battery charging module;
- 18650 Li-ion cell — autonomous power source.

### 6.2 Logical Architecture

```text
                ┌──────────────┐
                │    SHT40     │
                │ Temp / RH    │
                └──────┬───────┘
                       │ I²C
                       │
┌────────────┐   ┌─────▼──────┐
│   INA219   ├──►│    ESP32    │
│   Power    │I²C│             │
└────────────┘   └─────┬──────┘
                       │
                       │ Wi-Fi
                       ▼
                  Local Server


18650
  │
  ▼
TP4056
  │
  └── Power subsystem
```

> **TODO:** Final power wiring must be documented after the hardware configuration is validated. The charging path, ESP32 supply requirements, INA219 measurement point, and battery protection behavior must be verified before treating this diagram as the final electrical design.

### 6.3 Firmware Responsibilities

The ESP32 firmware should:

1. initialize hardware;
2. initialize I²C devices;
3. connect to Wi-Fi;
4. read temperature and humidity;
5. obtain battery/power information;
6. construct a measurement payload;
7. transmit the payload;
8. handle the transmission result;
9. wait until the next measurement cycle.

Future versions may introduce deep sleep for improved battery life.

---

## 7. Backend Architecture

### 7.1 Logical Layers

```text
HTTP Request
     │
     ▼
┌──────────────┐
│  API Layer   │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Application      │
│ / Service Layer  │
└──────┬───────────┘
       │
       ▼
┌──────────────┐
│ Data Access  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Database   │
└──────────────┘
```

### 7.2 Responsibilities

**API layer**

- defines HTTP endpoints;
- parses requests;
- validates basic request structure;
- returns HTTP responses.

**Application/service layer**

- implements application rules;
- processes measurements;
- manages devices;
- determines device state;
- coordinates persistence.

**Data-access layer**

- reads and writes persistent data;
- isolates database-specific operations from application logic.

### 7.3 Implementation Technology

Initial backend implementation may use Node.js.

The exact framework is an implementation-level decision and does not need to be fixed by this TLD unless it materially affects the system architecture.

---

## 8. Data Model

### 8.1 Device

Conceptual structure:

```text
Device
├── id
├── name
├── room
├── createdAt
└── metadata
```

Possible fields:

| Field | Purpose |
|---|---|
| `id` | Stable unique device identifier |
| `name` | Human-readable name |
| `room` | Room/location associated with the device |
| `createdAt` | Device creation/registration timestamp |
| `metadata` | Optional hardware/firmware information |

### 8.2 Measurement

Conceptual structure:

```text
Measurement
├── id
├── deviceId
├── timestamp
├── temperature
├── humidity
└── batteryVoltage
```

Possible fields:

| Field | Purpose |
|---|---|
| `id` | Measurement identifier |
| `deviceId` | Originating device |
| `timestamp` | Time associated with measurement |
| `temperature` | Temperature value |
| `humidity` | Relative humidity value |
| `batteryVoltage` | Measured battery voltage |

### 8.3 Relationships

```text
Device 1 ─────────────── * Measurement
```

One device can produce many measurements.

Measurements are stored as independent records rather than serialized measurement history inside the `Device` record.

### 8.4 Database

A relational database will be used.

**Initial candidate:** SQLite.

SQLite is suitable for the MVP because the system is expected to have a small number of devices and a single local server.

> **Open decision:** SQLite vs PostgreSQL for later versions.

---

## 9. API Design

The initial communication model assumes HTTP.

### 9.1 Sensor API

#### Submit measurement

```http
POST /api/measurements
```

Example payload:

```json
{
  "deviceId": "bedroom-01",
  "timestamp": "2026-09-14T16:30:00Z",
  "temperature": 22.7,
  "humidity": 48.3,
  "batteryVoltage": 3.91
}
```

The exact timestamp strategy is still to be decided. The server may eventually be responsible for assigning authoritative receive timestamps.

### 9.2 Dashboard API

Candidate endpoints:

```http
GET /api/devices
GET /api/devices/:id
GET /api/devices/:id/latest
GET /api/devices/:id/measurements
```

Possible future query parameters:

```http
GET /api/devices/:id/measurements?from=<timestamp>&to=<timestamp>
```

### 9.3 API Versioning

API versioning is not required for the first local MVP.

If external clients or backwards compatibility become important, endpoints may later be versioned:

```text
/api/v1/...
```

---

## 10. Data Flow

### 10.1 Measurement Ingestion

```text
SHT40 / INA219
       │
       ▼
ESP32 reads sensors
       │
       ▼
Create measurement
       │
       ▼
HTTP POST
       │
       ▼
Server receives request
       │
       ▼
Validate payload
       │
       ▼
Persist measurement
       │
       ▼
Return response
```

### 10.2 Dashboard Read Flow

```text
User opens dashboard
        │
        ▼
Dashboard requests data
        │
        ▼
HTTP API
        │
        ▼
Application service
        │
        ▼
Database
        │
        ▼
API response
        │
        ▼
Dashboard updates UI
```

### 10.3 MVP Vertical Slice

The first end-to-end milestone is:

```text
ESP32
  ↓
hard-coded/test measurement
  ↓
POST /api/measurements
  ↓
server validation
  ↓
SQLite
  ↓
GET /api/devices/:id/latest
  ↓
dashboard
```

Sensor integration and battery optimization can be developed incrementally after this path works.

---

## 11. Dashboard Architecture

The dashboard is a browser-based local application.

### 11.1 MVP Features

The MVP dashboard should provide:

- current temperature;
- current humidity;
- battery status;
- device online/offline status;
- room/device association;
- interactive apartment floor plan.

### 11.2 Floor Plan

The apartment plan will be represented using HTML/SVG.

Each room should have a stable identifier so dashboard data can be associated with a visual room element.

Conceptually:

```html
<g id="bedroom">
  ...
</g>

<g id="living-room">
  ...
</g>
```

Interaction may include:

- hover highlighting;
- selection of a room;
- displaying current room measurements;
- status indication.

### 11.3 Technology

The MVP does not require React.

Plain HTML, CSS, JavaScript, and SVG are sufficient unless UI complexity later justifies introducing a framework.

---

## 12. Network and Communication

### 12.1 Network Model

The system is local-first.

```text
                         Internet
                            X
                            │
                    not required
                            │

┌─────────┐
│  ESP32  │───────┐
└─────────┘       │
                  │
┌─────────┐       │
│ Laptop  │───────┼──── Home Wi-Fi LAN ──── Local Server
└─────────┘       │
                  │
┌─────────┐       │
│  Phone  │───────┘
└─────────┘
```

Sensor nodes and dashboard clients communicate with the server through the home LAN.

No external cloud service is required for normal operation.

### 12.2 Initial Transport

Initial sensor-to-server transport:

**HTTP over Wi-Fi**

MQTT remains an alternative if later requirements justify:

- publish/subscribe communication;
- larger device counts;
- asynchronous messaging;
- additional IoT consumers.

For the MVP, infrastructure simplicity is preferred.

---

## 13. Security

The system is not publicly exposed, but local-network operation does not eliminate security concerns.

Initial security considerations:

- API should reject malformed payloads;
- devices should have stable identifiers;
- the server should not listen on public Internet interfaces unless explicitly configured;
- secrets such as Wi-Fi credentials must not be committed to Git;
- configuration secrets should be separated from source code.

### Open Security Questions

- Should each ESP32 have an API key?
- Is device authentication required for the MVP?
- Should HTTPS be used inside the LAN?
- How should device provisioning work?
- How should compromised or unknown devices be rejected?

Security mechanisms should remain proportional to the threat model and project scope.

---

## 14. Reliability and Failure Handling

### 14.1 Wi-Fi Unavailable

Expected behavior:

- sensor reading should not crash the device;
- failed transmission should be handled explicitly;
- the device should attempt communication again later.

> **TODO:** Decide whether unsent measurements should be buffered locally.

### 14.2 Server Unavailable

The sensor node should:

- detect failed requests;
- avoid blocking indefinitely;
- retry according to the chosen retry policy.

> **TODO:** Define retry interval and maximum retry behavior.

### 14.3 Invalid Measurement

The server should reject malformed or invalid payloads.

Possible validation examples:

- missing `deviceId`;
- missing required measurement fields;
- non-numeric sensor values;
- values outside physically plausible limits.

### 14.4 Sensor Offline

A device may be considered offline if no measurement has been received for a configured time period.

```text
lastMeasurement + offlineThreshold < now
→ OFFLINE
```

> **TODO:** Define `offlineThreshold` based on the final measurement interval.

### 14.5 Server Restart

Persisted measurements and registered device information must survive application and server restarts.

### 14.6 Sensor Failure

Failure of one sensor node must not prevent:

- other nodes from submitting measurements;
- the dashboard from displaying existing data;
- the server from operating normally.

---

## 15. Deployment

### 15.1 Development

During development:

```text
ESP32
  │
  │ Wi-Fi
  ▼
Developer Laptop
├── Backend
├── Database
└── Dashboard
```

This allows development before Raspberry Pi deployment.

### 15.2 Target Deployment

Target architecture:

```text
ESP32 nodes
     │
     │ Wi-Fi
     ▼
Raspberry Pi
├── Backend service
├── Database
└── Dashboard
     │
     ▼
Home LAN clients
```

The exact Raspberry Pi model is not an architectural dependency as long as it can reliably run the required local services.

---

## 16. Constraints

Current project constraints:

- ESP32 is used as the sensor controller;
- SHT40 is used for temperature/humidity sensing;
- INA219 is available for power monitoring;
- TP4056 is available for battery charging;
- a single 18650 cell is intended as the sensor power source;
- sensors communicate with the ESP32 over I²C;
- communication between sensor nodes and server uses the existing home Wi-Fi network;
- the core system must not require public Internet connectivity;
- Raspberry Pi is the intended production server;
- development must be possible without Raspberry Pi by running the server on a laptop;
- the MVP should avoid unnecessary additional hardware;
- the system should remain understandable and maintainable as a portfolio project.

---

## 17. Open Questions

The following decisions are intentionally not finalized.

### Communication

- Is HTTP sufficient long-term, or should MQTT be introduced?
- What measurement interval provides an acceptable balance between data resolution and battery life?
- Should ESP32 nodes buffer measurements during server downtime?

### Device Identity

- How is `deviceId` generated?
- Is device registration manual or automatic?
- How is a device assigned to a room?

### Time

- Does the ESP32 send measurement timestamps?
- Does the server assign timestamps?
- Is NTP availability assumed?
- How should measurements be handled if device time is invalid?

### Storage

- SQLite or PostgreSQL?
- How long should measurements be retained?
- Is aggregation/downsampling needed for old data?

### Power

- What is the expected battery life?
- Will deep sleep be required?
- How often should battery state be measured?
- What battery metric should be exposed to the dashboard: voltage, percentage, or both?

### Reliability

- What is the retry policy?
- Should measurements be queued locally?
- What interval defines an offline device?

### Security

- Do sensor nodes require authentication?
- How are credentials provisioned?
- Is HTTPS justified inside the LAN?

These questions should be resolved when implementation evidence or concrete requirements make the decision necessary.

---

## 18. Architectural Decisions

Major architectural decisions should be recorded separately as Architecture Decision Records (ADRs).

Recommended structure:

```text
docs/
├── TLD.md
└── adr/
    ├── 0001-local-first-architecture.md
    ├── 0002-device-communication-protocol.md
    ├── 0003-database-selection.md
    └── 0004-measurement-data-model.md
```

Each ADR should contain:

```text
Title
Status
Context
Considered Options
Decision
Rationale
Consequences
```

### Initial ADR Candidates

**ADR-0001 — Local-first architecture**

Decision candidate: the core system operates entirely on the home LAN and does not require cloud services.

**ADR-0002 — HTTP for initial device communication**

Decision candidate: ESP32 nodes submit measurements directly to the local server using HTTP for the MVP.

**ADR-0003 — SQLite for initial persistence**

Decision candidate: use SQLite for the initial single-server implementation.

**ADR-0004 — Measurements stored as independent records**

Decision candidate: store each measurement as a separate database record associated with a device rather than embedding measurement history inside the device record.

---

## 19. MVP Definition

The MVP is complete when at least one real sensor node can perform the following end-to-end flow:

```text
SHT40
  ↓
ESP32
  ↓
Wi-Fi
  ↓
HTTP API
  ↓
Database
  ↓
Dashboard
```

The user must be able to:

1. power the sensor node;
2. receive real temperature and humidity measurements;
3. persist those measurements on the local server;
4. open the dashboard from the local network;
5. see the latest measurement associated with the correct room;
6. identify whether the sensor node is currently online.

Battery optimization, advanced historical charts, MQTT, cloud connectivity, Home Assistant integration, and other extensions are outside the MVP unless they become necessary to satisfy these requirements.

---

## 20. Document Evolution

This document describes the intended architecture, not an immutable specification.

Use the following statuses when the design is uncertain:

- **Draft** — architecture is actively being designed;
- **Proposed** — a specific decision has been suggested but not validated;
- **Accepted** — a decision has been implemented and adopted;
- **Deprecated** — a previous decision is no longer used;
- **TODO / Open Question** — insufficient evidence exists to make the decision yet.

The TLD should be updated when the high-level system architecture changes.

Implementation details should generally remain in source code, API specifications, hardware/wiring documentation, or dedicated low-level design documents rather than expanding this TLD indefinitely.
