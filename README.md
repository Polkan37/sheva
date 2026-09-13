# Sheva - Home Environmental Monitoring System

Local-first environmental monitoring system built with ESP32
sensor nodes and a Raspberry Pi server.

The system collects temperature, humidity and battery telemetry
from multiple rooms and visualizes the data on an interactive
apartment dashboard.

## Project Status

🚧 In active development — MVP phase.

## Goals

- Monitor temperature in multiple rooms
- Monitor humidity
- Track battery level of autonomous sensor nodes
- Store historical measurements to DB
- Display current state on an interactive rooms plan
- Support multiple ESP32 sensor nodes

## Hardware

Sensor node:

- ESP32
- SHT40 temperature/humidity sensor
- INA219 current/voltage sensor
- TP4056 battery charger
- 18650 Li-ion battery

Server:

- Raspberry Pi
- local Wi-Fi network

