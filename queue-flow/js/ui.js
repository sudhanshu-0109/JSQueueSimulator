/**
 * QueueFlow - User Interface & DOM Renderer
 * 
 * Handles all visual rendering, animations, statistics updates,
 * history tracking, modals, and toast notifications.
 * 
 * NOTE: The UI NEVER mutates queue state directly. It queries the Queue
 * instance for data and updates DOM accordingly.
 */

const UI = {
    // Cached DOM elements
    elements: {
        queueRunway: document.getElementById('queue-runway'),
        statSize: document.getElementById('stat-size'),
        statFront: document.getElementById('stat-front'),
        statRear: document.getElementById('stat-rear'),
        statStatus: document.getElementById('stat-status'),
        historyList: document.getElementById('history-list'),
        toastContainer: document.getElementById('toast-container'),
        
        // Pointers Inspector
        inspectorFront: document.getElementById('inspector-front'),
        inspectorRear: document.getElementById('inspector-rear'),
        inspectorSize: document.getElementById('inspector-size'),
        inspectorFormula: document.getElementById('inspector-formula'),

        // Simulation Banner
        simBanner: document.getElementById('sim-banner'),
        simStepBadge: document.getElementById('sim-step-badge'),
        simStepTitle: document.getElementById('sim-step-title'),
        simExplanation: document.getElementById('sim-explanation'),

        // Generic Modal
        genericModal: document.getElementById('generic-modal'),
        modalTitle: document.getElementById('modal-title'),
        modalBody: document.getElementById('modal-body'),
        modalCloseBtn: document.getElementById('modal-close-btn')
    },

    /**
     * Initializes UI event listeners for static modals and tooltips.
     */
    init() {
        if (this.elements.modalCloseBtn) {
            this.elements.modalCloseBtn.addEventListener('click', () => this.closeModal());
        }

        // Close modal on backdrop click
        if (this.elements.genericModal) {
            this.elements.genericModal.addEventListener('click', (e) => {
                if (e.target === this.elements.genericModal) {
                    this.closeModal();
                }
            });
        }

        // Keyboard ESC to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    },

    /**
     * Renders the complete Queue visualization horizontally.
     * 
     * @param {Queue} queue - The Queue data structure instance.
     * @param {Object} [highlightConfig] - Optional highlight config { memberId, animClass }
     * @param {string} [newlyAddedId] - Member ID that was just enqueued to trigger entry animation
     */
    renderQueue(queue, highlightConfig = null, newlyAddedId = null) {
        const runway = this.elements.queueRunway;
        if (!runway) return;

        const members = queue.getAll();
        const total = members.length;

        // 1. Empty State
        if (total === 0) {
            runway.innerHTML = `
                <div class="empty-queue-state">
                    <div class="empty-icon-box">
                        <i data-lucide="inbox" style="width: 32px; height: 32px;"></i>
                    </div>
                    <div class="empty-title">Queue is Empty</div>
                    <p class="empty-desc">No members waiting in line. Enqueue a new member or run a simulation to see FIFO in action.</p>
                </div>
            `;
            this.refreshIcons();
            return;
        }

        // 2. Render Cards & Connectors
        let html = '';

        members.forEach((member, index) => {
            const isFirst = (index === 0);
            const isLast = (index === total - 1);
            const position = index + 1;

            // Determine pointer labels
            let pointerBadgeHtml = '';
            let cardClasses = ['member-card'];

            if (isFirst && isLast) {
                cardClasses.push('is-front', 'is-rear');
                pointerBadgeHtml = `<span class="pointer-tag both-tag">FRONT & REAR (Pos 1)</span>`;
            } else if (isFirst) {
                cardClasses.push('is-front');
                pointerBadgeHtml = `<span class="pointer-tag front-tag">FRONT ↓ (Pos 1)</span>`;
            } else if (isLast) {
                cardClasses.push('is-rear');
                pointerBadgeHtml = `<span class="pointer-tag rear-tag">REAR ↑ (Pos ${position})</span>`;
            }

            // Check for specific highlight (Peek / Search / New)
            if (highlightConfig && highlightConfig.memberId === member.id) {
                cardClasses.push(highlightConfig.animClass || 'anim-peek');
            } else if (newlyAddedId && newlyAddedId === member.id) {
                cardClasses.push('anim-enqueue');
            }

            // Initials for avatar
            const initials = member.name.trim().charAt(0).toUpperCase();

            html += `
                <div class="${cardClasses.join(' ')}" id="member-card-${member.id}" data-id="${member.id}" data-position="${position}">
                    ${pointerBadgeHtml}
                    <div class="member-header">
                        <div class="member-avatar">${initials}</div>
                        <span class="member-pos-badge">#${position}</span>
                    </div>

                    <div class="member-name" title="${escapeHtml(member.name)}">${escapeHtml(member.name)}</div>

                    <div class="member-meta">
                        <span class="member-id">${escapeHtml(member.id)}</span>
                        <span class="member-time">
                            <i data-lucide="clock" style="width: 12px; height: 12px;"></i>
                            ${member.joinedAt || 'Just now'}
                        </span>
                    </div>

                    <div class="member-status-bar">
                        <div class="status-indicator">
                            <span class="status-dot"></span>
                            <span>${escapeHtml(member.status || 'Waiting')}</span>
                        </div>
                        <span style="color: var(--text-light); font-size: 0.65rem;">
                            ${isFirst ? 'Next to serve' : `${position - 1} ahead`}
                        </span>
                    </div>
                </div>
            `;

            // Add arrow connector between elements (pointing right: FRONT to REAR flow)
            if (index < total - 1) {
                html += `
                    <div class="queue-connector arrow-flow" title="FIFO Flow Direction">
                        <i data-lucide="arrow-right" style="width: 18px; height: 18px;"></i>
                    </div>
                `;
            }
        });

        runway.innerHTML = html;
        this.refreshIcons();

        // Toggle mobile swipe hint based on count
        const mobileHint = document.querySelector('.runway-mobile-hint');
        if (mobileHint) {
            mobileHint.style.display = total > 1 ? '' : 'none';
        }

        // If newly added or highlighted, smooth scroll runway to keep it in view
        if (newlyAddedId) {
            setTimeout(() => {
                runway.scrollLeft = runway.scrollWidth;
            }, 50);
        } else if (highlightConfig) {
            const highlightedCard = document.getElementById(`member-card-${highlightConfig.memberId}`);
            if (highlightedCard) {
                highlightedCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }
    },

    /**
     * Updates all statistics widgets across the dashboard.
     * 
     * @param {Queue} queue - The Queue instance
     */
    updateStats(queue) {
        const size = queue.size();
        const isEmpty = queue.isEmpty();
        const frontMember = queue.front();
        const rearMember = queue.rear();

        // 1. Queue Size
        if (this.elements.statSize) {
            this.elements.statSize.textContent = size < 10 ? `0${size}` : `${size}`;
        }

        // 2. Front Member
        if (this.elements.statFront) {
            this.elements.statFront.textContent = frontMember ? frontMember.name : '—';
            const sub = this.elements.statFront.parentElement.querySelector('.stat-subtext');
            if (sub) {
                sub.textContent = frontMember ? `ID: ${frontMember.id} (Index: ${queue.frontIndex})` : 'Queue empty';
            }
        }

        // 3. Rear Member
        if (this.elements.statRear) {
            this.elements.statRear.textContent = rearMember ? rearMember.name : '—';
            const sub = this.elements.statRear.parentElement.querySelector('.stat-subtext');
            if (sub) {
                sub.textContent = rearMember ? `ID: ${rearMember.id} (Index: ${queue.rearIndex - 1})` : 'Queue empty';
            }
        }

        // 4. Queue Status
        if (this.elements.statStatus) {
            if (isEmpty) {
                this.elements.statStatus.innerHTML = `
                    <span style="color: var(--text-muted); font-size: 1.25rem;">EMPTY</span>
                `;
            } else {
                this.elements.statStatus.innerHTML = `
                    <span style="display: flex; align-items: center; gap: 8px; color: var(--success); font-size: 1.25rem;">
                        <span class="pulse-dot"></span> ACTIVE
                    </span>
                `;
            }
        }

        // 5. DSA Pointers Inspector
        if (this.elements.inspectorFront) {
            this.elements.inspectorFront.textContent = queue.frontIndex;
        }
        if (this.elements.inspectorRear) {
            this.elements.inspectorRear.textContent = queue.rearIndex;
        }
        if (this.elements.inspectorSize) {
            this.elements.inspectorSize.textContent = size;
        }
        if (this.elements.inspectorFormula) {
            this.elements.inspectorFormula.innerHTML = `
                <span>Formula: <code>size = rearIndex - frontIndex</code></span>
                <span><strong>${queue.rearIndex} - ${queue.frontIndex} = ${size}</strong></span>
            `;
        }
    },

    /**
     * Appends an entry into the operation history log.
     * 
     * @param {string} type - 'ENQUEUE' | 'DEQUEUE' | 'PEEK' | 'REAR' | 'SEARCH' | 'RESET'
     * @param {string} description - Brief summary of what occurred
     */
    addHistory(type, description) {
        const historyList = this.elements.historyList;
        if (!historyList) return;

        // Remove placeholder if present
        const emptyPlaceholder = historyList.querySelector('.empty-history');
        if (emptyPlaceholder) {
            historyList.innerHTML = '';
        }

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        let badgeClass = 'op-enqueue';
        let iconName = 'arrow-down-to-line';

        switch (type.toUpperCase()) {
            case 'ENQUEUE':
                badgeClass = 'op-enqueue';
                iconName = 'user-plus';
                break;
            case 'DEQUEUE':
                badgeClass = 'op-dequeue';
                iconName = 'arrow-right-from-line';
                break;
            case 'PEEK':
                badgeClass = 'op-peek';
                iconName = 'eye';
                break;
            case 'REAR':
                badgeClass = 'op-rear';
                iconName = 'corner-down-right';
                break;
            case 'SEARCH':
                badgeClass = 'op-peek';
                iconName = 'search';
                break;
            case 'RESET':
                badgeClass = 'op-clear';
                iconName = 'rotate-ccw';
                break;
        }

        const itemHtml = `
            <div class="history-item">
                <div class="history-left">
                    <span class="history-badge ${badgeClass}">${type}</span>
                    <span class="history-text">${escapeHtml(description)}</span>
                </div>
                <span class="history-time">${timeStr}</span>
            </div>
        `;

        historyList.insertAdjacentHTML('afterbegin', itemHtml);

        // Keep maximum 15 recent items
        while (historyList.children.length > 15) {
            historyList.removeChild(historyList.lastElementChild);
        }
    },

    /**
     * Displays a toast notification.
     * 
     * @param {string} message - Message text
     * @param {string} [type='info'] - 'success' | 'danger' | 'warning' | 'info'
     * @param {number} [duration=3500] - Duration in ms
     */
    showToast(message, type = 'info', duration = 3500) {
        const container = this.elements.toastContainer;
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type} toast-enter`;

        let iconName = 'info';
        if (type === 'success') iconName = 'check-circle-2';
        if (type === 'danger') iconName = 'alert-circle';
        if (type === 'warning') iconName = 'alert-triangle';

        toast.innerHTML = `
            <div class="toast-icon">
                <i data-lucide="${iconName}" style="width: 20px; height: 20px;"></i>
            </div>
            <div class="toast-msg">${escapeHtml(message)}</div>
        `;

        container.appendChild(toast);
        this.refreshIcons();

        setTimeout(() => {
            toast.classList.remove('toast-enter');
            toast.classList.add('toast-leave');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                }
            }, 250);
        }, duration);
    },

    /**
     * Displays the Peek/Rear or detail modal with member and DSA explanation.
     * 
     * @param {string} title - Modal title (e.g. "Front Member (PEEK)")
     * @param {Object} member - Member object
     * @param {number} position - Position in queue (1 for Front)
     * @param {string} dsaExplanation - DSA educational note
     */
    showMemberModal(title, member, position, dsaExplanation) {
        if (!this.elements.genericModal) return;

        this.elements.modalTitle.innerHTML = `
            <i data-lucide="eye" style="width: 20px; height: 20px; color: var(--primary);"></i>
            <span>${escapeHtml(title)}</span>
        `;

        const initials = member.name.trim().charAt(0).toUpperCase();

        this.elements.modalBody.innerHTML = `
            <div class="modal-member-card">
                <div class="modal-member-avatar">${initials}</div>
                <div class="modal-member-info">
                    <div class="modal-member-name">${escapeHtml(member.name)}</div>
                    <div class="modal-member-meta">
                        <span class="member-id">${escapeHtml(member.id)}</span>
                        <span>•</span>
                        <span>Position: <strong>#${position}</strong></span>
                        <span>•</span>
                        <span>Joined: <strong>${member.joinedAt || 'Recent'}</strong></span>
                    </div>
                </div>
            </div>

            <div class="modal-explanation-box">
                <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                    <i data-lucide="book-open" style="width: 16px; height: 16px; color: var(--primary);"></i>
                    <span>DSA Concept Explanation</span>
                </div>
                <p>${escapeHtml(dsaExplanation)}</p>
            </div>
        `;

        this.elements.genericModal.classList.add('active');
        this.elements.genericModal.classList.add('modal-enter');
        this.refreshIcons();
    },

    /**
     * Closes any open modal.
     */
    closeModal() {
        if (this.elements.genericModal) {
            this.elements.genericModal.classList.remove('active');
        }
    },

    /**
     * Shakes the queue runway and dequeue button to visually demonstrate Underflow.
     */
    triggerUnderflowAnimation() {
        const runway = this.elements.queueRunway;
        const dequeueBtn = document.getElementById('btn-dequeue');

        if (runway) {
            runway.classList.add('anim-shake');
            setTimeout(() => runway.classList.remove('anim-shake'), 450);
        }

        if (dequeueBtn) {
            dequeueBtn.classList.add('anim-shake');
            setTimeout(() => dequeueBtn.classList.remove('anim-shake'), 450);
        }
    },

    /**
     * Displays the active Simulation banner at the top of the dashboard.
     * 
     * @param {number} currentStep - Current step index (1-based)
     * @param {number} totalSteps - Total steps in demo
     * @param {string} opName - Operation being performed
     * @param {string} explanation - Why this happens in FIFO
     */
    showSimulationBanner(currentStep, totalSteps, opName, explanation) {
        const banner = this.elements.simBanner;
        if (!banner) return;

        banner.classList.add('active');
        if (this.elements.simStepBadge) {
            this.elements.simStepBadge.textContent = `Step ${currentStep} / ${totalSteps}`;
        }
        if (this.elements.simStepTitle) {
            this.elements.simStepTitle.textContent = `${opName}`;
        }
        if (this.elements.simExplanation) {
            this.elements.simExplanation.textContent = explanation;
        }
    },

    /**
     * Hides the simulation banner.
     */
    hideSimulationBanner() {
        const banner = this.elements.simBanner;
        if (banner) {
            banner.classList.remove('active');
        }
    },

    /**
     * Triggers Lucide icons rendering for newly generated DOM.
     */
    refreshIcons() {
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }
};

/**
 * Escapes HTML characters to prevent XSS vulnerabilities in user input.
 * @param {string} str 
 * @returns {string} Safe escaped string
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Export UI globally
if (typeof window !== 'undefined') {
    window.UI = UI;
}
