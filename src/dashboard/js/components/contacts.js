/**
 * Contacts Component - Contact List & Management
 */

const Contacts = {
    contacts: [],
    currentPage: 1,
    pageSize: 50,
    filters: {},
    editingContactId: null,

    // Load contacts list
    async loadContacts(page = 1) {
        this.currentPage = page;

        try {
            const params = {
                page: this.currentPage,
                limit: this.pageSize,
                ...this.filters
            };

            const response = await API.contacts.list(params);
            this.contacts = response.data.contacts;
            this.renderContactsList();
            this.renderPagination(response.data.total, response.data.pages);

        } catch (error) {
            console.error('Error loading contacts:', error);
            App.toast('Erro ao carregar contatos', 'error');
        }
    },

    // Render contacts list
    renderContactsList() {
        const container = document.getElementById('contacts-list');
        if (!container) return;

        if (this.contacts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Nenhum contato encontrado</p>
                    <button class="btn-primary" onclick="Contacts.showModal()">
                        Adicionar Primeiro Contato
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="contacts-table">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>WhatsApp</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Última Interação</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.contacts.map(contact => this.renderContactRow(contact)).join('')}
                </tbody>
            </table>
        `;

        this.setupContactsListeners();
    },

    // Render contact row
    renderContactRow(contact) {
        const statusLabels = {
            lead: 'Lead',
            contacted: 'Contatado',
            qualified: 'Qualificado',
            customer: 'Cliente',
            inactive: 'Inativo'
        };

        const statusColors = {
            lead: 'gray',
            contacted: 'blue',
            qualified: 'purple',
            customer: 'green',
            inactive: 'red'
        };

        return `
            <tr data-contact-id="${contact.id}">
                <td>
                    <div class="contact-info">
                        <div class="contact-avatar">${contact.name.charAt(0).toUpperCase()}</div>
                        <div>
                            <div class="contact-name">${contact.name}</div>
                            ${contact.company ? `<div class="contact-company">${contact.company}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td>${contact.phone || '-'}</td>
                <td>${contact.email || '-'}</td>
                <td>
                    <span class="status-badge status-${statusColors[contact.status]}">
                        ${statusLabels[contact.status] || contact.status}
                    </span>
                </td>
                <td>${contact.last_interaction ? App.timeAgo(contact.last_interaction) : 'Nunca'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon view-contact" data-id="${contact.id}" title="Ver detalhes">
                            👁️
                        </button>
                        <button class="btn-icon edit-contact" data-id="${contact.id}" title="Editar">
                            ✏️
                        </button>
                        <button class="btn-icon delete-contact" data-id="${contact.id}" title="Excluir">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    // Setup contacts list event listeners
    setupContactsListeners() {
        // View contact
        document.querySelectorAll('.view-contact').forEach(btn => {
            btn.addEventListener('click', () => this.showContactDetails(btn.dataset.id));
        });

        // Edit contact
        document.querySelectorAll('.edit-contact').forEach(btn => {
            btn.addEventListener('click', () => this.showModal(btn.dataset.id));
        });

        // Delete contact
        document.querySelectorAll('.delete-contact').forEach(btn => {
            btn.addEventListener('click', () => this.deleteContact(btn.dataset.id));
        });

        // Row click to view details
        document.querySelectorAll('.contacts-table tbody tr').forEach(row => {
            row.addEventListener('click', (e) => {
                if (!e.target.closest('.action-buttons')) {
                    this.showContactDetails(row.dataset.contactId);
                }
            });
        });
    },

    // Show contact modal
    showModal(contactId = null) {
        this.editingContactId = contactId;

        const modal = document.getElementById('contact-modal');
        const form = document.getElementById('contact-form');

        if (contactId) {
            this.loadContactForEdit(contactId);
        } else {
            form.reset();
        }

        App.openModal('contact-modal');
    },

    // Load contact for editing
    async loadContactForEdit(contactId) {
        try {
            const response = await API.contacts.get(contactId);
            const contact = response.data;

            document.getElementById('contact-name').value = contact.name || '';
            document.getElementById('contact-phone').value = contact.phone || '';
            document.getElementById('contact-email').value = contact.email || '';
            document.getElementById('contact-company').value = contact.company || '';
            document.getElementById('contact-position').value = contact.position || '';
            document.getElementById('contact-status').value = contact.status || 'lead';
            document.getElementById('contact-notes').value = contact.notes || '';

        } catch (error) {
            console.error('Error loading contact:', error);
            App.toast('Erro ao carregar contato', 'error');
        }
    },

    // Handle contact form submit
    async handleSubmit(e) {
        e.preventDefault();

        const formData = {
            name: document.getElementById('contact-name').value,
            phone: document.getElementById('contact-phone').value,
            email: document.getElementById('contact-email').value,
            company: document.getElementById('contact-company').value,
            position: document.getElementById('contact-position').value,
            status: document.getElementById('contact-status').value,
            notes: document.getElementById('contact-notes').value
        };

        try {
            if (this.editingContactId) {
                await API.contacts.update(this.editingContactId, formData);
                App.toast('Contato atualizado com sucesso', 'success');
            } else {
                await API.contacts.create(formData);
                App.toast('Contato criado com sucesso', 'success');
            }

            App.closeModals();
            this.loadContacts(this.currentPage);

        } catch (error) {
            console.error('Error saving contact:', error);
            App.toast('Erro ao salvar contato', 'error');
        }
    },

    // Show contact details
    async showContactDetails(contactId) {
        try {
            const [contactResponse, timelineResponse, dealsResponse] = await Promise.all([
                API.contacts.get(contactId),
                API.contacts.timeline(contactId),
                API.contacts.deals(contactId)
            ]);

            const contact = contactResponse.data;
            const timeline = timelineResponse.data;
            const deals = dealsResponse.data;

            this.renderContactDetailsModal(contact, timeline, deals);

        } catch (error) {
            console.error('Error loading contact details:', error);
            App.toast('Erro ao carregar detalhes', 'error');
        }
    },

    // Render contact details modal
    renderContactDetailsModal(contact, timeline, deals) {
        // Implementation for rendering contact details in a modal
        // Should include: contact info, timeline, deals, tasks, notes
        console.log('Contact details:', contact, timeline, deals);
    },

    // Delete contact
    async deleteContact(contactId) {
        if (!confirm('Tem certeza que deseja excluir este contato?')) {
            return;
        }

        try {
            await API.contacts.delete(contactId);
            App.toast('Contato excluído com sucesso', 'success');
            this.loadContacts(this.currentPage);

        } catch (error) {
            console.error('Error deleting contact:', error);
            App.toast('Erro ao excluir contato', 'error');
        }
    },

    // Render pagination
    renderPagination(total, totalPages) {
        const container = document.getElementById('contacts-pagination');
        if (!container) return;

        const maxButtons = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);

        if (endPage - startPage + 1 < maxButtons) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        let html = `
            <div class="pagination">
                <button class="btn-pagination" ${this.currentPage === 1 ? 'disabled' : ''}
                    onclick="Contacts.loadContacts(1)">««</button>
                <button class="btn-pagination" ${this.currentPage === 1 ? 'disabled' : ''}
                    onclick="Contacts.loadContacts(${this.currentPage - 1})">‹</button>
        `;

        for (let i = startPage; i <= endPage; i++) {
            html += `
                <button class="btn-pagination ${i === this.currentPage ? 'active' : ''}"
                    onclick="Contacts.loadContacts(${i})">${i}</button>
            `;
        }

        html += `
                <button class="btn-pagination" ${this.currentPage === totalPages ? 'disabled' : ''}
                    onclick="Contacts.loadContacts(${this.currentPage + 1})">›</button>
                <button class="btn-pagination" ${this.currentPage === totalPages ? 'disabled' : ''}
                    onclick="Contacts.loadContacts(${totalPages})">»»</button>
            </div>
            <div class="pagination-info">
                Mostrando ${(this.currentPage - 1) * this.pageSize + 1} a
                ${Math.min(this.currentPage * this.pageSize, total)} de ${total} contatos
            </div>
        `;

        container.innerHTML = html;
    },

    // Apply filters
    applyFilters(filters) {
        this.filters = filters;
        this.loadContacts(1);
    }
};
