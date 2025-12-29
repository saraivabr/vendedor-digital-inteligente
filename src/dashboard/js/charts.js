/**
 * Charts Module for CRM Dashboard
 * Uses Chart.js for visualizations
 */

const Charts = {
    instances: {},

    // Color palette
    colors: {
        primary: '#3B82F6',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        purple: '#8B5CF6',
        pink: '#EC4899',
        gray: '#6B7280',
        stages: ['#94A3B8', '#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444']
    },

    // Default chart options
    defaultOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: '#9CA3AF',
                    font: { family: 'Inter' }
                }
            }
        },
        scales: {
            x: {
                ticks: { color: '#9CA3AF' },
                grid: { color: 'rgba(255,255,255,0.05)' }
            },
            y: {
                ticks: { color: '#9CA3AF' },
                grid: { color: 'rgba(255,255,255,0.05)' }
            }
        }
    },

    // Destroy existing chart
    destroy(chartId) {
        if (this.instances[chartId]) {
            this.instances[chartId].destroy();
            delete this.instances[chartId];
        }
    },

    // Create funnel chart
    createFunnelChart(canvasId, data) {
        this.destroy(canvasId);

        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return;

        this.instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.stage),
                datasets: [{
                    label: 'Deals',
                    data: data.map(d => d.count),
                    backgroundColor: this.colors.stages,
                    borderRadius: 4
                }]
            },
            options: {
                ...this.defaultOptions,
                indexAxis: 'y',
                plugins: {
                    ...this.defaultOptions.plugins,
                    tooltip: {
                        callbacks: {
                            afterLabel: (context) => {
                                const item = data[context.dataIndex];
                                return `Valor: R$ ${(item.value || 0).toLocaleString('pt-BR')}`;
                            }
                        }
                    }
                }
            }
        });
    },

    // Create activity chart (line)
    createActivityChart(canvasId, data) {
        this.destroy(canvasId);

        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return;

        // Group by date
        const grouped = {};
        data.forEach(item => {
            if (!grouped[item.date]) grouped[item.date] = { sent: 0, received: 0 };
            if (item.type === 'message_sent') grouped[item.date].sent += item.count;
            if (item.type === 'message_received') grouped[item.date].received += item.count;
        });

        const labels = Object.keys(grouped).sort();

        this.instances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.map(d => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })),
                datasets: [
                    {
                        label: 'Enviadas',
                        data: labels.map(d => grouped[d].sent),
                        borderColor: this.colors.primary,
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Recebidas',
                        data: labels.map(d => grouped[d].received),
                        borderColor: this.colors.success,
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: this.defaultOptions
        });
    },

    // Create performance chart (bar)
    createPerformanceChart(canvasId, data) {
        this.destroy(canvasId);

        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return;

        this.instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.user || 'Sem atribuição'),
                datasets: [
                    {
                        label: 'Ganhos',
                        data: data.map(d => d.won),
                        backgroundColor: this.colors.success
                    },
                    {
                        label: 'Perdidos',
                        data: data.map(d => d.lost),
                        backgroundColor: this.colors.danger
                    }
                ]
            },
            options: this.defaultOptions
        });
    },

    // Create lost reasons chart (doughnut)
    createLostReasonsChart(canvasId, data) {
        this.destroy(canvasId);

        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return;

        this.instances[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(d => d.reason),
                datasets: [{
                    data: data.map(d => d.count),
                    backgroundColor: [
                        this.colors.danger,
                        this.colors.warning,
                        this.colors.purple,
                        this.colors.pink,
                        this.colors.gray
                    ]
                }]
            },
            options: {
                ...this.defaultOptions,
                scales: {}
            }
        });
    },

    // Create daily metrics chart
    createDailyMetricsChart(canvasId, data) {
        this.destroy(canvasId);

        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return;

        this.instances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })),
                datasets: [
                    {
                        label: 'Novos Contatos',
                        data: data.map(d => d.new_contacts),
                        borderColor: this.colors.primary,
                        tension: 0.4
                    },
                    {
                        label: 'Deals Ganhos',
                        data: data.map(d => d.deals_won),
                        borderColor: this.colors.success,
                        tension: 0.4
                    },
                    {
                        label: 'Follow-ups',
                        data: data.map(d => d.followups_sent),
                        borderColor: this.colors.warning,
                        tension: 0.4
                    }
                ]
            },
            options: this.defaultOptions
        });
    }
};
