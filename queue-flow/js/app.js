/**
 * QueueFlow - Main Application Controller
 * 
 * Manages user interactions, event handlers, scenarios,
 * and coordinates between the Queue data structure and the UI.
 * 
 * CORE PRINCIPLE: The Queue instance is the SINGLE SOURCE OF TRUTH.
 */

// Global State
let queue = null;
let currentScenario = 'general';
let idCounter = 1;
let isSimulating = false;
let simulationTimeoutId = null;

// Preset Scenarios Data
const SCENARIOS = {
    general: {
        name: "General Service Queue",
        idPrefix: "Q-",
        members: [
            { name: "Alice Johnson", id: "Q-001" },
            { name: "Rahul Sharma", id: "Q-002" },
            { name: "Priya Patel", id: "Q-003" },
            { name: "David Miller", id: "Q-004" }
        ]
    },
    hospital: {
        name: "Hospital OPD Triage",
        idPrefix: "PAT-",
        members: [
            { name: "Dr. Ramesh (Consultant)", id: "PAT-101" },
            { name: "Sunita Roy (Triage)", id: "PAT-102" },
            { name: "Amit Verma (Checkup)", id: "PAT-103" },
            { name: "Kavita Rao (Pharmacy)", id: "PAT-104" }
        ]
    },
    college: {
        name: "College Admissions & Fees",
        idPrefix: "STU-",
        members: [
            { name: "Sudhanshu (Roll #12)", id: "STU-501" },
            { name: "Ananya Singh (Roll #34)", id: "STU-502" },
            { name: "Rohan Gupta (Roll #08)", id: "STU-503" },
            { name: "Divya Nair (Roll #22)", id: "STU-504" }
        ]
    },
    bank: {
        name: "Bank Cashier Counter",
        idPrefix: "TKN-",
        members: [
            { name: "Vikram Joshi (Deposit)", id: "TKN-801" },
            { name: "Meera Sen (Cheque)", id: "TKN-802" },
            { name: "Arjun Das (Transfer)", id: "TKN-803" }
        ]
    },
    food: {
        name: "Fast Food Counter",
        idPrefix: "ORD-",
        members: [
            { name: "Kabir (Burger Combo)", id: "ORD-301" },
            { name: "Simran (Loaded Fries)", id: "ORD-302" },
            { name: "Tanya (Cold Coffee)", id: "ORD-303" }
        ]
    }
};

/**
 * Initializes the application once the DOM is ready.
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Instantiate the Queue
    queue = new Queue();

    // 2. Initialize UI modules
    UI.init();

    // 3. Register Event Listeners
    setupFormListeners();
    setupOperationListeners();
    setupScenarioListeners();
    setupSimulationListeners();
    setupVivaModalListeners();

    // 4. Preload initial General Scenario for instant visual impact
    loadPresetMembers(SCENARIOS.general.members);

    // 5. Initial Render
    UI.renderQueue(queue);
    UI.updateStats(queue);
    UI.addHistory('ENQUEUE', 'Loaded sample members into queue');
    UI.refreshIcons();

    // Welcome Toast
    setTimeout(() => {
        UI.showToast("QueueFlow initialized! Ready for FIFO simulation.", "info", 4000);
    }, 500);
});

/**
 * Generates the next sequential formatted ID based on current scenario.
 */
function generateNextId() {
    const prefix = SCENARIOS[currentScenario]?.idPrefix || "Q-";
    const numStr = String(idCounter).padStart(3, '0');
    idCounter++;
    return `${prefix}${numStr}`;
}

/**
 * Form listeners for adding new members.
 */
function setupFormListeners() {
    const form = document.getElementById('enqueue-form');
    const nameInput = document.getElementById('member-name');
    const idInput = document.getElementById('member-id');

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleEnqueue();
        });
    }

    // Name input quick suggestions pills
    const suggestionPills = document.querySelectorAll('.suggestion-pill-name');
    suggestionPills.forEach(pill => {
        pill.addEventListener('click', () => {
            if (nameInput) {
                nameInput.value = pill.textContent.trim();
                nameInput.focus();
            }
        });
    });
}

/**
 * Core Enqueue Handler:
 * Validates inputs, creates member, and invokes queue.enqueue()
 */
function handleEnqueue(customName = null, customId = null) {
    const nameInput = document.getElementById('member-name');
    const idInput = document.getElementById('member-id');

    const name = customName || (nameInput ? nameInput.value.trim() : '');
    let id = customId || (idInput ? idInput.value.trim() : '');

    // Validation 1: Name cannot be blank
    if (!name) {
        UI.showToast("Please enter a member name to enqueue.", "warning");
        if (nameInput) nameInput.focus();
        return false;
    }

    // Auto-generate ID if empty
    if (!id) {
        id = generateNextId();
    } else {
        // Validation 2: Check ID uniqueness in current queue
        const existing = queue.find(m => m.id.toLowerCase() === id.toLowerCase());
        if (existing) {
            UI.showToast(`ID "${id}" already exists at position #${existing.position}. Please use a unique ID.`, "danger");
            if (idInput) idInput.focus();
            return false;
        }
    }

    const now = new Date();
    const joinedAt = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Create Member Object
    const member = {
        id: id,
        name: name,
        joinedAt: joinedAt,
        status: "Waiting"
    };

    // QUEUE METHOD CALL - SINGLE SOURCE OF TRUTH
    queue.enqueue(member);

    // Update UI
    UI.renderQueue(queue, null, member.id);
    UI.updateStats(queue);
    UI.addHistory('ENQUEUE', `${member.name} (${member.id}) joined at the rear`);
    UI.showToast(`Enqueued: ${member.name} (#${member.id}) at REAR`, "success");

    // Reset inputs
    if (nameInput && !customName) nameInput.value = '';
    if (idInput && !customId) idInput.value = '';
    if (nameInput) nameInput.focus();

    return true;
}

/**
 * Operation Buttons listeners:
 * Dequeue, Peek, Rear, Search, Reset
 */
function setupOperationListeners() {
    // 1. DEQUEUE / SERVE NEXT
    const dequeueBtn = document.getElementById('btn-dequeue');
    if (dequeueBtn) {
        dequeueBtn.addEventListener('click', handleDequeue);
    }

    // 2. PEEK FRONT
    const peekBtn = document.getElementById('btn-peek');
    if (peekBtn) {
        peekBtn.addEventListener('click', handlePeek);
    }

    // 3. VIEW REAR
    const rearBtn = document.getElementById('btn-rear');
    if (rearBtn) {
        rearBtn.addEventListener('click', handleRear);
    }

    // 4. RESET QUEUE
    const resetBtn = document.getElementById('btn-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', handleReset);
    }

    // 5. SEARCH MEMBER
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    if (searchForm && searchInput) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleSearch(searchInput.value.trim());
        });
    }

    // Global keyboard shortcuts (optional convenient bonus)
    document.addEventListener('keydown', (e) => {
        // Ignore if user is currently typing in an input
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            return;
        }

        if (e.key === 'd' || e.key === 'D') {
            handleDequeue();
        } else if (e.key === 'p' || e.key === 'P') {
            handlePeek();
        } else if (e.key === 'r' || e.key === 'R') {
            handleRear();
        }
    });
}

/**
 * Core Dequeue Handler:
 * Demonstrates FIFO - The first element inserted is the first removed.
 */
function handleDequeue() {
    // Check for Underflow
    if (queue.isEmpty()) {
        UI.triggerUnderflowAnimation();
        UI.showToast("Queue Underflow! No members in the queue to serve.", "danger");
        UI.addHistory('DEQUEUE', 'Attempted dequeue on empty queue (Underflow)');
        return null;
    }

    // Get the front element before removal to coordinate smooth exit animation
    const frontCard = document.getElementById(`member-card-${queue.front().id}`);

    const executeRemoval = () => {
        // QUEUE METHOD CALL - SINGLE SOURCE OF TRUTH
        const servedMember = queue.dequeue();
        if (!servedMember) return;

        UI.renderQueue(queue);
        UI.updateStats(queue);
        UI.addHistory('DEQUEUE', `${servedMember.name} (${servedMember.id}) was served`);
        UI.showToast(`Served: ${servedMember.name} (#${servedMember.id}) has departed from FRONT`, "info");
    };

    if (frontCard && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        frontCard.classList.add('anim-dequeue');
        setTimeout(executeRemoval, 360);
    } else {
        executeRemoval();
    }
}

/**
 * Core Peek Handler:
 * Returns the front member without removing it (O(1)).
 */
function handlePeek() {
    if (queue.isEmpty()) {
        UI.triggerUnderflowAnimation();
        UI.showToast("Queue is empty. Nothing to peek.", "warning");
        return;
    }

    // QUEUE METHOD CALL - SINGLE SOURCE OF TRUTH
    const frontMember = queue.front();

    // Highlight front card
    UI.renderQueue(queue, { memberId: frontMember.id, animClass: 'anim-peek' });
    UI.addHistory('PEEK', `${frontMember.name} is currently at FRONT`);

    // Show educational modal
    UI.showMemberModal(
        "Current Front Member (PEEK)",
        frontMember,
        1,
        "PEEK returns the front element without removing it. It operates in O(1) constant time. According to FIFO, this member will be the next one served when DEQUEUE is executed."
    );
}

/**
 * Core Rear Handler:
 * Returns the last member in queue without removing it (O(1)).
 */
function handleRear() {
    if (queue.isEmpty()) {
        UI.triggerUnderflowAnimation();
        UI.showToast("Queue is empty. No rear member.", "warning");
        return;
    }

    // QUEUE METHOD CALL - SINGLE SOURCE OF TRUTH
    const rearMember = queue.rear();
    const position = queue.size();

    // Highlight rear card
    UI.renderQueue(queue, { memberId: rearMember.id, animClass: 'anim-rear' });
    UI.addHistory('REAR', `${rearMember.name} is at REAR (Pos #${position})`);

    // Show educational modal
    UI.showMemberModal(
        "Current Rear Member",
        rearMember,
        position,
        "REAR represents the tail of the queue where elements enter. It operates in O(1) constant time. Any new member added via ENQUEUE will be placed right after this position."
    );
}

/**
 * Core Search Handler:
 * Linear search O(n) supporting feature.
 */
function handleSearch(query) {
    if (!query) {
        UI.showToast("Please enter a name or ID to search.", "warning");
        return;
    }

    if (queue.isEmpty()) {
        UI.showToast("Queue is empty. Cannot perform search.", "warning");
        return;
    }

    const lower = query.toLowerCase();
    const result = queue.find(m => m.name.toLowerCase().includes(lower) || m.id.toLowerCase().includes(lower));

    if (result) {
        UI.renderQueue(queue, { memberId: result.item.id, animClass: 'anim-search-match' });
        UI.addHistory('SEARCH', `Found "${result.item.name}" at Position #${result.position}`);
        UI.showToast(`Found: ${result.item.name} (#${result.item.id}) at Position #${result.position} of ${queue.size()}`, "success");
    } else {
        UI.showToast(`Member "${query}" was not found in the queue.`, "danger");
    }
}

/**
 * Reset Queue Handler:
 * Clears the queue and resets pointers.
 */
function handleReset() {
    if (queue.isEmpty()) {
        UI.showToast("Queue is already empty.", "info");
        return;
    }

    if (confirm("Are you sure you want to reset the queue? All waiting members will be cleared.")) {
        // QUEUE METHOD CALL - SINGLE SOURCE OF TRUTH
        queue.clear();
        idCounter = 1;

        UI.renderQueue(queue);
        UI.updateStats(queue);
        UI.addHistory('RESET', 'Cleared all members from queue');
        UI.showToast("Queue has been reset successfully.", "info");
    }
}

/**
 * Scenario Selector Event Listeners.
 */
function setupScenarioListeners() {
    const scenarioItems = document.querySelectorAll('.scenario-item');
    scenarioItems.forEach(item => {
        item.addEventListener('click', () => {
            const scenarioKey = item.dataset.scenario;
            if (!scenarioKey || !SCENARIOS[scenarioKey]) return;

            // Update active styling
            scenarioItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            currentScenario = scenarioKey;
            const scenario = SCENARIOS[scenarioKey];

            // Reset ID counter based on scenario
            idCounter = 1;

            // Load scenario members into queue
            queue.clear();
            loadPresetMembers(scenario.members);

            UI.renderQueue(queue);
            UI.updateStats(queue);
            UI.addHistory('SCENARIO', `Loaded "${scenario.name}" preset`);
            UI.showToast(`Loaded scenario: ${scenario.name}`, "info");
        });
    });
}

/**
 * Preloads an array of members into the queue.
 */
function loadPresetMembers(presetList) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    presetList.forEach(item => {
        queue.enqueue({
            id: item.id,
            name: item.name,
            joinedAt: timeStr,
            status: "Waiting"
        });
    });
}

/**
 * Automated Simulation Mode:
 * Runs a step-by-step presentation demonstration of FIFO.
 */
function setupSimulationListeners() {
    const startSimBtn = document.getElementById('btn-start-simulation');
    const stopSimBtn = document.getElementById('btn-stop-simulation');

    if (startSimBtn) {
        startSimBtn.addEventListener('click', runSimulation);
    }

    if (stopSimBtn) {
        stopSimBtn.addEventListener('click', stopSimulation);
    }
}

function runSimulation() {
    if (isSimulating) return;
    isSimulating = true;

    // Reset queue for clean demo
    queue.clear();
    idCounter = 1;
    UI.renderQueue(queue);
    UI.updateStats(queue);

    const steps = [
        {
            action: 'ENQUEUE',
            name: 'Alice',
            id: 'SIM-001',
            desc: 'Alice arrives and enters at the REAR of the queue.',
            delay: 1500
        },
        {
            action: 'ENQUEUE',
            name: 'Rahul',
            id: 'SIM-002',
            desc: 'Rahul enters next, joining behind Alice at the new REAR.',
            delay: 1600
        },
        {
            action: 'ENQUEUE',
            name: 'Priya',
            id: 'SIM-003',
            desc: 'Priya enters at REAR. Alice remains at FRONT (Position 1).',
            delay: 1600
        },
        {
            action: 'DEQUEUE',
            name: 'Alice',
            desc: 'Alice is served and departs because Alice was FIRST IN (FIFO)!',
            delay: 2200
        },
        {
            action: 'ENQUEUE',
            name: 'Arjun',
            id: 'SIM-004',
            desc: 'Arjun joins the queue at REAR. Rahul has now become FRONT.',
            delay: 1600
        },
        {
            action: 'PEEK',
            desc: 'PEEK inspects Rahul at FRONT without removing him.',
            delay: 2200
        }
    ];

    let currentStep = 0;

    function executeNextStep() {
        if (!isSimulating) return;

        if (currentStep >= steps.length) {
            UI.showSimulationBanner(steps.length, steps.length, "Simulation Complete", "FIFO demonstration finished. You can continue interacting with the queue.");
            UI.showToast("Simulation completed successfully!", "success", 4000);
            setTimeout(stopSimulation, 3500);
            return;
        }

        const step = steps[currentStep];
        currentStep++;

        UI.showSimulationBanner(currentStep, steps.length, `${step.action} Operation`, step.desc);

        if (step.action === 'ENQUEUE') {
            handleEnqueue(step.name, step.id);
        } else if (step.action === 'DEQUEUE') {
            handleDequeue();
        } else if (step.action === 'PEEK') {
            handlePeek();
        }

        simulationTimeoutId = setTimeout(executeNextStep, step.delay);
    }

    executeNextStep();
}

function stopSimulation() {
    isSimulating = false;
    if (simulationTimeoutId) {
        clearTimeout(simulationTimeoutId);
        simulationTimeoutId = null;
    }
    UI.hideSimulationBanner();
}

/**
 * Viva Voce Drawer / Modal setup.
 */
function setupVivaModalListeners() {
    const vivaBtn = document.getElementById('btn-viva-modal');
    const vivaModal = document.getElementById('viva-modal');
    const vivaCloseBtn = document.getElementById('viva-close-btn');

    if (vivaBtn && vivaModal) {
        vivaBtn.addEventListener('click', () => {
            vivaModal.classList.add('active');
            vivaModal.classList.add('modal-enter');
            UI.refreshIcons();
        });
    }

    if (vivaCloseBtn && vivaModal) {
        vivaCloseBtn.addEventListener('click', () => {
            vivaModal.classList.remove('active');
        });
    }

    if (vivaModal) {
        vivaModal.addEventListener('click', (e) => {
            if (e.target === vivaModal) {
                vivaModal.classList.remove('active');
            }
        });
    }
}
