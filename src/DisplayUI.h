#ifndef DISPLAY_UI_H
#define DISPLAY_UI_H

#include <Arduino.h>
#include <Adafruit_SSD1306.h>

extern Adafruit_SSD1306 display;
void initDisplay();
void markDisplayDirty();
void showOledMessage(const String& title, const String& subtitle, unsigned long durationMs = 3000);
void renderScreen(bool force = false);

#endif
