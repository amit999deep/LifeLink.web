document.addEventListener('DOMContentLoaded', () => {
    // State management
    let records = [
        { id: '#NB-9042', babyName: 'Saptarshi', motherName: 'Rupa Dash', time: '20 Feb, 2026 | 14:30', status: 'Verified' },
        { id: '#NB-9041', babyName: 'Ripon', motherName: 'Ruma Deb', time: '20 Feb, 2026 | 12:15', status: 'Verified' },
        { id: '#NB-9040', babyName: 'Raju', motherName: 'Pinkey Roy', time: '19 Feb, 2026 | 23:45', status: 'Verified' }
    ];

    // Track current record being verified so retry works correctly
    let currentVerifyRecord = null;

    // DOM Elements
    const navItems = document.querySelectorAll('.nav-item');
    const sidebar = document.querySelector('.sidebar');
    const mobileToggle = document.getElementById('mobile-toggle');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const registrationForm = document.getElementById('registration-form');
    const babyRecordsList = document.getElementById('baby-records-list');
    const newRegBtn = document.getElementById('new-registration-btn');
    const overlay = document.getElementById('verify-overlay');
    const closeBtn = document.querySelector('.close-btn');
    const startFaceVerifyBtn = document.getElementById('start-face-verify');

    // "Verify Baby Face" button on Face Identification tab
    if (startFaceVerifyBtn) {
        startFaceVerifyBtn.addEventListener('click', () => {
            const record = records[0];
            if (!record) {
                showNotification('No records found. Please register first.', 'error');
                return;
            }
            currentVerifyRecord = record;
            showVerificationModal(record);
        });
    }

    if (sidebar && mobileToggle) {
        mobileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== mobileToggle) {
                sidebar.classList.remove('open');
            }
        });
    }

    // Tab Switching Logic
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const targetTab = item.getAttribute('data-tab');
            if (!targetTab) return;
            e.preventDefault();

            if (sidebar && window.innerWidth <= 1024) {
                sidebar.classList.remove('open');
            }
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Sync bottom nav
            document.querySelectorAll('.mobile-bottom-nav .nav-tab').forEach(t => {
                t.classList.toggle('active', t.getAttribute('data-tab') === targetTab);
            });

            tabPanes.forEach(pane => {
                pane.classList.remove('active');
                if (pane.id === `tab-${targetTab}`) {
                    pane.classList.add('active');
                }
            });

            if (targetTab === 'records') renderFullRecords();
        });
    });

    // Mobile bottom nav tab switching
    document.querySelectorAll('.mobile-bottom-nav .nav-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = tab.getAttribute('data-tab');
            if (!targetTab) return;

            // Sync sidebar nav
            navItems.forEach(nav => nav.classList.toggle('active', nav.getAttribute('data-tab') === targetTab));

            // Sync bottom nav
            document.querySelectorAll('.mobile-bottom-nav .nav-tab').forEach(t => {
                t.classList.toggle('active', t.getAttribute('data-tab') === targetTab);
            });

            tabPanes.forEach(pane => {
                pane.classList.remove('active');
                if (pane.id === `tab-${targetTab}`) pane.classList.add('active');
            });

            if (targetTab === 'records') renderFullRecords();
        });
    });

    // Quick Actions
    document.querySelectorAll('.action-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.querySelector('span').innerText;
            showNotification(`${action} started...`, 'success');
        });
    });

    // "New Born Registration" header button
    if (newRegBtn) {
        newRegBtn.addEventListener('click', () => {
            const regTab = document.querySelector('[data-tab="registration"]');
            if (regTab) regTab.click();
        });
    }

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

    // Manual REF ID Search — supports button click AND Enter key
    const manualSearchInput = document.getElementById('manual-search-input');
    const manualSearchBtn = document.getElementById('manual-search-btn');

    function doManualSearch() {
        const resultDisplay = document.getElementById('search-result-display');
        const displayMother = document.getElementById('res-display-mother');
        const displayBaby = document.getElementById('res-display-baby');

        const query = manualSearchInput.value.trim().toLowerCase().replace('#', '');
        if (!query) {
            showNotification('Please enter a Reference ID.', 'error');
            resultDisplay.classList.add('hidden');
            return;
        }

        const record = records.find(r =>
            r.id.toLowerCase().replace('#', '').includes(query)
        );

        if (record) {
            displayMother.innerText = record.motherName;
            displayBaby.innerText = record.babyName;

            const faceImg = document.getElementById('res-display-face');
            const placeholder = document.getElementById('res-face-placeholder');

            if (record.babyPhoto && record.babyPhoto !== "SIMULATED_PHOTO") {
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

    // Face Scan System (Registration)
    let motherFaceScanned = false;
    let motherFacePhoto = null;
    let babyFaceScanned = false;
    let babyFacePhoto = null;

    const scanMotherFaceBtn = document.getElementById('scan-mother-face-btn');
    const motherFacePreview = document.getElementById('mother-face-preview');
    const scanBabyFaceBtn = document.getElementById('scan-baby-face-btn');
    const babyFacePreview = document.getElementById('baby-face-preview');

    async function captureFace(type, previewId) {
        const preview = document.getElementById(previewId);
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        try {
            showNotification(`Accessing camera for ${type}...`, 'success');
            const stream = await startCameraStream(null, currentFacingMode);

            preview.innerHTML = `
                <video id="face-video" autoplay muted playsinline style="width:100%;height:100%;object-fit:cover;border-radius:0.75rem;"></video>
                <button id="reg-camera-switch" class="camera-switch-btn ${isMobile ? '' : 'hidden'}" style="bottom:10px;left:10px;padding:5px;">
                    <i data-lucide="refresh-cw" style="width:16px;height:16px;"></i>
                </button>
            `;
            const video = preview.querySelector('video');
            video.srcObject = stream;
            lucide.createIcons();

            const switchBtn = preview.querySelector('#reg-camera-switch');
            if (switchBtn) {
                switchBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
                    showNotification('Switching camera...', 'success');
                    await startCameraStream(video, currentFacingMode);
                });
            }

            return new Promise(resolve => {
                setTimeout(() => {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth || 320;
                    canvas.height = video.videoHeight || 240;
                    canvas.getContext('2d').drawImage(video, 0, 0);
                    const photo = canvas.toDataURL('image/jpeg');
                    stopCamera();
                    showNotification(`${type} Face Captured!`, 'success');
                    resolve(photo);
                }, 4000);
            });
        } catch (err) {
            console.error("Camera error:", err);
            showNotification(`Camera unavailable. Simulating ${type} scan...`, 'error');
            preview.innerHTML = `<div class="spinner"></div><span class="scan-label">Scanning ${type}...</span>`;
            return new Promise(resolve => setTimeout(() => resolve("SIMULATED_PHOTO"), 2500));
        }
    }

    if (scanMotherFaceBtn) {
        scanMotherFaceBtn.addEventListener('click', async () => {
            motherFacePreview.classList.add('active');
            const photo = await captureFace('Mother', 'mother-face-preview');
            motherFacePreview.innerHTML = `<i data-lucide="check-circle" style="color:var(--success)"></i><span class="scan-label">Face Scanned</span>`;
            lucide.createIcons();
            motherFaceScanned = true;
            motherFacePhoto = photo;
            checkScans();
        });
    }

    if (scanBabyFaceBtn) {
        scanBabyFaceBtn.addEventListener('click', async () => {
            babyFacePreview.classList.add('active');
            const photo = await captureFace('Newborn', 'baby-face-preview');
            babyFacePreview.innerHTML = `<i data-lucide="check-circle" style="color:var(--success)"></i><span class="scan-label">Face Scanned</span>`;
            lucide.createIcons();
            babyFaceScanned = true;
            babyFacePhoto = photo;
            checkScans();
        });
    }

    function checkScans() {
        if (motherFaceScanned && babyFaceScanned) {
            showNotification('Face pairing link established!', 'success');
        }
    }

    // Form Submission
    if (registrationForm) {
        registrationForm.addEventListener('submit', (e) => {
            e.preventDefault();

            if (!motherFaceScanned || !babyFaceScanned) {
                showNotification('Please complete face scans for both Mother and Baby.', 'error');
                return;
            }

            const motherName = document.getElementById('mother-name').value;
            const motherId = document.getElementById('mother-id').value;
            const babyNameInput = document.getElementById('baby-name').value;

            if (motherId.length !== 6 || !/^\d+$/.test(motherId)) {
                showNotification('Hospital ID must be exactly 6 digits.', 'error');
                return;
            }

            const babyName = babyNameInput || `Baby of ${motherName}`;
            const newRecord = {
                id: `#NB-${Math.floor(Math.random() * 9000) + 1000}`,
                babyName,
                motherName,
                time: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' |'),
                status: 'Verified',
                motherPhoto: motherFacePhoto,
                babyPhoto: babyFacePhoto
            };

            records.unshift(newRecord);
            renderRecords();
            resetForm();
            document.querySelector('[data-tab="dashboard"]').click();
            showNotification(`${babyName} registered and paired successfully!`, 'success');
        });
    }

    function renderRecords(recordsToRender = records) {
        babyRecordsList.innerHTML = recordsToRender.map(record => `
            <tr>
                <td>${record.id}</td>
                <td>
                    <div class="baby-cell">
                        <div class="baby-avatar">${record.babyName.charAt(record.babyName.startsWith('Baby') ? 5 : 0)}</div>
                        <span>${record.babyName}</span>
                    </div>
                </td>
                <td>${record.motherName}</td>
                <td>${record.time}</td>
                <td><span class="status-badge verified">${record.status}</span></td>
                <td><button class="btn-icon-m verify-trigger" data-id="${record.id}"><i data-lucide="user-check"></i> Verify Baby Face</button></td>
            </tr>
        `).join('');
        lucide.createIcons();

        document.querySelectorAll('.verify-trigger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const record = records.find(r => r.id === id);
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
                <td>H-${record.id.split('-')[1]}</td>
                <td>${record.motherName}</td>
                <td>${24 + Math.floor(Math.random() * 10)}</td>
                <td>${record.time.split('|')[0]}</td>
                <td>${record.babyName}</td>
                <td>Room ${100 + Math.floor(Math.random() * 50)}</td>
                <td><span class="status-badge verified">Discharged</span></td>
            </tr>
        `).join('');
    }

    function resetForm() {
        registrationForm.reset();
        motherFaceScanned = false;
        motherFacePhoto = null;
        babyFaceScanned = false;
        babyFacePhoto = null;
        if (motherFacePreview) {
            motherFacePreview.innerHTML = `<i data-lucide="camera"></i><span class="scan-label">Mother's Face</span>`;
            motherFacePreview.classList.remove('active');
        }
        if (babyFacePreview) {
            babyFacePreview.innerHTML = `<i data-lucide="scan"></i><span class="scan-label">Baby's Face</span>`;
            babyFacePreview.classList.remove('active');
        }
        lucide.createIcons();
    }

    // Camera Management
    let currentFacingMode = 'user';
    let currentStream = null;

    async function startCameraStream(videoElement, mode = currentFacingMode) {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
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

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        scanningSection.classList.remove('hidden', 'active-scan');
        statusText.classList.remove('hidden');
        resultSection.classList.add('hidden');
        failedSection.classList.add('hidden');

        scanningSection.innerHTML = `
            <div class="scanner-line"></div>
            <i data-lucide="camera" class="scan-icon"></i>
            <button id="camera-switch-btn" class="camera-switch-btn ${isMobile ? '' : 'hidden'}">
                <i data-lucide="refresh-cw"></i>
            </button>
        `;
        lucide.createIcons();

        const newSwitchBtn = scanningSection.querySelector('#camera-switch-btn');
        if (newSwitchBtn) {
            newSwitchBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
                showNotification(`Switching to ${currentFacingMode} camera...`, 'success');
                try {
                    const video = scanningSection.querySelector('video');
                    if (video) await startCameraStream(video, currentFacingMode);
                } catch (err) {
                    showNotification("Camera switch failed.", "error");
                }
            });
        }

        statusText.innerText = "Initializing Face Scan...";

        try {
            const stream = await startCameraStream(null, currentFacingMode);
            scanningSection.insertAdjacentHTML('afterbegin', `<video id="verify-video" autoplay muted playsinline style="width:100%;height:100%;object-fit:cover;"></video>`);
            const video = scanningSection.querySelector('video');
            video.srcObject = stream;

            statusText.innerText = "Detecting human face...";
            await new Promise(r => setTimeout(r, 1500));

            // 98% face detection success
            if (Math.random() > 0.98) throw new Error("HUMAN_FACE_NOT_DETECTED");

            statusText.innerText = "Face detected. Analysing features...";
            scanningSection.classList.add('active-scan');
            await new Promise(r => setTimeout(r, 1500));

            statusText.innerText = "Matching face with biometric records...";
            scanningSection.insertAdjacentHTML('beforeend', `<div class="scan-overlay-grid active"></div><div class="similarity-score">Analyzing...</div>`);
            const scoreBadge = scanningSection.querySelector('.similarity-score');

            // 90% match success rate
            const isMatch = Math.random() > 0.10;
            let currentScore = 0;
            const targetScore = isMatch ? (Math.floor(Math.random() * 5) + 94) : (Math.floor(Math.random() * 15) + 60);

            const scoreInterval = setInterval(() => {
                currentScore += Math.floor(Math.random() * 10) + 2;
                if (currentScore >= targetScore) {
                    currentScore = targetScore;
                    clearInterval(scoreInterval);
                }
                scoreBadge.innerText = `Similarity: ${currentScore}%`;
            }, 100);

            await new Promise(r => setTimeout(r, 2500));
            clearInterval(scoreInterval);
            stopCamera();

            if (isMatch) {
                showMatchSuccess(record);
            } else {
                showMatchFailure("Face not match with our record database.");
            }

        } catch (err) {
            console.error("Verification error:", err);
            stopCamera();

            if (err.message === "HUMAN_FACE_NOT_DETECTED") {
                statusText.innerText = "No human face detected!";
                setTimeout(() => showMatchFailure("Face not detected. Ensure face is visible in camera."), 1000);
            } else {
                // Graceful simulation fallback when camera is unavailable
                showNotification("Camera unavailable. Running simulation...", 'error');
                statusText.innerText = "Simulating face scan...";
                scanningSection.innerHTML = `<div class="spinner"></div>`;
                await new Promise(r => setTimeout(r, 3000));

                const simMatch = Math.random() > 0.15;
                if (simMatch) {
                    showMatchSuccess(record);
                } else {
                    showMatchFailure("Simulated verification failed. Please try again.");
                }
            }
        }
    }

    function showMatchSuccess(record) {
        const scanningSection = overlay.querySelector('.scanning-animation');
        const statusText = overlay.querySelector('.scan-status-text');
        const resultSection = overlay.querySelector('.match-result');

        scanningSection.classList.add('hidden');
        statusText.classList.add('hidden');
        resultSection.classList.remove('hidden');

        document.getElementById('res-mother-name').innerText = record.motherName;
        document.getElementById('res-baby-name').innerText = record.babyName;

        const matchFaceImg = document.getElementById('res-match-baby-face');
        const matchPlaceholder = document.getElementById('res-match-placeholder');

        if (record.motherPhoto && record.motherPhoto !== "SIMULATED_PHOTO") {
            matchFaceImg.src = record.motherPhoto;
            matchFaceImg.classList.remove('hidden');
            matchPlaceholder.classList.add('hidden');
        } else {
            matchFaceImg.classList.add('hidden');
            matchPlaceholder.classList.remove('hidden');
        }
        showNotification("Identity Match Found!", 'success');
    }

    function showMatchFailure(customMsg) {
        const scanningSection = overlay.querySelector('.scanning-animation');
        const statusText = overlay.querySelector('.scan-status-text');
        const failedSection = overlay.querySelector('.match-failed');

        scanningSection.classList.add('hidden');
        statusText.classList.add('hidden');
        failedSection.classList.remove('hidden');
        failedSection.querySelector('p').innerText = customMsg || "Face not match with our record database.";
        lucide.createIcons();
        showNotification("Verification Failed", 'error');
    }

    // Retry — uses the same record that was last being verified
    const retryBtn = document.getElementById('retry-scan-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            const record = currentVerifyRecord || records[0];
            if (record) showVerificationModal(record);
        });
    }

    // Close modal and stop camera
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            stopCamera();
            overlay.classList.add('hidden');
        });
    }

    // Close on overlay background tap/click
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                stopCamera();
                overlay.classList.add('hidden');
            }
        });
    }

    // Notification Helper
    function showNotification(message, type) {
        const note = document.createElement('div');
        note.className = `notification ${type}`;
        note.innerHTML = `
            <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(note);
        lucide.createIcons();

        setTimeout(() => {
            note.style.opacity = '1';
            note.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            note.style.opacity = '0';
            note.style.transform = 'translateX(20px)';
            setTimeout(() => note.remove(), 300);
        }, 4000);
    }

    // Initial Render
    renderRecords();
});

// Dynamic styles
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: white;
        padding: 1rem 1.5rem;
        border-radius: 0.75rem;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        gap: 0.75rem;
        z-index: 9999;
        transition: all 0.3s ease;
        opacity: 0;
        transform: translateX(20px);
        border-left: 4px solid var(--primary);
        max-width: 320px;
    }
    .notification.success { border-left-color: var(--success); }
    .notification.error { border-left-color: var(--danger); }

    .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid var(--primary-light);
        border-top-color: var(--primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .btn-icon-m {
        background: var(--primary-light);
        color: var(--primary);
        border: none;
        padding: 0.5rem 0.75rem;
        border-radius: 0.5rem;
        cursor: pointer;
        font-size: 0.75rem;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 0.25rem;
        white-space: nowrap;
    }
    .btn-icon-m:hover { background: var(--primary); color: white; }

    @media (max-width: 480px) {
        .notification {
            bottom: 1rem;
            right: 1rem;
            left: 1rem;
            max-width: none;
        }
    }
`;
document.head.appendChild(style);
