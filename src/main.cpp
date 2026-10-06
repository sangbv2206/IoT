#include "AppConfig.h"

void setupWiFi() {
#if !ENABLE_WIFI
    WiFi.mode(WIFI_OFF);
#else
    Serial.printf("[WIFI] Kết nối: %s ", WIFI_SSID_STR);
    WiFi.mode(WIFI_STA); WiFi.setAutoReconnect(true); WiFi.begin(WIFI_SSID_STR, WIFI_PASS_STR);
    for (int i = 0; WiFi.status() != WL_CONNECTED && i < 30; i++) { delay(300); Serial.print("."); }
    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("\n[WIFI] OK! IP: %s\n", WiFi.localIP().toString().c_str());
        neopixelWrite(RGB_LED_PIN, 0, 20, 0);
    } else {
        Serial.println("\n[WIFI] Chế độ Offline.");
        neopixelWrite(RGB_LED_PIN, 20, 10, 0);
    }
#endif
}

void maintainWiFi() {
#if ENABLE_WIFI
    static unsigned long lastCheck = 0;
    if (WiFi.status() != WL_CONNECTED && WiFi.getMode() != WIFI_OFF && (millis() - lastCheck > 20000)) {
        lastCheck = millis(); WiFi.reconnect();
    }
#endif
}

void setup_node_id() {
    uint64_t mac = ESP.getEfuseMac(); char buf[18];
    snprintf(buf, sizeof(buf), "%02X:%02X:%02X:%02X:%02X:%02X", 
             (uint8_t)(mac>>40), (uint8_t)(mac>>32), (uint8_t)(mac>>24), (uint8_t)(mac>>16), (uint8_t)(mac>>8), (uint8_t)mac);
    nodeId = String(buf);
}

void publishDeviceState(const String& device, const String& state) {
    if (mqttClient.connected()) mqttClient.publish((String(TOPIC_PREFIX_STR) + "/" + nodeId + "/" + device + "/state").c_str(), state.c_str(), true);
}

void reconnectMQTT() {
    if (mqttClient.connected()) return;
    String cid = "ESP32S3-" + String((uint32_t)ESP.getEfuseMac(), HEX);
    if (mqttClient.connect(cid.c_str())) {
        mqttClient.subscribe((String(TOPIC_PREFIX_STR) + "/" + nodeId + "/#").c_str());
        for (const char* t : { "den", "quat", "rem_cua", "curtain", "tv" }) mqttClient.subscribe((String(TOPIC_PREFIX_STR) + "/" + t).c_str());
        publishDeviceState("den", lightState ? "ON" : "OFF");
        publishDeviceState("quat", fanState ? "ON" : "OFF");
        publishDeviceState("rem_cua", curtainOpen ? "OPEN" : "CLOSE");
        publishDeviceState("tv", tvPower ? "ON" : "OFF");
    } else {
        // Tăng thời gian chờ thử lại lên 8s để không chặn CPU liên tục khi mất mạng broker
        lastMqttRetry = millis() + 3000;
    }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
    String t = String(topic);
    if (t.endsWith("/state") || t.endsWith("/alert") || t.endsWith("/sensors")) return;

    char buf[64]; unsigned int len = min(length, (unsigned int)(sizeof(buf) - 1));
    memcpy(buf, payload, len); buf[len] = '\0';
    String msg = String(buf); msg.trim();

    if (t.startsWith(TOPIC_PREFIX_STR)) t = t.substring(strlen(TOPIC_PREFIX_STR) + 1);
    if (t.startsWith(nodeId)) t = t.substring(nodeId.length() + 1);

    if (t.indexOf("auto") >= 0) {
        bool autoState = (msg.equalsIgnoreCase("ON") || msg == "1");
        if (t.indexOf("den") >= 0 || t.indexOf("led3") >= 0 || t.endsWith("3")) {
            autoLight = autoState; publishDeviceState("automode_den", autoLight ? "ON" : "OFF");
        } else if (t.indexOf("quat") >= 0 || t.indexOf("led2") >= 0 || t.endsWith("2")) {
            autoFan = autoState; publishDeviceState("automode_quat", autoFan ? "ON" : "OFF");
        } else if (t.indexOf("rem") >= 0 || t.indexOf("curtain") >= 0 || t.endsWith("1")) {
            autoCurtain = autoState; publishDeviceState("automode_rem_cua", autoCurtain ? "ON" : "OFF");
        }
        return;
    }

    // Xử lý các subtopic thuộc tính (properties) - không được ép bật tắt nhầm thiết bị
    if (t.endsWith("/brightness")) {
        int bri = msg.toInt();
        if (bri > 0) {
            manualOverrideTimer = millis();
            if (autoLight) { autoLight = false; publishDeviceState("automode_den", "OFF"); }
            if (lightState) setLight(true, bri);
            else lightBrightness = constrain(bri, 1, 100);
        }
        return;
    }
    if (t.endsWith("/speed")) {
        int spd = msg.toInt();
        if (spd >= 1 && spd <= 3) {
            manualOverrideTimer = millis();
            if (autoFan) { autoFan = false; publishDeviceState("automode_quat", "OFF"); }
            if (fanState) setFan(true, spd);
            else fanSpeed = spd;
        }
        return;
    }
    if (t.endsWith("/pos") || t.endsWith("/position")) {
        int pos = msg.toInt();
        manualOverrideTimer = millis();
        if (autoCurtain) { autoCurtain = false; publishDeviceState("automode_rem_cua", "OFF"); }
        setCurtainPosition(pos);
        return;
    }

    // Xử lý các topic điều khiển nguồn BẬT / TẮT chính
    if (t == "den" || t == "led3" || t == "light") {
        manualOverrideTimer = millis();
        if (autoLight) { autoLight = false; publishDeviceState("automode_den", "OFF"); }
        if (msg.startsWith("BRI:")) {
            dispatchDeviceCommand("den", "ON", msg.substring(4).toInt());
        } else if (msg.equalsIgnoreCase("ON") || msg == "1") {
            dispatchDeviceCommand("den", "ON");
        } else if (msg.equalsIgnoreCase("OFF") || msg == "0") {
            dispatchDeviceCommand("den", "OFF");
        } else if (msg.equalsIgnoreCase("TOGGLE")) {
            dispatchDeviceCommand("den", "TOGGLE");
        }
    } else if (t == "quat" || t == "led2" || t == "fan") {
        manualOverrideTimer = millis();
        if (autoFan) { autoFan = false; publishDeviceState("automode_quat", "OFF"); }
        if (msg.startsWith("SPEED:")) {
            dispatchDeviceCommand("quat", "ON", msg.substring(6).toInt());
        } else if (msg.equalsIgnoreCase("ON")) {
            dispatchDeviceCommand("quat", "ON");
        } else if (msg.equalsIgnoreCase("OFF") || msg == "0") {
            dispatchDeviceCommand("quat", "OFF");
        } else if (msg.equalsIgnoreCase("TOGGLE")) {
            dispatchDeviceCommand("quat", "TOGGLE");
        } else if (msg == "1" || msg == "2" || msg == "3") {
            dispatchDeviceCommand("quat", "ON", msg.toInt());
        }
    } else if (t == "rem_cua" || t == "curtain" || t == "rem" || t == "led1") {
        manualOverrideTimer = millis();
        if (autoCurtain) { autoCurtain = false; publishDeviceState("automode_rem_cua", "OFF"); }
        if (msg.startsWith("POS:")) {
            dispatchDeviceCommand("rem", "POS", msg.substring(4).toInt());
        } else if (msg.equalsIgnoreCase("OPEN") || msg.equalsIgnoreCase("ON")) {
            dispatchDeviceCommand("rem", "OPEN");
        } else if (msg.equalsIgnoreCase("CLOSE") || msg.equalsIgnoreCase("OFF") || msg == "0") {
            dispatchDeviceCommand("rem", "CLOSE");
        } else if (msg.equalsIgnoreCase("STOP")) {
            dispatchDeviceCommand("rem", "STOP");
        } else if (msg.equalsIgnoreCase("TOGGLE")) {
            dispatchDeviceCommand("rem", "TOGGLE");
        }
    } else if (t == "tv" || t == "tivi" || t.endsWith("/tv")) {
        dispatchDeviceCommand("tv", msg.c_str());
    } else if (t.endsWith("/channel") && (t.indexOf("tv") >= 0 || t.indexOf("tivi") >= 0)) {
        handleTVCommand("CH:" + msg);
    } else if (t.endsWith("/volume") && (t.indexOf("tv") >= 0 || t.indexOf("tivi") >= 0)) {
        handleTVCommand("VOL:" + msg);
    } else if (t == "ir/send") {
        sendIRCommand(0x00, (uint8_t)strtol(msg.c_str(), NULL, 0));
    }
}

void setup() {
    Serial.begin(115200); Serial.setTimeout(50); delay(500); neopixelWrite(RGB_LED_PIN, 0, 0, 0);
    initHardware(); initI2SMic();
    xTaskCreatePinnedToCore(wakeWordTask, "WakeNet", 10240, NULL, 1, NULL, 0);
    pinMode(BTN_BOOT_PIN, INPUT_PULLUP);
    setupWiFi(); setup_node_id();
    espClient.setTimeout(15000);
    mqttClient.setServer(MQTT_SERVER_HOST, MQTT_SERVER_PORT);
    mqttClient.setCallback(mqttCallback); 
    mqttClient.setBufferSize(512);
    mqttClient.setSocketTimeout(15);
    mqttClient.setKeepAlive(15);
    if (WiFi.status() == WL_CONNECTED) reconnectMQTT();
    renderScreen(true);
}

void loop() {
    unsigned long now = millis();
    maintainWiFi();
    if (WiFi.status() == WL_CONNECTED) {
        if (!mqttClient.connected()) {
            if (now - lastMqttRetry > 5000) { lastMqttRetry = now; reconnectMQTT(); }
        } else mqttClient.loop();
    }

    if (wakeWordTriggered) { wakeWordTriggered = false; triggerVoiceRecord(); }

    static unsigned long btnPressStart = 0;
    if (now > 3000) {
        if (digitalRead(BTN_BOOT_PIN) == LOW) {
            if (btnPressStart == 0) btnPressStart = now;
        } else if (btnPressStart > 0) {
            if (now - btnPressStart >= 50) triggerVoiceRecord();
            btnPressStart = 0;
        }
    }

    if (Serial.available()) {
        String s = Serial.readStringUntil('\n');
        if (s.indexOf("record") >= 0) triggerVoiceRecord();
    }

    handleIRReceiver();
    updateSensorsAndAutomation();

    if (voiceStatus.length() > 0 && (now - voiceStatusTimer > 3500)) {
        voiceStatus = ""; recognizedText = ""; markDisplayDirty();
    }
    renderScreen(false);
    delay(2);
}