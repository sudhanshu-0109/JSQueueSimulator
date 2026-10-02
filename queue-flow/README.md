# 🏥 MediQueue — Hospital OPD Token & Queue Management System

> **A Data Structures & Algorithms (DSA) Practical Implementation**  
> Built strictly with **Vanilla HTML5, CSS3, and ES6+ JavaScript** (No Frameworks, No Backend, Zero Dependencies).

---

## 📌 Project Overview

**MediQueue** is a production-grade, real-time hospital Outpatient Department (OPD) queue management system. Unlike theoretical DSA projects that display arbitrary integer arrays or textbook simulators, MediQueue **solves an actual hospital operational workflow using an authentic Queue data structure as the core engine**.

The system operates across three synchronized interfaces:
1. **Assistant / Reception Dashboard (`assistant.html`)**: Registers arriving patients, generates sequential OPD tokens (`T-001`, `T-002`, `T-003`...), and performs the **`ENQUEUE`** operation.
2. **Doctor Consultation Dashboard (`doctor.html`)**: Inspects the front of the line (**`PEEK`**), calls the next patient (**`DEQUEUE`**), manages the active consultation state, and completes appointments.
3. **Public Waiting Lounge Display (`display.html`)**: High-contrast TV monitor screen placed outside OPD rooms displaying the active **NOW SERVING** token and upcoming patients in real time with audio chimes.

---

## 🎯 The Core DSA Story (Viva Voce Summary)

> *"The Assistant performs **ENQUEUE** operations when patients register at the reception, while the Doctor performs **DEQUEUE** operations when calling the next patient into the consultation room. Because the underlying data structure strictly enforces the **First-In, First-Out (FIFO)** principle, the patient who arrives first is guaranteed to be served first."*

```text
                 MEDIQUEUE ARCHITECTURE
                           │
                 ┌─────────┴─────────┐
                 │                   │
                 ▼                   ▼
          ASSISTANT (OPD)     DOCTOR (ROOM 04)
                 │                   │
         Register Patient       View Queue
                 │                   │
          Generate Token        Call Next
                 │                   │
                 ▼                   ▼
              ENQUEUE             DEQUEUE
                 │                   │
                 └─────────┬─────────┘
                           │
                    FIFO QUEUE ENGINE
                           │
                 ┌─────────┴─────────┐
                 │                   │
                 ▼                   ▼
           PUBLIC DISPLAY      CONSULTATION
           ("NOW SERVING")           │
                                     ▼
                                 COMPLETED
```

---

## 🔬 Queue Data Structure Implementation Details

### The $O(1)$ Pointer-Based Architecture vs. Naive `Array.shift()`

In many basic JavaScript tutorials, queues are naively implemented using arrays:
```javascript
// NAIVE ANTI-PATTERN - DO NOT USE IN PRODUCTION OR VIVA:
class BadQueue {
    constructor() { this.items = []; }
    enqueue(item) { this.items.push(item); }
    dequeue() { return this.items.shift(); } // O(n) TIME PENALTY!
}
```
**Why this is flawed:** Whenever `array.shift()` is called, the JavaScript engine must iterate over every remaining element in memory and shift its memory index one position to the left. For $n$ patients, a single dequeue takes **$O(n)$ linear time**.

### MediQueue's Constant-Time $O(1)$ Solution

MediQueue uses an object map with dual integer pointers (`frontIndex` and `rearIndex`):

```javascript
class Queue {
    constructor() {
        this.items = {};
        this.frontIndex = 0;
        this.rearIndex = 0;
    }

    // Insert at rear pointer -> O(1)
    enqueue(item) {
        this.items[this.rearIndex] = item;
        this.rearIndex++;
        return item;
    }

    // Remove from front pointer -> O(1)
    dequeue() {
        if (this.isEmpty()) return null;
        const item = this.items[this.frontIndex];
        delete this.items[this.frontIndex];
        this.frontIndex++;
        
        // Reset pointers when queue empties to maintain bounded memory indices
        if (this.isEmpty()) {
            this.frontIndex = 0;
            this.rearIndex = 0;
        }
        return item;
    }

    // Inspect first element without mutation -> O(1)
    front() {
        if (this.isEmpty()) return null;
        return this.items[this.frontIndex];
    }

    // Inspect last element without mutation -> O(1)
    rear() {
        if (this.isEmpty()) return null;
        return this.items[this.rearIndex - 1];
    }

    // Constant-time arithmetic -> O(1)
    size() {
        return this.rearIndex - this.frontIndex;
    }

    isEmpty() {
        return this.size() === 0;
    }

    clear() {
        this.items = {};
        this.frontIndex = 0;
        this.rearIndex = 0;
    }

    // Safe read-only snapshot for rendering without pointer mutation
    getAll() {
        const result = [];
        for (let i = this.frontIndex; i < this.rearIndex; i++) {
            if (this.items[i] !== undefined) {
                result.push(this.items[i]);
            }
        }
        return result;
    }
}
```

---

## 📊 Time & Space Complexity Analysis

| Queue Operation | Method | Time Complexity | Space Complexity | Explanation |
| :--- | :--- | :---: | :---: | :--- |
| **Enqueue** | `queue.enqueue(patient)` | **$O(1)$** | **$O(1)$** | Direct key assignment at `items[rearIndex]` |
| **Dequeue** | `queue.dequeue()` | **$O(1)$** | **$O(1)$** | Direct key deletion at `items[frontIndex]` |
| **Peek Front** | `queue.front()` | **$O(1)$** | **$O(1)$** | Constant-time read of `items[frontIndex]` |
| **View Rear** | `queue.rear()` | **$O(1)$** | **$O(1)$** | Constant-time read of `items[rearIndex - 1]` |
| **Get Size** | `queue.size()` | **$O(1)$** | **$O(1)$** | Simple subtraction `rearIndex - frontIndex` |
| **Check Empty** | `queue.isEmpty()` | **$O(1)$** | **$O(1)$** | Comparison `size() === 0` |

---

## 🏥 Separation of Waiting Queue vs. Active Consultation

A critical architectural principle in MediQueue:
1. **The Waiting Queue (`Queue`) only holds patients who are WAITING.**
2. When the Doctor clicks **`CALL NEXT`**, `queue.dequeue()` is invoked. The patient is **removed from the waiting queue** and assigned to `currentPatient`.
3. The patient is now in the **`IN CONSULTATION`** state, independent of the waiting line.
4. When the Doctor clicks **`COMPLETE CONSULTATION`**, `currentPatient` is archived to `completedPatients` and cleared.
5. The system never mutates ordering arbitrarily, ensuring that strict FIFO is preserved end-to-end.

---

## ⚡ Multi-Dashboard Real-Time Synchronization

Both terminals and the public monitor operate on the **same persisted state** in real time:
- **Persistence**: Managed via `localStorage` in `js/storage.js`. Rebuilt on load by calling `queue.enqueue()` for all records.
- **Cross-Tab Bus**: Built using `BroadcastChannel('mediqueue_bus')` with fallback to the `storage` event.
- **Result**:
  - Open `assistant.html` in Tab 1.
  - Open `doctor.html` in Tab 2.
  - Open `display.html` in Tab 3.
  - When the Assistant registers `T-025`, it appears on the Doctor's screen and the Public Display **instantly with zero delay and no page reload**.
  - When the Doctor clicks `CALL NEXT`, the Public TV monitor plays an audio chime and flashes the new token immediately.

---

## 📁 Project Structure

```text
MediQueue/
│
├── index.html          # Role selection & system portal
├── assistant.html      # Assistant / Reception registration terminal
├── doctor.html         # Doctor OPD consultation terminal
├── display.html        # Public waiting room TV screen monitor
│
├── css/
│   ├── global.css      # Master design tokens, buttons, cards, toasts, modals
│   ├── login.css       # Portal role-selection cards & hero styling
│   ├── assistant.css   # Registration form & waiting queue table styling
│   ├── doctor.css      # Hero "Now Serving" card & visual queue styling
│   └── display.css     # High-contrast waiting lounge monitor styling
│
├── js/
│   ├── queue.js        # Core Queue class with O(1) pointer architecture
│   ├── storage.js      # Centralized storage & cross-tab BroadcastChannel sync
│   ├── token.js        # Deterministic sequential token generator (T-001...)
│   ├── assistant.js    # Assistant registration & enqueue controller
│   ├── doctor.js       # Doctor consultation & dequeue controller
│   └── display.js      # Public monitor controller & audio synthesizer
│
└── README.md           # Project documentation and viva preparation guide
```

---

## 🚀 How to Run and Test

1. **Option 1 — Direct File Opening**:
   - Double-click [index.html](file:///c:/Users/heart/Desktop/JSQueueSimulator/index.html) to open in any web browser.
2. **Option 2 — Local Development Server (Recommended)**:
   ```bash
   # From the project root:
   python -m http.server 8080
   # Open in browser:
   http://localhost:8080
   ```
3. **Recommended Multi-Tab Demonstration for Teachers**:
   - Open [assistant.html](file:///c:/Users/heart/Desktop/JSQueueSimulator/assistant.html) in one window.
   - Open [doctor.html](file:///c:/Users/heart/Desktop/JSQueueSimulator/doctor.html) in another window side-by-side.
   - Click **`Load Demo Data`** or register patients: `Rahul`, `Priya`, `Aman`, `Sneha`.
   - Watch the queue fill up: `T-001` → `T-002` → `T-003` → `T-004`.
   - On the Doctor screen, click **`CALL NEXT PATIENT`**.
   - Observe `T-001 (Rahul)` dequeue from the queue and move into **NOW SERVING**.
   - Notice that `T-002 (Priya)` is automatically prepared as **NEXT IN LINE**.
   - Click **`✓ Complete Consultation`**, then **`CALL NEXT PATIENT`** again to demonstrate strict FIFO order.

---

## 🎓 Viva Voce Questions & Answers

### Q1: What is a Queue and what principle does it follow?
> **Answer**: A Queue is a linear data structure that operates strictly on the **FIFO (First-In, First-Out)** principle. Elements enter at the **REAR** (via `enqueue`) and exit from the **FRONT** (via `dequeue`). The element that enters first is always served first.

### Q2: Why did you not use JavaScript's built-in `Array.shift()` for dequeue?
> **Answer**: `Array.prototype.shift()` has a time complexity of **$O(n)$** because it forces the JavaScript runtime to re-index all remaining elements in memory by shifting them left. By using an object with integer `frontIndex` and `rearIndex` pointers, our `dequeue()` runs in constant **$O(1)$** time.

### Q3: What is Queue Underflow? How is it prevented in MediQueue?
> **Answer**: Queue Underflow occurs when a program attempts to remove or inspect an element from an empty queue (`size === 0`). In MediQueue, `dequeue()` checks `if (this.isEmpty()) return null;` and the Doctor terminal disables the "Call Next" button whenever the waiting queue is empty.

### Q4: How does MediQueue differentiate between a waiting patient and a consulting patient?
> **Answer**: The Queue data structure holds only **waiting** patients. When a doctor calls a patient, they are **dequeued** from the waiting line and held in a distinct `currentPatient` state. Once the consultation is finished, they are archived to completed records. This accurately mirrors real-world hospital workflows.

### Q5: How do the Assistant and Doctor screens stay synchronized without a backend database?
> **Answer**: We implemented a centralized storage controller in `storage.js` using `localStorage` for persistent memory, complemented by modern `BroadcastChannel` APIs and `window.addEventListener('storage', ...)`. When an action occurs in one tab (e.g. `enqueue` or `dequeue`), all other tabs receive the event and refresh their state automatically.

---

## 👨‍💻 Author & Academic Submission

- **Project**: MediQueue — Hospital OPD Token & Queue Management System
- **Topic**: Data Structures & Algorithms (Linear Data Structures — Queue)
- **Tech Stack**: HTML5, CSS3, Modern ES6+ JavaScript
- **Repository**: [https://github.com/sudhanshu-0109/JSQueueSimulator.git](https://github.com/sudhanshu-0109/JSQueueSimulator.git)
