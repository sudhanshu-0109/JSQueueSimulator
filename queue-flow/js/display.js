/**
 * MediQueue - Public Waiting Lounge Display Controller
 * 
 * Manages the high-visibility TV monitor outside OPD rooms.
 * Updates in real-time when the Assistant enqueues or Doctor calls/completes patients.
 * Includes Web Audio API chime and pulse animation on new calls.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. DOM Elements
    const tvServingCard = document.getElementById('display-serving-card');
    const tvServingToken = document.getElementById('tv-serving-token');
    const tvServingName = document.getElementById('tv-serving-name');
    const tvRoomDesc = document.getElementById('tv-room-desc');

    const tvNextToken = document.getElementById('tv-next-token');
    const tvNextName = document.getElementById('tv-next-name');
    const tvWaitingCount = document.getElementById('tv-waiting-count');
    const tvQueueList = document.getElementById('tv-queue-list');

    const clockEl = document.getElementById('display-clock');
    const dateEl = document.getElementById('display-date');

    // Track previous token to trigger chime and pulse animation
    let lastServingToken = null;

    // 2. Start Digital Clock
    startClock();

    // 3. Initial Render
    renderDisplay(false);

    // 4. Multi-Dashboard Real-Time Sync
    MediStorage.onSync(() => {
        renderDisplay(true);
    });

    /**
     * Master render function
     * @param {boolean} triggerAlertIfNew - Whether to chime if a new patient was called
     */
    function renderDisplay(triggerAlertIfNew = true) {
        const queue = MediStorage.getQueue();
        const currentPatient = MediStorage.getCurrentPatient();
        const waitingPatients = queue.getAll();
        const nextPatient = queue.front(); // O(1) peek

        // 1. Render NOW SERVING
        if (currentPatient) {
            tvServingToken.textContent = currentPatient.token;
            tvServingName.textContent = currentPatient.name;
            tvRoomDesc.innerHTML = `Please proceed to <strong>OPD Room 04</strong> • Dr. Sharma`;

            // Check if this is a newly called token
            if (triggerAlertIfNew && lastServingToken !== currentPatient.token) {
                playChime();
                triggerPulseAnimation();
            }
            lastServingToken = currentPatient.token;
        } else {
            tvServingToken.textContent = '—';
            tvServingName.textContent = 'Waiting for Doctor';
            tvRoomDesc.innerHTML = `OPD Room 04 is currently <strong>Available</strong>`;
            lastServingToken = null;
        }

        // 2. Render NEXT PATIENT
        if (nextPatient) {
            tvNextToken.textContent = nextPatient.token;
            tvNextName.textContent = nextPatient.name;
        } else {
            tvNextToken.textContent = '—';
            tvNextName.textContent = 'No patient waiting';
        }

        // 3. Render UPCOMING QUEUE
        if (tvWaitingCount) {
            tvWaitingCount.textContent = `${waitingPatients.length} Waiting`;
        }

        if (tvQueueList) {
            if (waitingPatients.length <= 1) {
                // If only 1 waiting, they are already shown in "Next Patient" box
                if (waitingPatients.length === 1) {
                    tvQueueList.innerHTML = `
                        <div style="font-size: 0.8rem; color: #94A3B8; text-align: center; padding: 12px;">
                            ${escapeHtml(waitingPatients[0].name)} is next in line.
                        </div>
                    `;
                } else {
                    tvQueueList.innerHTML = `
                        <div style="font-size: 0.8rem; color: #94A3B8; text-align: center; padding: 12px;">
                            No additional patients in waiting queue.
                        </div>
                    `;
                }
            } else {
                // Show remaining queue from index 1 onward
                let listHtml = '';
                for (let i = 1; i < waitingPatients.length; i++) {
                    const p = waitingPatients[i];
                    listHtml += `
                        <div class="display-queue-row">
                            <span class="display-queue-token">${escapeHtml(p.token)}</span>
                            <span class="display-queue-name">${escapeHtml(p.name)}</span>
                            <span style="font-size: 0.75rem; color: #64748B;">Pos #${i + 1}</span>
                        </div>
                    `;
                }
                tvQueueList.innerHTML = listHtml;
            }
        }

        refreshIcons();
    }

    /**
     * Digital Clock ticker
     */
    function startClock() {
        function updateTime() {
            const now = new Date();
            if (clockEl) {
                clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            }
            if (dateEl) {
                dateEl.textContent = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            }
        }
        updateTime();
        setInterval(updateTime, 1000);
    }

    /**
     * Visual pulse animation on the hero card when a new patient is called
     */
    function triggerPulseAnimation() {
        if (!tvServingCard) return;
        tvServingCard.classList.remove('new-call');
        void tvServingCard.offsetWidth; // Trigger DOM reflow
        tvServingCard.classList.add('new-call');
    }

    /**
     * Synthesizes a clean, pleasant two-tone hospital chime using Web Audio API.
     * Requires zero external audio files.
     */
    function playChime() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();

            // Note 1 (E5: 659.25 Hz)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
            gain1.gain.setValueAtTime(0.18, ctx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(ctx.currentTime);
            osc1.stop(ctx.currentTime + 0.6);

            // Note 2 (C5: 523.25 Hz)
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(523.25, ctx.currentTime + 0.28);
            gain2.gain.setValueAtTime(0.18, ctx.currentTime + 0.28);
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(ctx.currentTime + 0.28);
            osc2.stop(ctx.currentTime + 0.9);
        } catch (e) {
            // Audio context policy or disabled
        }
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
