/**
 * Tasks Component - Task List & Management
 */

const Tasks = {
    tasks: [],
    currentFilter: 'pending',
    editingTaskId: null,

    // Load tasks
    async loadTasks(filter = 'pending') {
        this.currentFilter = filter;

        try {
            let response;

            switch (filter) {
                case 'overdue':
                    response = await API.tasks.overdue();
                    break;
                case 'today':
                    response = await API.tasks.today();
                    break;
                case 'completed':
                    response = await API.tasks.list({ status: 'completed' });
                    break;
                default:
                    response = await API.tasks.list({ status: 'pending' });
            }

            this.tasks = response.data;
            this.renderTasksList();

        } catch (error) {
            console.error('Error loading tasks:', error);
            App.toast('Erro ao carregar tarefas', 'error');
        }
    },

    // Render tasks list
    renderTasksList() {
        const container = document.getElementById('tasks-list');
        if (!container) return;

        if (this.tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Nenhuma tarefa encontrada</p>
                </div>
            `;
            return;
        }

        // Group tasks by date
        const grouped = this.groupTasksByDate(this.tasks);

        container.innerHTML = Object.entries(grouped).map(([date, tasks]) => `
            <div class="task-group">
                <h3 class="task-group-header">${this.formatDateHeader(date)}</h3>
                <div class="task-group-items">
                    ${tasks.map(task => this.renderTaskItem(task)).join('')}
                </div>
            </div>
        `).join('');

        this.setupTasksListeners();
    },

    // Group tasks by date
    groupTasksByDate(tasks) {
        const grouped = {};

        tasks.forEach(task => {
            const date = task.due_date || 'no-date';
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(task);
        });

        return grouped;
    },

    // Format date header
    formatDateHeader(dateString) {
        if (dateString === 'no-date') return 'Sem data definida';

        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) return 'Hoje';
        if (date.toDateString() === tomorrow.toDateString()) return 'Amanhã';

        return date.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
    },

    // Render task item
    renderTaskItem(task) {
        const typeIcons = {
            call: '📞',
            email: '📧',
            meeting: '🤝',
            followup: '🔄',
            other: '📝'
        };

        const priorityColors = {
            high: 'red',
            medium: 'orange',
            low: 'blue'
        };

        const isOverdue = this.isOverdue(task.due_date);

        return `
            <div class="task-item ${task.status === 'completed' ? 'completed' : ''}
                ${isOverdue ? 'overdue' : ''}" data-task-id="${task.id}">
                <div class="task-checkbox">
                    <input type="checkbox"
                        ${task.status === 'completed' ? 'checked' : ''}
                        onchange="Tasks.toggleTask('${task.id}')">
                </div>
                <div class="task-icon">${typeIcons[task.type] || '📝'}</div>
                <div class="task-content">
                    <div class="task-title">${task.title}</div>
                    <div class="task-meta">
                        ${task.contact_name ? `<span class="task-contact">${task.contact_name}</span>` : ''}
                        ${task.deal_title ? `<span class="task-deal">${task.deal_title}</span>` : ''}
                        ${task.due_time ? `<span class="task-time">${task.due_time}</span>` : ''}
                    </div>
                </div>
                <div class="task-actions">
                    ${task.priority ? `
                        <span class="priority-badge priority-${priorityColors[task.priority]}">
                            ${task.priority}
                        </span>
                    ` : ''}
                    <button class="btn-icon edit-task" data-id="${task.id}" title="Editar">
                        ✏️
                    </button>
                    <button class="btn-icon delete-task" data-id="${task.id}" title="Excluir">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    },

    // Setup tasks event listeners
    setupTasksListeners() {
        // Edit task
        document.querySelectorAll('.edit-task').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showModal(btn.dataset.id);
            });
        });

        // Delete task
        document.querySelectorAll('.delete-task').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteTask(btn.dataset.id);
            });
        });

        // Task item click
        document.querySelectorAll('.task-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.task-checkbox') &&
                    !e.target.closest('.task-actions')) {
                    this.showTaskDetails(item.dataset.taskId);
                }
            });
        });
    },

    // Toggle task completion
    async toggleTask(taskId) {
        try {
            const task = this.tasks.find(t => t.id === taskId);
            if (!task) return;

            if (task.status === 'completed') {
                // Reopen task
                await API.tasks.update(taskId, { status: 'pending' });
            } else {
                // Complete task
                await API.tasks.complete(taskId);
            }

            this.loadTasks(this.currentFilter);

        } catch (error) {
            console.error('Error toggling task:', error);
            App.toast('Erro ao atualizar tarefa', 'error');
        }
    },

    // Show task modal
    showModal(taskId = null) {
        this.editingTaskId = taskId;

        const modal = document.getElementById('task-modal');
        const form = document.getElementById('task-form');

        if (taskId) {
            this.loadTaskForEdit(taskId);
        } else {
            form.reset();
        }

        App.openModal('task-modal');
    },

    // Load task for editing
    async loadTaskForEdit(taskId) {
        try {
            const response = await API.tasks.get(taskId);
            const task = response.data;

            document.getElementById('task-title').value = task.title || '';
            document.getElementById('task-type').value = task.type || 'other';
            document.getElementById('task-priority').value = task.priority || 'medium';
            document.getElementById('task-due-date').value = task.due_date || '';
            document.getElementById('task-due-time').value = task.due_time || '';
            document.getElementById('task-contact').value = task.contact_id || '';
            document.getElementById('task-deal').value = task.deal_id || '';
            document.getElementById('task-notes').value = task.notes || '';

        } catch (error) {
            console.error('Error loading task:', error);
            App.toast('Erro ao carregar tarefa', 'error');
        }
    },

    // Handle task form submit
    async handleSubmit(e) {
        e.preventDefault();

        const formData = {
            title: document.getElementById('task-title').value,
            type: document.getElementById('task-type').value,
            priority: document.getElementById('task-priority').value,
            due_date: document.getElementById('task-due-date').value,
            due_time: document.getElementById('task-due-time').value,
            contact_id: document.getElementById('task-contact').value,
            deal_id: document.getElementById('task-deal').value,
            notes: document.getElementById('task-notes').value
        };

        try {
            if (this.editingTaskId) {
                await API.tasks.update(this.editingTaskId, formData);
                App.toast('Tarefa atualizada com sucesso', 'success');
            } else {
                await API.tasks.create(formData);
                App.toast('Tarefa criada com sucesso', 'success');
            }

            App.closeModals();
            this.loadTasks(this.currentFilter);

        } catch (error) {
            console.error('Error saving task:', error);
            App.toast('Erro ao salvar tarefa', 'error');
        }
    },

    // Show task details
    async showTaskDetails(taskId) {
        // Implementation for showing task details
        console.log('Show task details:', taskId);
    },

    // Delete task
    async deleteTask(taskId) {
        if (!confirm('Tem certeza que deseja excluir esta tarefa?')) {
            return;
        }

        try {
            await API.tasks.delete(taskId);
            App.toast('Tarefa excluída com sucesso', 'success');
            this.loadTasks(this.currentFilter);

        } catch (error) {
            console.error('Error deleting task:', error);
            App.toast('Erro ao excluir tarefa', 'error');
        }
    },

    // Check if task is overdue
    isOverdue(dueDate) {
        if (!dueDate) return false;
        const date = new Date(dueDate);
        const now = new Date();
        return date < now;
    }
};
