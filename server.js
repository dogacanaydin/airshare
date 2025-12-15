const express = require('express');
const { WebSocketServer } = require('ws');
const { createServer } = require('http');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Disable caching for development
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Store connected devices
const devices = new Map();

// Device icons based on platform
const getDeviceIcon = (userAgent) => {
  const ua = userAgent.toLowerCase();
  if (ua.includes('iphone')) return 'iphone';
  if (ua.includes('ipad')) return 'ipad';
  if (ua.includes('mac')) return 'mac';
  if (ua.includes('windows')) return 'windows';
  if (ua.includes('android')) return 'android';
  if (ua.includes('linux')) return 'linux';
  return 'device';
};

// Broadcast device list to all connected clients
const broadcastDevices = () => {
  const deviceList = Array.from(devices.values()).map(d => ({
    id: d.id,
    name: d.name,
    icon: d.icon,
    online: true
  }));

  const message = JSON.stringify({
    type: 'devices',
    devices: deviceList
  });

  devices.forEach(device => {
    if (device.ws.readyState === 1) {
      device.ws.send(message);
    }
  });
};

wss.on('connection', (ws, req) => {
  const deviceId = uuidv4();
  const userAgent = req.headers['user-agent'] || '';
  
  console.log(`Device connected: ${deviceId}`);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'register':
          // Register new device
          devices.set(deviceId, {
            id: deviceId,
            name: message.name || 'Unknown Device',
            icon: getDeviceIcon(userAgent),
            ws: ws
          });
          
          // Send back the device ID
          ws.send(JSON.stringify({
            type: 'registered',
            id: deviceId
          }));
          
          // Broadcast updated device list
          broadcastDevices();
          break;

        case 'offer':
        case 'answer':
        case 'ice-candidate':
          // Relay WebRTC signaling messages to target device
          const targetDevice = devices.get(message.target);
          if (targetDevice && targetDevice.ws.readyState === 1) {
            targetDevice.ws.send(JSON.stringify({
              type: message.type,
              from: deviceId,
              data: message.data,
              fileName: message.fileName,
              fileSize: message.fileSize,
              fileType: message.fileType,
              fileCount: message.fileCount
            }));
          }
          break;

        case 'transfer-accept':
        case 'transfer-reject':
          // Relay transfer response to sender
          const senderDevice = devices.get(message.target);
          if (senderDevice && senderDevice.ws.readyState === 1) {
            senderDevice.ws.send(JSON.stringify({
              type: message.type,
              from: deviceId
            }));
          }
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });

  ws.on('close', () => {
    console.log(`Device disconnected: ${deviceId}`);
    devices.delete(deviceId);
    broadcastDevices();
  });

  ws.on('error', (err) => {
    console.error(`WebSocket error for ${deviceId}:`, err);
    devices.delete(deviceId);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', devices: devices.size });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`AirShare server running on port ${PORT}`);
});
