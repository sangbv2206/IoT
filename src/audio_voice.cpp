#include "AppConfig.h"
#include <ArduinoJson.h>
#include <IoT_inferencing.h>
#include <WiFiClient.h>

volatile unsigned long wakeCooldown = 0;
static int16_t wakeBuffer[EI_CLASSIFIER_RAW_SAMPLE_COUNT], *cmdBuf = NULL;
static size_t cmdOff = 0;
static int16_t* s_audioRecordBuf = NULL;

static int getWakeData(size_t o, size_t n, float *out) { numpy::int16_to_float(&wakeBuffer[o], out, n); return 0; }
static int getCmdData(size_t o, size_t n, float *out)  { if (cmdBuf) numpy::int16_to_float(&cmdBuf[cmdOff + o], out, n); return 0; }

void initI2SMic() {
    i2s_config_t cfg = {
        .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX), .sample_rate = SAMPLE_RATE,
        .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT, .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
        .communication_format = i2s_comm_format_t(I2S_COMM_FORMAT_STAND_I2S),
        .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1, .dma_buf_count = 4, .dma_buf_len = 512,
        .use_apll = false, .tx_desc_auto_clear = false, .fixed_mclk = 0
    };
    i2s_pin_config_t pins = { .bck_io_num = I2S_SCK_PIN, .ws_io_num = I2S_WS_PIN, .data_out_num = -1, .data_in_num = I2S_SD_PIN };
    i2s_driver_install(I2S_PORT, &cfg, 0, NULL);
    i2s_set_pin(I2S_PORT, &pins);

    if (!s_audioRecordBuf) {
        if (psramFound()) s_audioRecordBuf = (int16_t*)ps_malloc(AUDIO_BUFFER_SIZE);
        if (!s_audioRecordBuf) s_audioRecordBuf = (int16_t*)malloc(AUDIO_BUFFER_SIZE);
    }
}

bool dispatchDeviceCommand(const char* dev, const char* act, int param) {
    if (!dev || !act) return false;
    manualOverrideTimer = millis();
    String d = dev; d.toLowerCase();
    String a = act; a.toUpperCase();

    bool turnOff = (a == "OFF" || a == "TURN_OFF" || a == "0" || a == "CLOSE");
    bool toggle  = (a == "TOGGLE");

    if (d == "tv" || d == "tivi") {
        if (param >= 0 && (a == "SET_VOL" || a == "VOL")) handleTVCommand("VOL:" + String(param));
        else if (param >= 0 && (a == "SET_CH" || a == "CH")) handleTVCommand("CH:" + String(param));
        else handleTVCommand(a);
        return true;
    }
    if (d == "den" || d == "light" || d == "led3") {
        setLight(toggle ? !lightState : (turnOff ? false : true), param);
        return true;
    }
    if (d == "quat" || d == "fan" || d == "led2") {
        setFan(toggle ? !fanState : (turnOff ? false : true), param > 0 ? param : DEFAULT_FAN_SPEED);
        return true;
    }
    if (d == "rem" || d == "curtain" || d == "rem_cua" || d == "led1") {
        if (a == "STOP") {
            publishDeviceState("rem_cua", curtainOpen ? "OPEN" : "CLOSE");
            publishDeviceState("rem_cua/position", String(curtainPos));
            return true;
        }
        if (param >= 0) setCurtainPosition(param);
        else setCurtain(toggle ? !curtainOpen : (turnOff ? false : true));
        return true;
    }
    return false;
}

static bool executeCommandFromDoc(JsonDocument& doc) {
    bool executed = false;
    for (JsonObject c : doc["commands"].as<JsonArray>()) {
        const char* d = c["device"] | "";
        const char* a = c["action"] | "";
        int param = -1;
        JsonObject p = c["parameters"].as<JsonObject>();
        if (p["brightness"].is<int>()) param = p["brightness"];
        else if (p["speed"].is<int>()) param = p["speed"];
        else if (p["position_pct"].is<int>()) param = p["position_pct"];
        else if (p["channel"].is<int>()) param = p["channel"];
        else if (p["volume"].is<int>()) param = p["volume"];
        if (dispatchDeviceCommand(d, a, param)) executed = true;
    }
    return executed;
}

static void executeOfflineCommand(const char* label) {
    if (!label) return;
    const char* sep = strchr(label, '_');
    if (sep) {
        String act = String(label).substring(0, sep - label);
        const char* dev = sep + 1;
        const char* cmd = (act == "bat" || act == "mo") ? "ON" : "OFF";
        dispatchDeviceCommand(dev, cmd);
        neopixelWrite(RGB_LED_PIN, 0, 50, 0);
    }
}

void wakeWordTask(void *pvParameters) {
    wakeCooldown = millis() + WAKE_INITIAL_COOLDOWN_MS;
    int32_t chunk[512]; uint32_t count = 0; int32_t peak = 0;
    AudioDspPipeline wakeDsp;

    while (true) {
        if (isVoiceRecording || millis() < wakeCooldown) { vTaskDelay(pdMS_TO_TICKS(40)); continue; }
        size_t br = 0;
        esp_err_t err = i2s_read(I2S_PORT, chunk, sizeof(chunk), &br, pdMS_TO_TICKS(50));
        int samples = br / sizeof(int32_t);

        if (err == ESP_OK && samples > 0) {
            memmove(wakeBuffer, wakeBuffer + samples, (EI_CLASSIFIER_RAW_SAMPLE_COUNT - samples) * sizeof(int16_t));
            for (int i = 0; i < samples; i++) {
                int16_t c = wakeDsp.processSample((int16_t)constrain(chunk[i] >> 14, -32768, 32767));
                wakeBuffer[EI_CLASSIFIER_RAW_SAMPLE_COUNT - samples + i] = c;
                int32_t a = abs(c); if (a > peak) peak = a;
            }
            count += samples;

            if (count >= WAKE_CHECK_INTERVAL_SAMPLES) {
                count = 0; int voiced = 0; int64_t sum = 0;
                for (int i = 0; i < EI_CLASSIFIER_RAW_SAMPLE_COUNT; i++) {
                    int16_t v = abs(wakeBuffer[i]); sum += v;
                    if (v > VAD_SAMPLE_THRESHOLD) voiced++;
                }

                if (peak >= VAD_PEAK_THRESHOLD && voiced >= VAD_MIN_VOICED_SAMPLES && (sum / EI_CLASSIFIER_RAW_SAMPLE_COUNT) >= VAD_AVG_THRESHOLD) {
                    signal_t sig;
                    sig.total_length = EI_CLASSIFIER_RAW_SAMPLE_COUNT;
                    sig.get_data = &getWakeData;
                    ei_impulse_result_t res = {0};
                    if (run_classifier(&sig, &res, false) == EI_IMPULSE_OK) {
                        float heyVal = 0, secVal = 0;
                        for (size_t ix = 0; ix < EI_CLASSIFIER_LABEL_COUNT; ix++) {
                            if (!strcmp(res.classification[ix].label, "hey_esp")) heyVal = res.classification[ix].value;
                            else if (res.classification[ix].value > secVal) secVal = res.classification[ix].value;
                        }
                        if (heyVal >= WAKE_CONFIDENCE_THRESHOLD && heyVal > (secVal + WAKE_DIFF_THRESHOLD)) {
                            lastHeyEspConfidence = heyVal;
                            Serial.printf("[WAKE WORD] hey_esp (%.0f%%)\n", heyVal * 100.0f);
                            wakeWordTriggered = true;
                            memset(wakeBuffer, 0, sizeof(wakeBuffer));
                            wakeCooldown = millis() + WAKE_TRIGGER_COOLDOWN_MS;
                        }
                    }
                }
                peak = 0;
            }
        } else vTaskDelay(pdMS_TO_TICKS(10));
    }
}

static bool sendAudioToBackend(int16_t *audio, size_t count, String &outTranscript) {
    WiFiClient client; client.setTimeout(HTTP_BACKEND_TIMEOUT_MS / 1000);
    if (!client.connect(BACKEND_HOST, BACKEND_PORT)) return false;

    size_t bytes = count * sizeof(int16_t);
    String bnd = "----ESP32X7";
    String head = "--" + bnd + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"v.wav\"\r\nContent-Type: audio/wav\r\n\r\n";
    String tail = "\r\n--" + bnd + "--\r\n";
    size_t totalLen = head.length() + 44 + bytes + tail.length();

    client.printf("POST /api/esp32/audio HTTP/1.1\r\nHost: %s:%d\r\nContent-Type: multipart/form-data; boundary=%s\r\nContent-Length: %u\r\nConnection: close\r\n\r\n",
                  BACKEND_HOST, BACKEND_PORT, bnd.c_str(), (unsigned int)totalLen);
    client.print(head);

    uint8_t h[44] = {'R','I','F','F', 0,0,0,0, 'W','A','V','E','f','m','t',' ', 16,0,0,0, 1,0, 1,0, 0,0,0,0, 0,0,0,0, 2,0, 16,0, 'd','a','t','a', 0,0,0,0};
    uint32_t sz = 36 + bytes, sr = SAMPLE_RATE, bps = sr * 2;
    memcpy(&h[4], &sz, 4); memcpy(&h[24], &sr, 4); memcpy(&h[28], &bps, 4); memcpy(&h[40], &bytes, 4);
    client.write(h, 44);

    uint8_t *raw = (uint8_t *)audio;
    for (size_t sent = 0; sent < bytes; sent += 1024) client.write(raw + sent, min((size_t)1024, bytes - sent));
    client.print(tail);

    unsigned long t0 = millis();
    while (client.connected() && !client.available() && (millis() - t0 < HTTP_BACKEND_TIMEOUT_MS)) delay(20);
    String body; bool isBody = false;
    while (client.available()) {
        String line = client.readStringUntil('\n');
        if (line == "\r") { isBody = true; continue; }
        if (isBody) body += line;
    }
    client.stop();

    JsonDocument doc;
    if (deserializeJson(doc, body) == DeserializationError::Ok) {
        outTranscript = doc["transcript"] | "";
        executeCommandFromDoc(doc);
        return true;
    }
    return false;
}

void triggerVoiceRecord() {
    if (!s_audioRecordBuf) return;
    isVoiceRecording = true; neopixelWrite(RGB_LED_PIN, 0, 0, 60);
    showOledMessage("DANG NGHE...", "", 2000);
    i2s_zero_dma_buffer(I2S_PORT);

    int32_t maxAmp = 0;
    size_t samples = recordI2SSamples(s_audioRecordBuf, TOTAL_SAMPLES, maxAmp);

    if (maxAmp >= RECORD_MIN_AMP_THRESHOLD) {
        bool handled = false;
        if (WiFi.status() == WL_CONNECTED) {
            showOledMessage("DANG XU LY...", "", 1500); neopixelWrite(RGB_LED_PIN, 30, 20, 0);
            String transcript = "";
            if (sendAudioToBackend(s_audioRecordBuf, samples, transcript) && transcript.length() > 0) {
                if (tvPower) { voiceStatus = ""; recognizedText = ""; markDisplayDirty(); renderScreen(); }
                else showOledMessage("LENH", transcript, 1500);
                neopixelWrite(RGB_LED_PIN, 0, 50, 0); handled = true;
            }
        }
        if (!handled && samples >= EI_CLASSIFIER_RAW_SAMPLE_COUNT) {
            cmdBuf = s_audioRecordBuf;
            signal_t sig;
            sig.total_length = EI_CLASSIFIER_RAW_SAMPLE_COUNT;
            sig.get_data = &getCmdData;
            float bestConf = CMD_CONFIDENCE_THRESHOLD; const char *best = NULL;

            for (size_t off = 0; off + EI_CLASSIFIER_RAW_SAMPLE_COUNT <= samples && off <= CMD_MAX_SEARCH_SAMPLES; off += CMD_SLIDE_STEP_SAMPLES) {
                cmdOff = off; ei_impulse_result_t res = {0};
                if (run_classifier(&sig, &res, false) == EI_IMPULSE_OK) {
                    for (size_t ix = 0; ix < EI_CLASSIFIER_LABEL_COUNT; ix++) {
                        const char *l = res.classification[ix].label; float v = res.classification[ix].value;
                        if (!strcmp(l, "noise") || !strcmp(l, "unknow") || !strcmp(l, "hey_esp")) continue;
                        if (v > bestConf) { bestConf = v; best = l; }
                    }
                }
            }
            if (best) { executeOfflineCommand(best); handled = true; }
            cmdBuf = NULL;
        }
        if (!handled) { showOledMessage("KHONG RO", "Thu noi lai", 2000); neopixelWrite(RGB_LED_PIN, 40, 20, 0); }
    } else {
        showOledMessage("AM NHO", "Thu noi lai", 1500);
    }
    wakeCooldown = millis() + VOICE_RECORD_COOLDOWN_MS;
    isVoiceRecording = false;
}
