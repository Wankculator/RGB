// QR Scanner Module for LIGHTCAT
// Handles QR code scanning for RGB invoices

class LightcatQRScanner {
    constructor() {
        this.scanner = null;
        this.isScanning = false;
        this.modal = document.getElementById('qrScannerModal');
        this.permissionDiv = document.getElementById('cameraPermissionDiv');
        this.readerDiv = document.getElementById('qrReaderDiv');
        this.successDiv = document.getElementById('scanSuccessDiv');
        this.scannedInvoiceEl = document.getElementById('scannedInvoice');
        this.rgbInvoiceInput = document.getElementById('rgbInvoice');
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        // Scan button
        const scanBtn = document.getElementById('scanQRBtn');
        if (scanBtn) {
            scanBtn.addEventListener('click', () => this.openScanner());
        }
        
        // Start scanner button
        const startBtn = document.getElementById('startScannerBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startScanning());
        }
        
        // Close button
        const closeBtn = document.getElementById('closeQRScanner');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeScanner());
        }
        
        // Manual input button
        const manualBtn = document.getElementById('manualInputBtn');
        if (manualBtn) {
            manualBtn.addEventListener('click', () => this.closeScanner());
        }
        
        // Upload QR button
        const uploadBtn = document.getElementById('uploadQRBtn');
        const fileInput = document.getElementById('qrFileInput');
        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }
        
        // Close on backdrop click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeScanner();
            }
        });
    }
    
    openScanner() {
        // Reset UI state
        this.modal.style.display = 'flex';
        this.permissionDiv.style.display = 'block';
        this.readerDiv.style.display = 'none';
        this.successDiv.style.display = 'none';
        
        // Clear any existing scanner
        if (this.scanner) {
            this.scanner.clear().catch(console.error);
            this.scanner = null;
        }
    }
    
    async startScanning() {
        try {
            // Check if library is loaded
            if (typeof Html5QrcodeScanner === 'undefined') {
                throw new Error('QR scanner library not loaded');
            }
            
            // Hide permission UI, show scanner
            this.permissionDiv.style.display = 'none';
            this.readerDiv.style.display = 'block';
            this.readerDiv.innerHTML = ''; // Clear container
            
            // Configure scanner
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                rememberLastUsedCamera: true,
                showTorchButtonIfSupported: true,
                aspectRatio: 1.0,
                showZoomSliderIfSupported: true,
                defaultZoomValueIfSupported: 1.5
            };
            
            // Create scanner instance
            this.scanner = new Html5QrcodeScanner("qrReaderDiv", config, false);
            
            // Define callbacks
            const onSuccess = (decodedText) => {
                this.handleScanSuccess(decodedText);
            };
            
            const onError = (errorMessage) => {
                // Ignore "no QR code found" errors
                if (!errorMessage.includes('NotFoundException') && 
                    !errorMessage.includes('No MultiFormat Readers')) {
                    console.warn('Scan error:', errorMessage);
                }
            };
            
            // Start scanning
            this.scanner.render(onSuccess, onError);
            this.isScanning = true;
            
        } catch (error) {
            console.error('Scanner initialization error:', error);
            this.showError(error);
        }
    }
    
    handleScanSuccess(decodedText) {
        console.log('QR Code scanned:', decodedText);
        
        // Validate RGB invoice format
        if (this.isValidRGBInvoice(decodedText)) {
            // Stop scanner
            if (this.scanner) {
                this.scanner.clear().catch(console.error);
            }
            
            // Show success UI
            this.readerDiv.style.display = 'none';
            this.successDiv.style.display = 'block';
            this.scannedInvoiceEl.textContent = decodedText;
            
            // Play success sound if available
            this.playSuccessSound();
            
            // Auto-fill and close after delay
            setTimeout(() => {
                this.rgbInvoiceInput.value = decodedText;
                this.closeScanner();
                window.showNotification('RGB invoice scanned successfully!', 'success');
            }, 1500);
            
        } else {
            // Invalid QR code
            window.showNotification('Invalid QR code. Please scan an RGB invoice.', 'error');
        }
    }
    
    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            // Show loading state
            this.showLoading();
            
            // Create temporary scanner for file
            const fileScanner = new Html5Qrcode("qrReaderDiv");
            
            // Scan the uploaded file
            const decodedText = await fileScanner.scanFile(file, true);
            
            // Handle the result
            this.handleScanSuccess(decodedText);
            
        } catch (error) {
            console.error('File scan error:', error);
            this.showError(new Error('No QR code found in the uploaded image'));
        }
        
        // Reset file input
        event.target.value = '';
    }
    
    isValidRGBInvoice(text) {
        // Check for RGB invoice patterns
        return text && (
            text.startsWith('rgb:') || 
            text.includes('utxob:') ||
            text.includes('utxoa:') ||
            (text.includes('rgb') && text.includes('~/~/~/'))
        );
    }
    
    closeScanner() {
        // Stop and clear scanner
        if (this.scanner) {
            this.scanner.clear().catch(console.error);
            this.scanner = null;
        }
        
        // Hide modal
        this.modal.style.display = 'none';
        this.isScanning = false;
    }
    
    showLoading() {
        this.permissionDiv.innerHTML = `
            <div style="padding: 40px;">
                <div class="loading-spinner" style="width: 60px; height: 60px; margin: 0 auto 20px;">
                    <div style="width: 100%; height: 100%; border: 3px solid rgba(255,255,0,0.1); 
                               border-top-color: var(--yellow); border-radius: 50%; 
                               animation: spin 1s linear infinite;"></div>
                </div>
                <h3 style="color: var(--yellow);">Processing QR Code...</h3>
            </div>
        `;
        this.permissionDiv.style.display = 'block';
        this.readerDiv.style.display = 'none';
        this.successDiv.style.display = 'none';
    }
    
    showError(error) {
        let title = 'Scanner Error';
        let message = 'Unable to scan QR code';
        let tips = [];
        
        // Determine error type
        if (error.name === 'NotAllowedError' || error.message.includes('Permission')) {
            title = 'Camera Permission Required';
            message = 'Please allow camera access to scan QR codes';
            tips = [
                'Click the camera icon in your address bar',
                'Select "Allow" for camera permissions',
                'Then try scanning again'
            ];
        } else if (error.name === 'NotFoundError' || error.message.includes('No cameras')) {
            title = 'No Camera Found';
            message = 'No camera detected on this device';
            tips = [
                'Connect a webcam if using desktop',
                'Use the "Upload QR Image" option instead',
                'Or enter the invoice manually'
            ];
        } else if (error.message.includes('not loaded')) {
            title = 'Loading Error';
            message = 'QR scanner failed to load';
            tips = [
                'Check your internet connection',
                'Refresh the page and try again',
                'Or enter the invoice manually'
            ];
        }
        
        this.permissionDiv.innerHTML = `
            <div style="padding: 20px;">
                <div style="width: 60px; height: 60px; margin: 0 auto 20px; 
                           background: #ff5252; border-radius: 50%; 
                           display: flex; align-items: center; justify-content: center;">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                </div>
                <h3 style="color: #ff5252; margin-bottom: 10px;">${title}</h3>
                <p style="color: rgba(255,255,255,0.8); margin-bottom: 15px;">${message}</p>
                ${tips.length > 0 ? `
                    <ul style="text-align: left; max-width: 300px; margin: 0 auto 20px; 
                               color: rgba(255,255,255,0.7); font-size: 0.85rem;">
                        ${tips.map(tip => `<li style="margin-bottom: 5px;">${tip}</li>`).join('')}
                    </ul>
                ` : ''}
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button onclick="lightcatQRScanner.startScanning()" 
                            style="background: transparent; color: var(--yellow); 
                                   border: 1px solid var(--yellow); padding: 8px 20px; 
                                   border-radius: 5px; cursor: pointer;">
                        Try Again
                    </button>
                    <button onclick="lightcatQRScanner.closeScanner()" 
                            style="background: var(--yellow); color: #000; 
                                   border: none; padding: 8px 20px; 
                                   border-radius: 5px; cursor: pointer; font-weight: 600;">
                        Enter Manually
                    </button>
                </div>
            </div>
        `;
        this.permissionDiv.style.display = 'block';
        this.readerDiv.style.display = 'none';
    }
    
    playSuccessSound() {
        // Create a simple success beep
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.1;
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            // Ignore audio errors
        }
    }
}

// Initialize scanner when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.lightcatQRScanner = new LightcatQRScanner();
    });
} else {
    window.lightcatQRScanner = new LightcatQRScanner();
}

// Add spinning animation CSS if not already present
if (!document.querySelector('#qr-scanner-styles')) {
    const style = document.createElement('style');
    style.id = 'qr-scanner-styles';
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        #qrReaderDiv video {
            width: 100% !important;
            height: auto !important;
            border-radius: 10px;
        }
        
        #qrReaderDiv {
            position: relative;
            overflow: hidden;
            border-radius: 10px;
        }
        
        /* Style the scanner UI */
        #qrReaderDiv__dashboard_section_swaplink {
            display: none !important;
        }
        
        #qrReaderDiv__dashboard_section_csr button {
            background-color: var(--yellow) !important;
            color: #000 !important;
            border: none !important;
            padding: 8px 16px !important;
            border-radius: 5px !important;
            font-weight: 600 !important;
            margin: 5px !important;
        }
    `;
    document.head.appendChild(style);
}