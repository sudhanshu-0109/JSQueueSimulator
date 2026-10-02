/**
 * MediQueue - Centralized Storage & Multi-Dashboard Synchronization
 * 
 * Manages persistent state using localStorage and ensures real-time cross-tab synchronization
 * across Assistant, Doctor, and Public Display dashboards using BroadcastChannel and storage events.
 * 
 * SINGLE SOURCE OF TRUTH PRINCIPLE:
 * The Queue is always reconstructed from persisted data using queue.enqueue()
 * so that FIFO semantics and front/rear pointers are accurately maintained.
 */

const MediStorage = {
    KEYS: {
        WAITING_QUEUE: 'mediqueue_waiting_patients',
        CURRENT_PATIENT: 'mediqueue_current_patient',
        COMPLETED_PATIENTS: 'mediqueue_completed_patients',
        TOKEN_COUNTER: 'mediqueue_token_counter',
        ACTION_EVENT: 'mediqueue_action_event'
    },

    // BroadcastChannel for instant cross-tab communication (Zero delay)
    broadcastChannel: null,

    /**
     * Initializes the storage sync mechanism.
     */
    init() {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            try {
                this.broadcastChannel = new BroadcastChannel('mediqueue_bus');
            } catch (e) {
                console.warn('BroadcastChannel not supported or restricted, falling back to storage event.', e);
            }
        }
    },

    /**
     * Reconstructs and returns an authentic Queue instance from persisted state.
     * Uses queue.enqueue() on every patient to ensure O(1) pointer integrity.
     * 
     * @returns {Queue} Rebuilt Queue data structure
     */
    getQueue() {
        const queue = new Queue();
        try {
            const raw = localStorage.getItem(this.KEYS.WAITING_QUEUE);
            if (raw) {
                const list = JSON.parse(raw);
                if (Array.isArray(list)) {
                    list.forEach(patient => queue.enqueue(patient));
                }
            }
        } catch (err) {
            console.error('Error restoring queue from storage:', err);
        }
        return queue;
    },

    /**
     * Persists the Queue state to storage.
     * 
     * @param {Queue} queue - The active Queue instance
     * @param {string} [actionType='ENQUEUE'] - Action label for sync notification
     */
    saveQueue(queue, actionType = 'QUEUE_UPDATED') {
        try {
            const items = queue.getAll();
            localStorage.setItem(this.KEYS.WAITING_QUEUE, JSON.stringify(items));
            this.broadcast(actionType, { waitingCount: items.length });
        } catch (err) {
            console.error('Error saving queue to storage:', err);
        }
    },

    /**
     * Gets the patient currently consulting with the doctor.
     * 
     * @returns {Object|null}
     */
    getCurrentPatient() {
        try {
            const raw = localStorage.getItem(this.KEYS.CURRENT_PATIENT);
            return raw ? JSON.parse(raw) : null;
        } catch (err) {
            return null;
        }
    },

    /**
     * Saves or clears the current consulting patient.
     * 
     * @param {Object|null} patient 
     * @param {string} [actionType='CURRENT_UPDATED']
     */
    saveCurrentPatient(patient, actionType = 'CURRENT_UPDATED') {
        try {
            if (patient) {
                localStorage.setItem(this.KEYS.CURRENT_PATIENT, JSON.stringify(patient));
            } else {
                localStorage.removeItem(this.KEYS.CURRENT_PATIENT);
            }
            this.broadcast(actionType, { currentPatient: patient });
        } catch (err) {
            console.error('Error saving current patient:', err);
        }
    },

    /**
     * Gets list of completed consultations.
     * 
     * @returns {Array}
     */
    getCompletedPatients() {
        try {
            const raw = localStorage.getItem(this.KEYS.COMPLETED_PATIENTS);
            return raw ? JSON.parse(raw) : [];
        } catch (err) {
            return [];
        }
    },

    /**
     * Appends a completed patient to history.
     * 
     * @param {Object} patient 
     */
    addCompletedPatient(patient) {
        try {
            const list = this.getCompletedPatients();
            const record = {
                ...patient,
                completedAt: Date.now()
            };
            list.unshift(record); // Most recent first in history
            localStorage.setItem(this.KEYS.COMPLETED_PATIENTS, JSON.stringify(list));
            this.broadcast('CONSULTATION_COMPLETED', { patient: record });
        } catch (err) {
            console.error('Error recording completed patient:', err);
        }
    },

    /**
     * Gets the sequential token counter (defaults to 1).
     * 
     * @returns {number}
     */
    getNextTokenNumber() {
        try {
            const raw = localStorage.getItem(this.KEYS.TOKEN_COUNTER);
            const val = parseInt(raw, 10);
            return isNaN(val) || val < 1 ? 1 : val;
        } catch (err) {
            return 1;
        }
    },

    /**
     * Updates the next token counter.
     * 
     * @param {number} num 
     */
    saveNextTokenNumber(num) {
        try {
            localStorage.setItem(this.KEYS.TOKEN_COUNTER, String(Math.max(1, num)));
        } catch (err) {
            console.error('Error saving token counter:', err);
        }
    },

    /**
     * Broadcasts an action event across all open browser tabs (Assistant, Doctor, Public Display).
     * 
     * @param {string} type 
     * @param {Object} [payload] 
     */
    broadcast(type, payload = {}) {
        const eventData = {
            type,
            payload,
            timestamp: Date.now()
        };

        // 1. BroadcastChannel (Modern & Fast)
        if (this.broadcastChannel) {
            try {
                this.broadcastChannel.postMessage(eventData);
            } catch (e) {
                // Ignore channel errors
            }
        }

        // 2. Storage event fallback (Fires on other tabs via localStorage update)
        try {
            localStorage.setItem(this.KEYS.ACTION_EVENT, JSON.stringify(eventData));
        } catch (e) {
            // Ignore storage quota errors
        }
    },

    /**
     * Registers a callback that fires whenever state changes in ANY dashboard tab.
     * 
     * @param {Function} callback - Function receiving { type, payload, timestamp }
     */
    onSync(callback) {
        if (typeof window === 'undefined' || typeof callback !== 'function') return;

        // 1. BroadcastChannel listener
        if (this.broadcastChannel) {
            this.broadcastChannel.addEventListener('message', (event) => {
                if (event && event.data) {
                    callback(event.data);
                }
            });
        }

        // 2. Window storage listener (for across-window/tab updates)
        window.addEventListener('storage', (event) => {
            if (event.key === this.KEYS.ACTION_EVENT && event.newValue) {
                try {
                    const parsed = JSON.parse(event.newValue);
                    callback(parsed);
                } catch (e) {
                    // Ignore parse error
                }
            } else if (
                event.key === this.KEYS.WAITING_QUEUE ||
                event.key === this.KEYS.CURRENT_PATIENT ||
                event.key === this.KEYS.COMPLETED_PATIENTS
            ) {
                // Direct key update
                callback({ type: 'STORAGE_DIRECT_UPDATE', key: event.key, timestamp: Date.now() });
            }
        });
    },

    /**
     * Loads clean standard demo data for presentation to teachers.
     * Preloads 4 patients into waiting queue with sequential tokens.
     */
    loadDemoData() {
        const demoQueue = new Queue();
        const baseTime = Date.now();

        const demoPatients = [
            {
                token: 'T-001',
                name: 'Rahul Sharma',
                age: 24,
                phone: '9876543210',
                joinedAt: baseTime - 12 * 60 * 1000
            },
            {
                token: 'T-002',
                name: 'Priya Patel',
                age: 29,
                phone: '9812345678',
                joinedAt: baseTime - 8 * 60 * 1000
            },
            {
                token: 'T-003',
                name: 'Aman Kumar',
                age: 34,
                phone: '9898989898',
                joinedAt: baseTime - 5 * 60 * 1000
            },
            {
                token: 'T-004',
                name: 'Sneha Singh',
                age: 22,
                phone: '9845123456',
                joinedAt: baseTime - 2 * 60 * 1000
            }
        ];

        demoPatients.forEach(p => demoQueue.enqueue(p));

        this.saveQueue(demoQueue, 'DEMO_DATA_LOADED');
        this.saveCurrentPatient(null, 'DEMO_RESET_CURRENT');
        localStorage.removeItem(this.KEYS.COMPLETED_PATIENTS);
        this.saveNextTokenNumber(5);

        this.broadcast('DEMO_RESET', { count: 4 });
        return demoQueue;
    },

    /**
     * Clears all OPD state for a fresh test.
     */
    clearAll() {
        localStorage.removeItem(this.KEYS.WAITING_QUEUE);
        localStorage.removeItem(this.KEYS.CURRENT_PATIENT);
        localStorage.removeItem(this.KEYS.COMPLETED_PATIENTS);
        this.saveNextTokenNumber(1);
        this.broadcast('SYSTEM_RESET', {});
    }
};

// Auto-initialize broadcast channel
MediStorage.init();

// Export globally
if (typeof window !== 'undefined') {
    window.MediStorage = MediStorage;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MediStorage;
}
