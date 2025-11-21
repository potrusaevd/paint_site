// dashboard-chartjs.js - Дашборд на чистом JavaScript с Chart.js

(function() {
    'use strict';

    const API_URL = 'https://paint-site-vty0.onrender.com/api';
    let consumptionChart = null;
    let coatingChart = null;

    /**
     * Инициализация дашборда
     */
    async function initDashboard() {
        const dashboardRoot = document.getElementById('react-dashboard-root');
        if (!dashboardRoot) {
            console.error('Элемент #react-dashboard-root не найден');
            return;
        }

        // Показываем загрузку
        dashboardRoot.innerHTML = '<div class="loading-placeholder">Загрузка аналитики...</div>';

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('Токен не найден');
            }

            const response = await fetch(`${API_URL}/analytics/dashboard`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Ошибка загрузки данных');
            }

            const data = await response.json();
            renderDashboard(dashboardRoot, data);
        } catch (error) {
            console.error('Ошибка загрузки дашборда:', error);
            dashboardRoot.innerHTML = `
                <div style="color: #ef4444; padding: 2rem; text-align: center;">
                    Ошибка загрузки данных: ${error.message}
                </div>
            `;
        }
    }

    /**
     * Рендер HTML структуры дашборда
     */
    function renderDashboard(container, data) {
        const { metrics = {}, consumption = [], recentOrders = [], coatingDistribution = [] } = data;

        container.innerHTML = `
            <div class="dashboard-layout">
                <!-- KPI Метрики -->
                <div class="dashboard-metrics">
                    <div class="metric-card">
                        <div class="metric-icon" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                        </div>
                        <div class="metric-content">
                            <p class="metric-label">Активных заказов</p>
                            <h2 class="metric-value">${metrics.activeOrders || 0}</h2>
                        </div>
                    </div>

                    <div class="metric-card">
                        <div class="metric-icon" style="background: linear-gradient(135deg, #10b981, #059669);">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                                <line x1="12" y1="1" x2="12" y2="23"></line>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                            </svg>
                        </div>
                        <div class="metric-content">
                            <p class="metric-label">Общая сумма за год</p>
                            <h2 class="metric-value">${formatCurrency(metrics.totalYearSum || 0)}</h2>
                        </div>
                    </div>

                    <div class="metric-card">
                        <div class="metric-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                            </svg>
                        </div>
                        <div class="metric-content">
                            <p class="metric-label">Средний чек</p>
                            <h2 class="metric-value">${formatCurrency(metrics.avgCheck || 0)}</h2>
                        </div>
                    </div>
                </div>

                <!-- График потребления -->
                <div class="dashboard-section">
                    <div class="section-header">
                        <h4>Динамика потребления</h4>
                    </div>
                    <div class="chart-container">
                        <canvas id="consumptionChart"></canvas>
                    </div>
                </div>

                <!-- Сетка: Активные заказы и Распределение -->
                <div class="dashboard-grid">
                    <div class="dashboard-section">
                        <div class="section-header">
                            <h4>Активные заказы</h4>
                        </div>
                        <div class="recent-orders" id="recentOrdersList">
                            ${renderRecentOrders(recentOrders)}
                        </div>
                    </div>

                    <div class="dashboard-section">
                        <div class="section-header">
                            <h4>Распределение по покрытиям</h4>
                        </div>
                        <div class="chart-container small">
                            <canvas id="coatingChart"></canvas>
                        </div>
                        <div class="coating-legend" id="coatingLegend"></div>
                    </div>
                </div>
            </div>
        `;

        // Инициализируем графики после рендера HTML
        setTimeout(() => {
            initConsumptionChart(consumption);
            initCoatingChart(coatingDistribution);
        }, 100);
    }

    /**
     * Рендер списка активных заказов
     */
    function renderRecentOrders(orders) {
        if (!orders || orders.length === 0) {
            return '<p class="loading-placeholder">Активных заказов нет.</p>';
        }

        return orders.map(order => {
            const statusClass = getStatusClass(order.status);
            return `
                <div class="order-mini-card">
                    <div class="order-mini-info">
                        <h5>Заказ №${order.id}</h5>
                        <p>${new Date(order.date).toLocaleDateString('ru-RU')}</p>
                    </div>
                    <div class="order-mini-status ${statusClass}">${order.status}</div>
                </div>
            `;
        }).join('');
    }

    /**
     * Инициализация графика потребления (Bar Chart)
     */
    function initConsumptionChart(data) {
        const canvas = document.getElementById('consumptionChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Уничтожаем предыдущий график если есть
        if (consumptionChart) {
            consumptionChart.destroy();
        }

        const labels = data.map(item => item.month || '');
        const values = data.map(item => item['Сумма заказов'] || 0);

        consumptionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Сумма заказов',
                    data: values,
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return formatCurrency(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value);
                            },
                            color: '#94a3b8'
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#94a3b8'
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    /**
     * Инициализация графика покрытий (Doughnut Chart)
     */
    function initCoatingChart(data) {
        const canvas = document.getElementById('coatingChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Уничтожаем предыдущий график если есть
        if (coatingChart) {
            coatingChart.destroy();
        }

        const labels = data.map(item => item.name || '');
        const values = data.map(item => item.value || 0);
        const colors = [
            'rgba(59, 130, 246, 0.8)',   // blue
            'rgba(34, 211, 238, 0.8)',   // cyan
            'rgba(99, 102, 241, 0.8)',   // indigo
            'rgba(139, 92, 246, 0.8)',   // violet
            'rgba(217, 70, 239, 0.8)'    // fuchsia
        ];

        coatingChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#1e293b'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                return `${label}: ${value.toLocaleString('ru-RU')} кг`;
                            }
                        }
                    }
                }
            }
        });

        // Рендерим легенду
        renderCoatingLegend(data, colors);
    }

    /**
     * Рендер легенды для графика покрытий
     */
    function renderCoatingLegend(data, colors) {
        const legendContainer = document.getElementById('coatingLegend');
        if (!legendContainer) return;

        legendContainer.innerHTML = data.map((item, index) => `
            <div class="legend-item">
                <div class="legend-color">
                    <span class="legend-dot" style="background-color: ${colors[index]};"></span>
                    <span class="legend-label">${item.name}</span>
                </div>
                <span class="legend-value">${item.value.toLocaleString('ru-RU')} кг</span>
            </div>
        `).join('');
    }

    /**
     * Форматирование валюты
     */
    function formatCurrency(number) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(number);
    }

    /**
     * Получение CSS класса для статуса заказа
     */
    function getStatusClass(status) {
        const statusMap = {
            'В работе': 'status-processing',
            'В производстве': 'status-processing',
            'Отгружен': 'status-shipped',
            'Доставлен': 'status-delivered',
            'Завершен': 'status-delivered',
            'Отменен': 'status-cancelled'
        };
        return statusMap[status] || 'status-processing';
    }

    // Автоматическая инициализация при загрузке страницы
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDashboard);
    } else {
        initDashboard();
    }

    // Экспорт функции для ручной инициализации
    window.initDashboard = initDashboard;

})();
