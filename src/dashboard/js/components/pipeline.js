/**
 * Pipeline Component - Kanban Board
 */

const Pipeline = {
    currentPipeline: 'vendas',
    deals: {},
    editingDealId: null,

    // Load kanban board
    async loadKanban(pipeline = this.currentPipeline) {
        this.currentPipeline = pipeline;

        try {
            const response = await API.deals.kanban(pipeline);
            this.deals = response.data;
            this.renderKanban();
        } catch (error) {
            console.error('Error loading kanban:', error);
            App.toast('Erro ao carregar pipeline', 'error');
        }
    },

    // Render kanban board
    renderKanban() {
        const stages = {
            vendas: ['lead', 'contato', 'qualificacao', 'proposta', 'negociacao', 'fechado'],
            pos_venda: ['onboarding', 'ativo', 'renovacao', 'churn']
        };

        const stageLabels = {
            lead: 'Lead',
            contato: 'Contato Inicial',
            qualificacao: 'Qualificação',
            proposta: 'Proposta',
            negociacao: 'Negociação',
            fechado: 'Fechado',
            onboarding: 'Onboarding',
            ativo: 'Ativo',
            renovacao: 'Renovação',
            churn: 'Churn'
        };

        const kanbanContainer = document.getElementById('kanban-board');
        if (!kanbanContainer) return;

        const currentStages = stages[this.currentPipeline] || stages.vendas;

        kanbanContainer.innerHTML = currentStages.map(stage => {
            const stageDeals = this.deals[stage] || [];
            const totalValue = stageDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);

            return `
                <div class="kanban-column" data-stage="${stage}">
                    <div class="kanban-header">
                        <h3>${stageLabels[stage]}</h3>
                        <div class="kanban-meta">
                            <span class="deal-count">${stageDeals.length}</span>
                            <span class="deal-value">R$ ${totalValue.toLocaleString('pt-BR')}</span>
                        </div>
                    </div>
                    <div class="kanban-body" data-stage="${stage}">
                        ${stageDeals.map(deal => this.renderDealCard(deal)).join('')}
                    </div>
                    <button class="add-deal-btn" data-stage="${stage}">
                        + Nova Oportunidade
                    </button>
                </div>
            `;
        }).join('');

        this.setupKanbanListeners();
        this.initializeDragAndDrop();
    },

    // Render deal card
    renderDealCard(deal) {
        const probability = deal.probability || 0;
        const expectedValue = (deal.value || 0) * (probability / 100);

        return `
            <div class="deal-card" data-deal-id="${deal.id}" draggable="true">
                <div class="deal-card-header">
                    <h4>${deal.title}</h4>
                    <button class="deal-menu-btn" data-deal-id="${deal.id}">⋮</button>
                </div>
                <div class="deal-card-body">
                    <p class="contact-name">${deal.contact_name || 'Sem contato'}</p>
                    <div class="deal-value">R$ ${(deal.value || 0).toLocaleString('pt-BR')}</div>
                    <div class="deal-probability">${probability}% probabilidade</div>
                    <div class="deal-expected">Esperado: R$ ${expectedValue.toLocaleString('pt-BR')}</div>
                </div>
                ${deal.due_date ? `
                    <div class="deal-card-footer">
                        <span class="due-date ${this.isDueSoon(deal.due_date) ? 'overdue' : ''}">
                            ${new Date(deal.due_date).toLocaleDateString('pt-BR')}
                        </span>
                    </div>
                ` : ''}
            </div>
        `;
    },

    // Setup kanban event listeners
    setupKanbanListeners() {
        // Add deal buttons
        document.querySelectorAll('.add-deal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showDealModal(null, btn.dataset.stage);
            });
        });

        // Deal card clicks
        document.querySelectorAll('.deal-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('deal-menu-btn')) {
                    this.showDealDetails(card.dataset.dealId);
                }
            });
        });

        // Deal menu buttons
        document.querySelectorAll('.deal-menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showDealMenu(btn.dataset.dealId, btn);
            });
        });
    },

    // Initialize drag and drop
    initializeDragAndDrop() {
        const cards = document.querySelectorAll('.deal-card');
        const columns = document.querySelectorAll('.kanban-body');

        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', card.innerHTML);
                card.classList.add('dragging');
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
            });
        });

        columns.forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                column.classList.add('drag-over');
            });

            column.addEventListener('dragleave', () => {
                column.classList.remove('drag-over');
            });

            column.addEventListener('drop', (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');

                const draggedCard = document.querySelector('.dragging');
                if (draggedCard) {
                    const dealId = draggedCard.dataset.dealId;
                    const newStage = column.dataset.stage;
                    this.moveDeal(dealId, newStage);
                }
            });
        });
    },

    // Move deal to new stage
    async moveDeal(dealId, newStage) {
        try {
            await API.deals.moveToStage(dealId, newStage);
            this.loadKanban();
            App.toast('Deal movido com sucesso', 'success');
        } catch (error) {
            console.error('Error moving deal:', error);
            App.toast('Erro ao mover deal', 'error');
        }
    },

    // Show deal modal
    showDealModal(dealId = null, defaultStage = 'lead') {
        this.editingDealId = dealId;

        const modal = document.getElementById('deal-modal');
        const form = document.getElementById('deal-form');

        if (dealId) {
            // Load existing deal
            this.loadDealForEdit(dealId);
        } else {
            // New deal
            form.reset();
            document.getElementById('deal-stage').value = defaultStage;
        }

        App.openModal('deal-modal');
    },

    // Load deal for editing
    async loadDealForEdit(dealId) {
        try {
            const response = await API.deals.get(dealId);
            const deal = response.data;

            document.getElementById('deal-title').value = deal.title || '';
            document.getElementById('deal-value').value = deal.value || '';
            document.getElementById('deal-probability').value = deal.probability || 50;
            document.getElementById('deal-stage').value = deal.stage || 'lead';
            document.getElementById('deal-contact').value = deal.contact_id || '';
            document.getElementById('deal-notes').value = deal.notes || '';
            document.getElementById('deal-due-date').value = deal.due_date || '';

        } catch (error) {
            console.error('Error loading deal:', error);
            App.toast('Erro ao carregar deal', 'error');
        }
    },

    // Handle deal form submit
    async handleDealSubmit(e) {
        e.preventDefault();

        const formData = {
            title: document.getElementById('deal-title').value,
            value: parseFloat(document.getElementById('deal-value').value) || 0,
            probability: parseInt(document.getElementById('deal-probability').value) || 50,
            stage: document.getElementById('deal-stage').value,
            contact_id: document.getElementById('deal-contact').value,
            notes: document.getElementById('deal-notes').value,
            due_date: document.getElementById('deal-due-date').value,
            pipeline: this.currentPipeline
        };

        try {
            if (this.editingDealId) {
                await API.deals.update(this.editingDealId, formData);
                App.toast('Deal atualizado com sucesso', 'success');
            } else {
                await API.deals.create(formData);
                App.toast('Deal criado com sucesso', 'success');
            }

            App.closeModals();
            this.loadKanban();

        } catch (error) {
            console.error('Error saving deal:', error);
            App.toast('Erro ao salvar deal', 'error');
        }
    },

    // Show deal details
    async showDealDetails(dealId) {
        // Implementation for showing deal details in a modal or side panel
        console.log('Show deal details:', dealId);
    },

    // Show deal menu
    showDealMenu(dealId, button) {
        // Implementation for showing context menu with options like:
        // - Edit
        // - Delete
        // - Mark as Won
        // - Mark as Lost
        console.log('Show deal menu:', dealId);
    },

    // Check if due date is soon
    isDueSoon(dueDate) {
        const date = new Date(dueDate);
        const now = new Date();
        const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
        return diffDays < 3;
    }
};
