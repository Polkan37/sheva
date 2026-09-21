#include <Arduino.h>
#include <Wire.h>

#include <Adafruit_INA219.h>
#include <Adafruit_SHT4x.h>

#define SDA_PIN 21
#define SCL_PIN 22

Adafruit_INA219 ina219;
Adafruit_SHT4x sht4 = Adafruit_SHT4x();

void setup()
{
    Serial.begin(115200);
    delay(1000);

    Wire.begin(SDA_PIN, SCL_PIN);

    // INA219
    if (!ina219.begin())
    {
        Serial.println("INA219 not found");
        while (1)
        {
            delay(10);
        }
    }

    // SHT40
    if (!sht4.begin())
    {
        Serial.println("SHT40 not found");
        while (1)
        {
            delay(10);
        }
    }

    sht4.setPrecision(SHT4X_HIGH_PRECISION);
    sht4.setHeater(SHT4X_NO_HEATER);

    Serial.println("Sensors initialized");
}

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

void loop()
{
    // ---- SHT40 ----
    sensors_event_t humidity;
    sensors_event_t temp;

    sht4.getEvent(&humidity, &temp);

    // ---- INA219 ----
    float busVoltage = ina219.getBusVoltage_V();
    float shuntVoltage = ina219.getShuntVoltage_mV();
    float current = ina219.getCurrent_mA();
    float power = ina219.getPower_mW();

    // Custom values
    float loadVoltage = busVoltage + (shuntVoltage / 1000.0);
    float batteryVoltage = ina219.getBusVoltage_V() + ina219.getShuntVoltage_mV() / 1000.0;
    float battery = batteryPercent(batteryVoltage);


    // deepsleep if battery is critically low
    if (batteryVoltage <= 3.30)
    {
        Serial.println("CRITICAL BATTERY");
        Serial.println("Entering deep sleep");

        delay(200);

        esp_deep_sleep_start();
    }

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

    Serial.print("Supply voltage: ");
    Serial.print(loadVoltage);
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

    Serial.println();

    delay(2000);
}