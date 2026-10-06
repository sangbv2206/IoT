#include "AppConfig.h"
#include <Wire.h>
#include <DHT.h>

WiFiClient espClient;
PubSubClient mqttClient(espClient);
BH1750 lightMeter;
Servo curtainServo;
static DHT dht(DHT_PIN, DHT11);

String nodeId = "", voiceStatus = "", recognizedText = "";
unsigned long lastMqttRetry = 0, osdVolTimer = 0, manualOverrideTimer = 0, lastSensorReadTime = 0, voiceStatusTimer = 0;
bool tvPower = false, tvMuted = false, lightState = false, fanState = false, curtainOpen = false;
bool autoLight = false, autoCurtain = false, autoFan = false, bh1750Available = false, dhtAvailable = false;
int tvChannel = 1, tvVolume = 35, lightBrightness = DEFAULT_LIGHT_BRIGHTNESS, fanSpeed = DEFAULT_FAN_SPEED, curtainPos = 0;
float currentTemp = 0, currentHumidity = 0, currentLux = 0;
volatile bool isVoiceRecording = false, wakeWordTriggered = false;
volatile float lastHeyEspConfidence = 0;

void initHardware() {
    Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN); Wire.setTimeOut(30);
    initDisplay();
    bh1750Available = lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
    dht.begin();
    ledcSetup(LIGHT_LEDC_CH, LEDC_PWM_FREQ, LEDC_PWM_RES); ledcAttachPin(LIGHT_PIN, LIGHT_LEDC_CH); ledcWrite(LIGHT_LEDC_CH, 0);
    ledcSetup(FAN_LEDC_CH, LEDC_PWM_FREQ, LEDC_PWM_RES);   ledcAttachPin(FAN_PIN, FAN_LEDC_CH);     ledcWrite(FAN_LEDC_CH, 0);
    ESP32PWM::allocateTimer(0); curtainServo.setPeriodHertz(50); curtainServo.attach(SERVO_PIN, 500, 2400); curtainServo.write(0);
    initIR(); markDisplayDirty();
}

void setLight(bool state, int brightness) {
    bool stateChanged = (state != lightState);
    bool briChanged = (brightness > 0 && brightness != lightBrightness);
    if (!stateChanged && !briChanged) return;
    if (brightness > 0) lightBrightness = constrain(brightness, 1, 100);
    lightState = state;
    ledcWrite(LIGHT_LEDC_CH, lightState ? map(lightBrightness, 0, 100, 0, 255) : 0);
    publishDeviceState("den", lightState ? "ON" : "OFF");
    publishDeviceState("den/brightness", String(lightBrightness));
    markDisplayDirty();
}

void setFan(bool state, int speed) {
    bool stateChanged = (state != fanState);
    bool spdChanged = (speed >= 1 && speed <= 3 && speed != fanSpeed);
    if (!stateChanged && !spdChanged) return;
    if (speed >= 1 && speed <= 3) fanSpeed = speed;
    fanState = state;
    const int duty[] = {0, 90, 180, 255};
    ledcWrite(FAN_LEDC_CH, fanState ? duty[fanSpeed] : 0);
    publishDeviceState("quat", fanState ? "ON" : "OFF");
    publishDeviceState("quat/speed", String(fanSpeed));
    markDisplayDirty();
}

void setCurtainPosition(int pos) {
    int clamped = constrain(pos, 0, 100);
    if (clamped == curtainPos) return;
    curtainPos = clamped;
    curtainOpen = (curtainPos > 0);
    curtainServo.write(map(curtainPos, 0, 100, 0, 90));
    publishDeviceState("rem_cua", curtainOpen ? "OPEN" : "CLOSE");
    publishDeviceState("rem_cua/position", String(curtainPos));
    markDisplayDirty();
}
void setCurtain(bool open) { setCurtainPosition(open ? 100 : 0); }

void updateSensorsAndAutomation() {
    unsigned long now = millis();
    if (now - lastSensorReadTime < 5000) return;
    lastSensorReadTime = now;

    if (bh1750Available) { float l = lightMeter.readLightLevel(); if (l >= 0 && abs(l - currentLux) >= 1.0f) { currentLux = l; markDisplayDirty(); } }
    float t = dht.readTemperature(), h = dht.readHumidity();
    dhtAvailable = (!isnan(t) && !isnan(h));
    if (dhtAvailable && (abs(t - currentTemp) >= 0.2f || abs(h - currentHumidity) >= 1.0f)) { currentTemp = t; currentHumidity = h; markDisplayDirty(); }

    if (mqttClient.connected()) {
        String j = "{\"temperature\":" + String(currentTemp, 1) + ",\"humidity\":" + String(currentHumidity, 1) + ",\"lux\":" + String(currentLux, 0) + "}";
        mqttClient.publish((String(TOPIC_PREFIX_STR) + "/" + nodeId + "/sensors").c_str(), j.c_str());
    }
    // Tự động hóa tại chỗ (Edge Computing) có trễ Hysteresis chống dao động bật/tắt liên tục
    if (now - manualOverrideTimer > 30000) {
        if (autoLight && bh1750Available) {
            if (!lightState && currentLux < 25.0f) setLight(true);
            else if (lightState && currentLux > 80.0f) setLight(false);
        }
        if (autoCurtain && bh1750Available) {
            if (!curtainOpen && currentLux > 400.0f) setCurtain(true);
            else if (curtainOpen && currentLux < 150.0f) setCurtain(false);
        }
        if (autoFan && dhtAvailable) {
            if (!fanState && currentTemp > 31.5f) setFan(true);
            else if (fanState && currentTemp < 29.0f) setFan(false);
        }
    }
}
