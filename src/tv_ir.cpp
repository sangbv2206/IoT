#include "AppConfig.h"
#define IR_SEND_DUTY_CYCLE_PERCENT 50
#include <IRremote.hpp>

Channel channelList[TOTAL_CHANNELS] = {
    {"VTV1 HD", "Thoi su 19:00", "Chinh tri"}, {"VTV3 HD", "Gala Cuoi", "Giai tri"},
    {"HBO HD", "Avengers", "Phim My"},          {"DISCOVERY", "Wild Planet", "Dong vat"},
    {"CARTOON", "Tom & Jerry", "Hoat hinh"},    {"K+ SPORT", "Ngoai Hang Anh", "Bong da"},
    {"VTV2 HD", "Khoa hoc", "Kham pha"},        {"MUSIC HD", "Top Hits", "Nhac EDM"}
};
static unsigned long ignoreEchoTimer = 0;

void initIR() { 
    pinMode(IR_RECEIVE_PIN, INPUT_PULLUP);
    IrReceiver.begin(IR_RECEIVE_PIN, DISABLE_LED_FEEDBACK); 
    IrSender.begin(IR_SEND_PIN); 
}

void sendIRCommand(uint16_t addr, uint8_t cmd) { 
    ignoreEchoTimer = millis(); 
    IrSender.sendNEC(addr, cmd, 0); 
    delay(20); 
}

void togglePower() { 
    tvPower = !tvPower; sendIRCommand(0x00, 0x45); 
    publishDeviceState("tv", tvPower ? "ON" : "OFF"); 
    markDisplayDirty(); renderScreen(); 
}

void setChannel(int ch) {
    if (!tvPower) tvPower = true;
    if (ch >= 1 && ch <= TOTAL_CHANNELS) { 
        tvChannel = ch; publishDeviceState("tv/channel", String(ch)); 
        markDisplayDirty(); renderScreen(); 
    }
}

static void applyVolume(int v) {
    if (!tvPower) return;
    tvMuted = false; tvVolume = constrain(v, 0, 100); osdVolTimer = millis();
    publishDeviceState("tv/volume", String(tvVolume)); markDisplayDirty(); renderScreen();
}

void handleTVCommand(const String& cmd) {
    String c = cmd; c.toUpperCase(); c.trim();
    if (c == "POWER" || c == "TOGGLE") togglePower();
    else if ((c == "ON" || c == "POWER_ON" || c == "1") && !tvPower) togglePower();
    else if ((c == "OFF" || c == "POWER_OFF" || c == "0") && tvPower) togglePower();
    else if (c == "VOL_UP" || c == "RIGHT")   { sendIRCommand(0x00, 0x12); applyVolume(tvVolume + 5); }
    else if (c == "VOL_DOWN" || c == "LEFT") { sendIRCommand(0x00, 0x13); applyVolume(tvVolume - 5); }
    else if (c == "CH_UP" || c == "NEXT" || c == "UP")   { sendIRCommand(0x00, 0x10); setChannel(tvChannel >= TOTAL_CHANNELS ? 1 : tvChannel + 1); }
    else if (c == "CH_DOWN" || c == "PREV" || c == "DOWN") { sendIRCommand(0x00, 0x11); setChannel(tvChannel <= 1 ? TOTAL_CHANNELS : tvChannel - 1); }
    else if (c == "OK") { sendIRCommand(0x00, 0x0D); markDisplayDirty(); renderScreen(); }
    else if (c == "BACK") { sendIRCommand(0x00, 0x19); setChannel(tvChannel <= 1 ? TOTAL_CHANNELS : tvChannel - 1); }
    else if (c == "HOME") { sendIRCommand(0x00, 0x4A); setChannel(1); }
    else if (c == "MUTE") { tvMuted = !tvMuted; sendIRCommand(0x00, 0x14); publishDeviceState("tv/mute", tvMuted ? "ON" : "OFF"); markDisplayDirty(); renderScreen(); }
    else if (c.startsWith("VOL:")) applyVolume(c.substring(4).toInt());
    else if (c.startsWith("CH:")) setChannel(c.substring(3).toInt());
    else if (c.startsWith("APP:")) {
        String app = c.substring(4);
        if (app.indexOf("NETFLIX") >= 0) setChannel(3); // Kênh 3: HBO HD / Phim ảnh
        else if (app.indexOf("YOUTUBE") >= 0) setChannel(8); // Kênh 8: MUSIC HD / Video ca nhạc
        else if (app.indexOf("K+") >= 0 || app.indexOf("KPLUS") >= 0) setChannel(6); // Kênh 6: K+ SPORT / Bóng đá
        else if (app.indexOf("VTV") >= 0) setChannel(1); // Kênh 1: VTV1 HD / Tin tức
    }
    else {
        int num = c.toInt();
        if (num >= 1 && num <= TOTAL_CHANNELS) setChannel(num);
        else {
            for (int i = 0; i < TOTAL_CHANNELS; i++) {
                if (String(channelList[i].code).equalsIgnoreCase(c) || String(channelList[i].title).indexOf(c) >= 0) { setChannel(i + 1); break; }
            }
        }
    }
}

void handleIRReceiver() {
    if (!IrReceiver.decode()) return;
    if (IrReceiver.decodedIRData.protocol == UNKNOWN || IrReceiver.decodedIRData.rawlen < 10) { IrReceiver.resume(); return; }

    uint8_t c = IrReceiver.decodedIRData.command;
    if (millis() > 3000 && (millis() - ignoreEchoTimer >= 600)) {
        if (c == 0x45) togglePower(); 
        else if (c == 0x46) handleTVCommand("NEXT"); 
        else if (c == 0x15) handleTVCommand("PREV"); 
        else if (c == 0x47) handleTVCommand("VOL_UP"); 
        else if (c == 0x07) handleTVCommand("VOL_DOWN");
    }
    IrReceiver.resume();
}