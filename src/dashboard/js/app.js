/**
 * Main Application for CRM Dashboard
 * Fully interactive Chatwoot-style CRM with conversations, pipeline, contacts, tasks, and reports
 */

const App = {
    currentView: 'home',
    user: null,
    selectedContact: null,
    conversations: [],
    currentConversationId: null,
    messagesPolling: null,
    charts: {},

    // Toggle bot status
    async toggleBot(contactId) {
        if (!contactId) return;

        const btn = document.getElementById('toggle-bot-btn');
        if (btn) btn.disabled = true;

        try {
            const response = await API.contacts.toggleBot(contactId);

            // Update local state
            if (this.selectedContact && this.selectedContact.id === contactId) {
                // Ensure is_active is updated correctly (handling 0/1 vs boolean if API varies, but API ensures 0/1)
                this.selectedContact.is_active = response.data.is_active;

                // Re-render header to show new state
                this.renderChatHeader(this.selectedContact);

                // Also update the icon immediately (redundant if renderChatHeader works, but safe)
                // Actually renderChatHeader handles it.
            }

            const isPaused = response.data.is_active === 0;
            this.toast(isPaused ? 'IA Pausada' : 'IA Retomada', 'success');

        } catch (error) {
            console.error('Error toggling bot:', error);
            this.toast('Erro ao alterar status da IA', 'error');
            if (btn) btn.disabled = false;
        }
    },

    // Initialize application
    async init() {
        // Check for existing token
        if (API.init()) {
            try {
                const response = await API.auth.me();
                this.user = response.data.user;
                this.showDashboard();
                this.loadDashboardData();
                this.startPolling();
            } catch (error) {
                this.showLogin();
            }
        } else {
            this.showLogin();
        }

        this.setupEventListeners();

        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        this.setupPipelineDragAndDrop();
        this.initCharts();
    },

    // Setup event listeners
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                this.switchView(view);
            });
        });

        // New buttons
        const newContactBtn = document.getElementById('new-contact-btn');
        if (newContactBtn) {
            newContactBtn.addEventListener('click', () => {
                if (typeof Contacts !== 'undefined') {
                    Contacts.showModal();
                }
            });
        }

        const createContactBtn = document.getElementById('create-contact-btn');
        if (createContactBtn) {
            createContactBtn.addEventListener('click', () => {
                if (typeof Contacts !== 'undefined') {
                    Contacts.create();
                }
            });
        }

        const newDealBtn = document.getElementById('new-deal-btn');
        if (newDealBtn) {
            newDealBtn.addEventListener('click', () => {
                if (typeof Pipeline !== 'undefined') {
                    Pipeline.showDealModal();
                }
            });
        }

        const newTaskBtn = document.getElementById('new-task-btn');
        if (newTaskBtn) {
            newTaskBtn.addEventListener('click', () => {
                if (typeof Tasks !== 'undefined') {
                    Tasks.showModal();
                }
            });
        }

        // Modal close buttons
        document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });

        // Modal overlay click
        const modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target.id === 'modal-overlay') this.closeModals();
            });
        }

        // Contact form
        const contactForm = document.getElementById('contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                if (typeof Contacts !== 'undefined') {
                    Contacts.handleSubmit(e);
                }
            });
        }

        // Deal form
        const dealForm = document.getElementById('deal-form');
        if (dealForm) {
            dealForm.addEventListener('submit', (e) => {
                if (typeof Pipeline !== 'undefined') {
                    Pipeline.handleDealSubmit(e);
                }
            });
        }

        // Task form
        const taskForm = document.getElementById('task-form');
        if (taskForm) {
            taskForm.addEventListener('submit', (e) => {
                if (typeof Tasks !== 'undefined') {
                    Tasks.handleSubmit(e);
                }
            });
        }

        // Global search
        const globalSearch = document.getElementById('global-search');
        if (globalSearch) {
            globalSearch.addEventListener('input',
                this.debounce((e) => this.handleSearch(e.target.value), 300)
            );
        }

        // Conversations search
        const conversationsSearch = document.getElementById('conversations-search');
        if (conversationsSearch) {
            conversationsSearch.addEventListener('input',
                this.debounce((e) => this.filterConversations(e.target.value), 300)
            );
        }

        // Message input
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        const sendMessageBtn = document.getElementById('send-message-btn');
        if (sendMessageBtn) {
            sendMessageBtn.addEventListener('click', () => this.sendMessage());
        }

        // Contact details toggle
        const toggleContactBtn = document.getElementById('toggle-contact-details');
        if (toggleContactBtn) {
            toggleContactBtn.addEventListener('click', () => this.toggleContactDetails());
        }

        // Task tabs
        document.querySelectorAll('.tasks-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tasks-tabs .tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (typeof Tasks !== 'undefined') {
                    Tasks.loadTasks(btn.dataset.filter);
                }
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for global search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const search = document.getElementById('global-search');
                if (search) search.focus();
            }
        });
    },

    // Handle login
    async handleLogin(e) {
        e.preventDefault();

        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');
        const errorEl = document.getElementById('login-error');
        const submitBtn = e.target.querySelector('button[type="submit"]');

        if (!emailInput || !passwordInput) return;

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            if (errorEl) errorEl.textContent = 'Por favor, preencha todos os campos';
            return;
        }

        // Show loading state
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Entrando...';
        }

        try {
            const response = await API.auth.login(email, password);
            API.setToken(response.data.token);
            this.user = response.data.user;
            this.showDashboard();
            this.loadDashboardData();
            this.startPolling();

            // Clear form
            emailInput.value = '';
            passwordInput.value = '';
            if (errorEl) errorEl.textContent = '';

        } catch (error) {
            if (errorEl) {
                errorEl.textContent = error.message || 'Erro ao fazer login';
            }
            this.toast('Erro ao fazer login', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Entrar';
            }
        }
    },

    // Handle logout
    async handleLogout() {
        if (!confirm('Deseja realmente sair?')) return;

        try {
            await API.auth.logout();
        } catch (e) {
            console.error('Logout error:', e);
        }

        this.stopPolling();
        API.clearToken();
        this.user = null;
        this.selectedContact = null;
        this.conversations = [];
        this.showLogin();
        this.toast('Logout realizado com sucesso', 'success');
    },

    // Show login screen
    showLogin() {
        const loginScreen = document.getElementById('login-screen');
        const dashboard = document.getElementById('dashboard');

        if (loginScreen) loginScreen.classList.remove('hidden');
        if (dashboard) dashboard.classList.add('hidden');
    },

    // Show dashboard
    showDashboard() {
        const loginScreen = document.getElementById('login-screen');
        const dashboard = document.getElementById('dashboard');

        if (loginScreen) loginScreen.classList.add('hidden');
        if (dashboard) dashboard.classList.remove('hidden');

        // Update user info
        if (this.user) {
            const userName = document.getElementById('user-name');
            const userRole = document.getElementById('user-role');
            const userAvatar = document.getElementById('user-avatar');

            if (userName) userName.textContent = this.user.name;

            if (userRole) {
                userRole.textContent =
                    this.user.role === 'admin' ? 'Administrador' :
                        this.user.role === 'manager' ? 'Gerente' : 'Agente';
            }

            if (userAvatar) {
                userAvatar.textContent = this.getInitials(this.user.name);
            }
        }
    },

    // Switch view
    switchView(viewName) {
        this.currentView = viewName;

        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.toggle('active', view.id === `view-${viewName}`);
        });

        // Update title
        const titles = {
            home: 'Dashboard',
            conversations: 'Conversas',
            pipeline: 'Pipeline de Vendas',
            contacts: 'Contatos',
            tasks: 'Tarefas',
            reports: 'Relatórios'
        };

        const pageTitle = document.getElementById('page-title');
        if (pageTitle) {
            pageTitle.textContent = titles[viewName] || 'Dashboard';
        }

        // Load view data
        this.loadViewData(viewName);
    },

    // Load view data
    async loadViewData(viewName) {
        switch (viewName) {
            case 'home':
                this.loadDashboardData();
                break;
            case 'conversations':
                this.loadConversations();
                break;
            case 'pipeline':
                if (typeof Pipeline !== 'undefined') {
                    Pipeline.loadKanban();
                }
                break;
            case 'contacts':
                if (typeof Contacts !== 'undefined') {
                    Contacts.loadContacts();
                }
                break;
            case 'tasks':
                if (typeof Tasks !== 'undefined') {
                    Tasks.loadTasks('pending');
                }
                break;
            case 'reports':
                this.loadReportsData();
                break;
        }
    },

    // Load dashboard data
    async loadDashboardData() {
        try {
            const [dashboardData, funnelData, activityData, activitiesList] = await Promise.all([
                API.metrics.dashboard(),
                API.metrics.funnel(),
                API.metrics.activity(7),
                API.activities.list({ limit: 10 })
            ]);

            const d = dashboardData.data;

            // Update KPIs
            this.updateKPI('kpi-contacts', d.total_contacts || 0);
            this.updateKPI('kpi-contacts-trend', `+${d.new_contacts_7d || 0} (7d)`);
            this.updateKPI('kpi-deals', d.active_deals || 0);
            this.updateKPI('kpi-pipeline-value', this.formatCurrency(d.pipeline_value || 0));
            this.updateKPI('kpi-revenue', this.formatCurrency(d.revenue_30d || 0));
            this.updateKPI('kpi-conversion', `${(d.conversion_rate || 0).toFixed(1)}% conversão`);
            this.updateKPI('kpi-overdue', d.overdue_tasks || 0);

            // Create charts
            if (typeof Charts !== 'undefined') {
                Charts.createFunnelChart('funnel-chart', funnelData.data);
                Charts.createActivityChart('activity-chart', activityData.data);
            }

            // Load recent activity
            this.renderRecentActivity(activitiesList.data);

        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.toast('Erro ao carregar dashboard', 'error');
        }
    },

    // Update KPI element
    updateKPI(elementId, value) {
        const el = document.getElementById(elementId);
        if (el) el.textContent = value;
    },

    // Load conversations view
    async loadConversations() {
        try {
            // Load contacts with recent activity
            const response = await API.contacts.list({
                sort: 'last_activity',
                limit: 100
            });

            this.conversations = response.data.contacts || response.data || [];
            this.renderConversationsList(this.conversations);

            // Load first conversation if available
            if (this.conversations.length > 0 && !this.currentConversationId) {
                this.openConversation(this.conversations[0].id);
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            this.toast('Erro ao carregar conversas', 'error');
        }
    },

    // Render conversations list
    renderConversationsList(conversations) {
        const container = document.getElementById('conversations-list');
        if (!container) return;

        if (!conversations || conversations.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 2rem; text-align: center;">
                    <p style="color: #6b7280;">Nenhuma conversa encontrada</p>
                </div>
            `;
            return;
        }

        container.innerHTML = conversations.map(contact => `
            <div class="conversation-item ${this.currentConversationId === contact.id ? 'active' : ''}"
                 data-contact-id="${contact.id}"
                 onclick="App.openConversation(${contact.id})">
                <div class="conversation-avatar">
                    ${this.getInitials(contact.name)}
                </div>
                <div class="conversation-info">
                    <div class="conversation-header">
                        <span class="conversation-name">${this.escapeHtml(contact.name)}</span>
                        <span class="conversation-time">${this.timeAgo(contact.last_activity || contact.created_at)}</span>
                    </div>
                    <div class="conversation-preview">
                        ${contact.last_message || contact.email || ''}
                    </div>
                </div>
                ${contact.unread_count ? `<span class="unread-badge">${contact.unread_count}</span>` : ''}
            </div>
        `).join('');
    },

    // Filter conversations by search
    filterConversations(query) {
        if (!query || query.length < 2) {
            this.renderConversationsList(this.conversations);
            return;
        }

        const filtered = this.conversations.filter(c =>
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.email?.toLowerCase().includes(query.toLowerCase()) ||
            c.phone?.includes(query)
        );

        this.renderConversationsList(filtered);
    },

    // Open conversation
    async openConversation(contactId) {
        this.currentConversationId = contactId;

        // Update active state in list
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.toggle('active', parseInt(item.dataset.contactId) === contactId);
        });

        try {
            // Load contact details
            const contactResponse = await API.contacts.get(contactId);
            this.selectedContact = contactResponse.data;

            // Load messages/timeline
            const timelineResponse = await API.contacts.timeline(contactId);
            const messages = timelineResponse.data || [];

            // Render
            this.renderChatHeader(this.selectedContact);
            this.renderMessages(messages);
            this.renderContactDetails(this.selectedContact);

            // Enable message input
            const messageInput = document.getElementById('message-input');
            if (messageInput) messageInput.disabled = false;

        } catch (error) {
            console.error('Error loading conversation:', error);
            this.toast('Erro ao carregar conversa', 'error');
        }
    },

    // Render chat header
    renderChatHeader(contact) {
        const header = document.getElementById('chat-header');
        if (!header) return;

        header.innerHTML = `
            <div class="chat-contact-info">
                <div class="chat-avatar">${this.getInitials(contact.name)}</div>
                <div>
                    <div class="chat-contact-name">${this.escapeHtml(contact.name)}</div>
                    <div class="chat-contact-status">${contact.email || contact.phone || ''}</div>
                </div>
            </div>
            <div class="chat-header-actions">
                <button id="toggle-bot-btn" class="btn-icon" title="${contact.is_active === 0 ? 'Retomar IA' : 'Pausar IA'}" onclick="App.toggleBot('${contact.id}')" style="color: ${contact.is_active === 0 ? 'var(--danger)' : 'var(--text-secondary)'}">
                    <i data-lucide="${contact.is_active === 0 ? 'play-circle' : 'pause-circle'}"></i>
                </button>
                <button id="toggle-contact-details" class="btn-icon" title="Ver detalhes">
                    <i data-lucide="info"></i>
                </button>
            </div>
        `;

        // Re-initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // Re-attach event listener
        const toggleBtn = document.getElementById('toggle-contact-details');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleContactDetails());
        }
    },

    // Render messages
    renderMessages(messages) {
        const container = document.getElementById('messages-container');
        if (!container) return;

        if (!messages || messages.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 2rem;">
                    <p style="color: #6b7280;">Nenhuma mensagem ainda</p>
                    <p style="color: #9ca3af; font-size: 0.875rem;">Envie uma mensagem para iniciar a conversa</p>
                </div>
            `;
            return;
        }

        container.innerHTML = messages.map(msg => {
            const isOutgoing = msg.type === 'message_sent' || msg.direction === 'outgoing' || msg.role === 'assistant';

            // Extract thought (check if it exists)
            const thoughtHtml = (isOutgoing && msg.thought) ? `
                <div class="message-thought-container" onclick="this.classList.toggle('expanded')">
                    <div class="message-thought-header">
                        <i data-lucide="brain-circuit"></i>
                        <span>Pensamento Oculto</span>
                    </div>
                    <div class="message-thought-content">${this.escapeHtml(msg.thought)}</div>
                </div>
            ` : '';

            return `
                ${thoughtHtml}
                <div class="message ${isOutgoing ? 'outgoing' : 'incoming'}">
                    <div class="message-content">
                        ${this.escapeHtml(msg.content || msg.description || msg.type)}
                    </div>
                    <div class="message-meta">
                        ${this.formatDate(msg.created_at)}
                    </div>
                </div>
            `;
        }).join('');

        // Re-initialize Lucide icons including the new brain icon
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // Auto-scroll to bottom
        container.scrollTop = container.scrollHeight;
    },

    // Send message
    async sendMessage() {
        const input = document.getElementById('message-input');
        if (!input || !this.currentConversationId) return;

        const message = input.value.trim();
        if (!message) return;

        try {
            // Log activity
            await API.activities.log({
                type: 'message_sent',
                contact_id: this.currentConversationId,
                content: message
            });

            // Clear input
            input.value = '';

            // Reload messages
            const timelineResponse = await API.contacts.timeline(this.currentConversationId);
            this.renderMessages(timelineResponse.data);

            this.toast('Mensagem enviada', 'success');

        } catch (error) {
            console.error('Error sending message:', error);
            this.toast('Erro ao enviar mensagem', 'error');
        }
    },

    // Render contact details panel
    renderContactDetails(contact) {
        const panel = document.getElementById('contact-details-panel');
        if (!panel) return;

        panel.innerHTML = `
            <div class="contact-detail-header">
                <h3>Detalhes do Contato</h3>
            </div>
            <div class="contact-detail-body">
                <div class="contact-detail-avatar">
                    ${this.getInitials(contact.name)}
                </div>
                <h4 class="contact-detail-name">${this.escapeHtml(contact.name)}</h4>

                ${contact.email ? `
                    <div class="contact-detail-item">
                        <i data-lucide="mail"></i>
                        <a href="mailto:${contact.email}">${contact.email}</a>
                    </div>
                ` : ''}

                ${contact.phone ? `
                    <div class="contact-detail-item">
                        <i data-lucide="phone"></i>
                        <a href="tel:${contact.phone}">${this.formatPhone(contact.phone)}</a>
                    </div>
                ` : ''}

                ${contact.company ? `
                    <div class="contact-detail-item">
                        <i data-lucide="building"></i>
                        <span>${this.escapeHtml(contact.company)}</span>
                    </div>
                ` : ''}

                ${contact.tags && contact.tags.length > 0 ? `
                    <div class="contact-detail-tags">
                        ${contact.tags.map(tag => `
                            <span class="tag tag-${tag.category || 'default'}">${this.escapeHtml(tag.name)}</span>
                        `).join('')}
                    </div>
                ` : ''}

                <div class="contact-detail-actions">
                    <button class="btn-secondary" onclick="Contacts.editContact(${contact.id})">
                        <i data-lucide="edit"></i> Editar
                    </button>
                </div>
            </div>
        `;

        // Re-initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    // Toggle contact details panel
    toggleContactDetails() {
        const panel = document.getElementById('contact-details-panel');
        if (panel) {
            panel.classList.toggle('hidden');
        }
    },

    // Load reports data
    async loadReportsData() {
        try {
            const [performance, lostReasons, daily] = await Promise.all([
                API.metrics.performance(30),
                API.metrics.lostReasons(90),
                API.metrics.daily(30)
            ]);

            if (typeof Charts !== 'undefined') {
                Charts.createPerformanceChart('performance-chart', performance.data);
                Charts.createLostReasonsChart('lost-reasons-chart', lostReasons.data);
                Charts.createDailyMetricsChart('daily-metrics-chart', daily.data);
            }

        } catch (error) {
            console.error('Error loading reports:', error);
            this.toast('Erro ao carregar relatórios', 'error');
        }
    },

    // Render recent activity
    renderRecentActivity(activities) {
        const container = document.getElementById('recent-activity');
        if (!container) return;

        const icons = {
            message_sent: 'send',
            message_received: 'inbox',
            deal_created: 'target',
            deal_won: 'trophy',
            deal_lost: 'x-circle',
            stage_change: 'arrow-right',
            followup: 'repeat',
            task: 'check-square',
            note: 'file-text'
        };

        container.innerHTML = activities.map(a => `
            <div class="activity-item">
                <span class="activity-icon">
                    <i data-lucide="${icons[a.type] || 'activity'}"></i>
                </span>
                <div class="activity-content">
                    <span class="activity-title">${this.escapeHtml(a.title || a.type)}</span>
                    ${a.contact_name ? `<span class="activity-contact">${this.escapeHtml(a.contact_name)}</span>` : ''}
                </div>
                <span class="activity-time">${this.timeAgo(a.created_at)}</span>
            </div>
        `).join('');

        // Re-initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    // Close all modals
    closeModals() {
        const overlay = document.getElementById('modal-overlay');
        if (overlay) overlay.classList.add('hidden');

        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    },

    // Open modal
    openModal(modalId) {
        const overlay = document.getElementById('modal-overlay');
        const modal = document.getElementById(modalId);

        if (overlay) overlay.classList.remove('hidden');
        if (modal) modal.classList.remove('hidden');
    },

    // Show toast notification
    toast(message, type = 'info') {
        const container = document.getElementById('toast-container') || this.createToastContainer();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icon = this.getToastIcon(type);
        toast.innerHTML = `
            ${icon ? `<i data-lucide="${icon}"></i>` : ''}
            <span>${this.escapeHtml(message)}</span>
        `;

        container.appendChild(toast);

        // Re-initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Create toast container if it doesn't exist
    createToastContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = 'position: fixed; top: 1rem; right: 1rem; z-index: 9999;';
            document.body.appendChild(container);
        }
        return container;
    },

    // Get toast icon by type
    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'alert-triangle',
            info: 'info'
        };
        return icons[type] || 'info';
    },

    // Start polling for real-time updates
    startPolling() {
        // Poll for new messages every 10 seconds
        this.messagesPolling = setInterval(() => {
            if (this.currentView === 'conversations' && this.currentConversationId) {
                this.refreshMessages();
            }
            this.updateBadgeCounts();
        }, 10000);
    },

    // Stop polling
    stopPolling() {
        if (this.messagesPolling) {
            clearInterval(this.messagesPolling);
            this.messagesPolling = null;
        }
    },

    // Refresh messages in current conversation
    async refreshMessages() {
        if (!this.currentConversationId) return;

        try {
            const timelineResponse = await API.contacts.timeline(this.currentConversationId);
            this.renderMessages(timelineResponse.data);
        } catch (error) {
            console.error('Error refreshing messages:', error);
        }
    },

    // Update badge counts
    async updateBadgeCounts() {
        try {
            const [tasksStats, dealsStats] = await Promise.all([
                API.tasks.stats(),
                API.deals.stats()
            ]);

            // Update tasks badge
            const tasksBadge = document.querySelector('[data-view="tasks"] .nav-badge');
            if (tasksBadge && tasksStats.data.overdue > 0) {
                tasksBadge.textContent = tasksStats.data.overdue;
                tasksBadge.classList.remove('hidden');
            }

            // Update deals badge
            const dealsBadge = document.querySelector('[data-view="pipeline"] .nav-badge');
            if (dealsBadge && dealsStats.data.needs_attention > 0) {
                dealsBadge.textContent = dealsStats.data.needs_attention;
                dealsBadge.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error updating badges:', error);
        }
    },

    // Handle global search
    async handleSearch(query) {
        if (!query || query.length < 2) {
            this.hideSearchResults();
            return;
        }

        try {
            // Search across contacts and deals
            const [contactsRes, dealsRes] = await Promise.all([
                API.contacts.list({ search: query, limit: 5 }),
                API.deals.list({ search: query, limit: 5 })
            ]);

            this.showSearchResults({
                contacts: contactsRes.data.contacts || contactsRes.data || [],
                deals: dealsRes.data.deals || dealsRes.data || []
            });

        } catch (error) {
            console.error('Search error:', error);
        }
    },

    // Show search results
    showSearchResults(results) {
        let resultsPanel = document.getElementById('search-results');

        if (!resultsPanel) {
            resultsPanel = document.createElement('div');
            resultsPanel.id = 'search-results';
            resultsPanel.className = 'search-results-panel';

            const searchContainer = document.getElementById('global-search')?.parentElement;
            if (searchContainer) {
                searchContainer.style.position = 'relative';
                searchContainer.appendChild(resultsPanel);
            }
        }

        const html = [];

        if (results.contacts.length > 0) {
            html.push('<div class="search-section">');
            html.push('<div class="search-section-title">Contatos</div>');
            results.contacts.forEach(c => {
                html.push(`
                    <div class="search-result-item" onclick="App.switchView('contacts'); Contacts.viewContact(${c.id})">
                        <div class="search-result-avatar">${this.getInitials(c.name)}</div>
                        <div>
                            <div class="search-result-name">${this.escapeHtml(c.name)}</div>
                            <div class="search-result-meta">${c.email || c.phone || ''}</div>
                        </div>
                    </div>
                `);
            });
            html.push('</div>');
        }

        if (results.deals.length > 0) {
            html.push('<div class="search-section">');
            html.push('<div class="search-section-title">Negócios</div>');
            results.deals.forEach(d => {
                html.push(`
                    <div class="search-result-item" onclick="App.switchView('pipeline'); Pipeline.viewDeal(${d.id})">
                        <div>
                            <div class="search-result-name">${this.escapeHtml(d.title)}</div>
                            <div class="search-result-meta">${this.formatCurrency(d.value)} • ${d.stage}</div>
                        </div>
                    </div>
                `);
            });
            html.push('</div>');
        }

        if (html.length === 0) {
            html.push('<div class="search-no-results">Nenhum resultado encontrado</div>');
        }

        resultsPanel.innerHTML = html.join('');
        resultsPanel.classList.remove('hidden');

        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', this.handleSearchOutsideClick);
        }, 100);
    },

    // Hide search results
    hideSearchResults() {
        const resultsPanel = document.getElementById('search-results');
        if (resultsPanel) {
            resultsPanel.classList.add('hidden');
        }
        document.removeEventListener('click', this.handleSearchOutsideClick);
    },

    // Handle click outside search
    handleSearchOutsideClick(e) {
        const searchInput = document.getElementById('global-search');
        const resultsPanel = document.getElementById('search-results');

        if (searchInput && resultsPanel &&
            !searchInput.contains(e.target) &&
            !resultsPanel.contains(e.target)) {
            App.hideSearchResults();
        }
    },

    // Utility: Format date
    formatDate(dateString) {
        if (!dateString) return '';

        const date = new Date(dateString);
        const now = new Date();

        // If today, show time
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }

        // If this year, show day and month
        if (date.getFullYear() === now.getFullYear()) {
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        }

        // Otherwise, show full date
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    },

    // Utility: Format currency
    formatCurrency(value) {
        if (typeof value !== 'number') value = parseFloat(value) || 0;
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    },

    // Utility: Format phone
    formatPhone(phone) {
        if (!phone) return '';

        // Remove non-digits
        const cleaned = phone.replace(/\D/g, '');

        // Format Brazilian phone
        if (cleaned.length === 11) {
            return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (cleaned.length === 10) {
            return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }

        return phone;
    },

    // Utility: Get initials from name
    getInitials(name) {
        if (!name) return '?';

        const parts = name.trim().split(' ');
        if (parts.length === 1) {
            return parts[0].charAt(0).toUpperCase();
        }

        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    },

    // Utility: Time ago
    timeAgo(dateString) {
        if (!dateString) return '';

        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'agora';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
        if (seconds < 2592000) return `${Math.floor(seconds / 604800)}sem`;
        return `${Math.floor(seconds / 2592000)}mês`;
    },

    // Utility: Debounce
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Utility: Escape HTML
    escapeHtml(text) {
        if (!text) return '';

        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };

        return text.toString().replace(/[&<>"']/g, m => map[m]);
    },

    // Initialize Charts
    initCharts() {
        const chartConfig = {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            }
        };

        // Conversations Chart
        const conversationsCtx = document.getElementById('conversationsChart');
        if (conversationsCtx) {
            if (this.charts.conversations) this.charts.conversations.destroy();
            this.charts.conversations = new Chart(conversationsCtx, {
                type: 'line',
                data: {
                    labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'],
                    datasets: [{
                        label: 'Conversas',
                        data: [12, 19, 15, 25, 22, 18, 20],
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: chartConfig
            });
        }

        // Pipeline Chart
        const pipelineCtx = document.getElementById('pipelineChart');
        if (pipelineCtx) {
            if (this.charts.pipeline) this.charts.pipeline.destroy();
            this.charts.pipeline = new Chart(pipelineCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Qualificacao', 'Proposta', 'Negociacao', 'Ganho'],
                    datasets: [{
                        data: [4, 3, 2, 8],
                        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6']
                    }]
                },
                options: {
                    ...chartConfig,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom'
                        }
                    }
                }
            });
        }

        // Revenue Chart
        const revenueCtx = document.getElementById('revenueChart');
        if (revenueCtx) {
            if (this.charts.revenue) this.charts.revenue.destroy();
            this.charts.revenue = new Chart(revenueCtx, {
                type: 'bar',
                data: {
                    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
                    datasets: [{
                        label: 'Receita',
                        data: [32000, 38000, 35000, 42000, 40000, 45000],
                        backgroundColor: '#10B981'
                    }]
                },
                options: chartConfig
            });
        }

        // Conversion Chart
        const conversionCtx = document.getElementById('conversionChart');
        if (conversionCtx) {
            if (this.charts.conversion) this.charts.conversion.destroy();
            this.charts.conversion = new Chart(conversionCtx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
                    datasets: [{
                        label: 'Taxa de Conversao (%)',
                        data: [28, 30, 32, 31, 33, 34],
                        borderColor: '#F59E0B',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: chartConfig
            });
        }
    },

    setupPipelineDragAndDrop() {
        let draggedCard = null;

        document.querySelectorAll('.pipeline-card').forEach(card => {
            card.addEventListener('dragstart', function (e) {
                draggedCard = this;
                this.style.opacity = '0.5';
            });

            card.addEventListener('dragend', function (e) {
                this.style.opacity = '1';
                draggedCard = null;
            });
        });

        document.querySelectorAll('.pipeline-cards').forEach(column => {
            column.addEventListener('dragover', function (e) {
                e.preventDefault();
            });

            column.addEventListener('drop', (e) => {
                e.preventDefault();
                if (draggedCard) {
                    column.appendChild(draggedCard);
                    this.toast('Negociacao movida com sucesso!', 'success');
                }
            });
        });
    }
};

const Contacts = {
    showModal() {
        // Implement modal show logic (remove hidden class)
        const modal = document.getElementById('new-contact');
        if (modal) {
            modal.classList.add('active');
        }
    },

    // Create new contact
    async create() {
        const form = document.getElementById('contact-form');
        if (!form) return;

        // Get inputs by placeholder since IDs are missing or unreliable
        const name = form.querySelector('input[placeholder="Nome completo"]')?.value;
        const email = form.querySelector('input[placeholder="email@exemplo.com"]')?.value;
        const phone = form.querySelector('input[placeholder="(11) 99999-9999"]')?.value;
        const company = form.querySelector('input[placeholder="Nome da empresa"]')?.value;
        const role = form.querySelector('input[placeholder="Ex: Gerente de Vendas"]')?.value;

        if (!name || !phone) {
            App.toast('Nome e Telefone são obrigatórios', 'error');
            return;
        }

        const btn = document.getElementById('create-contact-btn');
        if (btn) btn.disabled = true;

        try {
            await API.contacts.create({
                name,
                email,
                phone,
                company,
                role
            });

            App.toast('Contato criado com sucesso!', 'success');
            App.closeModals();

            // Reload contacts or dashboard
            if (App.currentView === 'contacts') {
                this.loadContacts();
            } else {
                App.loadDashboardData();
            }

        } catch (error) {
            console.error('Error creating contact:', error);
            App.toast('Erro ao criar contato: ' + error.message, 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    },

    async loadContacts() {
        try {
            const response = await API.contacts.list({ limit: 50 });
            const contacts = response.data.contacts || response.data || [];

            const tbody = document.querySelector('table tbody');
            if (tbody) {
                tbody.innerHTML = contacts.map(c => `
                    <tr>
                        <td>
                            <div class="table-contact">
                                <div class="table-avatar">${App.getInitials(c.name)}</div>
                                <div class="table-contact-info">
                                    <div class="table-contact-name">${App.escapeHtml(c.name)}</div>
                                    <div class="table-contact-email">${App.escapeHtml(c.email || '')}</div>
                                </div>
                            </div>
                        </td>
                        <td>${App.escapeHtml(c.company || '-')}</td>
                        <td>${App.formatPhone(c.phone)}</td>
                        <td><span class="status-badge ${c.is_active === 0 ? 'status-inactive' : 'status-active'}">${c.is_active === 0 ? 'Pausado' : 'Ativo'}</span></td>
                        <td>${App.timeAgo(c.updated_at || c.created_at)}</td>
                    </tr>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading contacts table:', error);
            App.toast('Erro ao carregar contatos', 'error');
        }
    }
};

const Pipeline = {
    showDealModal() {
        const modal = document.getElementById('new-deal');
        if (modal) modal.classList.add('active');
    },
    handleDealSubmit(e) { e.preventDefault(); App.toast('Funcionalidade em desenvolvimento', 'info'); App.closeModals(); },
    loadKanban() { console.log('Loading Kanban...'); }
};

const Tasks = {
    showModal() {
        const modal = document.getElementById('new-task');
        if (modal) modal.classList.add('active');
    },
    handleSubmit(e) { e.preventDefault(); App.toast('Funcionalidade em desenvolvimento', 'info'); App.closeModals(); },
    loadTasks(filter) { console.log('Loading tasks:', filter); }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    App.stopPolling();
});
