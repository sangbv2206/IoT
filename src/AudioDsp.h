#ifndef AUDIO_DSP_H
#define AUDIO_DSP_H

#include <Arduino.h>
#include <driver/i2s.h>

struct AudioDspPipeline {
    float dcX1 = 0, dcY1 = 0, hpX1 = 0, hpX2 = 0, hpY1 = 0, hpY2 = 0;
    float lpX1 = 0, lpX2 = 0, lpY1 = 0, lpY2 = 0, envelope = 0, gateThreshold = 400.0f;
    void reset() { dcX1 = dcY1 = hpX1 = hpX2 = hpY1 = hpY2 = lpX1 = lpX2 = lpY1 = lpY2 = envelope = 0; }
    int16_t processSample(int16_t raw);
};

void normalizeBuffer(int16_t *buf, size_t count);
size_t recordI2SSamples(int16_t *outBuf, size_t targetSamples, int32_t &maxAmp);

#endif
