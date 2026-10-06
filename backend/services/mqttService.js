'use strict';
const mqtt = require('mqtt');
const { mqttBrokerUrl, mqttPort, TOPIC_PREFIX, TOPICS } = require('../config/config');
const logger = require('../utils/logger');

let client = null;

const mqttService = {
  connect(onMessageCallback, onConnectCallback) {
    if (client) { client.removeAllListeners(); client.end(true); client = null; }

    const opts = {
      port: mqttPort,
      clientId: process.env.MQTT_CLIENT_ID || `backend_${Math.random().toString(16).slice(2, 8)}`,
      reconnectPeriod: parseInt(process.env.MQTT_RECONNECT_MS || '3000', 10),
      connectTimeout: parseInt(process.env.MQTT_TIMEOUT_MS || '10000', 10),
      clean: true
    };
    if (process.env.MQTT_USERNAME) opts.username = process.env.MQTT_USERNAME;
    if (process.env.MQTT_PASSWORD) opts.password = process.env.MQTT_PASSWORD;

    logger.info(`Đang kết nối đến MQTT Broker: ${mqttBrokerUrl}:${mqttPort}...`);
    client = mqtt.connect(mqttBrokerUrl, opts);

    client.on('connect', () => {
      logger.success('Kết nối thành công đến MQTT Broker!');
      const subs = [
        TOPICS.TEMP_WILDCARD, TOPICS.HUM_WILDCARD, TOPICS.LUX_WILDCARD,
        TOPICS.SENSORS_WILDCARD, TOPICS.HEARTBEAT, TOPICS.ALERT_WILDCARD,
        TOPICS.ALL_DEVICE_STATES,             // {prefix}/+/+/state (2 cấp)
        `${TOPIC_PREFIX}/+/+/+/state`,        // {prefix}/+/+/+/state (3 cấp: brightness, speed, pos)
        TOPICS.WIFI_POWER_WILDCARD,           // {prefix}/+/wifi/power/state
        `${TOPIC_PREFIX}/+/state`,            // {prefix}/+/state (legacy 1 cấp)
        TOPICS.IR_RECEIVE_WILDCARD, TOPICS.SCENE_WILDCARD, TOPICS.SCENE_GLOBAL
      ].filter(Boolean);

      client.subscribe(subs, (err) => {
        if (err) logger.error('Lỗi khi subscribe các topic:', err.message);
        else logger.info('Đã subscribe thành công các topic:', subs);
      });
      if (onConnectCallback) onConnectCallback();
    });

    client.on('message', (topic, payload) => {
      try {
        const val = payload.toString().trim();
        onMessageCallback(topic, val);
      } catch (err) { logger.error(`Lỗi xử lý MQTT message [${topic}]:`, err.message); }
    });

    client.on('reconnect', () => logger.warn('Đang thử kết nối lại với MQTT Broker...'));
    client.on('offline', () => logger.error('Mất kết nối với MQTT Broker!'));
    client.on('error', (err) => logger.error('Lỗi kết nối MQTT:', err.message));
    return client;
  },

  publish(topic, payload, options = { qos: 1 }) {
    return new Promise((resolve) => {
      if (!client?.connected) {
        logger.error(`Không thể publish lên topic ${topic} (MQTT offline)`);
        return resolve(false);
      }
      const str = typeof payload === 'object' && payload !== null ? JSON.stringify(payload) : String(payload ?? '');
      client.publish(topic, str, options, (err) => {
        if (err) { logger.error(`Lỗi khi publish lên ${topic}:`, err.message); return resolve(false); }
        resolve(true);
      });
    });
  },

  close() {
    if (client) {
      logger.info('Đang ngắt kết nối MQTT Client...');
      client.end(false, () => { client = null; });
    }
  },

  isConnected() {
    return client ? client.connected : false;
  }
};

module.exports = mqttService;
