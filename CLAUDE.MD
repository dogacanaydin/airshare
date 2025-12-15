# AirShare - Project Guide for Claude

## Project Overview

AirShare is a self-hosted, WebRTC-based peer-to-peer file sharing application that works like AirDrop across all platforms (Windows, iOS, macOS, Android, Linux). Files transfer directly between devices without going through a server, using WebRTC DataChannels for encrypted, direct transfers.

**Key Technologies:**
- Node.js + Express (backend/signaling server)
- WebSocket (ws) for device discovery and signaling
- WebRTC DataChannels for P2P file transfers
- Progressive Web App (PWA) with service worker
- Vanilla JavaScript (no frameworks)

## Architecture

### High-Level Flow
1. **Discovery**: Devices connect to WebSocket signaling server and register
2. **Signaling**: Server maintains device list and relays WebRTC offer/answer/ICE candidates
3. **P2P Connection**: Devices establish direct WebRTC connection
4. **Transfer**: Files transfer directly via WebRTC DataChannel (encrypted)

### Components

**Backend (server.js)**
- Express server serving static files
- WebSocket server for signaling and device discovery
- Device management (Map of connected devices)
- Message routing between peers

**Frontend**
- `public/index.html` - Single-page application UI
- `public/app.js` - Client-side WebRTC logic, file handling, UI interactions
- `public/sw.js` - Service worker for PWA functionality
- `public/manifest.json` - PWA manifest
- `public/styles.css` - Dark theme UI styles

## File Structure

```
/home/user/airshare/
├── server.js              # WebSocket signaling server
├── package.json           # Dependencies and scripts
├── Dockerfile             # Container build config
├── docker-compose.yml     # Docker deployment config
├── generate-icons.js      # PWA icon generator
├── public/
│   ├── index.html        # Main application UI
│   ├── app.js            # Client WebRTC + UI logic
│   ├── sw.js             # Service worker
│   ├── manifest.json     # PWA manifest
│   ├── styles.css        # Application styles
│   └── icons/            # PWA icons
└── README.md             # User documentation
```

## Key Files Deep Dive

### server.js
- **Lines 23**: `devices` Map stores connected clients
- **Lines 26-35**: Device icon detection from User-Agent
- **Lines 38-52**: `broadcastDevices()` sends device list to all clients
- **Lines 54-142**: WebSocket connection handler
  - Handles: register, offer, answer, ice-candidate, disconnect
  - Routes WebRTC signaling between peers

### public/app.js
- WebSocket connection management
- WebRTC peer connection setup
- File chunking and transfer logic
- Drag-and-drop file handling
- UI state management
- Device list rendering
- Transfer progress tracking

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Start dev server with auto-reload
npm run dev

# Or standard start
npm start
```

Server runs on `http://localhost:3000`

### Making Changes

**Backend Changes (server.js)**
- Modify WebSocket message handlers
- Update device management logic
- Add new signaling message types
- Server auto-reloads with `npm run dev`

**Frontend Changes (public/)**
- `app.js` - WebRTC logic, file handling, UI
- `index.html` - Structure and layout
- `styles.css` - Styling (uses CSS variables for theming)
- Hard refresh (Ctrl+Shift+R) to bypass service worker cache

**Service Worker Changes (public/sw.js)**
- ⚠️ **CRITICAL**: Update VERSION constant whenever app.js changes
- The VERSION in sw.js MUST match the version in app.js comments
- Modify caching strategy
- Users need to close all tabs and reopen

## Common Tasks

### Adding a New Message Type

1. **Server-side** (server.js):
```javascript
// In WebSocket message handler
case 'new-message-type':
  // Handle the message
  break;
```

2. **Client-side** (public/app.js):
```javascript
// In WebSocket message handler
case 'new-message-type':
  // Handle the response
  break;
```

### Modifying File Transfer Logic

- File chunking: Look for `CHUNK_SIZE` constant in app.js
- Transfer progress: Search for `onprogress` handlers
- Error handling: Check `onerror` and `oniceconnectionstatechange`

### Updating UI

- Device cards: Search for `renderDeviceList()` in app.js
- Notifications: Look for notification-related functions
- Styling: CSS variables defined in `:root` in styles.css

### Testing WebRTC

- Open in two browser tabs/windows (use incognito for separate sessions)
- Check browser console for WebRTC state logs
- Monitor Network tab for WebSocket messages
- Use `chrome://webrtc-internals/` for detailed WebRTC debugging

## Deployment

### Docker (Recommended)

```bash
# Build and run with compose
docker-compose up -d

# Or with docker directly
docker build -t airshare .
docker run -d -p 3000:3000 airshare
```

### HTTPS Setup

**Required for:**
- PWA installation on iOS/macOS
- WebRTC on some networks
- Secure context APIs

**Options:**
1. Reverse proxy (Nginx, Caddy, Traefik) - See README
2. Tailscale HTTPS certificates
3. Let's Encrypt with Certbot

## Common Issues & Solutions

### Files Not Transferring
- Check browser console for WebRTC errors
- Verify both devices see each other in device list
- Check ICE connection state
- May need TURN server for cross-network transfers

### WebSocket Connection Failing
- Verify server is running on correct port
- Check firewall rules
- Ensure WebSocket upgrade headers are passed through proxy

### Service Worker Cache Issues

**⚠️ IMPORTANT: Version Update Checklist**

When updating the app, ALWAYS follow these steps:
1. Update version comment in `public/app.js` (Line 3)
2. Update VERSION constant in `public/sw.js` (Line 3)
3. Ensure both versions match (e.g., both say 1.0.4)
4. Commit both files together

**Why this matters:**
- The service worker uses VERSION to create cache names (e.g., `airshare-v1.0.4`)
- Mismatched versions cause old cached versions to be served
- Users will see outdated/broken versions without a hard refresh

**Troubleshooting:**
- Update version in sw.js
- Hard refresh (Ctrl+Shift+R)
- Clear site data in DevTools
- Close all tabs and reopen
- Check console for `[SW] Installing version X.X.X` logs

### PWA Not Installing
- Requires HTTPS (except localhost)
- Check manifest.json is loading
- Verify service worker registered successfully
- Check browser console for manifest errors

## Dependencies

**Runtime:**
- `express` ^4.18.2 - Web server
- `ws` ^8.16.0 - WebSocket server
- `uuid` ^9.0.1 - Device ID generation

**Dev:**
- `sharp` ^0.34.5 - Icon generation

**Minimum Node.js:** 18.0.0

## Code Style & Conventions

- Use clear, descriptive variable names
- WebSocket messages use type-based routing
- WebRTC follows standard offer/answer pattern
- Error handling with try-catch and error events
- Comments for complex WebRTC state management
- CSS uses BEM-like naming for components

## Security Considerations

- WebRTC DataChannels are encrypted by default
- Designed for trusted local networks
- Signaling server only relays metadata, not file contents
- No authentication by default (add if exposing to internet)
- Consider rate limiting for production use

## Future Enhancement Ideas

- Multiple file selection (currently implemented with auto-zip)
- Transfer history
- Authentication/authorization
- TURN server configuration for NAT traversal
- File preview before accepting
- Resume interrupted transfers
- QR code for easy device pairing

## Git Workflow

- Main branch for stable releases
- Feature branches: `claude/feature-name-{sessionId}`
- Commit frequently with clear messages
- Push to designated feature branch before creating PR

## Useful Commands

```bash
# View logs
docker-compose logs -f

# Restart service
docker-compose restart

# Rebuild after changes
docker-compose up -d --build

# Check WebSocket connections
# Look for upgrade requests in server logs
```

## Resources

- [WebRTC API Docs](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [WebSocket Protocol](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

## Contact & Support

- Issues: GitHub Issues
- Built with Claude Code
- MIT License
