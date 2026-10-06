'use strict';

const http = require('http');
const logger = require('../utils/logger');
const mqttService = require('./mqttService');
const supabaseService = require('./supabaseService');
const { TOPIC_PREFIX } = require('../config/config');

const VOICE_PORT = parseInt(process.env.VOICE_SERVICE_PORT || '8001', 10);
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

let httpServer = null, isReady = false;

// ── Chuẩn hóa tiếng Việt không dấu để Regex siêu tốc ──
const stripAccents = (s) => (s || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/gi, 'd')
  .toLowerCase()
  .replace(/[.!?,;:]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// ── Trích xuất buffer WAV từ multipart stream thuần (Zero-dependency) ──
function parseMultipartBuffer(req) {
  return new Promise((resolve, reject) => {
    const boundary = (req.headers['content-type'] || '').match(/boundary=(?:["']?)([^"';]+)(?:["']?)/)?.[1];
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      if (!boundary) return resolve(buf);
      const hEnd = buf.indexOf(Buffer.from('\r\n\r\n'));
      if (hEnd === -1) return resolve(buf);
      const start = hEnd + 4, delim = Buffer.from(`\r\n--${boundary}`);
      const end = buf.indexOf(delim, start);
      resolve(buf.subarray(start, end !== -1 ? end : buf.length));
    });
    req.on('error', reject);
  });
}

// ── 1. STT: Groq Whisper Cloud (~200ms) ──
async function transcribeAudio(audioBuffer) {
  if (!GROQ_API_KEY || audioBuffer.length < 100) return '';
  const form = new FormData();
  form.append('file', new Blob([audioBuffer], { type: 'audio/wav' }), 'audio.wav');
  form.append('model', 'whisper-large-v3-turbo');
  form.append('language', 'vi');
  form.append('prompt', 'bật đèn, tắt đèn, bật quạt số 1 2 3, mở rèm, đóng rèm, bật tivi, chuyển kênh');
  form.append('temperature', '0.0');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST', headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` }, body: form, signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
  const text = ((await res.json()).text || '').trim();
  const lower = stripAccents(text);
  if (/cam on|subscribe|theo doi|hen gap lai|ghen mi go/.test(lower)) return '';
  return text;
}

// ── 2. NLU: Bảng quy tắc Regex siêu tốc (0ms, chính xác tuyệt đối) ──
function parseRuleBased(rawText) {
  const s = stripAccents(rawText);
  const cmds = [];

  // Đèn
  if (/\b(bat|mo|sang)\b.*\b(den|dien|led)\b/.test(s)) {
    const pct = s.match(/(\d+)\s*%/)?.[1];
    cmds.push({ device: 'den', action: 'ON', parameters: pct ? { brightness: +pct } : {} });
  } else if (/\b(tat)\b.*\b(den|dien|led)\b/.test(s)) {
    cmds.push({ device: 'den', action: 'OFF', parameters: {} });
  }

  // Quạt
  if (/\b(bat|mo|chay)\b.*\b(quat)\b/.test(s) || /\bquat\b.*\b(so|muc|toc do)\s*(\d)\b/.test(s)) {
    let speed = s.match(/\b(?:so|muc|toc do)\s*(\d)\b/)?.[1] || (s.includes('ba') ? 3 : s.includes('hai') ? 2 : 1);
    cmds.push({ device: 'quat', action: 'ON', parameters: { speed: +speed } });
  } else if (/\b(tat)\b.*\b(quat)\b/.test(s)) {
    cmds.push({ device: 'quat', action: 'OFF', parameters: {} });
  }

  // Rèm cửa
  if (/\b(mo|keo len)\b.*\b(rem)\b/.test(s)) {
    const pct = s.match(/(\d+)\s*%/)?.[1];
    cmds.push({ device: 'rem_cua', action: pct ? 'POS' : 'OPEN', parameters: { position_pct: pct ? +pct : 100 } });
  } else if (/\b(dong|ha|keo xuong)\b.*\b(rem)\b/.test(s)) {
    cmds.push({ device: 'rem_cua', action: 'CLOSE', parameters: { position_pct: 0 } });
  } else if (/\b(dung|ngung)\b.*\b(rem)\b/.test(s)) {
    cmds.push({ device: 'rem_cua', action: 'STOP', parameters: {} });
  }

  // Tivi
  if (/\b(bat|mo)\b.*\b(tv|tivi)\b/.test(s)) {
    cmds.push({ device: 'tv', action: 'ON', parameters: {} });
  } else if (/\b(tat)\b.*\b(tv|tivi)\b/.test(s)) {
    cmds.push({ device: 'tv', action: 'OFF', parameters: {} });
  } else if (/\b(chuyen kenh|kenh)\s*(\d+)\b/.test(s)) {
    cmds.push({ device: 'tv', action: 'CH', parameters: { channel: +s.match(/\b(chuyen kenh|kenh)\s*(\d+)\b/)[2] } });
  } else if (/\b(tat tieng|mute)\b/.test(s)) {
    cmds.push({ device: 'tv', action: 'MUTE', parameters: {} });
  }

  return cmds;
}

// ── 3. NLU: Gemini 2.5 Flash Fallback cho câu lệnh tự nhiên phức tạp ──
async function parseWithGemini(rawText) {
  if (!GEMINI_API_KEY || !rawText) return [];
  const prompt = `Trích xuất lệnh IoT tiếng Việt thành JSON: { "commands": [{ "device": "den|quat|rem_cua|tv", "action": "ON|OFF|OPEN|CLOSE|POS|STOP|VOL|CH|MUTE", "parameters": {} }] }. Câu: "${rawText}"`;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } }),
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return [];
    const text = (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text?.replace(/```json|```/gi, '').trim();
    const p = JSON.parse(text || '{}');
    return Array.isArray(p) ? p : (Array.isArray(p.commands) ? p.commands : []);
  } catch { return []; }
}

// ── 4. Phát lệnh MQTT & Ghi nhật ký Supabase ──
async function executeCommands(commands, nodeId = null) {
  for (const { device, action, parameters = {} } of commands) {
    let payload = action;
    if (device === 'den' && parameters.brightness !== undefined) payload = `BRI:${parameters.brightness}`;
    else if (device === 'quat' && parameters.speed !== undefined && action === 'ON') payload = `SPEED:${parameters.speed}`;
    else if (device === 'rem_cua' && parameters.position_pct !== undefined) payload = `POS:${parameters.position_pct}`;
    else if (device === 'tv' && parameters.channel !== undefined) payload = `CH:${parameters.channel}`;
    else if (device === 'tv' && parameters.volume !== undefined) payload = `VOL:${parameters.volume}`;

    if (nodeId) mqttService.publish(`${TOPIC_PREFIX}/${nodeId}/${device}`, payload, { qos: 1 });
    mqttService.publish(`${TOPIC_PREFIX}/${device}`, payload, { qos: 1 });
    supabaseService.writeActionLog(null, `[Voice AI] ${action} ${device} ${JSON.stringify(parameters)}`, null, null, nodeId, 'voice_command').catch(() => {});
    logger.success(`⚡ [Voice AI] ${device} -> ${payload}`);
  }
}

// ── 5. HTTP Handler & Router chung cho cả Port 5000 và 8001 ──
async function handleHttpRequest(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const url = req.url || '';
  const send = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };

  if (url === '/voice/health' || url === '/health' || url === '/docs') {
    return send(200, { voice_service: 'running', engine: 'Node.js Native AI (Groq + Gemini)', port: VOICE_PORT, ready: true });
  }

  // Nhận Audio từ ESP32 hoặc Web
  if (req.method === 'POST' && (url.includes('/audio') || url.includes('/verify_and_execute'))) {
    try {
      const wav = await parseMultipartBuffer(req);
      if (!wav || wav.length < 50) return send(400, { status: 'error', error: 'Audio trống' });
      const t0 = Date.now();
      const transcript = await transcribeAudio(wav);
      if (!transcript) return send(200, { status: 'ignored', transcript: '', commands: [] });
      let commands = parseRuleBased(transcript);
      if (!commands.length && GEMINI_API_KEY) commands = await parseWithGemini(transcript);
      if (commands.length) await executeCommands(commands);
      return send(200, { status: 'success', transcript, commands, latency_ms: Date.now() - t0 });
    } catch (e) { return send(500, { status: 'error', error: e.message }); }
  }

  // Nhận Lệnh Text từ Web
  if (req.method === 'POST' && url.includes('/command')) {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      const text = JSON.parse(body || '{}').text || '';
      let commands = parseRuleBased(text);
      if (!commands.length && GEMINI_API_KEY) commands = await parseWithGemini(text);
      if (commands.length) await executeCommands(commands);
      return send(200, { status: 'success', transcript: text, commands });
    });
    return;
  }
  send(404, { status: 'not_found' });
}

function startVoiceService() {
  if (httpServer) return;
  httpServer = http.createServer(handleHttpRequest);
  httpServer.listen(VOICE_PORT, () => {
    isReady = true;
    logger.success(`[VoiceService] Voice  ${VOICE_PORT}`);
  });
  httpServer.on('error', () => { isReady = true; });
}

function stopVoiceService() {
  if (httpServer) { httpServer.close(); httpServer = null; isReady = false; }
}

module.exports = {
  start: startVoiceService,
  stop: stopVoiceService,
  handleHttpRequest,
  checkHealth: async () => isReady,
  get isReady() { return isReady; },
  get port() { return VOICE_PORT; }
};
