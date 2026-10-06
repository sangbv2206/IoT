#include "AudioDsp.h"
#include "AppConfig.h"

int16_t AudioDspPipeline::processSample(int16_t raw) {
    float in = (float)raw;
    // 1. DC Blocker + 2. High-Pass (85Hz) + 3. Low-Pass (3800Hz)
    float dcOut = in - dcX1 + 0.995f * dcY1; dcX1 = in; dcY1 = dcOut;
    float hpOut = 0.976673f * dcOut - 1.953347f * hpX1 + 0.976673f * hpX2 - (-1.952802f * hpY1 + 0.953891f * hpY2);
    hpX2 = hpX1; hpX1 = dcOut; hpY2 = hpY1; hpY1 = hpOut;
    float lpOut = 0.270257f * hpOut + 0.540514f * lpX1 + 0.270257f * lpX2 - (-0.092038f * lpY1 + 0.173066f * lpY2);
    lpX2 = lpX1; lpX1 = hpOut; lpY2 = lpY1; lpY1 = lpOut;

    // 4. Dynamic Noise Gate
    float absVal = fabsf(lpOut);
    envelope = (absVal > envelope) ? (0.85f * envelope + 0.15f * absVal) : (0.992f * envelope + 0.008f * absVal);
    float gated = (envelope < gateThreshold) ? (lpOut * powf(envelope / gateThreshold, 2)) : lpOut;
    return (int16_t)constrain((int32_t)gated, -32767, 32767);
}

void normalizeBuffer(int16_t *buf, size_t count) {
    if (!buf || count == 0) return;
    int32_t peak = 0;
    for (size_t i = 0; i < count; i++) { int32_t a = abs(buf[i]); if (a > peak) peak = a; }
    if (peak >= 500) {
        float gain = constrain(24000.0f / (float)peak, 0.6f, 5.0f);
        for (size_t i = 0; i < count; i++) buf[i] = (int16_t)constrain((int32_t)(buf[i] * gain), -32767, 32767);
    }
}

size_t recordI2SSamples(int16_t *outBuf, size_t targetSamples, int32_t &maxAmp) {
    AudioDspPipeline dsp; dsp.reset();
    size_t n = 0, voiced = 0, silence = 0;
    int32_t chunk[256]; maxAmp = 0;

    while (n < targetSamples) {
        size_t bRead = 0;
        i2s_read(I2S_PORT, chunk, sizeof(chunk), &bRead, portMAX_DELAY);
        int samplesRead = (int)(bRead / 4);
        for (int i = 0; i < samplesRead && n < targetSamples; i++) {
            int16_t c = dsp.processSample((int16_t)constrain(chunk[i] >> 14, -32768, 32767));
            outBuf[n++] = c;
            int32_t a = abs(c);
            if (a > maxAmp) maxAmp = a;
            if (a >= 600) { voiced++; silence = 0; }
            else if (a < 400) { silence++; }
        }
        if (n >= 19200 && voiced >= 2500 && silence >= 9600) break; // Dừng sớm khi ngừng nói
    }
    normalizeBuffer(outBuf, n);
    return n;
}
