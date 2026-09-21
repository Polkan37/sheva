#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>

#include <Adafruit_INA219.h>
#include <Adafruit_SHT4x.h>

#include "secrets.h"

#define SDA_PIN 21
#define SCL_PIN 22

// -------------------- DEVICE CONFIG --------------------

const char *DEVICE_UID = "living-room-env-01";
const char *FIRMWARE_VERSION = "0.1.0";

// interval 60 seconds
const unsigned long SEND_INTERVAL = 60 * 1000;

// -------------------------------------------------------

Adafruit_INA219 ina219;
Adafruit_SHT4x sht4 = Adafruit_SHT4x();

unsigned long lastSendTime = 0;

// -------------------------------------------------------
// Wi-Fi
// -------------------------------------------------------

void connectToWiFi()
{
    Serial.println();
    Serial.println("[WIFI] Checking connection...");

    if (WiFi.status() == WL_CONNECTED)
    {
        Serial.println("[WIFI] Already connected");

        Serial.print("[WIFI] SSID: ");
        Serial.println(WiFi.SSID());

        Serial.print("[WIFI] IP address: ");
        Serial.println(WiFi.localIP());

        Serial.print("[WIFI] Gateway: ");
        Serial.println(WiFi.gatewayIP());

        Serial.print("[WIFI] RSSI: ");
        Serial.print(WiFi.RSSI());
        Serial.println(" dBm");

        return;
    }

    Serial.print("[WIFI] Connecting to: ");
    Serial.println(WIFI_SSID);

    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempt = 0;

    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);

        Serial.print("[WIFI] Attempt ");
        Serial.print(attempt + 1);
        Serial.print(" | status = ");
        Serial.println(WiFi.status());

        attempt++;

        if (attempt >= 40)
        {
            Serial.println("[WIFI] ERROR: connection timeout");
            Serial.print("[WIFI] Final status: ");
            Serial.println(WiFi.status());

            return;
        }
    }

    Serial.println("[WIFI] Connected successfully");

    Serial.print("[WIFI] SSID: ");
    Serial.println(WiFi.SSID());

    Serial.print("[WIFI] IP address: ");
    Serial.println(WiFi.localIP());

    Serial.print("[WIFI] Gateway: ");
    Serial.println(WiFi.gatewayIP());

    Serial.print("[WIFI] RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
}

// -------------------------------------------------------
// Battery percentage
// -------------------------------------------------------

float batteryPercent(float voltage)
{
    const int N = 11;

    const float voltages[N] = {
        3.20, 3.30, 3.50, 3.60, 3.70,
        3.75, 3.80, 3.90, 4.00, 4.10, 4.20};

    const float percents[N] = {
        0, 5, 10, 20, 35,
        45, 55, 70, 80, 90, 100};

    if (voltage <= voltages[0])
        return 0;

    if (voltage >= voltages[N - 1])
        return 100;

    for (int i = 0; i < N - 1; i++)
    {
        if (voltage >= voltages[i] &&
            voltage <= voltages[i + 1])
        {
            float ratio =
                (voltage - voltages[i]) /
                (voltages[i + 1] - voltages[i]);

            return percents[i] +
                   ratio * (percents[i + 1] - percents[i]);
        }
    }

    return 0;
}

// -------------------------------------------------------
// Message ID
// -------------------------------------------------------

String createMessageId()
{
    uint64_t chipId = ESP.getEfuseMac();

    char buffer[64];

    snprintf(
        buffer,
        sizeof(buffer),
        "%08X-%lu-%08X",
        (uint32_t)(chipId & 0xFFFFFFFF),
        millis(),
        esp_random());

    return String(buffer);
}

// -------------------------------------------------------
// HTTP
// -------------------------------------------------------

void sendMeasurement(
    float temperature,
    float humidity,
    float batteryVoltage,
    float battery)
{
    Serial.println();
    Serial.println("[HTTP] Preparing measurement");

    if (WiFi.status() != WL_CONNECTED)
    {
        Serial.println("[HTTP] Wi-Fi is disconnected");

        connectToWiFi();

        if (WiFi.status() != WL_CONNECTED)
        {
            Serial.println("[HTTP] Request cancelled: no Wi-Fi");
            return;
        }
    }

    String url =
        String(API_BASE_URL) +
        "/api/devices/" +
        DEVICE_UID +
        "/measurements";

    String messageId = createMessageId();

    int rssi = WiFi.RSSI();

    Serial.print("[HTTP] WiFi status: ");
    Serial.println(WiFi.status());

    Serial.print("[HTTP] ESP32 IP: ");
    Serial.println(WiFi.localIP());

    Serial.print("[HTTP] Target server: ");
    Serial.println(API_BASE_URL);

    String payload = "{";

    payload += "\"schemaVersion\":1,";

    payload += "\"messageId\":\"";
    payload += messageId;
    payload += "\",";

    payload += "\"temperatureC\":";
    payload += String(temperature, 2);
    payload += ",";

    payload += "\"humidityPct\":";
    payload += String(humidity, 2);
    payload += ",";

    payload += "\"batteryVoltage\":";
    payload += String(batteryVoltage, 3);
    payload += ",";

    payload += "\"batteryPct\":";
    payload += String(battery, 1);
    payload += ",";

    payload += "\"rssiDbm\":";
    payload += String(rssi);
    payload += ",";

    payload += "\"firmwareVersion\":\"";
    payload += FIRMWARE_VERSION;
    payload += "\"";

    payload += "}";

    Serial.print("[HTTP] URL: ");
    Serial.println(url);

    Serial.print("[HTTP] Message ID: ");
    Serial.println(messageId);

    Serial.println("[HTTP] Payload:");
    Serial.println(payload);

    Serial.println("[HTTP] Sending POST request...");

    HTTPClient http;

    http.setTimeout(5000);

    if (!http.begin(url))
    {
        Serial.println("[HTTP] Failed to initialize HTTP client");
        return;
    }

    http.addHeader("Content-Type", "application/json");

    int httpCode = http.POST(payload);

    if (httpCode > 0)
    {
        Serial.print("[HTTP] Response status: ");
        Serial.println(httpCode);

        String response = http.getString();

        if (response.length() > 0)
        {
            Serial.println("[HTTP] Response body:");
            Serial.println(response);
        }

        if (httpCode == 200)
        {
            Serial.println("[HTTP] Measurement already existed / duplicate");
        }
        else if (httpCode == 201)
        {
            Serial.println("[HTTP] Measurement saved successfully");
        }
        else
        {
            Serial.println("[HTTP] Server returned unexpected status");
        }
    }
    else
    {
        Serial.print("[HTTP] Request failed: ");
        Serial.println(HTTPClient::errorToString(httpCode));
    }

    http.end();

    Serial.println("[HTTP] Request finished");
}

// -------------------------------------------------------
// Setup
// -------------------------------------------------------

void setup()
{
    Serial.begin(115200);
    delay(1000);

    Serial.println();
    Serial.println("==============================");
    Serial.println("       TH HOME SENSOR");
    Serial.println("==============================");

    Serial.print("[BOOT] Firmware: ");
    Serial.println(FIRMWARE_VERSION);

    Serial.print("[BOOT] Device UID: ");
    Serial.println(DEVICE_UID);

    // I2C
    Serial.println("[I2C] Starting bus");

    Wire.begin(SDA_PIN, SCL_PIN);

    // INA219
    Serial.println("[INA219] Initializing...");

    if (!ina219.begin())
    {
        Serial.println("[INA219] ERROR: sensor not found");

        while (1)
        {
            delay(10);
        }
    }

    Serial.println("[INA219] Initialized");

    // SHT40
    Serial.println("[SHT40] Initializing...");

    if (!sht4.begin())
    {
        Serial.println("[SHT40] ERROR: sensor not found");

        while (1)
        {
            delay(10);
        }
    }

    sht4.setPrecision(SHT4X_HIGH_PRECISION);
    sht4.setHeater(SHT4X_NO_HEATER);

    Serial.println("[SHT40] Initialized");

    // Wi-Fi
    connectToWiFi();

    Serial.println();
    Serial.println("[BOOT] Initialization complete");
    Serial.println("==============================");
}

// -------------------------------------------------------
// Loop
// -------------------------------------------------------

void loop()
{
    Serial.println();
    Serial.println("---------- NEW CYCLE ----------");

    // ---- SHT40 ----

    Serial.println("[SENSOR] Reading SHT40...");

    sensors_event_t humidity;
    sensors_event_t temp;

    sht4.getEvent(&humidity, &temp);

    Serial.println("[SENSOR] SHT40 read complete");

    // ---- INA219 ----

    Serial.println("[SENSOR] Reading INA219...");

    float busVoltage = ina219.getBusVoltage_V();
    float shuntVoltage = ina219.getShuntVoltage_mV();
    float current = ina219.getCurrent_mA();
    float power = ina219.getPower_mW();

    float batteryVoltage = busVoltage + (shuntVoltage / 1000.0);

    float battery = batteryPercent(batteryVoltage);

    Serial.println("[SENSOR] INA219 read complete");

    // ---- Values ----

    Serial.println();
    Serial.println("----- SENSOR DATA -----");

    Serial.print("Temperature: ");
    Serial.print(temp.temperature);
    Serial.println(" °C");

    Serial.print("Humidity: ");
    Serial.print(humidity.relative_humidity);
    Serial.println(" %");

    Serial.print("Bus voltage: ");
    Serial.print(busVoltage);
    Serial.println(" V");

    Serial.print("Battery voltage: ");
    Serial.print(batteryVoltage);
    Serial.println(" V");

    Serial.print("Battery: ");
    Serial.print(battery);
    Serial.println(" %");

    Serial.print("Current: ");
    Serial.print(current);
    Serial.println(" mA");

    Serial.print("Power: ");
    Serial.print(power);
    Serial.println(" mW");

    // ---- Critical battery ----

    if (batteryVoltage <= 3.30)
    {
        Serial.println();
        Serial.println("[POWER] CRITICAL BATTERY");
        Serial.println("[POWER] Entering deep sleep");

        delay(200);

        esp_deep_sleep_start();
    }

    // ---- HTTP ----

    sendMeasurement(
        temp.temperature,
        humidity.relative_humidity,
        batteryVoltage,
        battery);

    Serial.println();
    Serial.println("[SYSTEM] Cycle complete");
    Serial.println("-------------------------------");

    Serial.println("[POWER] Going to sleep");

    esp_sleep_enable_timer_wakeup(
        SEND_INTERVAL * 1000ULL
    );

    Serial.flush();

    esp_deep_sleep_start();
}