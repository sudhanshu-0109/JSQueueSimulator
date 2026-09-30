/**
 * QueueFlow - Core Data Structure Implementation
 * 
 * Data Structure: Queue (Linear FIFO - First In, First Out)
 * Implementation: Hash Map (Object) with Front & Rear Pointers
 * 
 * WHY THIS IMPLEMENTATION?
 * Standard JavaScript Array.prototype.shift() takes O(n) time because all
 * remaining elements must be shifted in memory.
 * 
 * By maintaining two explicit integer pointers (frontIndex and rearIndex):
 * - Enqueue: O(1) constant time
 * - Dequeue: O(1) constant time
 * - Front/Peek: O(1) constant time
 * - Rear: O(1) constant time
 * - Size / isEmpty: O(1) constant time
 * 
 * This file serves as the SINGLE SOURCE OF TRUTH for all queue operations.
 * UI components must NEVER manipulate queue data directly.
 */

class Queue {
    constructor() {
        /**
         * Storage object mapping integer indices to elements.
         * @type {Object.<number, any>}
         */
        this.items = {};

        /**
         * Pointer to the index of the first element (front of the queue).
         * Elements are removed (dequeued) from here.
         * @type {number}
         */
        this.frontIndex = 0;

        /**
         * Pointer to the next available index at the end (rear of the queue).
         * Elements are inserted (enqueued) here.
         * @type {number}
         */
        this.rearIndex = 0;
    }

    /**
     * Inserts an element at the rear of the queue.
     * Time Complexity: O(1)
     * Space Complexity: O(1)
     * 
     * @param {*} element - The item/member object to be added.
     * @returns {number} The new size of the queue.
     */
    enqueue(element) {
        if (element === undefined || element === null) {
            throw new Error("Cannot enqueue null or undefined element.");
        }
        this.items[this.rearIndex] = element;
        this.rearIndex++;
        return this.size();
    }

    /**
     * Removes and returns the front element from the queue.
     * If the queue is empty, returns null (Queue Underflow).
     * Time Complexity: O(1)
     * Space Complexity: O(1)
     * 
     * @returns {*|null} The dequeued element or null if empty.
     */
    dequeue() {
        if (this.isEmpty()) {
            return null; // Underflow condition
        }

        const item = this.items[this.frontIndex];
        delete this.items[this.frontIndex]; // Free up memory
        this.frontIndex++;

        // Reset pointers when queue becomes empty to prevent integer unbounded growth
        if (this.isEmpty()) {
            this.frontIndex = 0;
            this.rearIndex = 0;
        }

        return item;
    }

    /**
     * Returns the front element without removing it.
     * Time Complexity: O(1)
     * 
     * @returns {*|null} The front element or null if empty.
     */
    front() {
        if (this.isEmpty()) {
            return null;
        }
        return this.items[this.frontIndex];
    }

    /**
     * Returns the rear (most recently added) element without removing it.
     * Time Complexity: O(1)
     * 
     * @returns {*|null} The rear element or null if empty.
     */
    rear() {
        if (this.isEmpty()) {
            return null;
        }
        return this.items[this.rearIndex - 1];
    }

    /**
     * Returns the current number of elements in the queue.
     * Time Complexity: O(1)
     * 
     * @returns {number} Number of elements currently in the queue.
     */
    size() {
        return this.rearIndex - this.frontIndex;
    }

    /**
     * Checks if the queue contains zero elements.
     * Time Complexity: O(1)
     * 
     * @returns {boolean} True if empty, false otherwise.
     */
    isEmpty() {
        return this.size() === 0;
    }

    /**
     * Clears all elements from the queue and resets pointers.
     * Time Complexity: O(1)
     */
    clear() {
        this.items = {};
        this.frontIndex = 0;
        this.rearIndex = 0;
    }

    /**
     * Returns an array representation of all elements in FIFO order (Front to Rear).
     * Used exclusively for UI rendering and visualization.
     * Time Complexity: O(n) where n is queue size.
     * 
     * @returns {Array} Array of elements ordered from Front to Rear.
     */
    getAll() {
        const result = [];
        for (let i = this.frontIndex; i < this.rearIndex; i++) {
            result.push(this.items[i]);
        }
        return result;
    }

    /**
     * Searches for a member by predicate function.
     * Supporting helper method for search features.
     * Time Complexity: O(n)
     * 
     * @param {Function} predicate - Callback function (item, index, position) => boolean
     * @returns {Object|null} Matching item with position info or null.
     */
    find(predicate) {
        let position = 1;
        for (let i = this.frontIndex; i < this.rearIndex; i++) {
            const item = this.items[i];
            if (predicate(item, i, position)) {
                return {
                    item: item,
                    index: i,
                    position: position
                };
            }
            position++;
        }
        return null;
    }
}

// Export for browser environment
if (typeof window !== 'undefined') {
    window.Queue = Queue;
}

// Export for Node/CommonJS environment if ever tested via unit tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Queue;
}
