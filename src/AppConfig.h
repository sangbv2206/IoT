#ifndef APP_CONFIG_H
#define APP_CONFIG_H

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <Adafruit_SSD1306.h>
#include <BH1750.h>
#include <ESP32Servo.h>
#include <driver/i2s.h>
#include <math.h>
#include "secrets.h"
#include "DisplayUI.h"
#include "AudioDsp.h"

// Wi-Fi, MQTT & Backend
#define ENABLE_WIFI               true
#define WIFI_SSID_STR             ssid
#define WIFI_PASS_STR             password
#define MQTT_SERVER_HOST          "broker.hivemq.com"
#define MQTT_SERVER_PORT          1883
#define TOPIC_PREFIX_STR          "buivansang_iot_pj"
#define BACKEND_HOST              "192.168.1.13"
#define BACKEND_PORT              8001

// Pinout
#define I2C_SDA_PIN 8
#define I2C_SCL_PIN 9
#define IR_RECEIVE_PIN 3
#define IR_SEND_PIN 5
#define FAN_PIN 6
#define LIGHT_PIN 4
#define SERVO_PIN 7
#define DHT_PIN 10
#define LIGHT_LEDC_CH 4
#define FAN_LEDC_CH 5
#define LEDC_PWM_FREQ 5000
#define LEDC_PWM_RES 8
#define I2S_SCK_PIN 41
#define I2S_WS_PIN 42
#define I2S_SD_PIN 40
#define BTN_BOOT_PIN 0
#define RGB_LED_PIN 48
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_ADDR 0x3C

// Audio, VAD & AI Constants
#define RECORD_TIME_SEC 2.5f
#define SAMPLE_RATE 16000
#define I2S_PORT I2S_NUM_0
const size_t TOTAL_SAMPLES = (size_t)(SAMPLE_RATE * RECORD_TIME_SEC);
const size_t AUDIO_BUFFER_SIZE = TOTAL_SAMPLES * sizeof(int16_t);

#define WAKE_CHECK_INTERVAL_SAMPLES   ((SAMPLE_RATE * 3) / 10)
#define VAD_SAMPLE_THRESHOLD          500
#define VAD_MIN_VOICED_SAMPLES        800
#define VAD_PEAK_THRESHOLD            900
#define VAD_AVG_THRESHOLD             60
#define RECORD_MIN_AMP_THRESHOLD      800
#define WAKE_CONFIDENCE_THRESHOLD     0.80f
#define WAKE_DIFF_THRESHOLD           0.28f
#define CMD_CONFIDENCE_THRESHOLD      0.70f
#define CMD_SLIDE_STEP_SAMPLES        (SAMPLE_RATE / 2)
#define CMD_MAX_SEARCH_SAMPLES        (SAMPLE_RATE)
#define WAKE_INITIAL_COOLDOWN_MS      4000
#define WAKE_TRIGGER_COOLDOWN_MS      2500
#define VOICE_RECORD_COOLDOWN_MS      1500
#define HTTP_BACKEND_TIMEOUT_MS       2500
#define DEFAULT_FAN_SPEED             2
#define DEFAULT_LIGHT_BRIGHTNESS      80

// TV Channels & Globals
struct Channel { const char *code, *title, *show; };
const int TOTAL_CHANNELS = 8;
extern Channel channelList[TOTAL_CHANNELS];

extern WiFiClient espClient;
extern PubSubClient mqttClient;
extern BH1750 lightMeter;
extern Servo curtainServo;
extern String nodeId, voiceStatus, recognizedText;
extern unsigned long lastMqttRetry, osdVolTimer, manualOverrideTimer, lastSensorReadTime, voiceStatusTimer;
extern bool tvPower, tvMuted, lightState, fanState, curtainOpen, autoLight, autoCurtain, autoFan, bh1750Available, dhtAvailable;
extern int tvChannel, tvVolume, lightBrightness, fanSpeed, curtainPos;
extern float currentTemp, currentHumidity, currentLux;
extern volatile bool isVoiceRecording, wakeWordTriggered;
extern volatile float lastHeyEspConfidence;
extern volatile unsigned long wakeCooldown;

// Function Prototypes
void initHardware();
void updateSensorsAndAutomation();
void setLight(bool state, int brightness = -1);
void setFan(bool state, int speed = -1);
void setCurtain(bool open);
void setCurtainPosition(int pos);
void initIR();
void sendIRCommand(uint16_t addr, uint8_t cmd);
void togglePower();
void setChannel(int ch);
void handleTVCommand(const String& cmd);
void handleIRReceiver();
void initI2SMic();
void wakeWordTask(void* pvParameters);
void triggerVoiceRecord();
bool dispatchDeviceCommand(const char* dev, const char* act, int param = -1);
void publishDeviceState(const String& device, const String& state);

#endif
