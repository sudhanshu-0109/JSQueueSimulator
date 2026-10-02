/**
 * MediQueue - Core Queue Data Structure
 * 
 * Strict FIFO (First-In, First-Out) Linear Data Structure Implementation.
 * 
 * ARCHITECTURAL DESIGN:
 * - Uses object-based key-value storage with separate frontIndex and rearIndex pointers.
 * - Guarantees O(1) constant-time Enqueue and Dequeue operations.
 * - Strictly avoids Array.prototype.shift(), which incurs an O(n) re-indexing penalty.
 * - Serves as the independent Single Source of Truth for waiting patients.
 */

class Queue {
    constructor() {
        this.items = {};
        this.frontIndex = 0;
        this.rearIndex = 0;
    }

    /**
     * Inserts an element at the REAR of the queue.
     * Time Complexity: O(1)
     * Space Complexity: O(1)
     * 
     * @param {*} item - The patient object or data to enqueue.
     * @returns {*} The enqueued item.
     */
    enqueue(item) {
        this.items[this.rearIndex] = item;
        this.rearIndex++;
        return item;
    }

    /**
     * Removes and returns the element at the FRONT of the queue.
     * Time Complexity: O(1)
     * Space Complexity: O(1)
     * 
     * @returns {*|null} The dequeued item, or null if the queue is empty.
     */
    dequeue() {
        if (this.isEmpty()) {
            return null;
        }

        const item = this.items[this.frontIndex];
        delete this.items[this.frontIndex];
        this.frontIndex++;

        // Reset pointer indices when queue becomes empty to prevent unbounded memory indices
        if (this.isEmpty()) {
            this.frontIndex = 0;
            this.rearIndex = 0;
        }

        return item;
    }

    /**
     * Inspects the element at the FRONT of the queue without removing it.
     * Time Complexity: O(1)
     * 
     * @returns {*|null} The front item, or null if empty.
     */
    front() {
        if (this.isEmpty()) {
            return null;
        }
        return this.items[this.frontIndex];
    }

    /**
     * Inspects the element at the REAR of the queue without removing it.
     * Time Complexity: O(1)
     * 
     * @returns {*|null} The rear item, or null if empty.
     */
    rear() {
        if (this.isEmpty()) {
            return null;
        }
        return this.items[this.rearIndex - 1];
    }

    /**
     * Returns the number of elements currently waiting in the queue.
     * Time Complexity: O(1)
     * 
     * @returns {number} Current queue size.
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
     * Resets the queue to an empty state with initialized pointers.
     * Time Complexity: O(1)
     */
    clear() {
        this.items = {};
        this.frontIndex = 0;
        this.rearIndex = 0;
    }

    /**
     * Returns an array representation of all waiting items in exact FIFO order.
     * Used exclusively for read-only rendering without mutating queue pointers.
     * Time Complexity: O(n)
     * 
     * @returns {Array} Array of items from front to rear.
     */
    getAll() {
        const result = [];
        for (let i = this.frontIndex; i < this.rearIndex; i++) {
            if (this.items[i] !== undefined) {
                result.push(this.items[i]);
            }
        }
        return result;
    }

    /**
     * Reconstructs the Queue instance from an array of stored items.
     * Ensures items are properly enqueued in sequential order.
     * 
     * @param {Array} itemsArray - Array of saved items.
     */
    loadFromArray(itemsArray) {
        this.clear();
        if (Array.isArray(itemsArray)) {
            itemsArray.forEach(item => this.enqueue(item));
        }
    }
}

// Export for browser window and Node.js environments
if (typeof window !== 'undefined') {
    window.Queue = Queue;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Queue;
}
