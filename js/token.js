/**
 * MediQueue - Sequential Token Management System
 * 
 * Manages deterministic, sequential OPD tokens (e.g., T-001, T-002, T-023).
 * Integrates directly with MediStorage to ensure continuity across page reloads and browser sessions.
 */

const MediToken = {
    DEFAULT_PREFIX: 'T-',

    /**
     * Generates the next sequential token, increments the counter, and persists the state.
     * 
     * @param {string} [prefix] - Optional token prefix (defaults to 'T-')
     * @returns {string} Formatted token string (e.g. "T-001")
     */
    generate(prefix = MediToken.DEFAULT_PREFIX) {
        const currentCounter = MediStorage.getNextTokenNumber();
        const formatted = this.format(currentCounter, prefix);
        MediStorage.saveNextTokenNumber(currentCounter + 1);
        return formatted;
    },

    /**
     * Peeks at what the next token will be without incrementing the counter.
     * 
     * @param {string} [prefix] - Optional token prefix
     * @returns {string} Formatted token string
     */
    peek(prefix = MediToken.DEFAULT_PREFIX) {
        const currentCounter = MediStorage.getNextTokenNumber();
        return this.format(currentCounter, prefix);
    },

    /**
     * Formats a numeric token ID with leading zeros and prefix.
     * 
     * @param {number} number - The integer counter value
     * @param {string} [prefix] - The prefix string
     * @returns {string} Example: "T-007"
     */
    format(number, prefix = MediToken.DEFAULT_PREFIX) {
        const padded = String(Math.max(1, parseInt(number, 10) || 1)).padStart(3, '0');
        return `${prefix}${padded}`;
    },

    /**
     * Resets the token counter back to a starting number (typically 1).
     * 
     * @param {number} [startNumber=1] 
     */
    reset(startNumber = 1) {
        MediStorage.saveNextTokenNumber(startNumber);
    }
};

// Export globally
if (typeof window !== 'undefined') {
    window.MediToken = MediToken;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MediToken;
}
