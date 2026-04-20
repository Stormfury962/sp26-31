/*
  Car Detection System for Parking Lot

  This Arduino sketch is designed to detect the presence of a car in a parking
  lot using a Hall Effect sensor connected to a Raspberry Pi 4B. The system
  will read the sensor value, determine if a car is present, and send this
  information to the Uniview backend over WiFi. The system will
  run every hour, detect the car presence, send the data, and then shut down to
  conserve power.

  Connections:
  - Hall Effect Sensor connected to GPIO17
  - SIM A7670C module for 4G communication
  - Power supplied via a DC-DC buck converter
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Define the pins
const int hallSensorPin = 17; // GPIO pin connected to the Hall Effect Sensor

// WiFi credentials
const char* ssid = "your_SSID";
const char* password = "your_PASSWORD";

// Backend config — fill in your server address and the ID for this sensor node
const char* serverUrl = "http://your_app_endpoint/sensor/update";
const char* nodeId    = "node-001";  // unique ID for this sensor
const char* lotId     = "lot-001";   // ID of the parking lot this sensor belongs to

void setup() {
  Serial.begin(115200);
  pinMode(hallSensorPin, INPUT);

  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("Connected to WiFi");

  // Read sensor and map to backend status values
  int sensorValue = digitalRead(hallSensorPin);
  const char* status;
  if (sensorValue == HIGH) {
    Serial.println("Car detected!");
    status = "occupied";
  } else {
    Serial.println("No car detected.");
    status = "available";
  }

  sendStatusUpdate(status);

  // Schedule next run in 1 hour
  Serial.println("Entering deep sleep for 1 hour.");
  ESP.deepSleep(3600e6);
}

void loop() {
  // Empty — device sleeps and resets after each reading
}

void sendStatusUpdate(const char* status) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, skipping send.");
    return;
  }

  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  // Build JSON body: { "nodeId": "...", "lotId": "...", "status": "..." }
  StaticJsonDocument<128> doc;
  doc["nodeId"] = nodeId;
  doc["lotId"]  = lotId;
  doc["status"] = status;

  String body;
  serializeJson(doc, body);

  int httpCode = http.POST(body);

  if (httpCode > 0) {
    Serial.printf("Response code: %d\n", httpCode);
    Serial.println(http.getString());
  } else {
    Serial.printf("POST failed, error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}
