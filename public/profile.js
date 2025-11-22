// ===================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И КОНСТАНТЫ
// ===================================

const API_URL = 'https://paint-site-vty0.onrender.com/api';
let ALL_ORDERS = [];    
let ALL_ADDRESSES = []; 
let ALL_STOCK = { reserved: [], free: [] }; 
// Таймер для debounce поиска
let searchTimeout;

// ===================================
// УТИЛИТАРНЫЕ ФУНКЦИИ (fetchWithAuth, getCookie, Modal...)
// ===================================
// ... (Оставьте функции fetchWithAuth, getCookie, openModal, closeModal без изменений) ...
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

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
    return null;
}

function openModal(modalElement) {
    if (!modalElement) return;
    modalElement.style.display = 'flex';
    setTimeout(() => modalElement.classList.add('show'), 10);
}

function closeModal(modalElement) {
    if (!modalElement) return;
    modalElement.classList.remove('show');
    setTimeout(() => {
        modalElement.style.display = 'none';
    }, 300);
}

// ===================================
// ИНИЦИАЛИЗАЦИЯ
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('accessToken')) {
        window.location.href = '/auth';
        return;
    }
    
    initializeProfileInfoAndLogout();
    initializeLogoUpload();
    initializeNavigationAndTabs();
    
    // Инициализация модалок
    initializeModals();

    handleHashChange(); 
    window.addEventListener('hashchange', handleHashChange);
});

function initializeModals() {
    // Закрытие по клику на фон
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal);
        });
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) closeBtn.addEventListener('click', () => closeModal(modal));
    });
}

// ===================================
// НАВИГАЦИЯ
// ===================================
// ... (Оставьте initializeNavigationAndTabs и handleHashChange без изменений) ...
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

    if (!tabFound && navItems.length > 0) {
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
// САЙДБАР И ВЫХОД (ИСПРАВЛЕНО)
// ===================================

function initializeProfileInfoAndLogout() {
    loadSidebarInfo();
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        // Удаляем старые слушатели (клонированием), чтобы не дублировать
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        
        newLogoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const confirmed = await window.showCustomConfirm('Вы уверены, что хотите выйти из аккаунта?');
            if (confirmed) {
                // Очистка
                localStorage.removeItem('accessToken');
                sessionStorage.clear();
                
                // Очистка куки
                const cookies = document.cookie.split(";");
                for (let i = 0; i < cookies.length; i++) {
                    const cookie = cookies[i];
                    const eqPos = cookie.indexOf("=");
                    const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
                    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
                }
                
                window.location.href = '/auth';
            }
        });
    }
}

async function loadSidebarInfo() {
    // ... (код загрузки инфо без изменений) ...
     const companyNameEl = document.getElementById('companyName');
    const contactPersonEl = document.getElementById('contactPerson');
    const userEmailEl = document.getElementById('profileUserEmail');

    if(companyNameEl) companyNameEl.textContent = getCookie('companyName') || 'Загрузка...';
    if(contactPersonEl) contactPersonEl.textContent = getCookie('userName') || 'Пользователь';
    if(userEmailEl) userEmailEl.textContent = getCookie('userEmail') || '';

    try {
        const response = await fetchWithAuth(`${API_URL}/company-info`);
        if (response.ok) {
            const companyData = await response.json();
            if(companyNameEl) companyNameEl.textContent = companyData.CompanyName;
            document.cookie = `companyName=${encodeURIComponent(companyData.CompanyName)}; path=/; max-age=86400`;
        }
    } catch (error) {
        console.error("Sidebar info error:", error);
    }
}

// ... initializeLogoUpload (оставить без изменений) ...
function initializeLogoUpload() {
    const logoUploadBtn = document.getElementById('logoUpload');
    const logoInput = document.getElementById('logoInput');
    const companyLogo = document.getElementById('companyLogo'); // Исправлен ID, проверьте HTML

    if (logoUploadBtn && logoInput) {
        logoUploadBtn.addEventListener('click', () => logoInput.click());
        logoInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            // Валидация
            if (!file.type.startsWith('image/')) return window.showCustomAlert('Выберите изображение', 'error');
            if (file.size > 5 * 1024 * 1024) return window.showCustomAlert('Макс. размер 5MB', 'error');

            const formData = new FormData();
            formData.append('logo', file);

            try {
                const response = await fetchWithAuth(`${API_URL}/company/upload-logo`, {
                    method: 'POST', body: formData, headers: { 'Content-Type': undefined } 
                });
                if (!response.ok) throw new Error('Ошибка');
                const result = await response.json();
                if(document.getElementById('companyLogoImg')) 
                    document.getElementById('companyLogoImg').src = `/${result.logoUrl}`; // Предполагается ID img
                window.showCustomAlert('Логотип обновлен', 'success');
            } catch (error) {
                window.showCustomAlert('Ошибка загрузки', 'error');
            }
        });
    }
}

// ===================================
// МОИ ЗАКАЗЫ (ФИЛЬТР ПОПРАВЛЕН)
// ===================================

async function initializeOrders() {
    // Debounce для поиска
    const searchInput = document.getElementById('orderSearchInput');
    const seriesInput = document.getElementById('orderSeriesInput');
    const statusSelect = document.getElementById('orderStatusFilter');

    const debouncedFetch = () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(fetchAndRenderOrders, 500);
    };

    if(searchInput) searchInput.oninput = debouncedFetch;
    if(seriesInput) seriesInput.oninput = debouncedFetch;
    if(statusSelect) statusSelect.onchange = fetchAndRenderOrders;
    
    document.getElementById('ordersListContainer').addEventListener('click', handleOrderActions);
    
    await fetchAndRenderOrders();
}

async function fetchAndRenderOrders() {
    const container = document.getElementById('ordersListContainer');
    // Не показываем лоадер, если это просто фильтрация, чтобы не мигало, либо делаем аккуратно
    if (!container.querySelector('.order-card')) container.innerHTML = '<div class="loading-placeholder">Загрузка...</div>';
    
    const status = document.getElementById('orderStatusFilter')?.value || 'all';
    const search = document.getElementById('orderSearchInput')?.value || '';
    const series = document.getElementById('orderSeriesInput')?.value || '';

    const queryParams = new URLSearchParams();
    if (status !== 'all') queryParams.append('status', status);
    if (search) queryParams.append('search', search);
    if (series) queryParams.append('series', series);

    try {
        const response = await fetchWithAuth(`${API_URL}/orders?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Ошибка');
        const orders = await response.json();
        renderOrders(orders);
    } catch (error) {
        container.innerHTML = '<p class="loading-placeholder">Ошибка загрузки заказов.</p>';
    }
}

function renderOrders(orders) {
    const container = document.getElementById('ordersListContainer');
    if (!orders || orders.length === 0) {
        container.innerHTML = '<p class="loading-placeholder">Заказов не найдено.</p>';
        return;
    }

    const statusMap = {
        'В обработке': { text: 'В обработке', class: 'status-processing' }, // Проверьте точные строки из БД
        'В производстве': { text: 'В производстве', class: 'status-processing' },
        'processing': { text: 'В производстве', class: 'status-processing' },
        'shipped': { text: 'Отгружен', class: 'status-shipped' },
        'delivered': { text: 'Доставлен', class: 'status-delivered' },
        'cancelled': { text: 'Отменен', class: 'status-cancelled' }
    };

    container.innerHTML = orders.map(order => {
        const items = order.items ? JSON.parse(order.items) : [];
        const statusKey = order.status; 
        const currentStatus = statusMap[statusKey] || { text: statusKey, class: '' };

        return `
            <div class="order-card" data-order-id="${order.id}">
                <div class="order-header">
                    <div class="order-number">Заказ №${order.id}</div>
                    <div class="order-date">${new Date(order.date).toLocaleDateString('ru-RU')}</div>
                    <div class="order-status ${currentStatus.class}">${currentStatus.text}</div>
                </div>
                <div class="order-items">
                    ${items.map(item => `
                        <div class="order-item">
                            <img src="${item.img ? `/${item.img.replace(/\\/g, '/').replace(/^uploads\//, '')}` : '/images/placeholder.png'}" alt="${item.name}">
                            <div class="item-info">
                                <h4>${item.name}</h4>
                                <p>Количество: ${item.quantity} шт.</p>
                            </div>
                            <div class="item-price">${(item.price * item.quantity).toLocaleString('ru-RU')} ₽</div>
                        </div>`).join('')}
                </div>
                <div class="order-total">
                    <span>Итого: ${parseFloat(order.total).toLocaleString('ru-RU')} ₽</span>
                    <div class="order-actions">
                        <button class="btn btn-outline btn-sm btn-repeat-order" data-order-id="${order.id}">Повторить</button>
                        ${['В обработке', 'processing'].includes(order.status) ? `<button class="btn btn-danger btn-sm btn-cancel-order" data-order-id="${order.id}">Отменить</button>` : ''}
                        <button class="btn btn-secondary btn-sm btn-hide-order" data-order-id="${order.id}">Скрыть</button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// ... handleOrderActions (без изменений) ...
async function handleOrderActions(e) {
    const button = e.target.closest('button.btn[data-order-id]');
    if (!button) return;

    const orderId = button.dataset.orderId;
    try {
        if (button.classList.contains('btn-repeat-order')) {
            const confirmed = await window.showCustomConfirm(`Повторить заказ №${orderId}?`);
            if (confirmed) {
                 const response = await fetchWithAuth(`${API_URL}/orders/${orderId}/repeat`, { method: 'POST' });
                 if(response.ok) {
                     window.showCustomAlert('Заказ повторен и добавлен в обработку', 'success');
                     initializeOrders();
                 }
            }
        } else if (button.classList.contains('btn-cancel-order')) {
            const confirmed = await window.showCustomConfirm(`Отменить заказ №${orderId}?`);
            if (confirmed) {
                const response = await fetchWithAuth(`${API_URL}/orders/${orderId}/cancel`, { method: 'PUT' });
                if(response.ok) {
                    window.showCustomAlert('Заказ отменен.', 'success');
                    initializeOrders();
                }
            }
        } else if (button.classList.contains('btn-hide-order')) {
            const confirmed = await window.showCustomConfirm(`Скрыть заказ №${orderId} из истории?`);
            if (confirmed) {
                const response = await fetchWithAuth(`${API_URL}/orders/${orderId}/hide`, { method: 'PUT' });
                if(response.ok) {
                    window.showCustomAlert('Заказ скрыт.', 'success');
                    initializeOrders();
                }
            }
        }
    } catch (error) {
        window.showCustomAlert(error.message, 'error');
    }
}

// ===================================
// ОСТАТКИ НА СКЛАДЕ (ФИЛЬТР + ПАРТИИ + "В ЗАЯВКУ")
// ===================================

function initializeStock() {
    loadStockData('reserved');
    
    document.querySelectorAll('[data-stock-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-stock-tab]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.stock-tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(btn.dataset.stockTab === 'reserved' ? 'stockReserved' : 'stockAvailable').classList.add('active');
            
            // Сбрасываем фильтры при переключении
            document.getElementById('stockSearchInput').value = ''; 
            
            loadStockData(btn.dataset.stockTab);
        });
    });
    
    // Поиск и фильтры
    const stockSearch = document.getElementById('stockSearchInput');
    const coatingFilter = document.getElementById('coatingFilter');

    if(stockSearch) stockSearch.oninput = filterStock;
    if(coatingFilter) coatingFilter.onchange = filterStock;
}

async function loadStockData(type) {
    const tableId = type === 'reserved' ? 'reservedStockBody' : 'availableStockBody';
    const tbody = document.getElementById(tableId);
    tbody.innerHTML = '<tr><td colspan="6" class="loading-placeholder">Загрузка...</td></tr>';

    try {
        const response = await fetchWithAuth(`${API_URL}/stock-levels`);
        if(!response.ok) throw new Error('Ошибка');
        const data = await response.json();
        
        ALL_STOCK.reserved = data.reserved || [];
        ALL_STOCK.free = data.free || [];
        
        renderStock(type);
    } catch(error) {
        tbody.innerHTML = `<tr><td colspan="6" class="loading-placeholder">Ошибка загрузки.</td></tr>`;
        console.error(error);
    }
}

function renderStock(type) {
    const tableId = type === 'reserved' ? 'reservedStockBody' : 'availableStockBody';
    const tbody = document.getElementById(tableId);
    // Берем актуальные данные, но учитываем, что filterStock мог их временно подменить,
    // поэтому лучше хранить отфильтрованное состояние или фильтровать на лету. 
    // Для простоты здесь: фильтруем ALL_STOCK на лету при рендеринге, но filterStock делает это отдельно.
    // Чтобы не усложнять, renderStock рисует то, что есть в ALL_STOCK, а filterStock фильтрует массив перед вызовом.
    // Исправим логику: renderStock принимает опциональный массив items.
    
    let items = ALL_STOCK[type === 'reserved' ? 'reserved' : 'free'];
    // Если вызвана из loadStockData - items полный. Если из filterStock - мы передадим отфильтрованный.
    
    // Чтобы фильтр работал корректно:
    const searchValue = document.getElementById('stockSearchInput')?.value.toLowerCase().trim() || '';
    const coatingValue = document.getElementById('coatingFilter')?.value.toLowerCase() || '';

    if (items.length > 0 && (searchValue || coatingValue)) {
         items = items.filter(item => {
            const matchSearch = (item.ProductName || '').toLowerCase().includes(searchValue) ||
                                (item.ProductSeries || '').toLowerCase().includes(searchValue) ||
                                (item.RalColor || '').toLowerCase().includes(searchValue);
            const matchCoating = !coatingValue || (item.CoatingType || '').toLowerCase().includes(coatingValue);
            return matchSearch && matchCoating;
         });
    }

    if (!items || items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="loading-placeholder">Нет данных.</td></tr>`;
        return;
    }

    // Рендер с колонкой ПАРТИЯ (ProductSeries)
    tbody.innerHTML = items.map(item => `
        <tr>
            <td>${item.ProductName || '-'}</td>
            <td><strong>${item.ProductSeries || 'Без партии'}</strong></td> <!-- ПАРТИЯ -->
            <td>${item.RalColor ? `RAL ${item.RalColor}` : '-'}</td>
            <td>${item.CoatingType || '-'}</td>
            <td>${item.Quantity || 0} кг</td>
            <td>
                <button class="btn btn-outline btn-sm btn-add-to-cart" 
                    data-product-id="${item.ProductID}" 
                    data-product-name="${item.ProductName}"
                    data-quantity="1">
                    В заявку
                </button>
            </td>
        </tr>
    `).join('');
    
    tbody.querySelectorAll('.btn-add-to-cart').forEach(btn => {
        btn.addEventListener('click', handleAddToCart);
    });
}

function filterStock() {
    const activeTabBtn = document.querySelector('[data-stock-tab].active');
    const type = activeTabBtn ? activeTabBtn.dataset.stockTab : 'reserved';
    renderStock(type); // renderStock сам возьмет значения из инпутов
}

// ОЖИВЛЕНИЕ КНОПКИ "В ЗАЯВКУ"
async function handleAddToCart(e) {
    const button = e.target;
    const productId = button.dataset.productId;
    const productName = button.dataset.productName;
    
    const confirmed = await window.showCustomConfirm(`Добавить "${productName}" в заявку (1 шт.)?`);
    if (confirmed) {
        try {
            const response = await fetchWithAuth(`${API_URL}/cart/add`, {
                method: 'POST',
                body: JSON.stringify({ productId: productId, quantity: 1 })
            });
            
            if (response.ok) {
                window.showCustomAlert('Товар добавлен в корзину', 'success');
            } else {
                throw new Error('Ошибка добавления');
            }
        } catch (error) {
            window.showCustomAlert('Не удалось добавить товар', 'error');
        }
    }
}

// ===================================
// РЕКВИЗИТЫ (МОДАЛКА + РЕДАКТИРОВАНИЕ)
// ===================================

function initializeCompany() {
    loadCompanyInfo();
    loadAddresses();

    // Слушатели адресов
    document.getElementById('addAddressBtn').addEventListener('click', () => openAddressModal());
    document.getElementById('modal-addressForm').addEventListener('submit', handleAddressSubmit);
    document.getElementById('addressesListContainer').addEventListener('click', handleAddressActions);
    
    // НОВОЕ: Слушатель для редактирования реквизитов
    // Кнопка будет добавлена динамически или должна быть в HTML. 
    // Предположим, мы добавляем кнопку в JS или она есть с id="editRequisitesBtn"
    const editReqBtn = document.getElementById('editRequisitesBtn');
    if(editReqBtn) {
        editReqBtn.addEventListener('click', openRequisitesModal);
    }
    
    // Форма реквизитов
    const reqForm = document.getElementById('modal-requisitesForm');
    if(reqForm) reqForm.addEventListener('submit', handleRequisitesSubmit);
}

async function loadCompanyInfo() {
    try {
        const response = await fetchWithAuth(`${API_URL}/company-info`);
        if (!response.ok) throw new Error('Ошибка');
        const data = await response.json();
        
        // Заполняем отображение
        document.getElementById('orgName').textContent = data.CompanyName || '-';
        document.getElementById('orgInn').textContent = data.TaxID || '-';
        document.getElementById('orgKpp').textContent = data.RegistrationNumber || '-';
        document.getElementById('orgAddress').textContent = data.LegalAddress || '-';
        
        // Сохраняем данные глобально для модалки
        window.CURRENT_COMPANY_DATA = data;
        
        // Если кнопки редактирования нет, создадим её
        if(!document.getElementById('editRequisitesBtn')) {
            const container = document.querySelector('.company-section .section-header');
            if(container) {
                const btn = document.createElement('button');
                btn.id = 'editRequisitesBtn';
                btn.className = 'btn btn-outline btn-sm';
                btn.textContent = 'Редактировать';
                btn.onclick = openRequisitesModal;
                container.appendChild(btn);
            }
        }

    } catch (error) {
        console.error(error);
    }
}

// Открытие модалки реквизитов
function openRequisitesModal() {
    const modal = document.getElementById('requisitesModalOverlay');
    if (!modal) return console.error('Модальное окно реквизитов не найдено в HTML');
    
    const data = window.CURRENT_COMPANY_DATA || {};
    document.getElementById('req-companyName').value = data.CompanyName || '';
    document.getElementById('req-inn').value = data.TaxID || '';
    document.getElementById('req-kpp').value = data.RegistrationNumber || '';
    document.getElementById('req-address').value = data.LegalAddress || '';
    
    openModal(modal);
}

// Сохранение реквизитов
async function handleRequisitesSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    
    const body = {
        CompanyName: document.getElementById('req-companyName').value,
        TaxID: document.getElementById('req-inn').value,
        RegistrationNumber: document.getElementById('req-kpp').value,
        LegalAddress: document.getElementById('req-address').value
    };
    
    try {
        const response = await fetchWithAuth(`${API_URL}/company-info`, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
        
        if(!response.ok) throw new Error('Ошибка сохранения');
        
        window.showCustomAlert('Реквизиты обновлены', 'success');
        closeModal(document.getElementById('requisitesModalOverlay'));
        loadCompanyInfo(); // Перезагрузить отображение
    } catch(err) {
        window.showCustomAlert('Не удалось сохранить реквизиты', 'error');
    } finally {
        btn.disabled = false;
    }
}

// ... loadAddresses, renderAddresses, handleAddressSubmit, handleAddressActions (без изменений) ...
async function loadAddresses() {
    const container = document.getElementById('addressesListContainer');
    container.innerHTML = '<div class="loading-placeholder">Загрузка адресов...</div>';
    try {
        const response = await fetchWithAuth(`${API_URL}/addresses`);
        if (!response.ok) throw new Error('Ошибка');
        ALL_ADDRESSES = await response.json();
        renderAddresses(ALL_ADDRESSES);
    } catch(error) {
        container.innerHTML = '<p class="loading-placeholder">Не удалось загрузить адреса.</p>';
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
        
        window.showCustomAlert(result.message || 'Адрес сохранен!', 'success');
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
        const confirmed = await window.showCustomConfirm('Удалить адрес?');
        if (confirmed) {
            try {
                const response = await fetchWithAuth(`${API_URL}/addresses/${addressId}`, { method: 'DELETE' });
                if (!response.ok) throw new Error();
                window.showCustomAlert('Адрес удален', 'success');
                loadAddresses();
            } catch (error) {
                window.showCustomAlert('Ошибка удаления', 'error');
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
    openModal(modalOverlay);
}

// ===================================
// БЕЗОПАСНОСТЬ (СМЕНА ПАРОЛЯ)
// ===================================

function initializeSecurity() {
    const passwordForm = document.getElementById('passwordChangeForm');
    // Используем replaceWith для удаления старых слушателей (клон ноды)
    if (passwordForm) {
        const newForm = passwordForm.cloneNode(true);
        passwordForm.parentNode.replaceChild(newForm, passwordForm);
        
        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = newForm.querySelector('button[type="submit"]');
            const currentPassword = newForm.querySelector('input[name="currentPassword"]').value;
            const newPassword = newForm.querySelector('input[name="newPassword"]').value;
            const confirmNewPassword = newForm.querySelector('input[name="confirmNewPassword"]').value;

            if (newPassword.length < 8) return window.showCustomAlert('Пароль должен быть не менее 8 символов.', 'error');
            if (newPassword !== confirmNewPassword) return window.showCustomAlert('Пароли не совпадают.', 'error');
            
            submitButton.disabled = true;
            submitButton.textContent = 'Сохранение...';

            try {
                const response = await fetchWithAuth(`${API_URL}/user/change-password`, {
                    method: 'POST',
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                
                window.showCustomAlert(result.message, 'success');
                newForm.reset();
            } catch (error) {
                window.showCustomAlert(`Ошибка: ${error.message}`, 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Сменить пароль';
            }
        });
    }
}