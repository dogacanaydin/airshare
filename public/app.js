// AirShare - WebRTC File Transfer Application
// Auto-select single device feature

class AirShare {
    constructor() {
        this.ws = null;
        this.myDeviceId = null;
        this.myDeviceName = this.getStoredDeviceName();
        this.devices = [];
        this.selectedDevice = null;
        this.peerConnection = null;
        this.dataChannel = null;
        this.pendingFiles = [];
        this.isTransferring = false;
        this.transferStats = {
            startTime: 0,
            totalBytes: 0,
            sentBytes: 0
        };

        this.init();
    }

    init() {
        this.setupWebSocket();
        this.setupUI();
        this.setupDragDrop();
        this.registerServiceWorker();
    }

    getStoredDeviceName() {
        const stored = localStorage.getItem('deviceName');
        if (stored) return stored;

        // Generate default name based on platform
        const platform = this.detectPlatform();
        return `${platform} Device`;
    }

    detectPlatform() {
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('iphone')) return 'iPhone';
        if (ua.includes('ipad')) return 'iPad';
        if (ua.includes('mac')) return 'Mac';
        if (ua.includes('windows')) return 'Windows';
        if (ua.includes('android')) return 'Android';
        if (ua.includes('linux')) return 'Linux';
        return 'Unknown';
    }

    setupWebSocket() {
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${location.host}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.updateStatus('connected', 'Connected');
            this.register();
        };

        this.ws.onmessage = (event) => {
            this.handleMessage(JSON.parse(event.data));
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.updateStatus('disconnected', 'Disconnected');
            setTimeout(() => this.setupWebSocket(), 3000);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.updateStatus('error', 'Connection error');
        };
    }

    register() {
        this.send({
            type: 'register',
            name: this.myDeviceName
        });
    }

    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    handleMessage(message) {
        console.log('Received message:', message.type);

        switch (message.type) {
            case 'registered':
                this.myDeviceId = message.id;
                console.log('Device registered:', this.myDeviceId);
                break;

            case 'devices':
                this.updateDevicesList(message.devices);
                break;

            case 'offer':
                this.handleOffer(message);
                break;

            case 'answer':
                this.handleAnswer(message);
                break;

            case 'ice-candidate':
                this.handleIceCandidate(message);
                break;

            case 'transfer-accept':
                this.handleTransferAccept();
                break;

            case 'transfer-reject':
                this.handleTransferReject();
                break;
        }
    }

    updateDevicesList(devices) {
        // Filter out this device
        this.devices = devices.filter(d => d.id !== this.myDeviceId);

        const noDevices = document.getElementById('noDevices');
        const devicesList = document.getElementById('devicesList');
        const dropArea = document.getElementById('dropArea');
        const devicesContainer = document.getElementById('devicesContainer');

        if (this.devices.length === 0) {
            noDevices.style.display = 'block';
            devicesList.style.display = 'none';
            dropArea.style.display = 'none';
            this.selectedDevice = null;
        } else {
            noDevices.style.display = 'none';

            // AUTO-SELECT LOGIC: If only one device, automatically select it
            if (this.devices.length === 1 && !this.selectedDevice) {
                this.selectedDevice = this.devices[0];
                console.log('Auto-selected single device:', this.selectedDevice.name);
                this.showDropArea();
                this.showToast(`Ready to send files to ${this.selectedDevice.name}`);
            } else {
                // Show device list for manual selection
                devicesList.style.display = 'block';
                dropArea.style.display = 'none';
                devicesContainer.innerHTML = '';

                this.devices.forEach(device => {
                    const deviceCard = this.createDeviceCard(device);
                    devicesContainer.appendChild(deviceCard);
                });
            }
        }
    }

    createDeviceCard(device) {
        const card = document.createElement('div');
        card.className = 'device-card';
        card.onclick = () => this.selectDevice(device);

        const icon = this.getDeviceIcon(device.icon);

        card.innerHTML = `
            <div class="device-icon">${icon}</div>
            <div class="device-info">
                <h3>${device.name}</h3>
                <p>${this.capitalize(device.icon)}</p>
            </div>
            <div class="device-status ${device.online ? 'online' : 'offline'}">
                ${device.online ? '●' : '○'}
            </div>
        `;

        return card;
    }

    getDeviceIcon(type) {
        const icons = {
            'iphone': '📱',
            'ipad': '📱',
            'mac': '💻',
            'windows': '🖥️',
            'android': '📱',
            'linux': '🖥️',
            'device': '📟'
        };
        return icons[type] || icons['device'];
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    selectDevice(device) {
        this.selectedDevice = device;
        console.log('Selected device:', device.name);
        this.showDropArea();
    }

    showDropArea() {
        document.getElementById('devicesList').style.display = 'none';
        document.getElementById('dropArea').style.display = 'flex';
    }

    setupUI() {
        const deviceNameInput = document.getElementById('deviceName');
        const editBtn = document.getElementById('editDeviceName');
        const selectFilesBtn = document.getElementById('selectFiles');
        const fileInput = document.getElementById('fileInput');
        const acceptBtn = document.getElementById('acceptTransfer');
        const rejectBtn = document.getElementById('rejectTransfer');
        const cancelBtn = document.getElementById('cancelTransfer');

        deviceNameInput.value = this.myDeviceName;
        deviceNameInput.disabled = true;

        editBtn.onclick = () => {
            if (deviceNameInput.disabled) {
                deviceNameInput.disabled = false;
                deviceNameInput.focus();
                deviceNameInput.select();
            } else {
                this.updateDeviceName(deviceNameInput.value);
            }
        };

        deviceNameInput.onblur = () => {
            this.updateDeviceName(deviceNameInput.value);
        };

        deviceNameInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                this.updateDeviceName(deviceNameInput.value);
            }
        };

        selectFilesBtn.onclick = () => fileInput.click();
        fileInput.onchange = (e) => this.handleFiles(Array.from(e.target.files));

        acceptBtn.onclick = () => this.acceptTransfer();
        rejectBtn.onclick = () => this.rejectTransfer();
        cancelBtn.onclick = () => this.cancelTransfer();
    }

    updateDeviceName(name) {
        if (name && name.trim() && name !== this.myDeviceName) {
            this.myDeviceName = name.trim();
            localStorage.setItem('deviceName', this.myDeviceName);
            document.getElementById('deviceName').value = this.myDeviceName;
            this.register();
        }
        document.getElementById('deviceName').disabled = true;
    }

    setupDragDrop() {
        const dropArea = document.getElementById('dropArea');

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.remove('drag-over');
            });
        });

        dropArea.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files);
            this.handleFiles(files);
        });
    }

    handleFiles(files) {
        if (!this.selectedDevice) {
            this.showToast('Please select a device first');
            return;
        }

        if (files.length === 0) return;

        this.pendingFiles = files;
        this.initiateTransfer();
    }

    async initiateTransfer() {
        try {
            this.createPeerConnection();

            // Create data channel
            this.dataChannel = this.peerConnection.createDataChannel('fileTransfer', {
                ordered: true
            });

            this.setupDataChannel();

            // Create and send offer
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

            const fileInfo = this.getFilesInfo();

            this.send({
                type: 'offer',
                target: this.selectedDevice.id,
                data: offer,
                fileName: fileInfo.names,
                fileSize: fileInfo.totalSize,
                fileType: fileInfo.types,
                fileCount: this.pendingFiles.length
            });

            this.showToast('Sending transfer request...');
        } catch (error) {
            console.error('Error initiating transfer:', error);
            this.showToast('Failed to initiate transfer');
        }
    }

    getFilesInfo() {
        const totalSize = this.pendingFiles.reduce((sum, file) => sum + file.size, 0);
        const names = this.pendingFiles.map(f => f.name).join(', ');
        const types = this.pendingFiles.map(f => f.type || 'application/octet-stream').join(', ');

        return { totalSize, names, types };
    }

    createPeerConnection() {
        const config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        this.peerConnection = new RTCPeerConnection(config);

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.send({
                    type: 'ice-candidate',
                    target: this.selectedDevice.id,
                    data: event.candidate
                });
            }
        };

        this.peerConnection.ondatachannel = (event) => {
            this.dataChannel = event.channel;
            this.setupDataChannel();
        };

        this.peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', this.peerConnection.connectionState);
            if (this.peerConnection.connectionState === 'failed') {
                this.showToast('Connection failed');
                this.cleanupTransfer();
            }
        };
    }

    setupDataChannel() {
        this.dataChannel.onopen = () => {
            console.log('Data channel opened');
            if (this.pendingFiles.length > 0) {
                this.sendFiles();
            }
        };

        this.dataChannel.onmessage = (event) => {
            this.handleDataChannelMessage(event.data);
        };

        this.dataChannel.onclose = () => {
            console.log('Data channel closed');
        };

        this.dataChannel.onerror = (error) => {
            console.error('Data channel error:', error);
            this.showToast('Transfer error');
            this.cleanupTransfer();
        };
    }

    async handleOffer(message) {
        this.selectedDevice = this.devices.find(d => d.id === message.from);

        // Show transfer request modal
        document.getElementById('modalDeviceName').textContent = this.selectedDevice.name;
        document.getElementById('modalFileInfo').textContent =
            `${message.fileCount} file(s) • ${this.formatSize(message.fileSize)}`;
        document.getElementById('transferModal').style.display = 'flex';

        // Store offer for later acceptance
        this.pendingOffer = message.data;
    }

    async acceptTransfer() {
        document.getElementById('transferModal').style.display = 'none';

        try {
            this.createPeerConnection();
            await this.peerConnection.setRemoteDescription(this.pendingOffer);

            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            this.send({
                type: 'answer',
                target: this.selectedDevice.id,
                data: answer
            });

            this.showTransferProgress('Receiving files...', this.selectedDevice.name);
        } catch (error) {
            console.error('Error accepting transfer:', error);
            this.showToast('Failed to accept transfer');
        }
    }

    rejectTransfer() {
        document.getElementById('transferModal').style.display = 'none';

        this.send({
            type: 'transfer-reject',
            target: this.selectedDevice.id
        });

        this.showToast('Transfer declined');
    }

    async handleAnswer(message) {
        try {
            await this.peerConnection.setRemoteDescription(message.data);
            this.showTransferProgress('Sending files...', this.selectedDevice.name);
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    }

    async handleIceCandidate(message) {
        try {
            await this.peerConnection.addIceCandidate(message.data);
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    }

    handleTransferAccept() {
        console.log('Transfer accepted');
        this.send({
            type: 'transfer-accept',
            target: this.selectedDevice.id
        });
    }

    handleTransferReject() {
        this.showToast('Transfer was declined');
        this.cleanupTransfer();
    }

    async sendFiles() {
        this.isTransferring = true;
        this.transferStats.startTime = Date.now();
        this.transferStats.sentBytes = 0;
        this.transferStats.totalBytes = this.pendingFiles.reduce((sum, f) => sum + f.size, 0);

        const CHUNK_SIZE = 16384; // 16KB chunks

        for (let i = 0; i < this.pendingFiles.length; i++) {
            const file = this.pendingFiles[i];

            // Send file metadata
            const metadata = {
                type: 'file-start',
                name: file.name,
                size: file.size,
                mimeType: file.type,
                index: i,
                total: this.pendingFiles.length
            };

            this.dataChannel.send(JSON.stringify(metadata));

            // Send file in chunks
            const reader = new FileReader();
            let offset = 0;

            while (offset < file.size) {
                const chunk = file.slice(offset, offset + CHUNK_SIZE);
                const arrayBuffer = await this.readChunk(chunk);

                // Wait if buffer is full
                while (this.dataChannel.bufferedAmount > CHUNK_SIZE * 10) {
                    await this.sleep(10);
                }

                this.dataChannel.send(arrayBuffer);
                offset += arrayBuffer.byteLength;
                this.transferStats.sentBytes += arrayBuffer.byteLength;

                this.updateTransferProgress();
            }

            // Send file end marker
            this.dataChannel.send(JSON.stringify({ type: 'file-end' }));
        }

        // All files sent
        this.dataChannel.send(JSON.stringify({ type: 'transfer-complete' }));
        this.showToast('Transfer complete!');

        setTimeout(() => {
            this.cleanupTransfer();
        }, 2000);
    }

    readChunk(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    receivedFiles = [];
    currentFile = null;
    currentFileChunks = [];

    handleDataChannelMessage(data) {
        if (typeof data === 'string') {
            const message = JSON.parse(data);

            switch (message.type) {
                case 'file-start':
                    this.currentFile = {
                        name: message.name,
                        size: message.size,
                        mimeType: message.mimeType,
                        index: message.index,
                        total: message.total
                    };
                    this.currentFileChunks = [];
                    document.getElementById('transferFileName').textContent = `${message.name}`;
                    break;

                case 'file-end':
                    const blob = new Blob(this.currentFileChunks, { type: this.currentFile.mimeType });
                    this.downloadFile(blob, this.currentFile.name);
                    this.currentFile = null;
                    this.currentFileChunks = [];
                    break;

                case 'transfer-complete':
                    this.showToast('Transfer complete!');
                    setTimeout(() => {
                        this.cleanupTransfer();
                    }, 2000);
                    break;
            }
        } else {
            // Binary data chunk
            this.currentFileChunks.push(data);
            this.transferStats.sentBytes += data.byteLength;
            this.updateTransferProgress();
        }
    }

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showTransferProgress(title, deviceName) {
        document.getElementById('dropArea').style.display = 'none';
        document.getElementById('transferProgress').style.display = 'block';
        document.getElementById('transferTitle').textContent = title;
        document.getElementById('transferDevice').textContent = deviceName;
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('progressPercent').textContent = '0';
    }

    updateTransferProgress() {
        const percent = Math.round((this.transferStats.sentBytes / this.transferStats.totalBytes) * 100);
        const elapsed = (Date.now() - this.transferStats.startTime) / 1000;
        const speed = elapsed > 0 ? this.transferStats.sentBytes / elapsed : 0;

        document.getElementById('progressFill').style.width = percent + '%';
        document.getElementById('progressPercent').textContent = percent;
        document.getElementById('progressSpeed').textContent = this.formatSpeed(speed);
    }

    cancelTransfer() {
        this.cleanupTransfer();
        this.showToast('Transfer cancelled');
    }

    cleanupTransfer() {
        if (this.dataChannel) {
            this.dataChannel.close();
            this.dataChannel = null;
        }

        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        this.pendingFiles = [];
        this.isTransferring = false;
        this.transferStats = { startTime: 0, totalBytes: 0, sentBytes: 0 };

        document.getElementById('transferProgress').style.display = 'none';
        document.getElementById('fileInput').value = '';

        // Return to device selection or drop area based on device count
        if (this.devices.length === 1) {
            this.showDropArea();
        } else {
            this.selectedDevice = null;
            this.updateDevicesList(this.devices);
        }
    }

    updateStatus(state, text) {
        const statusEl = document.getElementById('status');
        const statusText = document.getElementById('statusText');

        statusEl.className = 'status ' + state;
        statusText.textContent = text;
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    formatSpeed(bytesPerSecond) {
        return this.formatSize(bytesPerSecond) + '/s';
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(err => {
                console.log('Service Worker registration failed:', err);
            });
        }
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new AirShare());
} else {
    new AirShare();
}
