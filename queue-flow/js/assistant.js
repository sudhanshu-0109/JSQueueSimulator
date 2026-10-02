/**
 * MediQueue - Assistant Dashboard Controller
 * 
 * Manages patient registration, sequential token generation,
 * and ENQUEUE operations into the waiting queue.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Core State
    let queue = MediStorage.getQueue();

    // 2. DOM Elements
    const form = document.getElementById('registration-form');
    const nameInput = document.getElementById('patient-name');
    const ageInput = document.getElementById('patient-age');
    const phoneInput = document.getElementById('patient-phone');
    const queueContainer = document.getElementById('queue-container');
    const queueBadge = document.getElementById('queue-count-badge');

    // KPI Elements
    const kpiWaiting = document.getElementById('kpi-waiting');
    const kpiServing = document.getElementById('kpi-serving');
    const kpiServingName = document.getElementById('kpi-serving-name');
    const kpiNextToken = document.getElementById('kpi-next-token');
    const kpiCompleted = document.getElementById('kpi-completed');

    // Modal Elements
    const modal = document.getElementById('token-modal');
    const modalClose = document.getElementById('token-modal-close');
    const modalOk = document.getElementById('token-modal-ok');
    const modalTokenNum = document.getElementById('modal-token-num');
    const modalPatientName = document.getElementById('modal-patient-name');
    const modalPatientDetails = document.getElementById('modal-patient-details');

    // 3. Render Initial State
    renderAll();

    // 4. Form Submit Handler (ENQUEUE)
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = nameInput.value.trim();
            const age = ageInput.value.trim();
            const phone = phoneInput.value.trim();

            if (!name) {
                showToast('Patient name is required.', 'danger');
                nameInput.focus();
                return;
            }

            // Generate next sequential token (e.g. T-001)
            const token = MediToken.generate();

            // Construct minimal patient object
            const patient = {
                token,
                name,
                age: age ? parseInt(age, 10) : null,
                phone: phone || null,
                joinedAt: Date.now()
            };

            // Call queue.enqueue() - O(1) DSA Operation
            queue.enqueue(patient);

            // Persist updated queue to localStorage and broadcast to Doctor & Display
            MediStorage.saveQueue(queue, 'PATIENT_ENQUEUED');

            // Show token confirmation modal
            showTokenConfirmation(patient, queue.size());

            // Reset inputs & refocus
            nameInput.value = '';
            ageInput.value = '';
            phoneInput.value = '';
            nameInput.focus();

            // Re-render UI
            renderAll();

            showToast(`✓ Token ${token} generated for ${name}`, 'success');
        });
    }

    // Quick chip buttons
    const chips = document.querySelectorAll('.name-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            nameInput.value = chip.textContent.trim();
            nameInput.focus();
        });
    });

    // Modal close listeners
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalOk) modalOk.addEventListener('click', closeModal);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // 5. Multi-Tab Real-Time Sync Listener
    // Automatically reloads queue when Doctor calls next or completes consultation in another tab
    MediStorage.onSync(() => {
        queue = MediStorage.getQueue();
        renderAll();
    });

    /**
     * Renders all statistics and queue table.
     */
    function renderAll() {
        renderKPIs();
        renderQueueTable();
        refreshIcons();
    }

    function renderKPIs() {
        const size = queue.size();
        const currentPatient = MediStorage.getCurrentPatient();
        const completedList = MediStorage.getCompletedPatients();
        const nextToken = MediToken.peek();

        if (kpiWaiting) kpiWaiting.textContent = size;
        if (queueBadge) queueBadge.textContent = `${size} Waiting`;

        if (kpiServing) {
            kpiServing.textContent = currentPatient ? currentPatient.token : '—';
        }
        if (kpiServingName) {
            kpiServingName.textContent = currentPatient ? currentPatient.name : 'No active consult';
        }

        if (kpiNextToken) kpiNextToken.textContent = nextToken;
        if (kpiCompleted) kpiCompleted.textContent = completedList.length;
    }

    function renderQueueTable() {
        if (!queueContainer) return;

        const patients = queue.getAll();

        if (patients.length === 0) {
            queueContainer.innerHTML = `
                <div class="empty-queue-box">
                    <div class="empty-icon">
                        <i data-lucide="check-check" style="width: 24px; height: 24px;"></i>
                    </div>
                    <div class="empty-title">No Waiting Patients</div>
                    <p class="empty-subtitle">Register a patient on the left to generate the next token and enqueue.</p>
                </div>
            `;
            return;
        }

        let rowsHtml = '';
        patients.forEach((patient, index) => {
            const isNext = (index === 0);
            const position = index + 1;
            const timeStr = formatTime(patient.joinedAt);

            let statusBadge = `<span class="badge badge-waiting">Waiting</span>`;
            if (isNext) {
                statusBadge = `<span class="badge badge-next">NEXT TO CALL</span>`;
            }

            const ageInfo = patient.age ? `${patient.age} yrs` : '—';
            const phoneInfo = patient.phone ? patient.phone : '—';

            rowsHtml += `
                <tr class="${isNext ? 'is-next' : ''}">
                    <td>
                        <span class="badge badge-token">${escapeHtml(patient.token)}</span>
                    </td>
                    <td>
                        <div class="patient-cell">
                            <span class="patient-name">${escapeHtml(patient.name)}</span>
                            <span class="patient-meta">${ageInfo} • Tel: ${phoneInfo}</span>
                        </div>
                    </td>
                    <td style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">
                        Pos #${position}
                    </td>
                    <td>
                        <div class="status-badge-cell">
                            ${statusBadge}
                        </div>
                    </td>
                    <td style="font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono);">
                        ${timeStr}
                    </td>
                </tr>
            `;
        });

        queueContainer.innerHTML = `
            <table class="queue-table">
                <thead>
                    <tr>
                        <th style="width: 90px;">Token</th>
                        <th>Patient Name</th>
                        <th style="width: 90px;">Order</th>
                        <th style="width: 130px;">Status</th>
                        <th style="width: 100px;">Registered</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        `;
    }

    function showTokenConfirmation(patient, position) {
        if (!modal) return;
        if (modalTokenNum) modalTokenNum.textContent = patient.token;
        if (modalPatientName) modalPatientName.textContent = patient.name;
        if (modalPatientDetails) {
            const ageStr = patient.age ? `Age ${patient.age} • ` : '';
            modalPatientDetails.textContent = `${ageStr}Position #${position} in Queue (FIFO)`;
        }
        modal.classList.add('active');
        refreshIcons();
    }

    function closeModal() {
        if (modal) modal.classList.remove('active');
    }

    function formatTime(timestamp) {
        if (!timestamp) return 'Just now';
        const d = new Date(timestamp);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span class="toast-msg">${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 250);
        }, 3200);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function refreshIcons() {
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }
});
