// ===================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И КОНСТАНТЫ
// ===================================

const API_URL = 'https://paint-site-vty0.onrender.com/api';
let ALL_ORDERS = [];    // Кэш для заказов
let ALL_ADDRESSES = []; // Кэш для адресов

// ===================================
// УТИЛИТАРНЫЕ ФУНКЦИИ
// ===================================

/**
 * Безопасно отправляет fetch-запрос с токеном авторизации.
 * @param {string} url - URL эндпоинта API.
 * @param {object} options - Опции для fetch (method, body, etc.).
 * @returns {Promise<Response>} - Промис с ответом сервера.
 */
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = '/auth';
        return Promise.reject(new Error('Пользователь не авторизован'));
    }

    const headers = { 'Authorization': `Bearer ${token}`, ...options.headers };
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('accessToken');
        window.location.href = '/auth';
        return Promise.reject(new Error('Сессия истекла'));
    }
    return response;
}

/**
 * Получает значение cookie по имени.
 * @param {string} name - Имя cookie.
 * @returns {string|null} - Значение cookie или null.
 */
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
    return null;
}

/**
 * Управляет открытием модального окна.
 * @param {HTMLElement} modalElement - DOM-элемент модального окна.
 */
function openModal(modalElement) {
    if (!modalElement) return;
    modalElement.style.display = 'flex';
    setTimeout(() => modalElement.classList.add('show'), 10);
}

/**
 * Управляет закрытием модального окна.
 * @param {HTMLElement} modalElement - DOM-элемент модального окна.
 */
function closeModal(modalElement) {
    if (!modalElement) return;
    modalElement.classList.remove('show');
    setTimeout(() => {
        modalElement.style.display = 'none';
    }, 300);
}

// ===================================
// ИНИЦИАЛИЗАЦИЯ СТРАНИЦЫ
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('accessToken')) {
        window.location.href = '/auth';
        return;
    }
    
    initializeProfileInfoAndLogout();
    initializeNavigationAndTabs();
    
    handleHashChange(); 
    window.addEventListener('hashchange', handleHashChange);
});

// ===================================
// УПРАВЛЕНИЕ ВКЛАДКАМИ И НАВИГАЦИЕЙ
// ===================================

function initializeNavigationAndTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTabId = item.getAttribute('data-tab');
            window.location.hash = targetTabId;
        });
    });
}

function handleHashChange() {
    const tabContents = document.querySelectorAll('.tab-content');
    const navItems = document.querySelectorAll('.nav-item');
    let hash = window.location.hash.substring(1) || 'dashboard';

    let tabFound = false;
    navItems.forEach(nav => {
        const isTarget = nav.getAttribute('data-tab') === hash;
        nav.classList.toggle('active', isTarget);
        if(isTarget) tabFound = true;
    });

    if (!tabFound) {
        document.querySelector('.nav-item[data-tab="dashboard"]').classList.add('active');
    }

    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === hash);
    });

    switch (hash) {
        case 'orders': initializeOrders(); break;
        case 'stock': initializeStock(); break;
        case 'company': initializeCompany(); break;
        case 'security': initializeSecurity(); break;
    }
}

// ===================================
// САЙДБАР: ИНФО И ВЫХОД
// ===================================

function initializeProfileInfoAndLogout() {
    document.getElementById('companyName').textContent = getCookie('companyName') || 'Компания';
    document.getElementById('contactPerson').textContent = getCookie('userName') || 'Пользователь';
    document.getElementById('profileUserEmail').textContent = getCookie('userEmail') || '';
    
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        const confirmed = await window.showCustomConfirm('Вы уверены, что хотите выйти из аккаунта?');
        if (confirmed) {
            localStorage.removeItem('accessToken');
            document.cookie.split(";").forEach(c => { document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); });
            window.location.href = '/auth';
        }
    });
}




// ===================================
// ВКЛАДКА: МОИ ЗАКАЗЫ
// ===================================

async function initializeOrders() {
    const container = document.getElementById('ordersListContainer');
    container.innerHTML = '<div class="loading-placeholder">Загрузка заказов...</div>';
    
    try {
        const response = await fetchWithAuth(`${API_URL}/orders`);
        if (!response.ok) throw new Error('Ошибка загрузки заказов');
        ALL_ORDERS = await response.json();
        renderOrders(ALL_ORDERS);

        document.getElementById('orderStatusFilter').addEventListener('change', filterOrders);
        document.getElementById('orderSearchInput').addEventListener('input', filterOrders);
        container.addEventListener('click', handleOrderActions);

    } catch (error) {
        container.innerHTML = '<p class="loading-placeholder">Не удалось загрузить заказы.</p>';
        console.error(error);
    }
}

function renderOrders(orders) {
    const container = document.getElementById('ordersListContainer');
    if (!orders || orders.length === 0) {
        container.innerHTML = '<p class="loading-placeholder">Заказов не найдено.</p>';
        return;
    }
    container.innerHTML = orders.map(order => {
        const items = JSON.parse(order.items || '[]');
        const statusMap = { 'В производстве': { text: 'В производстве', class: 'status-processing' }, 'Отгружен': { text: 'Отгружен', class: 'status-shipped' }, 'Доставлен': { text: 'Доставлен', class: 'status-delivered' }, 'Отменен': { text: 'Отменен', class: 'status-cancelled' }};
        const status = statusMap[order.status] || { text: order.status, class: '' };
        return `
            <div class="order-card" data-order-id="${order.id}">
                <div class="order-header">
                    <div class="order-number">Заказ №${order.id}</div>
                    <div class="order-date">${new Date(order.date).toLocaleDateString('ru-RU')}</div>
                    <div class="order-status ${status.class}">${status.text}</div>
                </div>
                <div class="order-items">
                    ${items.map(item => `
                        <div class="order-item">
                            <img src="${item.img ? `/${item.img.replace(/\\/g, '/')}` : '/images/placeholder.png'}" alt="${item.name}">
                            <div class="item-info">
                                <h4>${item.name}</h4>
                                <p>Количество: ${item.quantity} шт.</p>
                            </div>
                            <div class="item-price">${(item.price * item.quantity).toLocaleString('ru-RU')} ₽</div>
                        </div>`).join('') || '<p>Информация о товарах отсутствует.</p>'}
                </div>
                <div class="order-total">
                    <span>Итого: ${parseFloat(order.total).toLocaleString('ru-RU')} ₽</span>
                    <div class="order-actions">
                        <button class="btn btn-outline btn-sm btn-repeat-order" data-order-id="${order.id}">Повторить</button>
                        ${order.status === 'В производстве' ? `<button class="btn btn-danger btn-sm btn-cancel-order" data-order-id="${order.id}">Отменить</button>` : ''}
                        <button class="btn btn-secondary btn-sm btn-hide-order" data-order-id="${order.id}">Скрыть</button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

function filterOrders() {
    const status = document.getElementById('orderStatusFilter').value;
    const search = document.getElementById('orderSearchInput').value.toLowerCase();
    let filtered = ALL_ORDERS;
    if (status !== 'all') filtered = filtered.filter(o => o.status === status);
    if (search) filtered = filtered.filter(o => String(o.id).includes(search));
    renderOrders(filtered);
}

async function handleOrderActions(e) {
    const button = e.target.closest('button.btn[data-order-id]');
    if (!button) return;

    const orderId = button.dataset.orderId;
    try {
        if (button.classList.contains('btn-repeat-order')) {
            const confirmed = await window.showCustomConfirm(`Повторить заказ №${orderId}?`);
            if (confirmed) {
                // Логика повтора (может потребовать доработки API)
                window.showCustomAlert('Функция повтора заказа в разработке.', 'info');
            }
        } else if (button.classList.contains('btn-cancel-order')) {
            const confirmed = await window.showCustomConfirm(`Отменить заказ №${orderId}?`);
            if (confirmed) {
                const response = await fetchWithAuth(`${API_URL}/orders/${orderId}/cancel`, { method: 'PUT' });
                if (!response.ok) throw new Error('Ошибка отмены заказа');
                window.showCustomAlert('Заказ успешно отменен.', 'info');
                loadOrders();
            }
        } else if (button.classList.contains('btn-hide-order')) {
            const confirmed = await window.showCustomConfirm(`Скрыть заказ №${orderId} из истории?`);
            if (confirmed) {
                const response = await fetchWithAuth(`${API_URL}/orders/${orderId}/hide`, { method: 'PUT' });
                if (!response.ok) throw new Error('Ошибка скрытия заказа');
                window.showCustomAlert('Заказ скрыт из истории.', 'info');
                loadOrders();
            }
        }
    } catch (error) {
        window.showCustomAlert(error.message, 'error');
    }
}

// ===================================
// ВКЛАДКА: ОСТАТКИ НА СКЛАДЕ
// ===================================

function initializeStock() {
    loadStockData('reserved');
    document.querySelectorAll('[data-stock-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-stock-tab]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.stock-tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(btn.dataset.stockTab === 'reserved' ? 'stockReserved' : 'stockAvailable').classList.add('active');
            
            loadStockData(btn.dataset.stockTab);
        });
    });
}

async function loadStockData(type) {
    const tableId = type === 'reserved' ? 'reservedStockBody' : 'availableStockBody';
    const tbody = document.getElementById(tableId);
    tbody.innerHTML = '<tr><td colspan="6" class="loading-placeholder">Загрузка...</td></tr>';

    try {
        const response = await fetchWithAuth(`${API_URL}/stock-levels`);
        if(!response.ok) throw new Error('Ошибка загрузки остатков');
        const data = await response.json();
        const stockData = (type === 'reserved') ? data.reserved : data.free;

        if (stockData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="loading-placeholder">Остатков нет.</td></tr>`;
            return;
        }

        tbody.innerHTML = stockData.map(item => `
            <tr>
                <td>${item.ProductName}</td>
                <td>${item.ProductSeries || '-'}</td>
                <td>${item.RalColor ? `RAL ${item.RalColor}` : '-'}</td>
                <td>${item.CoatingType}</td>
                <td>${item.Quantity} кг</td>
                <td><button class="btn btn-outline btn-sm">В заявку</button></td>
            </tr>
        `).join('');
    } catch(error) {
        tbody.innerHTML = `<tr><td colspan="6" class="loading-placeholder">Ошибка загрузки.</td></tr>`;
        console.error(error);
    }
}

// ===================================
// ВКЛАДКА: РЕКВИЗИТЫ И АДРЕСА
// ===================================

function initializeCompany() {
    loadCompanyInfo();
    loadAddresses();

    document.getElementById('addAddressBtn').addEventListener('click', () => openAddressModal());
    document.getElementById('closeAddressModalBtn').addEventListener('click', () => closeModal(document.getElementById('addressModalOverlay')));
    document.getElementById('addressModalOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'addressModalOverlay') closeModal(e.target);
    });
    document.getElementById('modal-addressForm').addEventListener('submit', handleAddressSubmit);
    document.getElementById('addressesListContainer').addEventListener('click', handleAddressActions);
}

async function loadCompanyInfo() {
    try {
        const response = await fetchWithAuth(`${API_URL}/company-info`);
        if (!response.ok) throw new Error('Ошибка загрузки реквизитов');
        const data = await response.json();
        
        document.getElementById('orgName').textContent = data.CompanyName || '-';
        document.getElementById('orgInn').textContent = data.TaxID || '-';
        document.getElementById('orgKpp').textContent = data.RegistrationNumber || '-';
        document.getElementById('orgAddress').textContent = data.LegalAddress || '-';
    } catch (error) {
        console.error(error);
    }
}

async function loadAddresses() {
    const container = document.getElementById('addressesListContainer');
    container.innerHTML = '<div class="loading-placeholder">Загрузка адресов...</div>';
    try {
        const response = await fetchWithAuth(`${API_URL}/addresses`);
        if (!response.ok) throw new Error('Ошибка загрузки адресов');
        ALL_ADDRESSES = await response.json();
        renderAddresses(ALL_ADDRESSES);
    } catch(error) {
        container.innerHTML = '<p class="loading-placeholder">Не удалось загрузить адреса.</p>';
        console.error(error);
    }
}

function renderAddresses(addresses) {
    const container = document.getElementById('addressesListContainer');
    if (!addresses || addresses.length === 0) {
        container.innerHTML = '<p class="loading-placeholder">Адресов не добавлено</p>';
        return;
    }
    container.innerHTML = addresses.map(addr => `
        <div class="address-card">
            <div class="address-header">
                <h4>${addr.AddressType}</h4>
                ${addr.IsDefault ? '<span class="address-default">Основной</span>' : ''}
            </div>
            <p>${addr.City}, ${addr.Street}, д. ${addr.House}${addr.Apartment ? `, ${addr.Apartment}` : ''}</p>
            <p>Индекс: ${addr.PostalCode || 'не указан'}</p>
            <div class="address-actions">
                <button class="btn btn-outline btn-sm btn-edit-address" data-address-id="${addr.AddressID}">Редактировать</button>
                ${!addr.IsDefault ? `<button class="btn btn-danger btn-sm btn-delete-address" data-address-id="${addr.AddressID}">Удалить</button>` : ''}
            </div>
        </div>
    `).join('');
}

async function handleAddressSubmit(e) {
    e.preventDefault();
    const form = document.getElementById('modal-addressForm');
    const editingId = form.dataset.editingId;
    const addressData = {
        AddressType: document.getElementById('modal-addressType').value,
        City: document.getElementById('modal-city').value,
        Street: document.getElementById('modal-street').value,
        House: document.getElementById('modal-house').value,
        Apartment: document.getElementById('modal-apartment').value,
        PostalCode: document.getElementById('modal-postalCode').value
    };

    const url = editingId ? `${API_URL}/addresses/${editingId}` : `${API_URL}/addresses`;
    const method = editingId ? 'PUT' : 'POST';

    try {
        const response = await fetchWithAuth(url, { method, body: JSON.stringify(addressData) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        
        window.showCustomAlert(result.message || 'Адрес успешно сохранен!', 'success');
        closeModal(document.getElementById('addressModalOverlay'));
        loadAddresses();
    } catch (error) {
        window.showCustomAlert(`Ошибка: ${error.message}`, 'error');
    }
}

async function handleAddressActions(e) {
    const button = e.target.closest('button.btn[data-address-id]');
    if (!button) return;
    const addressId = button.dataset.addressId;

    if (button.classList.contains('btn-edit-address')) {
        const addressToEdit = ALL_ADDRESSES.find(addr => addr.AddressID == addressId);
        if (addressToEdit) openAddressModal(addressToEdit);
    } else if (button.classList.contains('btn-delete-address')) {
        const confirmed = await window.showCustomConfirm('Вы уверены, что хотите удалить этот адрес?');
        if (confirmed) {
            try {
                const response = await fetchWithAuth(`${API_URL}/addresses/${addressId}`, { method: 'DELETE' });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                window.showCustomAlert(result.message, 'success');
                loadAddresses();
            } catch (error) {
                window.showCustomAlert(error.message, 'error');
            }
        }
    }
}

function openAddressModal(address = null) {
    const modalOverlay = document.getElementById('addressModalOverlay');
    const form = document.getElementById('modal-addressForm');
    const modalTitle = modalOverlay.querySelector('h3');
    form.reset();
    if (address) {
        form.setAttribute('data-editing-id', address.AddressID);
        modalTitle.textContent = 'Редактирование адреса';
        document.getElementById('modal-addressType').value = address.AddressType;
        document.getElementById('modal-city').value = address.City;
        document.getElementById('modal-street').value = address.Street;
        document.getElementById('modal-house').value = address.House;
        document.getElementById('modal-apartment').value = address.Apartment || '';
        document.getElementById('modal-postalCode').value = address.PostalCode || '';
    } else {
        form.removeAttribute('data-editing-id');
        modalTitle.textContent = 'Новый адрес доставки';
    }
    modalOverlay.style.display = 'flex';
}

// ===================================
// ВКЛАДКА: БЕЗОПАСНОСТЬ
// ===================================

function initializeSecurity() {
    const passwordForm = document.getElementById('passwordChangeForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = passwordForm.querySelector('button[type="submit"]');
            const { currentPassword, newPassword, confirmNewPassword } = e.target.elements;

            if (newPassword.value.length < 8) {
                return window.showCustomAlert('Новый пароль должен быть не менее 8 символов.', 'error');
            }
            if (newPassword.value !== confirmNewPassword.value) {
                return window.showCustomAlert('Новые пароли не совпадают.', 'error');
            }
            
            submitButton.disabled = true;
            submitButton.textContent = 'Сохранение...';

            try {
                const response = await fetchWithAuth(`${API_URL}/user/change-password`, {
                    method: 'POST',
                    body: JSON.stringify({ currentPassword: currentPassword.value, newPassword: newPassword.value })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                
                window.showCustomAlert(result.message, 'success');
                e.target.reset();
            } catch (error) {
                window.showCustomAlert(`Ошибка: ${error.message}`, 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Сменить пароль';
            }
        });
    }
}

