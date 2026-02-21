document.addEventListener('DOMContentLoaded', () => {
    // State management
    let records = [
        { id: '#NB-9042', babyName: 'Saptarshi', motherName: 'Rupa Dash', time: '20 Feb, 2026 | 14:30', status: 'Verified' },
        { id: '#NB-9041', babyName: 'Ripon', motherName: 'Ruma Deb', time: '20 Feb, 2026 | 12:15', status: 'Verified' },
        { id: '#NB-9040', babyName: 'Raju', motherName: 'Pinkey Roy', time: '19 Feb, 2026 | 23:45', status: 'Verified' }
    ];

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

    if (startFaceVerifyBtn) {
        startFaceVerifyBtn.addEventListener('click', () => {
            showVerificationModal(records[0]); // Demo: Match with first stored record
        });
    }

    if (!sidebar || !mobileToggle) {
        console.warn('Sidebar or mobile toggle not found');
    } else {
        // Mobile Sidebar Toggle
        mobileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('open');
        });

        // Close sidebar when clicking outside on mobile
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

            // Close sidebar on mobile after selection
            if (sidebar && window.innerWidth <= 1024) {
                sidebar.classList.remove('open');
            }
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            tabPanes.forEach(pane => {
                pane.classList.remove('active');
                if (pane.id === `tab-${targetTab}`) {
                    pane.classList.add('active');
                }
            });

            if (targetTab === 'records') {
                renderFullRecords();
            }
        });
    });



    // Quick Actions
    document.querySelectorAll('.action-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.querySelector('span').innerText;
            showNotification(`${action} started...`, 'success');
        });
    });

    // Main Verification Portal Trigger


    // Special case for "New Born Registration" button in header
    if (newRegBtn) {
        newRegBtn.addEventListener('click', () => {
            const regTab = document.querySelector('[data-tab="registration"]');
            if (regTab) regTab.click();
        });
    }

    // Dashboard Search Logic
    const dashboardSearch = document.getElementById('dashboard-search');
    if (dashboardSearch) {
        dashboardSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filteredRecords = records.filter(record =>
                record.babyName.toLowerCase().includes(query) ||
                record.motherName.toLowerCase().includes(query) ||
                record.id.toLowerCase().includes(query)
            );
            renderRecords(filteredRecords);
        });
    }

    // Manual Search Logic
    const manualSearchInput = document.getElementById('manual-search-input');
    const manualSearchBtn = document.getElementById('manual-search-btn');

    if (manualSearchBtn && manualSearchInput) {
        const resultDisplay = document.getElementById('search-result-display');
        const displayMother = document.getElementById('res-display-mother');
        const displayBaby = document.getElementById('res-display-baby');

        manualSearchBtn.addEventListener('click', () => {
            const query = manualSearchInput.value.trim().toLowerCase();
            if (!query) {
                showNotification('Please enter a Reference ID.', 'error');
                resultDisplay.classList.add('hidden');
                return;
            }

            const record = records.find(r => r.id.toLowerCase().includes(query));
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
            } else {
                showNotification('No record found for the provided ID.', 'error');
                resultDisplay.classList.add('hidden');
            }
        });
    }



    // Face Scan System
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
                <video id="face-video" autoplay muted playsinline style="width: 100%; height: 100%; object-fit: cover; border-radius: 0.75rem;"></video>
                <button id="reg-camera-switch" class="camera-switch-btn ${isMobile ? '' : 'hidden'}" style="bottom: 10px; left: 10px; padding: 5px;">
                    <i data-lucide="refresh-cw" style="width: 16px; height: 16px;"></i>
                </button>
            `;
            const video = preview.querySelector('video');
            video.srcObject = stream;
            lucide.createIcons();

            // Handle Switch Button Click for Registration
            const switchBtn = preview.querySelector('#reg-camera-switch');
            if (switchBtn) {
                switchBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
                    showNotification(`Switching camera...`, 'success');
                    await startCameraStream(video, currentFacingMode);
                });
            }

            return new Promise(resolve => {
                setTimeout(() => {
                    // Capture frame
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0);
                    const photo = canvas.toDataURL('image/jpeg');

                    // Stop stream
                    if (currentStream) {
                        currentStream.getTracks().forEach(track => track.stop());
                    }
                    showNotification(`${type} Face Captured!`, 'success');
                    resolve(photo);
                }, 4000); // 4 seconds to allow for camera switching
            });
        } catch (err) {
            console.error("Camera error:", err);
            showNotification(`Camera access denied. Simulating ${type} scan...`, 'warning');
            preview.innerHTML = `<div class="spinner"></div><span class="scan-label">Scanning ${type}...</span>`;
            return new Promise(resolve => setTimeout(() => resolve("SIMULATED_PHOTO"), 2500));
        }
    }



    scanMotherFaceBtn.addEventListener('click', async () => {
        motherFacePreview.classList.add('active');
        const photo = await captureFace('Mother', 'mother-face-preview');
        motherFacePreview.innerHTML = `<i data-lucide="check-circle" style="color: var(--success)"></i><span class="scan-label">Face Scanned</span>`;
        lucide.createIcons();
        motherFaceScanned = true;
        motherFacePhoto = photo;
        checkScans();
    });



    scanBabyFaceBtn.addEventListener('click', async () => {
        babyFacePreview.classList.add('active');
        const photo = await captureFace('Newborn', 'baby-face-preview');
        babyFacePreview.innerHTML = `<i data-lucide="check-circle" style="color: var(--success)"></i><span class="scan-label">Face Scanned</span>`;
        lucide.createIcons();
        babyFaceScanned = true;
        babyFacePhoto = photo;
        checkScans();
    });

    function checkScans() {
        if (motherFaceScanned && babyFaceScanned) {
            showNotification('Face pairing link established!', 'success');
        }
    }

    // Form Submission
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
            babyName: babyName,
            motherName: motherName,
            time: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' |'),
            status: 'Verified',
            motherPhoto: motherFacePhoto,
            babyPhoto: babyFacePhoto
        };

        records.unshift(newRecord);
        renderRecords();
        resetForm();

        // Return to dashboard
        document.querySelector('[data-tab="dashboard"]').click();
        showNotification(`${babyName} registered and paired successfully!`, 'success');
    });

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

        // Add verification triggers
        document.querySelectorAll('.verify-trigger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const record = records.find(r => r.id === id);
                showVerificationModal(record);
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

    // Settings Toggle Logic
    const toggles = document.querySelectorAll('.toggle-switch');
    toggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('off');
            const state = toggle.classList.contains('off') ? 'Disabled' : 'Enabled';
            showNotification(`Feature ${state}`, 'success');
        });
    });

    // Settings Button Logic
    document.querySelectorAll('.tab-pane#tab-settings .btn-outline').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.innerText;
            showNotification(`${action} in progress...`, 'success');
            setTimeout(() => {
                showNotification(`${action} completed!`, 'success');
            }, 1000);
        });
    });

    function resetForm() {
        registrationForm.reset();
        motherFaceScanned = false;
        motherFacePhoto = null;
        babyFaceScanned = false;
        babyFacePhoto = null;
        motherFacePreview.innerHTML = `<i data-lucide="camera"></i><span class="scan-label">Mother's Face</span>`;
        babyFacePreview.innerHTML = `<i data-lucide="scan"></i><span class="scan-label">Baby's Face</span>`;
        motherFacePreview.classList.remove('active');
        babyFacePreview.classList.remove('active');
        lucide.createIcons();
    }

    // Camera Management
    let currentFacingMode = 'user';
    let currentStream = null;

    async function startCameraStream(videoElement, mode = currentFacingMode) {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: mode }
            });
            currentStream = stream;
            if (videoElement) videoElement.srcObject = stream;
            return stream;
        } catch (err) {
            console.error("Camera access error:", err);
            throw err;
        }
    }

    // Verification Modal Logic
    async function showVerificationModal(record) {
        overlay.classList.remove('hidden');
        const scanningSection = overlay.querySelector('.scanning-animation');
        const statusText = overlay.querySelector('.scan-status-text');
        const resultSection = overlay.querySelector('.match-result');
        const failedSection = overlay.querySelector('.match-failed');

        // Check if mobile to show switch button
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        scanningSection.classList.remove('hidden', 'active-scan');
        statusText.classList.remove('hidden');
        resultSection.classList.add('hidden');
        failedSection.classList.add('hidden');

        // Reset scanning section UI
        scanningSection.innerHTML = `
            <div class="scanner-line"></div>
            <i data-lucide="camera" class="scan-icon"></i>
            <button id="camera-switch-btn" class="camera-switch-btn ${isMobile ? '' : 'hidden'}">
                <i data-lucide="refresh-cw"></i>
            </button>
        `;
        lucide.createIcons();

        // Handle Switch Button Click
        const newSwitchBtn = scanningSection.querySelector('#camera-switch-btn');
        if (newSwitchBtn) {
            newSwitchBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
                showNotification(`Switching to ${currentFacingMode} camera...`, 'success');

                // Restart only the camera streaming part without full modal reset
                try {
                    const video = scanningSection.querySelector('video');
                    if (video) {
                        await startCameraStream(video, currentFacingMode);
                    }
                } catch (err) {
                    showNotification("Camera switch failed.", "error");
                }
            });
        }

        statusText.innerText = "Initializing Face Scan...";

        try {
            const stream = await startCameraStream(null, currentFacingMode);
            const videoHTML = `<video id="verify-video" autoplay muted playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>`;
            scanningSection.insertAdjacentHTML('afterbegin', videoHTML);
            const video = scanningSection.querySelector('video');
            video.srcObject = stream;

            // Phase 1: Human Face Detection
            statusText.innerText = "Detecting human face...";
            await new Promise(r => setTimeout(r, 1500));

            // Simulation: 95% chance to detect a face
            if (Math.random() > 0.95) {
                throw new Error("HUMAN_FACE_NOT_DETECTED");
            }

            // Phase 2: Feature Analysis
            statusText.innerText = "Face detected. Analysing features...";
            scanningSection.classList.add('active-scan'); // Visual feedback
            await new Promise(r => setTimeout(r, 1500));

            // Phase 3: Matching - WITH SIMILARITY CALCULATION
            statusText.innerText = "Matching face with biometric records...";
            scanningSection.insertAdjacentHTML('beforeend', `<div class="scan-overlay-grid active"></div><div class="similarity-score">Analyzing...</div>`);
            const scoreBadge = scanningSection.querySelector('.similarity-score');

            // Simulated Security Decision
            const forceFail = window.event && window.event.shiftKey;
            const isMatch = !forceFail && Math.random() > 0.55;

            let currentScore = 0;
            let targetScore = isMatch ? (Math.floor(Math.random() * 5) + 95) : (Math.floor(Math.random() * 20) + 60);

            const scoreInterval = setInterval(() => {
                const increment = Math.floor(Math.random() * 10) + 2;
                currentScore += increment;
                if (currentScore >= targetScore) {
                    currentScore = targetScore;
                    clearInterval(scoreInterval);
                }
                scoreBadge.innerText = `Similarity: ${currentScore}%`;
            }, 100);

            await new Promise(r => setTimeout(r, 2500));
            clearInterval(scoreInterval);

            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
            }

            if (isMatch) {
                showMatchSuccess(record);
            } else {
                const reason = forceFail ? "Wrong Identity Detected" : (currentScore < 90 ? "Biological Mismatch" : "Face Not Recognized");
                showMatchFailure(reason === "Wrong Identity Detected" ? "Wrong Face Detected! Identity does not match hospital records." : null);
            }

        } catch (err) {
            console.error("Verification error:", err);
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
            }
            statusText.innerText = err.message === "HUMAN_FACE_NOT_DETECTED" ? "No human face detected!" : "Camera access error!";
            setTimeout(() => {
                showMatchFailure("Face not detected. Ensure face is visible in camera.");
            }, 1000);
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

        if (customMsg) {
            failedSection.querySelector('p').innerText = customMsg;
        } else {
            failedSection.querySelector('p').innerText = "Face not match with our record database.";
        }

        lucide.createIcons(); // Ensure the Red Cross icon is rendered
        showNotification("Verification Failed", 'error');
    }

    // Retry Button logic
    document.getElementById('retry-scan-btn').addEventListener('click', () => {
        const id = document.querySelector('.verify-trigger').getAttribute('data-id'); // Fallback or current
        showVerificationModal(records[0]); // For demo, restart with first record
    });

    closeBtn.addEventListener('click', () => {
        overlay.classList.add('hidden');
    });

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

// Add extra styles for dynamic elements via script for convenience (or I could have added it to style.css)
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
        z-index: 2000;
        transition: all 0.3s ease;
        opacity: 0;
        transform: translateX(20px);
        border-left: 4px solid var(--primary);
    }
    .notification.success { border-left-color: var(--success); }
    .notification.error { border-left-color: var(--danger); }
    
    .spinner {
        width: 30px;
        height: 30px;
        border: 3px solid var(--primary-light);
        border-top-color: var(--primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
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
    }
    .btn-icon-m:hover { background: var(--primary); color: white; }
`;
document.head.appendChild(style);
