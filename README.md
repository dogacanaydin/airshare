# AirShare

A self-hosted, WebRTC-based file sharing application that works like AirDrop. Share files instantly between Windows, iOS, macOS, Android, and Linux devices on your local network.

![AirShare](public/icons/icon-192.png)

## Features

- 🚀 **Peer-to-peer transfers** - Files go directly between devices, not through a server
- 🔒 **Secure** - WebRTC encryption for all transfers
- 📱 **Cross-platform** - Works on any device with a modern browser
- 📲 **PWA support** - Install as an app on iOS, macOS, Windows, and Android
- 🌙 **Beautiful dark UI** - Modern, responsive design
- 🔌 **Self-hosted** - Your data stays on your network
- 📦 **Multiple file support** - Automatically zips multiple files for easy transfer
- ⚡ **Smart device selection** - Auto-selects when only one device is available
- 📊 **Transfer progress** - Real-time file loading and transfer indicators

## Recent Improvements

- ✨ **Automatic ZIP creation** - Multiple files are automatically zipped together for seamless transfer
- 🔄 **Enhanced loading indicators** - Visual feedback during file preparation and zipping
- 🎯 **Smart single-device mode** - Automatically selects the target device when only one is available
- 🐛 **Platform fixes** - Improved reliability for Windows and iOS Safari file transfers
- 📚 **Developer documentation** - Added comprehensive [CLAUDE.MD](CLAUDE.MD) guide for contributors

## Quick Start with Docker

### 1. Clone or copy the files to your server

```bash
# Copy the airshare folder to your server
scp -r airshare user@your-server:/opt/
```

### 2. Build and run with Docker Compose

```bash
cd /opt/airshare
docker-compose up -d
```

### 3. Access the app

Open `http://your-server-ip:3000` in your browser.

## Deployment Options

### Option A: Docker Compose (Recommended)

```bash
docker-compose up -d
```

### Option B: Docker Run

```bash
docker build -t airshare .
docker run -d -p 3000:3000 --name airshare airshare
```

### Option C: Node.js directly

```bash
npm install
npm start
```

## HTTPS Setup (Recommended for PWA)

For the PWA to work properly on iOS/macOS, you'll need HTTPS. Here are some options:

### Using a Reverse Proxy (Recommended)

If you're using Traefik, Nginx Proxy Manager, or Caddy, add AirShare as a service.

**Example Nginx config:**

```nginx
server {
    listen 443 ssl http2;
    server_name airshare.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Example Caddy config:**

```
airshare.yourdomain.com {
    reverse_proxy localhost:3000
}
```

### Using Tailscale HTTPS

If you're using Tailscale, you can enable HTTPS:

```bash
tailscale cert airshare.your-tailnet.ts.net
```

## Installing as a PWA

### iOS (Safari)
1. Open AirShare in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Tap "Add"

### macOS (Safari/Chrome)
1. Open AirShare in Safari or Chrome
2. Click the share/install icon in the address bar
3. Select "Install" or "Add to Dock"

### Windows (Chrome/Edge)
1. Open AirShare in Chrome or Edge
2. Click the install icon in the address bar
3. Click "Install"

### Android (Chrome)
1. Open AirShare in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home screen"

## How It Works

1. **Discovery**: When you open AirShare, it connects to the signaling server and registers your device
2. **Selection**: Select the device you want to send files to (or it auto-selects if there's only one)
3. **File Preparation**: Drop or select files - multiple files are automatically zipped together
4. **Transfer Request**: The recipient gets a notification with file details
5. **Accept**: The recipient accepts the transfer
6. **Direct Transfer**: Files transfer directly between devices via encrypted WebRTC DataChannel

## Network Requirements

- All devices must be on the same network (or have network access to the server)
- WebRTC uses STUN servers for NAT traversal
- For transfers across different networks, you may need a TURN server

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `production` | Environment mode |

### Docker Compose with Traefik

```yaml
version: '3.8'

services:
  airshare:
    build: .
    container_name: airshare
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.airshare.rule=Host(`airshare.yourdomain.com`)"
      - "traefik.http.routers.airshare.entrypoints=websecure"
      - "traefik.http.routers.airshare.tls.certresolver=letsencrypt"
      - "traefik.http.services.airshare.loadbalancer.server.port=3000"
    networks:
      - traefik

networks:
  traefik:
    external: true
```

## Troubleshooting

### Files not transferring
- Ensure both devices are on the same network
- Check browser console for WebRTC errors
- Try refreshing both devices

### Can't install as PWA
- HTTPS is required for PWA installation on iOS/macOS
- Check that manifest.json is loading correctly

### Connection keeps dropping
- Check your network stability
- Increase the keepalive interval in app.js if needed

## Security Considerations

- AirShare is designed for use on trusted local networks
- All WebRTC data channels are encrypted by default
- The signaling server only relays connection metadata, not file contents
- Consider adding authentication if exposing to the internet

## For Developers

Want to contribute or understand how AirShare works under the hood? Check out [CLAUDE.MD](CLAUDE.MD) for:
- Detailed architecture overview
- File structure and key components
- Development workflow and common tasks
- WebRTC implementation details
- Deployment guides and troubleshooting tips

### Quick Development Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd airshare

# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Access at http://localhost:3000
```

## License

MIT License - feel free to modify and self-host!

## Credits

Built with:
- Node.js + Express
- WebSocket (ws)
- WebRTC DataChannels
- Modern CSS with CSS Variables
- Claude Code.
