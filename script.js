document.addEventListener('DOMContentLoaded', async () => {
    // face-api.js Model Initialization
    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

    async function loadModels() {
        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
            ]);
        } catch (err) {
            console.error("Model loading failed:", err);
        }
    }

    await loadModels();

    // State management
    let records = [];

    let currentVerifyRecord = null;
    let selectedSearchRecord = null;
    let currentFacingMode = 'user';
    let currentStream = null;

    // DOM Elements
    const navItems = document.querySelectorAll('.nav-item');
    const sidebar = document.querySelector('.sidebar');
    const mobileToggle = document.getElementById('mobile-toggle');
    const sidebarClose = document.getElementById('sidebar-close');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const registrationForm = document.getElementById('registration-form');
    const babyRecordsList = document.getElementById('baby-records-list');
    const newRegBtn = document.getElementById('new-registration-btn');
    const overlay = document.getElementById('verify-overlay');
    const closeBtn = document.querySelector('.close-btn');
    const startFaceVerifyBtn = document.getElementById('start-face-verify');

    // Sidebar & Mobile Navigation functionality
    if (sidebar && mobileToggle) {
        mobileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.add('open');
            if (!document.querySelector('.sidebar-backdrop')) {
                const backdrop = document.createElement('div');
                backdrop.className = 'sidebar-backdrop';
                document.body.appendChild(backdrop);
                setTimeout(() => backdrop.classList.add('visible'), 10);
                backdrop.addEventListener('click', closeSidebar);
            }
        });
    }

    if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('open');
        const backdrop = document.querySelector('.sidebar-backdrop');
        if (backdrop) {
            backdrop.classList.remove('visible');
            setTimeout(() => backdrop.remove(), 300);
        }
    }

    document.addEventListener('click', (e) => {
        if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== mobileToggle) {
            closeSidebar();
        }
    });

    // Tab Switching
    function switchTab(targetTab) {
        closeSidebar();
        navItems.forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-tab') === targetTab);
        });

        document.querySelectorAll('.mobile-bottom-nav .nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === targetTab);
        });

        tabPanes.forEach(pane => {
            pane.classList.toggle('active', pane.id === `tab-${targetTab}`);
        });

        if (targetTab === 'records') renderFullRecords();
    }

    if (newRegBtn) newRegBtn.addEventListener('click', () => switchTab('registration'));

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(item.getAttribute('data-tab'));
        });
    });

    document.querySelectorAll('.mobile-bottom-nav .nav-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(tab.getAttribute('data-tab'));
        });
    });

    // Dashboard Search
    const dashboardSearch = document.getElementById('dashboard-search');
    if (dashboardSearch) {
        dashboardSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = records.filter(r =>
                r.babyName.toLowerCase().includes(query) ||
                r.motherName.toLowerCase().includes(query) ||
                r.id.toLowerCase().includes(query)
            );
            renderRecords(filtered);
        });
    }

    // Manual REF ID Search
    const manualSearchInput = document.getElementById('manual-search-input');
    const manualSearchBtn = document.getElementById('manual-search-btn');

    function doManualSearch() {
        const resultDisplay = document.getElementById('search-result-display');
        const displayMother = document.getElementById('res-display-mother');
        const displayBaby = document.getElementById('res-display-baby');

        const query = (manualSearchInput.value || '').trim().toLowerCase().replace('#', '');
        if (!query) {
            showNotification('Please enter a Reference ID.', 'error');
            resultDisplay.classList.add('hidden');
            selectedSearchRecord = null;
            return;
        }

        const record = records.find(r => r.id.toLowerCase().replace('#', '').includes(query));

        if (record) {
            selectedSearchRecord = record;
            displayMother.innerText = record.motherName;
            displayBaby.innerText = record.babyName;

            const faceImg = document.getElementById('res-display-face');
            const placeholder = document.getElementById('res-face-placeholder');

            if (record.babyPhoto) {
                faceImg.src = record.babyPhoto;
                faceImg.classList.remove('hidden');
                placeholder.classList.add('hidden');
            } else {
                faceImg.classList.add('hidden');
                placeholder.classList.remove('hidden');
            }

            resultDisplay.classList.remove('hidden');
            showNotification(`Record found: ${record.babyName}`, 'success');
        } else {
            showNotification('No record found for the provided ID.', 'error');
            resultDisplay.classList.add('hidden');
            selectedSearchRecord = null;
        }
    }

    if (manualSearchBtn && manualSearchInput) {
        manualSearchBtn.addEventListener('click', doManualSearch);
        manualSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                doManualSearch();
            }
        });
    }

    if (startFaceVerifyBtn) {
        startFaceVerifyBtn.addEventListener('click', () => {
            const record = selectedSearchRecord || records[0];
            if (!record) {
                showNotification('No records found.', 'error');
                return;
            }
            currentVerifyRecord = record;
            showVerificationModal(record);
        });
    }

    // Face Scan System (Registration)
    let motherFacePhoto = null;
    let motherDescriptor = null;
    let babyFacePhoto = null;
    let babyDescriptor = null;

    async function captureFace(type, previewId) {
        const preview = document.getElementById(previewId);
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        try {
            const stream = await startCameraStream(null, currentFacingMode);
            preview.innerHTML = `
                <div class="registration-scan-overlay">
                    <div class="scan-status-pill">Detecting ${type}'s face...</div>
                    <video id="face-video" autoplay muted playsinline style="width:100%;height:100%;object-fit:cover;border-radius:0.75rem;"></video>
                    <canvas id="face-canvas" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;"></canvas>
                    <button id="reg-camera-switch" class="camera-switch-btn ${isMobile ? '' : 'hidden'}" style="bottom:5px;left:5px;width:30px;height:30px;padding:0;">
                        <i data-lucide="refresh-cw" style="width:14px;"></i>
                    </button>
                    <div class="descriptor-info" style="position:absolute;bottom:5px;right:5px;font-size:10px;color:white;background:rgba(0,0,0,0.5);padding:2px 5px;border-radius:4px;">Scanning biometrics...</div>
                </div>
            `;
            const video = preview.querySelector('video');
            const canvas = preview.querySelector('#face-canvas');
            const context = canvas.getContext('2d');
            const statusPill = preview.querySelector('.scan-status-pill');
            const descriptorInfo = preview.querySelector('.descriptor-info');

            video.srcObject = stream;
            lucide.createIcons();

            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            };

            // Wire up camera switch button in registration
            const switchBtn = preview.querySelector('#reg-camera-switch');
            if (switchBtn) {
                switchBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
                    const newStream = await startCameraStream(video, currentFacingMode);
                    video.srcObject = newStream;
                    showNotification(`Switched to ${currentFacingMode} camera`, 'info');
                });
            }

            await new Promise(r => setTimeout(r, 1000)); // Wait for video to settle

            let extractedPhoto = null;
            let extractedDescriptor = null;

            const scanInterval = setInterval(async () => {
                if (video.paused || video.ended) return;

                const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                context.clearRect(0, 0, canvas.width, canvas.height);

                if (detections) {
                    const dims = faceapi.matchDimensions(canvas, video, true);
                    const resizedDetections = faceapi.resizeResults(detections, dims);
                    faceapi.draw.drawDetections(canvas, resizedDetections);

                    statusPill.innerText = "Biometrics Detected! Capturing...";
                    statusPill.style.background = "var(--success)";
                    descriptorInfo.innerText = "Identity Signature Locked";

                    if (!extractedPhoto) {
                        const captureCanvas = document.createElement('canvas');
                        captureCanvas.width = video.videoWidth;
                        captureCanvas.height = video.videoHeight;
                        captureCanvas.getContext('2d').drawImage(video, 0, 0);
                        extractedPhoto = captureCanvas.toDataURL('image/jpeg');
                        extractedDescriptor = detections.descriptor;

                        clearInterval(scanInterval);
                        stopCamera();
                        showNotification(`${type} Face Captured!`, 'success');

                        // Wait a bit to show success state in UI
                        setTimeout(() => {
                            if (type === 'Newborn') babyDescriptor = extractedDescriptor;
                            // Trigger callback manually in the promise
                        }, 500);
                    }
                } else {
                    statusPill.innerText = `Please center ${type}'s face`;
                    statusPill.style.background = "var(--warning)";
                }
            }, 500);

            // Wait until we have a photo
            while (!extractedPhoto) {
                await new Promise(r => setTimeout(r, 100));
            }

            return { photo: extractedPhoto, descriptor: extractedDescriptor };
        } catch (err) {
            console.error("Camera error:", err);
            showNotification(`Scanner error: ${err.message}`, 'error');
            stopCamera();
            return null;
        }
    }

    const scanMotherFaceBtn = document.getElementById('scan-mother-face-btn');
    if (scanMotherFaceBtn) {
        scanMotherFaceBtn.addEventListener('click', async () => {
            const preview = document.getElementById('mother-face-preview');
            preview.classList.add('active');
            const result = await captureFace('Mother', 'mother-face-preview');
            if (result) {
                motherFacePhoto = result.photo;
                motherDescriptor = result.descriptor;
                preview.innerHTML = `<i data-lucide="check-circle" style="color:var(--success)"></i><span class="scan-label">Face Scanned</span>`;
                lucide.createIcons();
            } else {
                preview.classList.remove('active');
            }
        });
    }

    const scanBabyFaceBtn = document.getElementById('scan-baby-face-btn');
    if (scanBabyFaceBtn) {
        scanBabyFaceBtn.addEventListener('click', async () => {
            const preview = document.getElementById('baby-face-preview');
            preview.classList.add('active');
            const result = await captureFace('Newborn', 'baby-face-preview');
            if (result) {
                babyFacePhoto = result.photo;
                babyDescriptor = result.descriptor;
                preview.innerHTML = `<i data-lucide="check-circle" style="color:var(--success)"></i><span class="scan-label">Face Scanned</span>`;
                lucide.createIcons();
            } else {
                preview.classList.remove('active');
            }
        });
    }

    // Form Submission
    if (registrationForm) {
        registrationForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!motherFacePhoto || !babyFacePhoto) {
                showNotification('Please complete face scans for both Mother and Baby.', 'error');
                return;
            }

            const motherName = document.getElementById('mother-name').value;
            const motherId = document.getElementById('mother-id').value;
            const babyGender = document.getElementById('baby-gender').value;
            const babyNameInput = document.getElementById('baby-name').value;
            const babyName = babyNameInput || `Baby of ${motherName}`;

            const newRecord = {
                id: `#NB-${Math.floor(Math.random() * 9000) + 1000}`,
                babyName,
                motherName,
                motherId,
                gender: babyGender,
                time: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' |'),
                status: 'Verified',
                motherPhoto: motherFacePhoto,
                babyPhoto: babyFacePhoto,
                motherDescriptor: motherDescriptor, // Store mother's descriptor
                descriptor: babyDescriptor // Store baby's descriptor for verification
            };

            records.unshift(newRecord);
            renderRecords();
            registrationForm.reset();

            motherFacePhoto = null;
            motherDescriptor = null;
            babyFacePhoto = null;
            babyDescriptor = null;

            document.getElementById('mother-face-preview').innerHTML = `<i data-lucide="camera"></i><span class="scan-label">Mother's Face</span>`;
            document.getElementById('baby-face-preview').innerHTML = `<i data-lucide="scan"></i><span class="scan-label">Baby's Face</span>`;
            document.getElementById('mother-face-preview').classList.remove('active');
            document.getElementById('baby-face-preview').classList.remove('active');

            lucide.createIcons();
            switchTab('dashboard');
            showNotification(`${babyName} registered successfully!`, 'success');
        });
    }

    function renderRecords(recordsToRender = records) {
        if (!babyRecordsList) return;
        babyRecordsList.innerHTML = recordsToRender.map(record => `
            <tr>
                <td>${record.id}</td>
                <td>
                    <div class="baby-cell">
                        <div class="baby-avatar">${record.babyName.charAt(0)}</div>
                        <span>${record.babyName}</span>
                    </div>
                </td>
                <td>${record.motherName}</td>
                <td>${record.time}</td>
                <td><span class="status-badge verified">Verified</span></td>
                <td><button class="btn-icon-m verify-trigger" data-id="${record.id}"><i data-lucide="user-check"></i> Verify</button></td>
            </tr>
        `).join('');
        lucide.createIcons();

        document.querySelectorAll('.verify-trigger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const record = records.find(r => r.id === btn.getAttribute('data-id'));
                if (record) {
                    currentVerifyRecord = record;
                    showVerificationModal(record);
                }
            });
        });
    }

    function renderFullRecords() {
        const fullList = document.getElementById('full-records-list');
        if (!fullList) return;
        fullList.innerHTML = records.map(record => `
            <tr>
                <td>${record.id}</td>
                <td>${record.motherName}</td>
                <td>${24 + Math.floor(Math.random() * 8)}</td>
                <td>${record.time.split('|')[0]}</td>
                <td>${record.babyName}</td>
                <td>Ward ${100 + Math.floor(Math.random() * 20)}</td>
                <td><span class="status-badge verified">Active</span></td>
            </tr>
        `).join('');
    }

    // Camera Management
    async function startCameraStream(videoElement, mode = currentFacingMode) {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
            currentStream = stream;
            if (videoElement) videoElement.srcObject = stream;
            return stream;
        } catch (err) {
            console.error("Camera access error:", err);
            throw err;
        }
    }

    function stopCamera() {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }
    }

    // Verification Modal Logic
    async function showVerificationModal(record) {
        overlay.classList.remove('hidden');
        const scanningSection = overlay.querySelector('.scanning-animation');
        const statusText = overlay.querySelector('.scan-status-text');
        const resultSection = overlay.querySelector('.match-result');
        const failedSection = overlay.querySelector('.match-failed');

        scanningSection.classList.remove('hidden', 'active-scan');
        statusText.classList.remove('hidden');
        resultSection.classList.add('hidden');
        failedSection.classList.add('hidden');

        scanningSection.innerHTML = `<div class="scanner-line"></div><i data-lucide="camera" class="scan-icon"></i>`;
        lucide.createIcons();
        statusText.innerText = "Initializing Face Scan...";

        try {
            const stream = await startCameraStream(null, currentFacingMode);
            if (overlay.classList.contains('hidden')) throw new Error("CLOSED");

            scanningSection.innerHTML = `
                <div class="scanner-line"></div>
                <video id="verify-video" autoplay muted playsinline style="width:100%;height:100%;object-fit:cover;"></video>
                <canvas id="verify-canvas" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;"></canvas>
            `;
            const video = scanningSection.querySelector('video');
            const canvas = scanningSection.querySelector('#verify-canvas');
            const context = canvas.getContext('2d');
            video.srcObject = stream;

            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            };

            // Inject and wire up camera switch button in verification
            scanningSection.insertAdjacentHTML('beforeend', `
                <button id="verify-camera-switch" class="camera-switch-btn" style="z-index:10;">
                    <i data-lucide="refresh-cw"></i>
                </button>
            `);
            lucide.createIcons();

            const vSwitchBtn = scanningSection.querySelector('#verify-camera-switch');
            if (vSwitchBtn) {
                vSwitchBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
                    const newStream = await startCameraStream(video, currentFacingMode);
                    video.srcObject = newStream;
                    showNotification(`Switched to ${currentFacingMode} camera`, 'info');
                });
            }

            statusText.innerText = "Searching for identity signature...";

            let matchFound = false;
            let matchDistance = 1.0;
            let finalDescriptor = null;

            const scanInterval = setInterval(async () => {
                if (video.paused || video.ended || overlay.classList.contains('hidden')) return;

                const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                context.clearRect(0, 0, canvas.width, canvas.height);

                if (detections) {
                    const dims = faceapi.matchDimensions(canvas, video, true);
                    const resizedDetections = faceapi.resizeResults(detections, dims);
                    faceapi.draw.drawDetections(canvas, resizedDetections);



                    if (record.descriptor || record.motherDescriptor) {
                        // Bidirectional Biometric Comparison
                        let matchedWho = null;
                        let bestDistance = 1.0;

                        if (record.descriptor) {
                            const dIdx = faceapi.euclideanDistance(detections.descriptor, record.descriptor);
                            if (dIdx < 0.6) {
                                matchedWho = 'baby';
                                bestDistance = dIdx;
                            }
                        }

                        if (!matchedWho && record.motherDescriptor) {
                            const dMoth = faceapi.euclideanDistance(detections.descriptor, record.motherDescriptor);
                            if (dMoth < 0.6) {
                                matchedWho = 'mother';
                                bestDistance = dMoth;
                            }
                        }

                        if (matchedWho) {
                            matchFound = true;
                            matchDistance = bestDistance;
                            clearInterval(scanInterval);
                            finishVerification(true, record, bestDistance, matchedWho);
                        }
                    } else {
                        // Simulation for legacy records
                        setTimeout(() => {
                            if (Math.random() > 0.1) finishVerification(true, record, 0.1, 'baby');
                            else finishVerification(false, record);
                            clearInterval(scanInterval);
                        }, 2000);
                        clearInterval(scanInterval);
                    }
                }
            }, 500);

            // Timeout after 8 seconds of scanning
            setTimeout(() => {
                if (!matchFound && !overlay.classList.contains('hidden')) {
                    clearInterval(scanInterval);
                    finishVerification(false, record, matchDistance);
                }
            }, 8000);

        } catch (err) {
            stopCamera();
            if (err.message !== "CLOSED") showNotification(`Camera error: ${err.message}`, 'error');
        }
    }

    function finishVerification(success, record, distance = 1.0, matchedWho = 'baby') {
        stopCamera();
        if (overlay.classList.contains('hidden')) return;

        scanningSection = overlay.querySelector('.scanning-animation');
        statusText = overlay.querySelector('.scan-status-text');

        scanningSection.classList.add('hidden');
        statusText.classList.add('hidden');

        if (success) {
            const resultSection = overlay.querySelector('.match-result');
            resultSection.classList.remove('hidden');
            document.getElementById('res-mother-name').innerText = record.motherName;
            document.getElementById('res-baby-name').innerText = record.babyName;

            const matchFaceImg = document.getElementById('res-match-baby-face');
            const matchPlaceholder = document.getElementById('res-match-placeholder');

            // Swap Logic: Show mother if baby matched, show baby if mother matched
            const photoToShow = (matchedWho === 'mother') ? record.babyPhoto : record.motherPhoto;
            const labelToShow = (matchedWho === 'mother') ? "Baby Assigned" : "Mother Assigned";

            resultSection.querySelector('h3').innerText = `${labelToShow} Found!`;

            if (photoToShow) {
                matchFaceImg.src = photoToShow;
                matchFaceImg.classList.remove('hidden');
                matchPlaceholder.classList.add('hidden');
            } else {
                matchFaceImg.classList.add('hidden');
                matchPlaceholder.classList.remove('hidden');
            }

        } else {
            const failedSection = overlay.querySelector('.match-failed');
            failedSection.classList.remove('hidden');
            failedSection.querySelector('p').innerText = distance < 1.0
                ? "Identity Mismatch. Face does not match the registered record."
                : "No face detected or scan timed out.";
            showNotification("Verification Failed", 'error');
        }
    }

    if (closeBtn) closeBtn.addEventListener('click', () => { stopCamera(); overlay.classList.add('hidden'); });
    if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) { stopCamera(); overlay.classList.add('hidden'); } });

    const retryBtn = document.getElementById('retry-scan-btn');
    if (retryBtn) retryBtn.addEventListener('click', () => showVerificationModal(currentVerifyRecord || records[0]));

    // Notification Helper
    function showNotification(message, type) {
        const note = document.createElement('div');
        note.className = `notification ${type}`;
        note.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info'}"></i><span>${message}</span>`;
        document.body.appendChild(note);
        lucide.createIcons();
        setTimeout(() => { note.style.opacity = '1'; note.style.transform = 'translateY(0)'; }, 10);
        setTimeout(() => { note.style.opacity = '0'; note.style.transform = 'translateY(10px)'; setTimeout(() => note.remove(), 300); }, 4000);
    }

    // Global Camera Switch Logic
    document.querySelectorAll('.global-camera-switch').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

            // Update all global switch buttons
            document.querySelectorAll('.global-camera-switch').forEach(b => {
                b.innerHTML = `<i data-lucide="refresh-cw"></i> Switch Camera (${currentFacingMode === 'user' ? 'Front' : 'Back'})`;
            });
            lucide.createIcons();

            showNotification(`Camera preference set to ${currentFacingMode}`, 'info');
        });
    });

    renderRecords();
});
