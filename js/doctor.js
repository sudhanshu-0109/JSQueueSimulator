/**
 * MediQueue - Doctor Dashboard Controller
 * 
 * Manages consultation states, FIFO DEQUEUE operations,
 * front pointer inspections (PEEK), and consultation completion.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Core State
    let queue = MediStorage.getQueue();
    let currentPatient = MediStorage.getCurrentPatient();
    let completedPatients = MediStorage.getCompletedPatients();

    // 2. DOM Elements
    const servingCard = document.getElementById('serving-card');
    const servingContainer = document.getElementById('serving-container');
    const servingBadge = document.getElementById('serving-state-badge');
    const nextPreviewContainer = document.getElementById('next-preview-container');
    const visualTrack = document.getElementById('visual-track');
    const waitingListContainer = document.getElementById('waiting-list-container');
    const completedListContainer = document.getElementById('completed-list-container');
    const docQueueBadge = document.getElementById('doc-queue-badge');
    const completedCountBadge = document.getElementById('completed-count-badge');

    // KPI Elements
    const kpiStatus = document.getElementById('doc-kpi-status');
    const kpiStatusSub = document.getElementById('doc-kpi-status-sub');
    const kpiQueue = document.getElementById('doc-kpi-queue');
    const kpiNextToken = document.getElementById('doc-kpi-next-token');
    const kpiNextName = document.getElementById('doc-kpi-next-name');
    const kpiCompleted = document.getElementById('doc-kpi-completed');

    // 3. Initial Render
    renderAll();

    // 4. Multi-Dashboard Real-Time Sync Listener
    // Instantly reflects patient additions by Assistant or actions in other tabs
    MediStorage.onSync(() => {
        queue = MediStorage.getQueue();
        currentPatient = MediStorage.getCurrentPatient();
        completedPatients = MediStorage.getCompletedPatients();
        renderAll();
    });

    /**
     * Core DEQUEUE Action: Calls the front patient from the FIFO queue.
     * Guarantees O(1) constant time.
     */
    function callNextPatient() {
        if (queue.isEmpty()) {
            showToast('⚠ Queue is empty. No waiting patients.', 'warning');
            return;
        }

        if (currentPatient) {
            if (!confirm(`Patient ${currentPatient.token} (${currentPatient.name}) is currently in consultation. Mark current consultation as complete and call next patient?`)) {
                return;
            }
            // Auto-complete previous patient
            MediStorage.addCompletedPatient(currentPatient);
        }

        // DEQUEUE from FIFO Queue - O(1) front pointer operation
        const dequeuedPatient = queue.dequeue();

        if (!dequeuedPatient) return;

        // Set as active consultation
        currentPatient = dequeuedPatient;

        // Persist both Queue and Current Patient
        MediStorage.saveQueue(queue, 'PATIENT_DEQUEUED');
        MediStorage.saveCurrentPatient(currentPatient, 'PATIENT_CALLED');

        // Re-render UI
        renderAll();

        showToast(`✓ Called: ${currentPatient.token} - ${currentPatient.name}`, 'success');
    }

    /**
     * Complete Consultation: Finishes consultation, moves patient to history,
     * and readies terminal for the next call.
     */
    function completeConsultation() {
        if (!currentPatient) {
            showToast('⚠ No active consultation in progress.', 'warning');
            return;
        }

        const finishedToken = currentPatient.token;
        const finishedName = currentPatient.name;

        // Save to completed records
        MediStorage.addCompletedPatient(currentPatient);

        // Clear current patient
        currentPatient = null;
        MediStorage.saveCurrentPatient(null, 'CONSULTATION_COMPLETED');

        // Update local completed list
        completedPatients = MediStorage.getCompletedPatients();

        // Re-render UI
        renderAll();

        showToast(`✓ Consultation completed for ${finishedToken} (${finishedName})`, 'info');
    }

    /**
     * Master render function
     */
    function renderAll() {
        renderKPIs();
        renderServingHero();
        renderNextPreview();
        renderVisualTrack();
        renderWaitingList();
        renderCompletedList();
        refreshIcons();
    }

    function renderKPIs() {
        const size = queue.size();
        const nextInLine = queue.front(); // O(1) Peek

        if (kpiQueue) kpiQueue.textContent = size;
        if (docQueueBadge) docQueueBadge.textContent = `${size} Waiting`;
        if (kpiCompleted) kpiCompleted.textContent = completedPatients.length;
        if (completedCountBadge) completedCountBadge.textContent = `${completedPatients.length} Finished`;

        if (currentPatient) {
            if (kpiStatus) {
                kpiStatus.textContent = 'CONSULTING';
                kpiStatus.style.color = 'var(--success)';
            }
            if (kpiStatusSub) kpiStatusSub.textContent = `Serving ${currentPatient.token}`;
            if (servingBadge) {
                servingBadge.textContent = 'IN CONSULTATION';
                servingBadge.className = 'badge badge-serving';
            }
        } else {
            if (kpiStatus) {
                kpiStatus.textContent = 'AVAILABLE';
                kpiStatus.style.color = 'var(--primary)';
            }
            if (kpiStatusSub) kpiStatusSub.textContent = size > 0 ? 'Ready for next patient' : 'No waiting patients';
            if (servingBadge) {
                servingBadge.textContent = 'AVAILABLE';
                servingBadge.className = 'badge badge-waiting';
            }
        }

        if (kpiNextToken) kpiNextToken.textContent = nextInLine ? nextInLine.token : '—';
        if (kpiNextName) kpiNextName.textContent = nextInLine ? nextInLine.name : 'Queue is empty';
    }

    /**
     * Renders the prominent "NOW SERVING" hero card.
     */
    function renderServingHero() {
        if (!servingContainer) return;

        if (currentPatient) {
            servingCard.classList.add('has-patient');
            const ageStr = currentPatient.age ? `Age: ${currentPatient.age} yrs` : 'Age: N/A';
            const phoneStr = currentPatient.phone ? `Phone: ${currentPatient.phone}` : 'No phone registered';
            const waitTime = currentPatient.joinedAt ? formatWaitTime(currentPatient.joinedAt) : 'Just now';

            servingContainer.innerHTML = `
                <div class="serving-token-display">${escapeHtml(currentPatient.token)}</div>
                <div class="serving-patient-name">${escapeHtml(currentPatient.name)}</div>
                <div class="serving-patient-meta">
                    <span>${ageStr}</span>
                    <span>•</span>
                    <span>${phoneStr}</span>
                    <span>•</span>
                    <span>Waited ${waitTime}</span>
                </div>
                <div class="serving-actions">
                    <button type="button" class="btn btn-success btn-lg" id="btn-complete-consult" style="width: 100%;">
                        <i data-lucide="check" style="width: 20px; height: 20px;"></i>
                        <span>✓ Complete Consultation</span>
                    </button>
                </div>
            `;

            const completeBtn = document.getElementById('btn-complete-consult');
            if (completeBtn) {
                completeBtn.addEventListener('click', completeConsultation);
            }
        } else {
            servingCard.classList.remove('has-patient');
            const hasWaiting = !queue.isEmpty();

            servingContainer.innerHTML = `
                <div class="serving-empty-state">
                    <div class="serving-token-display" style="color: var(--text-light); font-size: 3rem;">—</div>
                    <div class="serving-empty-title">No Patient In Consultation</div>
                    <p class="serving-empty-desc">
                        ${hasWaiting 
                            ? 'Patient is waiting in line. Click below to call the next patient according to FIFO order.' 
                            : 'All registered patients have been served. Waiting for assistant to enqueue.'}
                    </p>
                    <div class="serving-actions" style="margin-top: var(--space-2);">
                        <button type="button" class="btn btn-primary btn-lg" id="btn-hero-call-next" style="width: 100%;" ${hasWaiting ? '' : 'disabled'}>
                            <i data-lucide="bell" style="width: 20px; height: 20px;"></i>
                            <span>${hasWaiting ? 'Call Next Patient (DEQUEUE)' : 'Queue is Empty'}</span>
                        </button>
                    </div>
                </div>
            `;

            const heroCallBtn = document.getElementById('btn-hero-call-next');
            if (heroCallBtn && hasWaiting) {
                heroCallBtn.addEventListener('click', callNextPatient);
            }
        }
    }

    /**
     * Renders the Next Patient (Front Pointer) preview box on the left.
     */
    function renderNextPreview() {
        if (!nextPreviewContainer) return;

        const nextPatient = queue.front(); // O(1) peek

        if (nextPatient) {
            const ageStr = nextPatient.age ? `Age ${nextPatient.age}` : 'Age: N/A';
            const phoneStr = nextPatient.phone ? nextPatient.phone : 'No phone';

            nextPreviewContainer.innerHTML = `
                <div class="next-patient-box">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="next-token-tag">${escapeHtml(nextPatient.token)}</span>
                        <span class="badge badge-next">FRONT POINTER</span>
                    </div>
                    <div class="next-name">${escapeHtml(nextPatient.name)}</div>
                    <div class="next-meta">${ageStr} • Tel: ${phoneStr}</div>
                    <button type="button" class="btn btn-primary" id="btn-next-call" style="margin-top: var(--space-2); width: 100%;">
                        <i data-lucide="arrow-right-circle" style="width: 18px; height: 18px;"></i>
                        <span>CALL NEXT (DEQUEUE)</span>
                    </button>
                </div>
            `;

            const callBtn = document.getElementById('btn-next-call');
            if (callBtn) {
                callBtn.addEventListener('click', callNextPatient);
            }
        } else {
            nextPreviewContainer.innerHTML = `
                <div class="empty-queue-box" style="padding: var(--space-5) var(--space-2);">
                    <div class="empty-icon" style="width: 40px; height: 40px;">
                        <i data-lucide="inbox" style="width: 20px; height: 20px;"></i>
                    </div>
                    <div class="empty-title">Queue is Empty</div>
                    <p class="empty-subtitle">No patient currently waiting at the FRONT of the queue.</p>
                </div>
            `;
        }
    }

    /**
     * Renders the compact horizontal visual queue track.
     */
    function renderVisualTrack() {
        if (!visualTrack) return;

        const patients = queue.getAll();
        const total = patients.length;

        if (total === 0) {
            visualTrack.innerHTML = `
                <div style="font-size: 0.775rem; color: var(--text-muted); padding: 8px 12px; font-style: italic;">
                    Waiting queue is currently empty.
                </div>
            `;
            return;
        }

        let html = '';
        patients.forEach((patient, index) => {
            const isFirst = (index === 0);
            const isLast = (index === total - 1);

            let tagHtml = '';
            let nodeClass = 'visual-node';

            if (isFirst && isLast) {
                nodeClass += ' is-front is-rear';
                tagHtml = `<span class="visual-tag-indicator both">FRONT & REAR</span>`;
            } else if (isFirst) {
                nodeClass += ' is-front';
                tagHtml = `<span class="visual-tag-indicator front">FRONT ↓</span>`;
            } else if (isLast) {
                nodeClass += ' is-rear';
                tagHtml = `<span class="visual-tag-indicator rear">↑ REAR</span>`;
            }

            html += `
                <div class="${nodeClass}">
                    ${tagHtml}
                    <div class="visual-node-token">${escapeHtml(patient.token)}</div>
                    <div class="visual-node-name" title="${escapeHtml(patient.name)}">${escapeHtml(patient.name)}</div>
                </div>
            `;

            if (index < total - 1) {
                html += `<div class="visual-arrow">→</div>`;
            }
        });

        visualTrack.innerHTML = html;
    }

    /**
     * Renders the waiting patient cards list.
     */
    function renderWaitingList() {
        if (!waitingListContainer) return;

        const patients = queue.getAll();

        if (patients.length === 0) {
            waitingListContainer.innerHTML = `
                <div class="empty-queue-box" style="padding: var(--space-4);">
                    <p class="empty-subtitle">All waiting patients have been attended to.</p>
                </div>
            `;
            return;
        }

        let html = '';
        patients.forEach((patient, index) => {
            const isNext = (index === 0);
            const position = index + 1;
            const ageStr = patient.age ? `${patient.age} yrs` : '';

            html += `
                <div class="waiting-item-card ${isNext ? 'is-front' : ''}">
                    <div class="waiting-item-left">
                        <span class="waiting-item-token">${escapeHtml(patient.token)}</span>
                        <div class="waiting-item-info">
                            <span class="waiting-item-name">${escapeHtml(patient.name)}</span>
                            <span class="waiting-item-sub">Pos #${position} • ${ageStr}</span>
                        </div>
                    </div>
                    <div>
                        ${isNext ? '<span class="badge badge-next">NEXT</span>' : `<span class="badge badge-waiting">#${position}</span>`}
                    </div>
                </div>
            `;
        });

        waitingListContainer.innerHTML = html;
    }

    /**
     * Renders completed consultations history.
     */
    function renderCompletedList() {
        if (!completedListContainer) return;

        if (completedPatients.length === 0) {
            completedListContainer.innerHTML = `
                <div class="empty-queue-box" style="padding: var(--space-4);">
                    <p class="empty-subtitle">No consultations completed yet today.</p>
                </div>
            `;
            return;
        }

        let rowsHtml = '';
        completedPatients.forEach(patient => {
            const timeStr = patient.completedAt 
                ? new Date(patient.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Earlier';

            rowsHtml += `
                <tr>
                    <td style="font-family: var(--font-mono); font-weight: 700; color: var(--success); width: 90px;">
                        ${escapeHtml(patient.token)}
                    </td>
                    <td style="font-weight: 600;">
                        ${escapeHtml(patient.name)}
                    </td>
                    <td style="color: var(--text-muted); font-size: 0.8rem;">
                        ${patient.age ? `${patient.age} yrs` : '—'}
                    </td>
                    <td style="color: var(--text-muted); font-size: 0.8rem; font-family: var(--font-mono); width: 120px;">
                        ${timeStr}
                    </td>
                </tr>
            `;
        });

        completedListContainer.innerHTML = `
            <table class="queue-table">
                <thead>
                    <tr>
                        <th>Token</th>
                        <th>Patient</th>
                        <th>Age</th>
                        <th>Completed At</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        `;
    }

    function formatWaitTime(timestamp) {
        const diffMs = Date.now() - timestamp;
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return 'Just now';
        if (mins === 1) return '1 min ago';
        return `${mins} mins ago`;
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
