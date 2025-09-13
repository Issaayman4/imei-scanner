/**
 * Professional IMEI/UPC Scanner Application
 * Built for iPHOXY CORP - High-volume barcode scanning solution
 * Combines ZXing library with advanced features for production use
 */

class IMEIUPCScanner {
    constructor() {
        this.isInitialized = false;
        this.isScanning = false;
        this.currentUser = null;
        this.sessionStartTime = null;
        this.scanData = [];
        this.duplicateCount = 0;
        this.errorCount = 0;
        this.settings = this.loadSettings();
        
        // Camera and scanning
        this.videoElement = null;
        this.canvasElement = null;
        this.codeReader = null;
        this.scanInterval = null;
        this.currentStream = null;
        this.availableCameras = [];
        this.currentCameraIndex = 0;
        
        // Performance tracking
        this.scanStartTime = null;
        this.totalScans = 0;
        this.scanTimes = [];
        
        // Audio elements
        this.successSound = null;
        this.errorSound = null;
        
        this.init();
    }

    async init() {
        try {
            await this.initializeElements();
            await this.initializeZXing();
            this.initializeAudio();
            this.setupEventListeners();
            this.loadUserData();
            this.updateUI();
            this.startSessionTimer();
            
            this.isInitialized = true;
            this.updateStatus('Scanner initialized successfully. Ready to scan IMEI and UPC barcodes.');
            console.log('IMEI/UPC Scanner initialized successfully');
        } catch (error) {
            console.error('Failed to initialize scanner:', error);
            this.updateStatus('Failed to initialize scanner. Please refresh the page.', 'error');
        }
    }

    async initializeElements() {
        // Get DOM elements
        this.elements = {
            // User controls
            userSelect: document.getElementById('userSelect'),
            userInfo: document.getElementById('userInfo'),
            currentUser: document.getElementById('currentUser'),
            sessionTime: document.getElementById('sessionTime'),
            
            // Statistics
            sessionScans: document.getElementById('sessionScans'),
            validScans: document.getElementById('validScans'),
            duplicateBlocked: document.getElementById('duplicateBlocked'),
            errorCount: document.getElementById('errorCount'),
            scanRate: document.getElementById('scanRate'),
            cloudSynced: document.getElementById('cloudSynced'),
            
            // Camera controls
            startScanningBtn: document.getElementById('startScanningBtn'),
            stopScanningBtn: document.getElementById('stopScanningBtn'),
            switchCameraBtn: document.getElementById('switchCameraBtn'),
            toggleFlashBtn: document.getElementById('toggleFlashBtn'),
            focusBtn: document.getElementById('focusBtn'),
            captureBtn: document.getElementById('captureBtn'),
            scanModeSelect: document.getElementById('scanModeSelect'),
            
            // Camera elements
            cameraContainer: document.getElementById('cameraContainer'),
            cameraPlaceholder: document.getElementById('cameraPlaceholder'),
            cameraFeedContainer: document.getElementById('cameraFeedContainer'),
            cameraVideo: document.getElementById('cameraVideo'),
            overlayCanvas: document.getElementById('overlayCanvas'),
            
            // Detection overlay
            detectionIndicator: document.getElementById('detectionIndicator'),
            detectionText: document.getElementById('detectionText'),
            liveDetections: document.getElementById('liveDetections'),
            pauseDetection: document.getElementById('pauseDetection'),
            clearDetections: document.getElementById('clearDetections'),
            
            // Results
            scanResultsList: document.getElementById('scanResultsList'),
            pagination: document.getElementById('pagination'),
            prevPage: document.getElementById('prevPage'),
            nextPage: document.getElementById('nextPage'),
            pageInfo: document.getElementById('pageInfo'),
            
            // Action buttons
            exportExcelBtn: document.getElementById('exportExcelBtn'),
            syncGoogleSheetsBtn: document.getElementById('syncGoogleSheetsBtn'),
            backupDataBtn: document.getElementById('backupDataBtn'),
            clearSessionBtn: document.getElementById('clearSessionBtn'),
            resetAllBtn: document.getElementById('resetAllBtn'),
            
            // Settings
            settingsBtn: document.getElementById('settingsBtn'),
            settingsModal: document.getElementById('settingsModal'),
            closeSettings: document.getElementById('closeSettings'),
            saveSettings: document.getElementById('saveSettings'),
            
            // Help
            helpBtn: document.getElementById('helpBtn'),
            helpModal: document.getElementById('helpModal'),
            closeHelp: document.getElementById('closeHelp'),
            
            // Status
            statusMessage: document.getElementById('statusMessage'),
            connectionStatus: document.getElementById('connectionStatus'),
            connectionText: document.getElementById('connectionText'),
            cameraStatus: document.getElementById('cameraStatus'),
            storageStatus: document.getElementById('storageStatus'),
            networkStatus: document.getElementById('networkStatus')
        };

        // Set up canvas
        this.videoElement = this.elements.cameraVideo;
        this.canvasElement = this.elements.overlayCanvas;
        this.canvasContext = this.canvasElement.getContext('2d');
    }

    async initializeZXing() {
        if (typeof ZXing === 'undefined') {
            throw new Error('ZXing library not loaded');
        }

        this.codeReader = new ZXing.BrowserMultiFormatReader();
        
        // Configure supported formats for IMEI/UPC scanning
        const hints = new Map();
        const formats = [
            ZXing.BarcodeFormat.EAN_13,
            ZXing.BarcodeFormat.EAN_8,
            ZXing.BarcodeFormat.UPC_A,
            ZXing.BarcodeFormat.UPC_E,
            ZXing.BarcodeFormat.CODE_128,
            ZXing.BarcodeFormat.CODE_39,
            ZXing.BarcodeFormat.CODE_93,
            ZXing.BarcodeFormat.ITF,
            ZXing.BarcodeFormat.CODABAR
        ];
        
        hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
        hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
        hints.set(ZXing.DecodeHintType.ALSO_INVERTED, true);
        
        this.codeReader.hints = hints;
        
        // Get available cameras
        try {
            const devices = await this.codeReader.listVideoInputDevices();
            this.availableCameras = devices;
            console.log('Available cameras:', devices.length);
        } catch (error) {
            console.warn('Could not enumerate cameras:', error);
        }
    }

    initializeAudio() {
        this.successSound = document.getElementById('successSound');
        this.errorSound = document.getElementById('errorSound');
    }

    setupEventListeners() {
        // User selection
        this.elements.userSelect.addEventListener('change', (e) => {
            this.selectUser(e.target.value);
        });

        // Camera controls
        this.elements.startScanningBtn.addEventListener('click', () => {
            this.startScanning();
        });

        this.elements.stopScanningBtn.addEventListener('click', () => {
            this.stopScanning();
        });

        this.elements.switchCameraBtn.addEventListener('click', () => {
            this.switchCamera();
        });

        this.elements.captureBtn.addEventListener('click', () => {
            this.captureImage();
        });

        // Scan mode selection
        this.elements.scanModeSelect.addEventListener('change', (e) => {
            this.updateScanMode(e.target.value);
        });

        // Detection controls
        this.elements.pauseDetection.addEventListener('click', () => {
            this.toggleDetection();
        });

        this.elements.clearDetections.addEventListener('click', () => {
            this.clearLiveDetections();
        });

        // Action buttons
        this.elements.exportExcelBtn.addEventListener('click', () => {
            this.exportToExcel();
        });

        this.elements.syncGoogleSheetsBtn.addEventListener('click', () => {
            this.syncToGoogleSheets();
        });

        this.elements.backupDataBtn.addEventListener('click', () => {
            this.backupData();
        });

        this.elements.clearSessionBtn.addEventListener('click', () => {
            this.clearSession();
        });

        this.elements.resetAllBtn.addEventListener('click', () => {
            this.resetAllData();
        });

        // Settings
        this.elements.settingsBtn.addEventListener('click', () => {
            this.openSettings();
        });

        this.elements.closeSettings.addEventListener('click', () => {
            this.closeSettings();
        });

        this.elements.saveSettings.addEventListener('click', () => {
            this.saveSettings();
        });

        // Help
        this.elements.helpBtn.addEventListener('click', () => {
            this.openHelp();
        });

        this.elements.closeHelp.addEventListener('click', () => {
            this.closeHelp();
        });

        // Settings tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Modal close on outside click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Page visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isScanning) {
                this.pauseScanning();
            } else if (!document.hidden && this.isScanning) {
                this.resumeScanning();
            }
        });
    }

    selectUser(username) {
        if (!username) {
            this.currentUser = null;
            this.elements.userInfo.style.display = 'none';
            this.elements.startScanningBtn.disabled = true;
            return;
        }

        this.currentUser = username;
        this.sessionStartTime = new Date();
        this.elements.currentUser.textContent = username;
        this.elements.userInfo.style.display = 'flex';
        this.elements.startScanningBtn.disabled = false;
        
        this.updateStatus(`Welcome ${username}! You can now start scanning.`);
        this.saveUserData();
    }

    async startScanning() {
        if (!this.currentUser) {
            this.updateStatus('Please select a user before starting to scan.', 'error');
            return;
        }

        try {
            this.updateStatus('Starting camera...');
            
            // Request camera permission and start stream
            await this.startCameraStream();
            
            this.isScanning = true;
            this.scanStartTime = Date.now();
            
            // Update UI
            this.elements.startScanningBtn.style.display = 'none';
            this.elements.stopScanningBtn.style.display = 'inline-flex';
            this.elements.cameraPlaceholder.style.display = 'none';
            this.elements.cameraFeedContainer.style.display = 'block';
            document.querySelector('.secondary-controls').style.display = 'flex';
            
            // Start scanning loop
            this.startScanningLoop();
            
            this.updateStatus('Scanning started. Position device 30-50cm above phone boxes.');
            this.updateCameraStatus('Camera: Active');
            
        } catch (error) {
            console.error('Failed to start scanning:', error);
            this.updateStatus('Failed to start camera. Please check permissions and try again.', 'error');
            this.updateCameraStatus('Camera: Error');
        }
    }

    async startCameraStream() {
        try {
            // Stop existing stream
            if (this.currentStream) {
                this.currentStream.getTracks().forEach(track => track.stop());
            }

            // Get camera constraints
            const constraints = {
                video: {
                    facingMode: this.currentCameraIndex === 0 ? 'environment' : 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            // If we have specific camera devices, use them
            if (this.availableCameras.length > 0) {
                const selectedCamera = this.availableCameras[this.currentCameraIndex];
                if (selectedCamera) {
                    constraints.video.deviceId = { exact: selectedCamera.deviceId };
                    delete constraints.video.facingMode;
                }
            }

            this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement.srcObject = this.currentStream;
            
            // Wait for video to be ready
            await new Promise((resolve) => {
                this.videoElement.onloadedmetadata = resolve;
            });

            // Set up canvas to match video dimensions
            this.setupCanvas();
            
        } catch (error) {
            throw new Error(`Camera access failed: ${error.message}`);
        }
    }

    setupCanvas() {
        const video = this.videoElement;
        const canvas = this.canvasElement;
        
        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
    }

    startScanningLoop() {
        const scanInterval = this.getScanInterval();
        
        this.scanInterval = setInterval(async () => {
            if (!this.isScanning || !this.videoElement.videoWidth) {
                return;
            }

            try {
                await this.performScan();
            } catch (error) {
                console.warn('Scan error:', error);
                this.errorCount++;
                this.updateStatistics();
            }
        }, scanInterval);
    }

    async performScan() {
        const video = this.videoElement;
        const canvas = this.canvasElement;
        const ctx = this.canvasContext;
        
        // Clear previous overlays
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        try {
            // Capture current frame
            const imageData = this.captureVideoFrame();
            
            // Scan for barcodes
            const results = await this.scanImageData(imageData);
            
            if (results.length > 0) {
                this.processDetectedBarcodes(results);
            }
            
        } catch (error) {
            // Silent fail for individual scan attempts
            if (this.settings.debugMode) {
                console.warn('Scan attempt failed:', error);
            }
        }
    }

    captureVideoFrame() {
        const video = this.videoElement;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    async scanImageData(imageData) {
        const results = [];
        
        try {
            // Try to decode the full image
            const result = await this.codeReader.decodeFromImageData(imageData);
            if (result) {
                results.push({
                    text: result.text,
                    format: result.format,
                    points: result.resultPoints,
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            // No barcode found in full image, try regions
        }

        // If no results from full image, try scanning regions
        if (results.length === 0) {
            const regions = this.getImageRegions(imageData);
            
            for (const region of regions) {
                try {
                    const result = await this.codeReader.decodeFromImageData(region.data);
                    if (result) {
                        results.push({
                            text: result.text,
                            format: result.format,
                            points: result.resultPoints,
                            region: region.bounds,
                            timestamp: Date.now()
                        });
                        break; // Found one, that's enough for now
                    }
                } catch (error) {
                    // Continue to next region
                }
            }
        }

        return results;
    }

    getImageRegions(imageData) {
        const { width, height } = imageData;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const regions = [
            // Center region
            { x: width * 0.2, y: height * 0.2, w: width * 0.6, h: height * 0.6 },
            // Top region
            { x: width * 0.1, y: height * 0.1, w: width * 0.8, h: height * 0.4 },
            // Bottom region
            { x: width * 0.1, y: height * 0.5, w: width * 0.8, h: height * 0.4 },
            // Left region
            { x: 0, y: height * 0.2, w: width * 0.5, h: height * 0.6 },
            // Right region
            { x: width * 0.5, y: height * 0.2, w: width * 0.5, h: height * 0.6 }
        ];

        return regions.map(region => {
            canvas.width = region.w;
            canvas.height = region.h;
            
            // Create temporary canvas with full image
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = width;
            tempCanvas.height = height;
            tempCtx.putImageData(imageData, 0, 0);
            
            // Draw region to our canvas
            ctx.drawImage(tempCanvas, region.x, region.y, region.w, region.h, 0, 0, region.w, region.h);
            
            return {
                data: ctx.getImageData(0, 0, region.w, region.h),
                bounds: region
            };
        });
    }

    processDetectedBarcodes(results) {
        const validBarcodes = [];
        
        for (const result of results) {
            const barcodeInfo = this.analyzeBarcodeType(result.text);
            
            if (barcodeInfo.isValid) {
                // Check for duplicates
                if (this.isDuplicate(result.text)) {
                    this.duplicateCount++;
                    this.playErrorSound();
                    this.showDuplicateWarning(result.text);
                    continue;
                }
                
                // Add to valid barcodes
                validBarcodes.push({
                    ...result,
                    ...barcodeInfo,
                    user: this.currentUser,
                    sessionId: this.getSessionId(),
                    id: this.generateId()
                });
                
                this.playSuccessSound();
            }
        }
        
        if (validBarcodes.length > 0) {
            this.addScanResults(validBarcodes);
            this.drawDetectionOverlays(validBarcodes);
            this.updateLiveDetections(validBarcodes);
            this.updateStatistics();
            
            // Auto-sync if enabled
            if (this.settings.autoSync) {
                this.syncToGoogleSheets();
            }
        }
    }

    analyzeBarcodeType(text) {
        const cleanText = text.trim();
        
        // IMEI validation (15 digits)
        if (/^\d{15}$/.test(cleanText)) {
            return {
                type: 'IMEI',
                isValid: true,
                vendor: this.getIMEIVendor(cleanText),
                checksum: this.validateIMEIChecksum(cleanText)
            };
        }
        
        // MEID validation (14 digits hex)
        if (/^[0-9A-F]{14}$/i.test(cleanText)) {
            return {
                type: 'MEID',
                isValid: true,
                vendor: 'Unknown',
                checksum: true
            };
        }
        
        // UPC-A validation (12 digits)
        if (/^\d{12}$/.test(cleanText)) {
            return {
                type: 'UPC-A',
                isValid: true,
                vendor: 'Product',
                checksum: this.validateUPCChecksum(cleanText)
            };
        }
        
        // UPC-E validation (8 digits)
        if (/^\d{8}$/.test(cleanText)) {
            return {
                type: 'UPC-E',
                isValid: true,
                vendor: 'Product',
                checksum: true
            };
        }
        
        // EAN-13 validation
        if (/^\d{13}$/.test(cleanText)) {
            return {
                type: 'EAN-13',
                isValid: true,
                vendor: 'Product',
                checksum: this.validateEAN13Checksum(cleanText)
            };
        }
        
        return {
            type: 'Unknown',
            isValid: false,
            vendor: 'Unknown',
            checksum: false
        };
    }

    getIMEIVendor(imei) {
        const tac = imei.substring(0, 8);
        const vendors = {
            '01': 'Apple',
            '35': 'Samsung',
            '86': 'Huawei',
            '99': 'Xiaomi'
        };
        
        return vendors[tac.substring(0, 2)] || 'Unknown';
    }

    validateIMEIChecksum(imei) {
        // Luhn algorithm for IMEI validation
        let sum = 0;
        for (let i = 0; i < 14; i++) {
            let digit = parseInt(imei[i]);
            if (i % 2 === 1) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
        }
        const checkDigit = (10 - (sum % 10)) % 10;
        return checkDigit === parseInt(imei[14]);
    }

    validateUPCChecksum(upc) {
        let sum = 0;
        for (let i = 0; i < 11; i++) {
            const digit = parseInt(upc[i]);
            sum += (i % 2 === 0) ? digit : digit * 3;
        }
        const checkDigit = (10 - (sum % 10)) % 10;
        return checkDigit === parseInt(upc[11]);
    }

    validateEAN13Checksum(ean) {
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            const digit = parseInt(ean[i]);
            sum += (i % 2 === 0) ? digit : digit * 3;
        }
        const checkDigit = (10 - (sum % 10)) % 10;
        return checkDigit === parseInt(ean[12]);
    }

    isDuplicate(text) {
        if (this.settings.duplicateHandling === 'allow') {
            return false;
        }
        
        return this.scanData.some(item => item.text === text);
    }

    addScanResults(barcodes) {
        for (const barcode of barcodes) {
            this.scanData.push(barcode);
            this.totalScans++;
        }
        
        this.saveScanData();
        this.updateResultsList();
    }

    drawDetectionOverlays(barcodes) {
        const ctx = this.canvasContext;
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
        
        barcodes.forEach((barcode, index) => {
            const color = colors[index % colors.length];
            
            // Draw bounding box
            if (barcode.region) {
                const { x, y, w, h } = barcode.region;
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.strokeRect(x, y, w, h);
                
                // Draw label
                ctx.fillStyle = color;
                ctx.font = 'bold 16px Arial';
                const text = `${barcode.type}: ${barcode.text}`;
                const textWidth = ctx.measureText(text).width;
                
                ctx.fillRect(x, y - 25, textWidth + 10, 25);
                ctx.fillStyle = 'white';
                ctx.fillText(text, x + 5, y - 8);
            }
        });
    }

    updateLiveDetections(barcodes) {
        const container = this.elements.liveDetections;
        
        barcodes.forEach(barcode => {
            const item = document.createElement('div');
            item.className = 'detection-item fade-in';
            item.innerHTML = `
                <div class="detection-type">${barcode.type}</div>
                <div class="detection-value">${barcode.text}</div>
            `;
            
            container.appendChild(item);
            
            // Remove old items (keep last 5)
            while (container.children.length > 5) {
                container.removeChild(container.firstChild);
            }
        });
    }

    stopScanning() {
        this.isScanning = false;
        
        // Clear scan interval
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
        
        // Stop camera stream
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
        
        // Update UI
        this.elements.startScanningBtn.style.display = 'inline-flex';
        this.elements.stopScanningBtn.style.display = 'none';
        this.elements.cameraPlaceholder.style.display = 'block';
        this.elements.cameraFeedContainer.style.display = 'none';
        document.querySelector('.secondary-controls').style.display = 'none';
        
        // Clear canvas
        this.canvasContext.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        
        this.updateStatus('Scanning stopped. Click "Start Scanning" to resume.');
        this.updateCameraStatus('Camera: Ready');
    }

    switchCamera() {
        if (this.availableCameras.length <= 1) {
            this.updateStatus('No additional cameras available.', 'warning');
            return;
        }
        
        this.currentCameraIndex = (this.currentCameraIndex + 1) % this.availableCameras.length;
        
        if (this.isScanning) {
            this.startCameraStream().catch(error => {
                console.error('Failed to switch camera:', error);
                this.updateStatus('Failed to switch camera.', 'error');
            });
        }
    }

    captureImage() {
        if (!this.videoElement.videoWidth) {
            this.updateStatus('No camera feed available.', 'error');
            return;
        }
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = this.videoElement.videoWidth;
        canvas.height = this.videoElement.videoHeight;
        ctx.drawImage(this.videoElement, 0, 0);
        
        // Download the image
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `scan_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
            a.click();
            URL.revokeObjectURL(url);
        });
        
        this.updateStatus('Image captured and downloaded.');
    }

    // Settings Management
    loadSettings() {
        const defaultSettings = {
            scanSpeed: 100,
            duplicateHandling: 'block',
            soundEnabled: true,
            vibrationEnabled: true,
            googleSheetsUrl: '',
            sheetName: 'scanning manu',
            autoSync: true,
            syncInterval: 'realtime',
            debugMode: false,
            cameraResolution: '720p',
            maxStorageSize: 50,
            sessionTimeout: 60,
            autoSave: 25
        };
        
        try {
            const saved = localStorage.getItem('imei_scanner_settings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch (error) {
            console.warn('Failed to load settings:', error);
            return defaultSettings;
        }
    }

    saveSettings() {
        try {
            // Get values from form
            const settings = {
                scanSpeed: parseInt(document.getElementById('scanSpeed').value),
                duplicateHandling: document.getElementById('duplicateHandling').value,
                soundEnabled: document.getElementById('soundEnabled').checked,
                vibrationEnabled: document.getElementById('vibrationEnabled').checked,
                googleSheetsUrl: document.getElementById('googleSheetsUrl').value,
                sheetName: document.getElementById('sheetName').value,
                autoSync: document.getElementById('autoSync').checked,
                syncInterval: document.getElementById('syncInterval').value,
                debugMode: document.getElementById('debugMode').checked,
                cameraResolution: document.getElementById('cameraResolution').value,
                maxStorageSize: parseInt(document.getElementById('maxStorageSize').value),
                sessionTimeout: parseInt(document.getElementById('sessionTimeout').value),
                autoSave: parseInt(document.getElementById('autoSave').value)
            };
            
            this.settings = settings;
            localStorage.setItem('imei_scanner_settings', JSON.stringify(settings));
            
            this.closeSettings();
            this.updateStatus('Settings saved successfully.');
            
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.updateStatus('Failed to save settings.', 'error');
        }
    }

    openSettings() {
        // Populate form with current settings
        document.getElementById('scanSpeed').value = this.settings.scanSpeed;
        document.getElementById('duplicateHandling').value = this.settings.duplicateHandling;
        document.getElementById('soundEnabled').checked = this.settings.soundEnabled;
        document.getElementById('vibrationEnabled').checked = this.settings.vibrationEnabled;
        document.getElementById('googleSheetsUrl').value = this.settings.googleSheetsUrl;
        document.getElementById('sheetName').value = this.settings.sheetName;
        document.getElementById('autoSync').checked = this.settings.autoSync;
        document.getElementById('syncInterval').value = this.settings.syncInterval;
        document.getElementById('debugMode').checked = this.settings.debugMode;
        document.getElementById('cameraResolution').value = this.settings.cameraResolution;
        document.getElementById('maxStorageSize').value = this.settings.maxStorageSize;
        document.getElementById('sessionTimeout').value = this.settings.sessionTimeout;
        document.getElementById('autoSave').value = this.settings.autoSave;
        
        this.elements.settingsModal.style.display = 'block';
    }

    closeSettings() {
        this.elements.settingsModal.style.display = 'none';
    }

    openHelp() {
        this.elements.helpModal.style.display = 'block';
    }

    closeHelp() {
        this.elements.helpModal.style.display = 'none';
    }

    switchTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Remove active class from all tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab content
        document.getElementById(tabName + 'Tab').classList.add('active');
        
        // Add active class to selected tab button
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    }

    // Data Management
    async exportToExcel() {
        if (this.scanData.length === 0) {
            this.updateStatus('No data to export.', 'warning');
            return;
        }
        
        try {
            const csvContent = this.generateCSV();
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `imei_upc_scan_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.updateStatus(`Exported ${this.scanData.length} records to Excel.`);
            
        } catch (error) {
            console.error('Export failed:', error);
            this.updateStatus('Failed to export data.', 'error');
        }
    }

    generateCSV() {
        const headers = ['Timestamp', 'Type', 'Value', 'Vendor', 'User', 'Session ID', 'Checksum Valid'];
        const rows = this.scanData.map(item => [
            new Date(item.timestamp).toISOString(),
            item.type,
            item.text,
            item.vendor,
            item.user,
            item.sessionId,
            item.checksum ? 'Yes' : 'No'
        ]);
        
        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
            
        return csvContent;
    }

    async syncToGoogleSheets() {
        if (!this.settings.googleSheetsUrl) {
            this.updateStatus('Google Sheets URL not configured. Please check settings.', 'warning');
            return;
        }
        
        if (this.scanData.length === 0) {
            this.updateStatus('No data to sync.', 'warning');
            return;
        }
        
        try {
            this.updateSyncStatus('Syncing...');
            
            const payload = {
                action: 'addData',
                sheetName: this.settings.sheetName,
                data: this.scanData.map(item => ({
                    timestamp: new Date(item.timestamp).toISOString(),
                    imei_meid: item.type === 'IMEI' || item.type === 'MEID' ? item.text : '',
                    upc: item.type.startsWith('UPC') || item.type.startsWith('EAN') ? item.text : '',
                    vendor: item.vendor,
                    user: item.user,
                    session_id: item.sessionId,
                    barcode_type: item.type,
                    scan_mode: 'Ultra Fast'
                }))
            };
            
            const response = await fetch(this.settings.googleSheetsUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                this.updateSyncStatus('Synced');
                this.updateStatus(`Successfully synced ${this.scanData.length} records to Google Sheets.`);
                this.updateCloudSyncedCount(this.scanData.length);
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
            
        } catch (error) {
            console.error('Sync failed:', error);
            this.updateSyncStatus('Error');
            this.updateStatus('Failed to sync to Google Sheets. Check your internet connection and URL.', 'error');
        }
    }

    backupData() {
        try {
            const backup = {
                timestamp: new Date().toISOString(),
                version: '1.0',
                scanData: this.scanData,
                settings: this.settings,
                statistics: {
                    totalScans: this.totalScans,
                    duplicateCount: this.duplicateCount,
                    errorCount: this.errorCount
                }
            };
            
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `imei_scanner_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.updateStatus('Data backup created successfully.');
            
        } catch (error) {
            console.error('Backup failed:', error);
            this.updateStatus('Failed to create backup.', 'error');
        }
    }

    clearSession() {
        if (confirm('Are you sure you want to clear the current session data?')) {
            this.scanData = [];
            this.duplicateCount = 0;
            this.errorCount = 0;
            this.totalScans = 0;
            
            this.saveScanData();
            this.updateResultsList();
            this.updateStatistics();
            this.clearLiveDetections();
            
            this.updateStatus('Session data cleared.');
        }
    }

    resetAllData() {
        if (confirm('Are you sure you want to reset ALL data? This cannot be undone.')) {
            localStorage.removeItem('imei_scanner_data');
            localStorage.removeItem('imei_scanner_settings');
            localStorage.removeItem('imei_scanner_user');
            
            location.reload();
        }
    }

    // UI Updates
    updateStatistics() {
        const validScans = this.scanData.filter(item => item.checksum).length;
        const scanRate = this.calculateScanRate();
        
        this.elements.sessionScans.textContent = this.scanData.length;
        this.elements.validScans.textContent = validScans;
        this.elements.duplicateBlocked.textContent = this.duplicateCount;
        this.elements.errorCount.textContent = this.errorCount;
        this.elements.scanRate.textContent = scanRate;
        
        // Update export count
        document.getElementById('exportCount').textContent = `(${this.scanData.length})`;
    }

    calculateScanRate() {
        if (!this.scanStartTime || this.scanData.length === 0) {
            return 0;
        }
        
        const elapsed = (Date.now() - this.scanStartTime) / 1000 / 60; // minutes
        return Math.round(this.scanData.length / elapsed);
    }

    updateResultsList() {
        const container = this.elements.scanResultsList;
        
        if (this.scanData.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <div class="no-results-icon">📱</div>
                    <div class="no-results-text">No scans yet</div>
                    <div class="no-results-subtitle">Start scanning to see results here</div>
                </div>
            `;
            return;
        }
        
        // Sort by timestamp (newest first)
        const sortedData = [...this.scanData].sort((a, b) => b.timestamp - a.timestamp);
        
        container.innerHTML = sortedData.slice(0, 25).map(item => `
            <div class="result-item">
                <div class="result-info">
                    <div class="result-type">${item.type}</div>
                    <div class="result-value">${item.text}</div>
                    <div class="result-meta">
                        ${new Date(item.timestamp).toLocaleString()} • 
                        ${item.vendor} • 
                        ${item.user} • 
                        Checksum: ${item.checksum ? '✅' : '❌'}
                    </div>
                </div>
                <div class="result-actions">
                    <button class="result-btn copy" onclick="navigator.clipboard.writeText('${item.text}')">📋</button>
                    <button class="result-btn delete" onclick="scanner.deleteResult('${item.id}')">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    deleteResult(id) {
        if (confirm('Delete this scan result?')) {
            this.scanData = this.scanData.filter(item => item.id !== id);
            this.saveScanData();
            this.updateResultsList();
            this.updateStatistics();
        }
    }

    updateStatus(message, type = 'info') {
        this.elements.statusMessage.textContent = message;
        this.elements.statusMessage.className = `status-message ${type}`;
        
        // Auto-clear after 5 seconds for non-error messages
        if (type !== 'error') {
            setTimeout(() => {
                this.elements.statusMessage.textContent = 'Ready to scan IMEI and UPC barcodes';
                this.elements.statusMessage.className = 'status-message';
            }, 5000);
        }
    }

    updateCameraStatus(status) {
        this.elements.cameraStatus.textContent = status;
    }

    updateSyncStatus(status) {
        document.getElementById('syncStatus').textContent = status;
    }

    updateCloudSyncedCount(count) {
        this.elements.cloudSynced.textContent = count;
    }

    clearLiveDetections() {
        this.elements.liveDetections.innerHTML = '';
    }

    // Utility Functions
    getScanInterval() {
        const mode = this.elements.scanModeSelect.value;
        const intervals = {
            'ultra-fast': 50,
            'fast': 100,
            'normal': 200,
            'precise': 500
        };
        return intervals[mode] || this.settings.scanSpeed;
    }

    updateScanMode(mode) {
        if (this.isScanning) {
            // Restart scanning with new interval
            this.stopScanning();
            setTimeout(() => this.startScanning(), 100);
        }
    }

    getSessionId() {
        if (!this.sessionId) {
            this.sessionId = `${this.currentUser}_${Date.now()}`;
        }
        return this.sessionId;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    playSuccessSound() {
        if (this.settings.soundEnabled && this.successSound) {
            this.successSound.play().catch(() => {});
        }
        
        if (this.settings.vibrationEnabled && navigator.vibrate) {
            navigator.vibrate(100);
        }
    }

    playErrorSound() {
        if (this.settings.soundEnabled && this.errorSound) {
            this.errorSound.play().catch(() => {});
        }
        
        if (this.settings.vibrationEnabled && navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
    }

    showDuplicateWarning(text) {
        this.updateStatus(`Duplicate detected: ${text}`, 'warning');
    }

    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 's':
                    e.preventDefault();
                    if (this.isScanning) {
                        this.stopScanning();
                    } else {
                        this.startScanning();
                    }
                    break;
                case 'e':
                    e.preventDefault();
                    this.exportToExcel();
                    break;
                case ',':
                    e.preventDefault();
                    this.openSettings();
                    break;
            }
        }
        
        if (e.key === 'Escape') {
            this.closeSettings();
            this.closeHelp();
        }
    }

    pauseScanning() {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
    }

    resumeScanning() {
        if (this.isScanning && !this.scanInterval) {
            this.startScanningLoop();
        }
    }

    toggleDetection() {
        if (this.scanInterval) {
            this.pauseScanning();
            this.elements.pauseDetection.textContent = '▶️';
        } else if (this.isScanning) {
            this.resumeScanning();
            this.elements.pauseDetection.textContent = '⏸️';
        }
    }

    startSessionTimer() {
        setInterval(() => {
            if (this.sessionStartTime) {
                const elapsed = Date.now() - this.sessionStartTime;
                const hours = Math.floor(elapsed / 3600000);
                const minutes = Math.floor((elapsed % 3600000) / 60000);
                this.elements.sessionTime.textContent = `${hours}h ${minutes}m`;
            }
        }, 60000);
    }

    // Data Persistence
    saveScanData() {
        try {
            localStorage.setItem('imei_scanner_data', JSON.stringify(this.scanData));
        } catch (error) {
            console.warn('Failed to save scan data:', error);
        }
    }

    loadScanData() {
        try {
            const saved = localStorage.getItem('imei_scanner_data');
            this.scanData = saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.warn('Failed to load scan data:', error);
            this.scanData = [];
        }
    }

    saveUserData() {
        try {
            const userData = {
                currentUser: this.currentUser,
                sessionStartTime: this.sessionStartTime
            };
            localStorage.setItem('imei_scanner_user', JSON.stringify(userData));
        } catch (error) {
            console.warn('Failed to save user data:', error);
        }
    }

    loadUserData() {
        try {
            const saved = localStorage.getItem('imei_scanner_user');
            if (saved) {
                const userData = JSON.parse(saved);
                if (userData.currentUser) {
                    this.elements.userSelect.value = userData.currentUser;
                    this.selectUser(userData.currentUser);
                    this.sessionStartTime = new Date(userData.sessionStartTime);
                }
            }
        } catch (error) {
            console.warn('Failed to load user data:', error);
        }
        
        this.loadScanData();
        this.updateResultsList();
        this.updateStatistics();
    }

    updateUI() {
        // Update connection status
        this.updateConnectionStatus();
        
        // Update storage status
        this.updateStorageStatus();
        
        // Update network status
        this.updateNetworkStatus();
    }

    updateConnectionStatus() {
        const isOnline = navigator.onLine;
        this.elements.connectionStatus.className = `status-dot ${isOnline ? 'online' : 'offline'}`;
        this.elements.connectionText.textContent = isOnline ? 'Online' : 'Offline';
    }

    updateStorageStatus() {
        try {
            const used = JSON.stringify(this.scanData).length / 1024; // KB
            const maxSize = this.settings.maxStorageSize * 1024; // KB
            const percentage = (used / maxSize) * 100;
            
            this.elements.storageStatus.textContent = `💾 Storage: ${Math.round(percentage)}% used`;
        } catch (error) {
            this.elements.storageStatus.textContent = '💾 Storage: OK';
        }
    }

    updateNetworkStatus() {
        const isOnline = navigator.onLine;
        this.elements.networkStatus.textContent = `🌐 Network: ${isOnline ? 'Online' : 'Offline'}`;
    }
}

// Initialize the scanner when the page loads
let scanner;

document.addEventListener('DOMContentLoaded', () => {
    scanner = new IMEIUPCScanner();
});

// Handle online/offline events
window.addEventListener('online', () => {
    if (scanner) {
        scanner.updateConnectionStatus();
        scanner.updateNetworkStatus();
    }
});

window.addEventListener('offline', () => {
    if (scanner) {
        scanner.updateConnectionStatus();
        scanner.updateNetworkStatus();
    }
});

// Export scanner instance for debugging
window.scanner = scanner;

