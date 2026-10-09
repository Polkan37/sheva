
#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Adafruit_INA219.h>
#include <Adafruit_SHT4x.h>
#include <esp_sleep.h>
#include <esp_system.h>
#include <math.h>

#include "secrets.h"

namespace Config {
    constexpr int SDA_PIN = 21;
    constexpr int SCL_PIN = 22;

    constexpr char DEVICE_UID[] = "living-room-env-01";
    constexpr char FIRMWARE_VERSION[] = "0.2.0";

    constexpr uint32_t SEND_INTERVAL_SEC = 60;
    constexpr uint32_t LOW_BATTERY_INTERVAL_SEC = 300;
    constexpr uint32_t ERROR_INTERVAL_SEC = 60;

    constexpr float LOW_BATTERY_V = 3.35f;
    constexpr float RECOVER_BATTERY_V = 3.65f;

    constexpr uint32_t WIFI_TIMEOUT_MS = 15000;
    constexpr uint32_t HTTP_TIMEOUT_MS = 5000;
    constexpr uint8_t HTTP_ATTEMPTS = 2;
}

RTC_DATA_ATTR bool batteryProtectionActive = false;

Adafruit_INA219 ina219;
Adafruit_SHT4x sht40;

bool sensorsReady = false;
uint32_t lastCycleAt = 0;
uint32_t nextIntervalMs = 0;

struct SensorData {
    float temperatureC;
    float humidityPct;
    float batteryVoltage;
    float batteryPct;
};

float batteryPercent(float voltage) {
    constexpr float voltages[] = {
        3.20f, 3.30f, 3.50f, 3.60f, 3.70f,
        3.75f, 3.80f, 3.90f, 4.00f, 4.10f, 4.20f
    };

    constexpr float percents[] = {
        0, 5, 10, 20, 30,
        35, 40, 60, 75, 90, 100
    };

    constexpr size_t count =
        sizeof(voltages) / sizeof(voltages[0]);

    if (voltage <= voltages[0]) return 0.0f;
    if (voltage >= voltages[count - 1]) return 100.0f;

    for (size_t i = 0; i < count - 1; ++i) {
        if (voltage <= voltages[i + 1]) {
            const float ratio =
                (voltage - voltages[i]) /
                (voltages[i + 1] - voltages[i]);

            return percents[i] +
                   ratio * (percents[i + 1] - percents[i]);
        }
    }

    return 0.0f;
}

bool initializeSensors() {
    Wire.begin(Config::SDA_PIN, Config::SCL_PIN);

    if (!ina219.begin()) {
        Serial.println("[INA219] Initialization failed");
        return false;
    }

    if (!sht40.begin()) {
        Serial.println("[SHT40] Initialization failed");
        return false;
    }

    sht40.setPrecision(SHT4X_HIGH_PRECISION);
    sht40.setHeater(SHT4X_NO_HEATER);

    return true;
}

bool readBatteryVoltage(float &voltage) {
    const float busVoltage = ina219.getBusVoltage_V();
    const float shuntVoltage = ina219.getShuntVoltage_mV();

    voltage = busVoltage + shuntVoltage / 1000.0f;

    return isfinite(voltage) && voltage > 0.0f;
}

bool isBatteryLow(float voltage) {
    if (batteryProtectionActive) {
        if (voltage < Config::RECOVER_BATTERY_V) {
            return true;
        }

        batteryProtectionActive = false;
        return false;
    }

    if (voltage <= Config::LOW_BATTERY_V) {
        batteryProtectionActive = true;
        return true;
    }

    return false;
}

bool readEnvironment(SensorData &data) {
    sensors_event_t humidity;
    sensors_event_t temperature;

    if (!sht40.getEvent(&humidity, &temperature)) {
        Serial.println("[SHT40] Read failed");
        return false;
    }

    if (!isfinite(temperature.temperature) ||
        !isfinite(humidity.relative_humidity)) {
        Serial.println("[SHT40] Invalid measurements");
        return false;
    }

    data.temperatureC = temperature.temperature;
    data.humidityPct = humidity.relative_humidity;

    return true;
}

bool connectToWiFi() {
    if (WiFi.status() == WL_CONNECTED) {
        return true;
    }

    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    const uint32_t startedAt = millis();

    while (WiFi.status() != WL_CONNECTED) {
        if (millis() - startedAt >= Config::WIFI_TIMEOUT_MS) {
            Serial.println("[WIFI] Connection timeout");
            return false;
        }

        delay(200);
    }

    return true;
}

String createMessageId() {
    const uint64_t chipId = ESP.getEfuseMac();
    char buffer[64];

    snprintf(
        buffer,
        sizeof(buffer),
        "%08lX-%08lX-%08lX",
        static_cast<unsigned long>(chipId & 0xFFFFFFFFULL),
        static_cast<unsigned long>(millis()),
        static_cast<unsigned long>(esp_random())
    );

    return String(buffer);
}

String createPayload(
    const SensorData &data,
    const String &messageId
) {
    String payload;
    payload.reserve(256);

    payload += "{\"schemaVersion\":1";

    payload += ",\"messageId\":\"";
    payload += messageId;
    payload += "\"";

    payload += ",\"temperatureC\":";
    payload += String(data.temperatureC, 2);

    payload += ",\"humidityPct\":";
    payload += String(data.humidityPct, 2);

    payload += ",\"batteryVoltage\":";
    payload += String(data.batteryVoltage, 3);

    payload += ",\"batteryPct\":";
    payload += String(data.batteryPct, 1);

    payload += ",\"rssiDbm\":";
    payload += String(WiFi.RSSI());

    payload += ",\"firmwareVersion\":\"";
    payload += Config::FIRMWARE_VERSION;
    payload += "\"}";

    return payload;
}

bool sendMeasurement(const SensorData &data) {
    const String url =
        String(API_BASE_URL) +
        "/api/devices/" +
        Config::DEVICE_UID +
        "/measurements";

    const String messageId = createMessageId();
    const String payload = createPayload(data, messageId);

    for (uint8_t attempt = 0;
         attempt < Config::HTTP_ATTEMPTS;
         ++attempt) {

        HTTPClient http;
        http.setTimeout(Config::HTTP_TIMEOUT_MS);

        if (!http.begin(url)) {
            Serial.println("[HTTP] Initialization failed");
            return false;
        }

        http.addHeader("Content-Type", "application/json");

        const int status = http.POST(payload);
        http.end();

        if (status == 200 || status == 201) {
            Serial.printf("[HTTP] Success: %d\n", status);
            return true;
        }

        Serial.printf("[HTTP] Error: %d\n", status);

        if (status >= 400 && status < 500 && status != 429) {
            return false;
        }

        if (attempt + 1 < Config::HTTP_ATTEMPTS) {
            delay(500);
        }
    }

    return false;
}

void finishCycle(uint32_t seconds) {
    WiFi.disconnect(true);
    WiFi.mode(WIFI_OFF);

    // Keep the USB Serial/JTAG interface available
    // when a USB host is detected.
    if (Serial.isPlugged()) {
        lastCycleAt = millis();
        nextIntervalMs = seconds * 1000UL;
        return;
    }

    Wire.end();

    esp_sleep_enable_timer_wakeup(
        static_cast<uint64_t>(seconds) * 1000000ULL
    );

    Serial.flush();
    esp_deep_sleep_start();
}

void setup() {
    Serial.begin(115200);

    // Allow USB CDC to enumerate after reset.
    delay(1500);

    Serial.printf(
        "[BOOT] SHEVA firmware %s\n",
        Config::FIRMWARE_VERSION
    );

    sensorsReady = initializeSensors();

    if (sensorsReady) {
        Serial.println("[BOOT] Sensors ready");
    }
}

void loop() {
    if (nextIntervalMs > 0 &&
        millis() - lastCycleAt < nextIntervalMs) {
        delay(50);
        return;
    }

    nextIntervalMs = 0;

    if (!sensorsReady) {
        Wire.end();
        sensorsReady = initializeSensors();

        if (!sensorsReady) {
            finishCycle(Config::ERROR_INTERVAL_SEC);
            return;
        }
    }

    float voltage = 0.0f;

    if (!readBatteryVoltage(voltage)) {
        Serial.println("[BATTERY] Invalid voltage");
        finishCycle(Config::ERROR_INTERVAL_SEC);
        return;
    }

    Serial.printf("[BATTERY] %.3f V\n", voltage);

    if (isBatteryLow(voltage)) {
        Serial.println("[BATTERY] Protection active");
        finishCycle(Config::LOW_BATTERY_INTERVAL_SEC);
        return;
    }

    SensorData data = {};
    data.batteryVoltage = voltage;
    data.batteryPct = batteryPercent(voltage);

    if (!readEnvironment(data)) {
        finishCycle(Config::ERROR_INTERVAL_SEC);
        return;
    }

    if (!connectToWiFi()) {
        finishCycle(Config::ERROR_INTERVAL_SEC);
        return;
    }

    Serial.printf(
        "[SENSOR] %.2f C, %.2f %%\n",
        data.temperatureC,
        data.humidityPct
    );

    sendMeasurement(data);

    finishCycle(Config::SEND_INTERVAL_SEC);
}
