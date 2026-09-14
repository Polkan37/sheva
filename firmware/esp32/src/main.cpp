#include <Arduino.h>

const unsigned long SEND_INTERVAL = 5000;
unsigned long lastSendTime = 0;

float generateTemperature() {
    return 20.0 + random(0, 501) / 100.0;
}

float generateHumidity() {
    return 40.0 + random(0, 2001) / 100.0;
}

float generateBatteryVoltage() {
    return 3.70 + random(0, 51) / 100.0;
}

void generateMeasurement() {
    float temperature = generateTemperature();
    float humidity = generateHumidity();
    float batteryVoltage = generateBatteryVoltage();

    Serial.println("--- Measurement ---");

    Serial.print("Temperature: ");
    Serial.print(temperature);
    Serial.println(" °C");

    Serial.print("Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");

    Serial.print("Battery: ");
    Serial.print(batteryVoltage);
    Serial.println(" V");

    Serial.println();
}

void setup() {
    Serial.begin(115200);
    delay(2000);

    randomSeed(micros());

    Serial.println("ESP32-C6 Sensor Simulator started");
}

void loop() {
    unsigned long now = millis();

    if (now - lastSendTime >= SEND_INTERVAL) {
        lastSendTime = now;
        generateMeasurement();
    }
}