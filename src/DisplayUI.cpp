#include "DisplayUI.h"
#include "AppConfig.h"
#include <Wire.h>

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
static bool s_isDirty = true;
void markDisplayDirty() { s_isDirty = true; }

void initDisplay() {
    if (display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
        display.clearDisplay(); display.setTextWrap(false); renderScreen(true);
    }
}

void showOledMessage(const String& title, const String& subtitle, unsigned long durationMs) {
    voiceStatus = title; recognizedText = subtitle; voiceStatusTimer = millis();
    markDisplayDirty(); renderScreen(true);
}

void renderScreen(bool force) {
    unsigned long now = millis();
    bool hud = (tvPower && (now - osdVolTimer < 2000)) || (!tvPower && voiceStatus.length() > 0 && (now - voiceStatusTimer < 2500));
    static bool wasHud = false;
    if (!force && !s_isDirty && !hud && !wasHud) return;
    wasHud = hud; s_isDirty = false;

    display.clearDisplay(); display.setTextSize(1); display.setTextColor(SSD1306_WHITE);

    if (tvPower) {
        display.setCursor(2, 1); display.print("SMART TV");
        display.setCursor(84, 1); display.print(tvMuted ? "[MUTE]" : (WiFi.status() == WL_CONNECTED ? "LIVE" : "OFF-L"));
        display.drawFastHLine(0, 11, 128, SSD1306_WHITE);

        display.fillRoundRect(2, 14, 34, 11, 2, SSD1306_WHITE);
        display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
        display.setCursor(5, 16); display.printf("CH%02d", tvChannel);
        display.setTextColor(SSD1306_WHITE);

        display.setCursor(42, 16); display.print(channelList[tvChannel - 1].code);
        display.setCursor(2, 28); display.printf("> %-16.16s", channelList[tvChannel - 1].title);
        display.setCursor(2, 39); display.printf("#%s", channelList[tvChannel - 1].show);

        display.drawFastHLine(0, 50, 128, SSD1306_WHITE);
        display.setCursor(2, 53); display.print("VOL");
        display.drawRoundRect(24, 53, 64, 8, 2, SSD1306_WHITE);
        int vW = map(tvVolume, 0, 100, 0, 60);
        if (vW > 0 && !tvMuted) display.fillRect(26, 55, vW, 4, SSD1306_WHITE);
        display.setCursor(94, 53); display.print(tvMuted ? "MUTE" : String(tvVolume) + "%");
    } else {
        display.setCursor(2, 1); display.print("SMART HOME");
        display.setCursor(84, 1); display.print(WiFi.status() == WL_CONNECTED ? "WIFI" : "NO-WF");
        display.drawFastHLine(0, 11, 128, SSD1306_WHITE);
        display.drawFastVLine(64, 12, 38, SSD1306_WHITE);

        display.setCursor(2, 15); display.printf(dhtAvailable ? "T:%.1f C" : "T:--.- C", currentTemp);
        display.setCursor(2, 27); display.printf(dhtAvailable ? "H:%.0f %%" : "H:-- %%", currentHumidity);
        display.setCursor(2, 39); display.printf(bh1750Available ? "L:%.0flx" : "L:---lx", currentLux);

        display.setCursor(70, 15); display.printf("D:%s", lightState ? "BAT" : "TAT");
        display.setCursor(70, 27); display.printf(fanState ? "Q:S%d" : "Q:TAT", fanSpeed);
        display.setCursor(70, 39); display.printf("R:%d%%", curtainPos);

        display.drawFastHLine(0, 50, 128, SSD1306_WHITE);
        display.setCursor(2, 53); display.printf("TV:STANDBY | Rem:%s", curtainOpen ? "MO" : "DONG");
    }

    if (tvPower && (now - osdVolTimer < 2000)) {
        display.fillRoundRect(10, 14, 108, 34, 3, SSD1306_BLACK);
        display.drawRoundRect(10, 14, 108, 34, 3, SSD1306_WHITE);
        display.setCursor(18, 19); display.printf("AM LUONG: %s", tvMuted ? "MUTE" : (String(tvVolume) + "%").c_str());
        display.drawRoundRect(18, 31, 92, 8, 2, SSD1306_WHITE);
        int b = map(tvVolume, 0, 100, 0, 88);
        if (b > 0 && !tvMuted) display.fillRect(20, 33, b, 4, SSD1306_WHITE);
    } else if (!tvPower && (now - voiceStatusTimer < 2500) && voiceStatus.length() > 0) {
        display.fillRoundRect(8, 14, 112, 34, 3, SSD1306_BLACK);
        display.drawRoundRect(8, 14, 112, 34, 3, SSD1306_WHITE);
        display.setCursor(14, 20); display.print(voiceStatus.substring(0, 16));
        if (recognizedText.length() > 0) { display.setCursor(14, 32); display.printf("\"%s\"", recognizedText.substring(0, 14).c_str()); }
    }
    display.display();
}
