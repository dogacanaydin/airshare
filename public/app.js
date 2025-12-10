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
        this.pendingIceCandidates = [];
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
        console.log('Initiating transfer to:', this.selectedDevice.name);
        console.log('Files to send:', this.pendingFiles.length);

        try {
            // Clear any pending ICE candidates from previous connections
            this.pendingIceCandidates = [];

            this.createPeerConnection();

            // Create data channel with iOS-compatible settings
            this.dataChannel = this.peerConnection.createDataChannel('fileTransfer', {
                ordered: true,
                maxRetransmits: 10
            });

            console.log('Data channel created, setting up handlers...');
            this.setupDataChannel();

            // Create and send offer
            console.log('Creating offer...');
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            console.log('Local description set, sending offer...');

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

            console.log('Offer sent to', this.selectedDevice.name);
            this.showToast('Sending transfer request...');
        } catch (error) {
            console.error('Error initiating transfer:', error);
            this.showToast('Failed to initiate transfer: ' + error.message);
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
                console.log('Sending ICE candidate');
                this.send({
                    type: 'ice-candidate',
                    target: this.selectedDevice.id,
                    data: event.candidate
                });
            } else {
                console.log('ICE gathering complete');
            }
        };

        this.peerConnection.onicegatheringstatechange = () => {
            console.log('ICE gathering state:', this.peerConnection.iceGatheringState);
        };

        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', this.peerConnection.iceConnectionState);
            const state = this.peerConnection.iceConnectionState;

            if (state === 'connected' || state === 'completed') {
                console.log('ICE connection established successfully');
            } else if (state === 'failed') {
                console.error('ICE connection failed');
                this.showToast('Connection failed - please check network and try again');
            } else if (state === 'disconnected') {
                console.warn('ICE connection disconnected');
            }
        };

        this.peerConnection.ondatachannel = (event) => {
            console.log('Data channel received');
            this.dataChannel = event.channel;
            this.setupDataChannel();
        };

        this.peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', this.peerConnection.connectionState);
            if (this.peerConnection.connectionState === 'failed') {
                this.showToast('Connection failed');
                this.cleanupTransfer();
            } else if (this.peerConnection.connectionState === 'connected') {
                console.log('Peer connection established');
            }
        };
    }

    setupDataChannel() {
        console.log('Setting up data channel, current state:', this.dataChannel.readyState);

        this.dataChannel.onopen = () => {
            console.log('Data channel opened successfully');
            console.log('Ready to transfer, pending files:', this.pendingFiles.length);
            if (this.pendingFiles.length > 0) {
                console.log('Starting file transfer...');
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

        // If already open, trigger immediately
        if (this.dataChannel.readyState === 'open') {
            console.log('Data channel already open');
            if (this.pendingFiles.length > 0) {
                this.sendFiles();
            }
        }
    }

    async handleOffer(message) {
        console.log('Received offer from:', message.from);
        console.log('File count:', message.fileCount, 'Total size:', message.fileSize);

        this.selectedDevice = this.devices.find(d => d.id === message.from);

        if (!this.selectedDevice) {
            console.error('Device not found:', message.from);
            return;
        }

        // Show transfer request modal
        document.getElementById('modalDeviceName').textContent = this.selectedDevice.name;
        document.getElementById('modalFileInfo').textContent =
            `${message.fileCount} file(s) • ${this.formatSize(message.fileSize)}`;
        document.getElementById('transferModal').style.display = 'flex';

        // Store offer for later acceptance
        this.pendingOffer = message.data;
    }

    async acceptTransfer() {
        console.log('Accepting transfer from:', this.selectedDevice.name);
        document.getElementById('transferModal').style.display = 'none';

        try {
            // Initialize receiving state
            this.isTransferring = true;
            this.transferStats.startTime = Date.now();
            this.transferStats.sentBytes = 0;
            this.transferStats.totalBytes = 0; // Will be set from file metadata
            this.currentFileChunks = [];
            this.currentFile = null;
            this.pendingIceCandidates = [];

            this.createPeerConnection();
            console.log('Setting remote description...');
            await this.peerConnection.setRemoteDescription(this.pendingOffer);
            console.log('Remote description set');

            // Add any buffered ICE candidates
            await this.addPendingIceCandidates();

            console.log('Creating answer...');
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            console.log('Local description set');

            this.send({
                type: 'answer',
                target: this.selectedDevice.id,
                data: answer
            });

            console.log('Answer sent, waiting for connection...');
            this.showTransferProgress('Receiving files...', this.selectedDevice.name);
        } catch (error) {
            console.error('Error accepting transfer:', error);
            this.showToast('Failed to accept transfer: ' + error.message);
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
        console.log('Received answer from:', message.from);
        try {
            await this.peerConnection.setRemoteDescription(message.data);
            console.log('Remote description set');

            // Add any buffered ICE candidates
            await this.addPendingIceCandidates();

            console.log('Waiting for connection...');
            this.showTransferProgress('Sending files...', this.selectedDevice.name);
        } catch (error) {
            console.error('Error handling answer:', error);
            this.showToast('Connection error: ' + error.message);
        }
    }

    async handleIceCandidate(message) {
        console.log('Received ICE candidate');
        try {
            if (!this.peerConnection) {
                console.warn('Received ICE candidate but no peer connection');
                return;
            }

            // If remote description isn't set yet, buffer the candidate
            if (!this.peerConnection.remoteDescription || !this.peerConnection.remoteDescription.type) {
                console.log('Remote description not set, buffering ICE candidate');
                this.pendingIceCandidates.push(message.data);
                return;
            }

            await this.peerConnection.addIceCandidate(message.data);
            console.log('ICE candidate added successfully');
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    }

    async addPendingIceCandidates() {
        if (this.pendingIceCandidates.length === 0) {
            return;
        }

        console.log(`Adding ${this.pendingIceCandidates.length} buffered ICE candidates`);
        for (const candidate of this.pendingIceCandidates) {
            try {
                await this.peerConnection.addIceCandidate(candidate);
                console.log('Buffered ICE candidate added');
            } catch (error) {
                console.error('Error adding buffered ICE candidate:', error);
            }
        }
        this.pendingIceCandidates = [];
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
        console.log('sendFiles() called, files:', this.pendingFiles.length);

        if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
            console.error('Data channel not ready:', this.dataChannel?.readyState);
            this.showToast('Connection not ready, please try again');
            return;
        }

        this.isTransferring = true;
        this.transferStats.startTime = Date.now();
        this.transferStats.sentBytes = 0;
        this.transferStats.totalBytes = this.pendingFiles.reduce((sum, f) => sum + f.size, 0);

        // Smaller chunk size for better iOS compatibility (8KB instead of 16KB)
        const CHUNK_SIZE = 8192;
        // Lower buffer threshold for iOS Safari (max 256KB buffered)
        const MAX_BUFFER = CHUNK_SIZE * 32;

        try {
            for (let i = 0; i < this.pendingFiles.length; i++) {
                const file = this.pendingFiles[i];
                console.log(`Sending file ${i + 1}/${this.pendingFiles.length}: ${file.name} (${file.size} bytes)`);

                // Send file metadata
                const metadata = {
                    type: 'file-start',
                    name: file.name,
                    size: file.size,
                    mimeType: file.type || 'application/octet-stream',
                    index: i,
                    total: this.pendingFiles.length
                };

                this.dataChannel.send(JSON.stringify(metadata));

                // Send file in chunks
                let offset = 0;
                let chunkCount = 0;

                while (offset < file.size) {
                    const chunk = file.slice(offset, offset + CHUNK_SIZE);

                    try {
                        const arrayBuffer = await this.readChunk(chunk);

                        // Wait if buffer is getting full - iOS needs more conservative throttling
                        while (this.dataChannel.bufferedAmount > MAX_BUFFER) {
                            await this.sleep(50);
                        }

                        this.dataChannel.send(arrayBuffer);
                        offset += arrayBuffer.byteLength;
                        this.transferStats.sentBytes += arrayBuffer.byteLength;
                        chunkCount++;

                        // Update progress every 10 chunks to avoid too many UI updates
                        if (chunkCount % 10 === 0) {
                            this.updateTransferProgress();
                        }
                    } catch (error) {
                        console.error('Error reading/sending chunk:', error);
                        throw error;
                    }
                }

                console.log(`File ${file.name} sent successfully (${chunkCount} chunks)`);

                // Send file end marker
                this.dataChannel.send(JSON.stringify({ type: 'file-end' }));

                // Final progress update for this file
                this.updateTransferProgress();
            }

            // All files sent
            this.dataChannel.send(JSON.stringify({ type: 'transfer-complete' }));
            console.log('All files sent successfully');
            this.showToast('Transfer complete!');

            setTimeout(() => {
                this.cleanupTransfer();
            }, 2000);
        } catch (error) {
            console.error('Error during file transfer:', error);
            this.showToast('Transfer failed: ' + error.message);
            this.cleanupTransfer();
        }
    }

    readChunk(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => {
                console.error('FileReader error:', error);
                reject(new Error('Failed to read file chunk'));
            };
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
        try {
            if (typeof data === 'string') {
                const message = JSON.parse(data);
                console.log('Received message:', message.type);

                switch (message.type) {
                    case 'file-start':
                        console.log(`Starting to receive file: ${message.name} (${message.size} bytes)`);
                        this.currentFile = {
                            name: message.name,
                            size: message.size,
                            mimeType: message.mimeType,
                            index: message.index,
                            total: message.total
                        };
                        this.currentFileChunks = [];

                        // Set total bytes if first file
                        if (this.transferStats.totalBytes === 0) {
                            this.transferStats.totalBytes = message.size;
                        }

                        document.getElementById('transferFileName').textContent = `${message.name}`;
                        break;

                    case 'file-end':
                        console.log(`File complete: ${this.currentFile.name}, chunks received: ${this.currentFileChunks.length}`);

                        try {
                            const blob = new Blob(this.currentFileChunks, { type: this.currentFile.mimeType });
                            console.log(`Created blob of size: ${blob.size}, expected: ${this.currentFile.size}`);

                            this.downloadFile(blob, this.currentFile.name);
                            this.currentFile = null;
                            this.currentFileChunks = [];
                        } catch (error) {
                            console.error('Error creating/downloading blob:', error);
                            this.showToast('Error saving file: ' + error.message);
                        }
                        break;

                    case 'transfer-complete':
                        console.log('Transfer complete!');
                        this.showToast('Transfer complete!');
                        setTimeout(() => {
                            this.cleanupTransfer();
                        }, 2000);
                        break;
                }
            } else {
                // Binary data chunk - ensure it's an ArrayBuffer
                let arrayBuffer;

                if (data instanceof ArrayBuffer) {
                    arrayBuffer = data;
                } else if (data instanceof Blob) {
                    console.warn('Received Blob instead of ArrayBuffer, converting...');
                    // This shouldn't happen but handle it
                    return;
                } else {
                    console.error('Unexpected data type:', typeof data);
                    return;
                }

                this.currentFileChunks.push(arrayBuffer);
                this.transferStats.sentBytes += arrayBuffer.byteLength;

                // Update progress every 10 chunks to avoid too many UI updates
                if (this.currentFileChunks.length % 10 === 0) {
                    this.updateTransferProgress();
                }
            }
        } catch (error) {
            console.error('Error handling data channel message:', error);
            this.showToast('Transfer error: ' + error.message);
        }
    }

    downloadFile(blob, filename) {
        console.log(`Downloading file: ${filename}, size: ${blob.size}`);

        try {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);

            // Small delay for Windows browsers
            setTimeout(() => {
                a.click();
                console.log('Download triggered for:', filename);

                // Cleanup after a delay to ensure download starts
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    console.log('Cleanup complete for:', filename);
                }, 100);
            }, 10);
        } catch (error) {
            console.error('Error triggering download:', error);
            this.showToast('Failed to download file: ' + error.message);
        }
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
        this.pendingIceCandidates = [];
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
