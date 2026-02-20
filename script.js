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
    const startMainVerifyBtn = document.getElementById('start-main-verify');
    const exportBtn = document.getElementById('export-records');

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

    // Simulated Export
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            showNotification('Preparing patient reports...', 'success');
            setTimeout(() => {
                showNotification('Report (LL-2026-FEB.pdf) downloaded!', 'success');
            }, 2000);
        });
    }

    // Quick Actions
    document.querySelectorAll('.action-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.querySelector('span').innerText;
            showNotification(`${action} started...`, 'success');
        });
    });

    // Main Verification Portal Trigger
    if (startMainVerifyBtn) {
        startMainVerifyBtn.addEventListener('click', () => {
            showVerificationModal(records[0]); // Demo with the first record
        });
    }

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
                resultDisplay.classList.remove('hidden');
            } else {
                showNotification('No record found for the provided ID.', 'error');
                resultDisplay.classList.add('hidden');
            }
        });
    }

    // Biometric Scan Simulation
    const scanMotherBtn = document.getElementById('scan-mother-btn');
    const scanBabyBtn = document.getElementById('scan-baby-btn');
    const motherPreview = document.getElementById('mother-scan-preview');
    const babyPreview = document.getElementById('baby-scan-preview');

    let motherScanned = false;
    let babyScanned = false;

    scanMotherBtn.addEventListener('click', () => {
        simulateScan(motherPreview, 'Mother', () => {
            motherScanned = true;
            checkScans();
        });
    });

    scanBabyBtn.addEventListener('click', () => {
        simulateScan(babyPreview, 'Newborn', () => {
            babyScanned = true;
            checkScans();
        });
    });

    function simulateScan(element, type, callback) {
        element.innerHTML = `<div class="spinner"></div><span class="scan-label">Scanning ${type}...</span>`;
        element.classList.add('active');

        setTimeout(() => {
            element.innerHTML = `<i data-lucide="check-circle" style="color: var(--success)"></i><span class="scan-label">${type} Scanned</span>`;
            lucide.createIcons();
            callback();
        }, 2000);
    }

    function checkScans() {
        if (motherScanned && babyScanned) {
            showNotification('Biometric link established successfully!', 'success');
        }
    }

    // Form Submission
    registrationForm.addEventListener('submit', (e) => {
        e.preventDefault();

        if (!motherScanned || !babyScanned) {
            showNotification('Please complete biometric scans for both Mother and Baby.', 'error');
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
            status: 'Verified'
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
                <td><button class="btn-icon-m verify-trigger" data-id="${record.id}"><i data-lucide="shield-check"></i> Verify</button></td>
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
        motherScanned = false;
        babyScanned = false;
        motherPreview.innerHTML = `<i data-lucide="fingerprint"></i><span class="scan-label">Mother's Fingerprint</span>`;
        babyPreview.innerHTML = `<i data-lucide="hand"></i><span class="scan-label">Baby's Palm Scan</span>`;
        motherPreview.classList.remove('active');
        babyPreview.classList.remove('active');
        lucide.createIcons();
    }

    // Verification Modal Logic
    function showVerificationModal(record) {
        overlay.classList.remove('hidden');
        const scanningSection = overlay.querySelector('.scanning-animation');
        const statusText = overlay.querySelector('.scan-status-text');
        const resultSection = overlay.querySelector('.match-result');

        scanningSection.classList.remove('hidden');
        statusText.classList.remove('hidden');
        resultSection.classList.add('hidden');
        statusText.innerText = "Scanning Mother's Fingerprint...";

        setTimeout(() => {
            statusText.innerText = "Matching with Newborn Database...";
            setTimeout(() => {
                scanningSection.classList.add('hidden');
                statusText.classList.add('hidden');
                resultSection.classList.remove('hidden');

                document.getElementById('res-mother-name').innerText = record.motherName;
                document.getElementById('res-baby-name').innerText = record.babyName;
            }, 1500);
        }, 2000);
    }

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
