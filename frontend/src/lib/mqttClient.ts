import mqtt, { type MqttClient } from "mqtt";

const DEFAULT_BROKER = "wss://broker.hivemq.com:8884/mqtt";
const DEFAULT_PREFIX = "buivansang_iot_pj";

const BROKER_WS_URL = typeof window !== "undefined"
  ? window.localStorage.getItem("sh-mqtt-broker") || DEFAULT_BROKER
  : DEFAULT_BROKER;

const TOPIC_PREFIX = typeof window !== "undefined"
  ? window.localStorage.getItem("sh-mqtt-prefix") || DEFAULT_PREFIX
  : DEFAULT_PREFIX;

/* -------------------- 1. Mapping Topic Thiết Bị -------------------- */
const DEVICE_TOPIC_MAP: Record<string, { ctrl: string; auto: string }> = {
  quat: { ctrl: "led2", auto: "automode2" },
  den: { ctrl: "led3", auto: "automode3" },
  rem_cua: { ctrl: "curtain", auto: "automode_curtain" },
  tivi: { ctrl: "tv", auto: "automode_tv" },
};

export function getDeviceMqttTopic(
  loaiThietBi: string,
  nodeId?: string
): { ctrl: string; auto: string } | null {
  const map = DEVICE_TOPIC_MAP[loaiThietBi];
  if (!map) return null;
  const prefix = nodeId ? `${TOPIC_PREFIX}/${nodeId}` : TOPIC_PREFIX;
  return { ctrl: `${prefix}/${map.ctrl}`, auto: `${prefix}/${map.auto}` };
}

const PROPERTY_SUBTOPICS: Record<string, string> = {
  "quat.speed": "quat/speed",
  "den.brightness": "den/brightness",
  "rem_cua.position": "rem_cua/pos",
};

export function publishDeviceProperty(
  loaiThietBi: string,
  prop: "speed" | "brightness" | "position",
  val: number | string,
  nodeId?: string
) {
  const subtopic = PROPERTY_SUBTOPICS[`${loaiThietBi}.${prop}`];
  if (!subtopic) return;
  const strVal = String(val);
  if (nodeId) mqttPublish(`${TOPIC_PREFIX}/${nodeId}/${subtopic}`, strVal);
  mqttPublish(`${TOPIC_PREFIX}/${subtopic}`, strVal);
}

/* -------------------- 2. Quản Lý Kết Nối Singleton -------------------- */
let _client: MqttClient | null = null;
let _connectPromise: Promise<MqttClient> | null = null;
let _connected = false;

export type ConnectionStatus = "connecting" | "online" | "offline";
type StatusListener = (status: ConnectionStatus) => void;
const _listeners = new Set<StatusListener>();
let _currentStatus: ConnectionStatus = "connecting";

function _notify(status: ConnectionStatus) {
  _currentStatus = status;
  _listeners.forEach((fn) => fn(status));
}

export function onMqttStatus(fn: StatusListener): () => void {
  _listeners.add(fn);
  fn(_currentStatus);
  return () => _listeners.delete(fn);
}

function createClient(): Promise<MqttClient> {
  if (_connectPromise) return _connectPromise;

  _connectPromise = new Promise((resolve) => {
    _notify("connecting");
    const client = mqtt.connect(BROKER_WS_URL, {
      clientId: `smarthome-web-${Math.random().toString(36).slice(2, 8)}`,
      clean: true,
      connectTimeout: 8000,
      reconnectPeriod: 3000,
      keepalive: 60,
    });

    client.on("connect", () => {
      _connected = true;
      _notify("online");
      console.info("[MQTT]  Đã kết nối WebSocket tới broker.");
      resolve(client);
    });

    client.on("reconnect", () => _notify("connecting"));
    client.on("close", () => { _connected = false; _notify("offline"); });
    client.on("offline", () => { _connected = false; _notify("offline"); });
    client.on("error", (err) => {
      _connected = false;
      _notify("offline");
      console.error("[MQTT] Lỗi kết nối:", err.message);
    });

    _client = client;

    // Timeout dự phòng sau 8s để không block UI nếu broker phản hồi chậm
    setTimeout(() => {
      if (!_connected) resolve(client);
    }, 8000);
  });

  return _connectPromise;
}

export async function initMqttClient(): Promise<void> {
  await createClient();
}

/* -------------------- 3. Gửi Lệnh Điều Khiển -------------------- */
export async function mqttPublish(
  topic: string,
  payload: string,
  qos: 0 | 1 = 0
): Promise<void> {
  try {
    const client = await createClient();
    client.publish(topic, payload, { qos, retain: false }, (err) => {
      if (err) console.error(`[MQTT] Lỗi publish ${topic}:`, err.message);
      else console.info(`[MQTT]  ${topic} = "${payload}"`);
    });
  } catch (err) {
    console.error("[MQTT] Publish thất bại:", err);
  }
}

export function isMqttConnected(): boolean {
  return _connected && (_client?.connected ?? false);
}
