// profile.js - ПОЛНАЯ ВЕРСИЯ С JWT И ВСЕМИ ФУНКЦИЯМИ

const API_URL = 'http://localhost:3000/api';

// --- Секция 1: Утилиты и безопасный fetch ---

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
    return null;
}

// Новая "умная" функция для запросов к API
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('accessToken');

    // Подготавливаем заголовки
    const headers = { ...options.headers };

    // Устанавливаем Content-Type, только если его не определили как undefined (для FormData)
    if (headers['Content-Type'] !== undefined) {
        headers['Content-Type'] = 'application/json';
    } else {
        delete headers['Content-Type']; // Удаляем, чтобы браузер сам установил для FormData
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const newOptions = { ...options, headers };

    const response = await fetch(url, newOptions);

    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('accessToken');
        document.cookie.split(";").forEach(function(c) { document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); });
        window.location.href = 'auth.html';
        return Promise.reject(new Error('Сессия истекла. Пожалуйста, войдите снова.'));
    }

    return response;
}

function showLoading(container, isLoading, text) {
    if (isLoading) {
        container.innerHTML = `<p style="text-align:center; padding: 2rem;">${text}</p>`;
    }
}


// 1. Новая функция для загрузки и отрисовки избранного

async function initializeFavoritesFeature() {
    const container = document.querySelector('.favorites-grid');
    const clearButton = document.getElementById('clearFavoritesBtn');

    if (!container || !clearButton) return;

    // ----- Функция для отрисовки -----
    const renderFavorites = (favorites) => {
        if (!favorites || favorites.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #aaa;">В избранном пока пусто. Добавьте товары из каталога, нажав на сердечко ♥.</p>';
            clearButton.style.display = 'none';
            return;
        }
        clearButton.style.display = 'inline-block';
        container.innerHTML = favorites.map(fav => {
            const imageSrc = fav.ImageURL ? `/${fav.ImageURL.replace(/\\/g, '/')}` : '/images/placeholder.png';
            return `
            <div class="favorite-item" data-product-id="${fav.ProductID}">
                <img src="${imageSrc}" alt="${fav.ProductName}">
                <div class="favorite-info">
                    <h4>${fav.ProductName}</h4>
                    <p class="favorite-price">₽ ${(fav.DiscountPrice || fav.Price).toFixed(2)}</p>
                    <div class="favorite-actions">
                        <a href="#" class="btn btn-primary" onclick="addToCart(${fav.ProductID}, event)">В корзину</a>
                        <button class="btn btn-outline favorite-remove" data-product-id="${fav.ProductID}">Удалить</button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    };
    
    // ----- Загрузка данных -----
    const loadFavorites = async () => {
        try {
            showLoading(container, true, 'Загрузка избранного...');
            const response = await fetchWithAuth(`${API_URL}/favorites`);
            if (!response.ok) throw new Error('Не удалось загрузить избранное');
            const favorites = await response.json();
            renderFavorites(favorites);
        } catch (error) {
            container.innerHTML = `<p>${error.message}</p>`;
        }
    };
    
    await loadFavorites();

    // ----- Обработчики событий -----
    
    clearButton.addEventListener('click', async () => {
        const confirmed = await showCustomConfirm('Вы уверены, что хотите удалить все товары из избранного?');
        if (!confirmed) return;

        try {
            const response = await fetchWithAuth(`${API_URL}/favorites/all`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            showCustomAlert(result.message, 'success');
            renderFavorites([]);
        } catch (error) {
            showCustomAlert('Ошибка: ' + error.message, 'error');
        }
    });

    container.addEventListener('click', async (e) => {
        const removeButton = e.target.closest('button.favorite-remove');
        if (!removeButton) return;

        // productId теперь берется напрямую из атрибута кнопки, которая была нажата
        const productId = removeButton.dataset.productId;
        if (!productId) {
            console.error("Не удалось найти productId на кнопке 'Удалить'");
            return;
        }

        try {
            // Создаем объект с данными для отправки
            const requestBody = { productId: productId };

            const response = await fetchWithAuth(`${API_URL}/favorites/toggle`, {
                method: 'POST',
                headers: {
                    // Прямо указываем, что отправляем JSON
                    'Content-Type': 'application/json' 
                },
                // Явно передаем строку JSON в тело запроса
                body: JSON.stringify(requestBody) 
            });
            
            if (!response.ok) {
                let errorMessage = `Ошибка ${response.status}.`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (jsonError) {
                    console.warn("Ответ сервера при ошибке не является JSON.");
                }
                throw new Error(errorMessage);
            }

            // Если все успешно, удаляем элемент из DOM
            removeButton.closest('.favorite-item').remove();
            showCustomAlert('Товар удален из избранного.', 'info');
            
            if (container.children.length === 0) {
                renderFavorites([]);
            }

        } catch (error) {
            showCustomAlert('Ошибка удаления: ' + error.message, 'error');
        }
    });
}


// --- Секция 2: Инициализация страницы ---

document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('accessToken')) {
        window.location.href = 'auth.html';
        return;
    }
    initializeProfilePage();
});

function initializeProfilePage() {
    loadUserProfileData();
    initializeSideNavigation();
    initializeEditMode();
    initializeAvatarUpload();
    initializeOrdersFeature();
    initializeAddressesFeature();
    initializeSecurityFeature();
    initializeFavoritesFeature();
}

// --- Секция 3: Функции для разделов профиля ---

// ЗАМЕНИТЕ функцию loadUserProfileData в файле profile.js

function loadUserProfileData() {
    const userName = getCookie('userName') || 'Пользователь';
    const userEmail = getCookie('userEmail') || 'email@example.com';
    const userAvatarPath = getCookie('userAvatar'); // Получаем путь

    document.getElementById('usernameDisplay').textContent = userName;
    document.getElementById('profileUserEmail').textContent = userEmail;
    
    const avatarImg = document.getElementById('avatarImg');
    
    // --- ГЛАВНОЕ ИЗМЕНЕНИЕ ---
    // Проверяем, что путь к аватару существует и не является "null" или "undefined"
    if (userAvatarPath && userAvatarPath !== 'null' && userAvatarPath !== 'undefined') {
        // Формируем полный URL, добавляя адрес сервера
        // API_URL здесь уже должен быть определен в начале файла
        const fullAvatarUrl = `http://localhost:3000/${userAvatarPath.replace(/\\/g, '/')}`;
        avatarImg.src = fullAvatarUrl;
    } else {
        // Если аватара нет, показываем стандартную картинку
        avatarImg.src = 'images/аватары/default-avatar.png';
    }

    const nameParts = userName.split(' ');
    document.getElementById('firstName').value = nameParts[0] || '';
    document.getElementById('lastName').value = nameParts.slice(1).join(' ') || '';
    document.getElementById('email').value = userEmail;
}

function initializeSideNavigation() {
    const navItems = document.querySelectorAll('.profile-nav .nav-item');
    const tabContents = document.querySelectorAll('.profile-content .tab-content');

    // 1. Центральная функция для активации нужной вкладки
    function activateTab(tabId) {
        // Если ID не предоставлен, по умолчанию выбираем 'personal'
        const targetTabId = tabId || 'personal';
        const defaultTab = document.querySelector('.nav-item[data-tab="personal"]');

        let tabFound = false;
        navItems.forEach(nav => {
            const isTarget = nav.getAttribute('data-tab') === targetTabId;
            nav.classList.toggle('active', isTarget);
            if (isTarget) tabFound = true;
        });

        // Если вкладка по хешу не найдена, активируем дефолтную
        if (!tabFound && defaultTab) {
            defaultTab.classList.add('active');
        }

        tabContents.forEach(content => {
            const isTarget = content.id === targetTabId;
            content.classList.toggle('active', isTarget);
        });
        
        // Если вкладка не найдена, показываем контент дефолтной
        if (!tabFound) {
            const defaultContent = document.getElementById('personal');
            if(defaultContent) defaultContent.classList.add('active');
        }
    }

    // 2. Функция, которая читает хеш из URL и вызывает активацию
    function handleHash() {
        const hash = window.location.hash.substring(1); // Получаем ID без символа '#'
        activateTab(hash);
    }

    // 3. Обработчики кликов теперь просто меняют хеш
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTabId = item.getAttribute('data-tab');
            // Устанавливаем хеш, это вызовет событие 'hashchange'
            window.location.hash = targetTabId;
        });
    });

    // 4. Слушаем событие изменения хеша
    window.addEventListener('hashchange', handleHash);

    // 5. ВЫЗЫВАЕМ ФУНКЦИЮ ПРИ ПЕРВОЙ ЗАГРУЗКЕ СТРАНИЦЫ
    // --- ЭТО КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ ---
    handleHash();
}

function initializeEditMode() {
    const editBtn = document.getElementById('editProfileBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');
    const form = document.getElementById('personalDataForm');
    const formActions = document.getElementById('formActions');
    const inputs = form.querySelectorAll('input, select');
    
    const toggleEditMode = (isEditing) => {
        inputs.forEach(input => {
            if (input.id !== 'email') {
                input.readOnly = !isEditing;
                input.disabled = !isEditing;
            }
        });
        editBtn.style.display = isEditing ? 'none' : 'block';
        formActions.style.display = isEditing ? 'flex' : 'none';
    };

    editBtn.addEventListener('click', () => toggleEditMode(true));
    cancelBtn.addEventListener('click', () => {
        toggleEditMode(false);
        loadUserProfileData();
    });
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newFullName = `${document.getElementById('firstName').value} ${document.getElementById('lastName').value}`.trim();
        try {
            const response = await fetchWithAuth(`${API_URL}/user/update`, {
                method: 'PUT',
                body: JSON.stringify({ username: newFullName })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            document.cookie = `userName=${encodeURIComponent(result.newUsername)}; path=/; max-age=86400`;
            showCustomAlert('Данные успешно обновлены!', 'success');
            toggleEditMode(false);
            loadUserProfileData();
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            showCustomAlert(`Ошибка: ${error.message}`, 'error');
        }
    });
}

async function initializeAvatarUpload() {
    const avatarUploadBtn = document.getElementById('avatarUpload');
    const avatarInput = document.getElementById('avatarInput');
    
    avatarUploadBtn.addEventListener('click', () => avatarInput.click());
    
    avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);
        try {
            const response = await fetchWithAuth(`${API_URL}/avatar/upload`, {
                method: 'POST',
                body: formData,
                headers: { 'Content-Type': undefined } // Для FormData Content-Type не указывается
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Не удалось загрузить файл.');
            }
            document.cookie = `userAvatar=${encodeURIComponent(data.filePath)}; path=/; max-age=86400`;
            showCustomAlert('Аватар успешно обновлен!', 'success');
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            showCustomAlert(`Ошибка: ${error.message}`, 'error');
        }
    });
}

let ALL_ORDERS = [];
async function initializeOrdersFeature() {
    const container = document.getElementById('ordersListContainer');
    showLoading(container, true, 'Загрузка заказов...');
    try {
        const response = await fetchWithAuth(`${API_URL}/orders`);
        if (!response.ok) throw new Error('Ошибка сети при загрузке заказов');
        ALL_ORDERS = await response.json();
        renderOrders(ALL_ORDERS);
    } catch (error) {
        console.error(error.message);
        if (error.message.includes('Сессия истекла')) return;
        showLoading(container, false, '');
        container.innerHTML = '<p>Не удалось загрузить заказы.</p>';
    }
    const filter = document.getElementById('orderStatusFilter');
    filter.addEventListener('change', () => {
        const selectedStatus = filter.value;
        const filtered = selectedStatus === 'all' ? ALL_ORDERS : ALL_ORDERS.filter(o => o.status === selectedStatus);
        renderOrders(filtered);
    });
    container.addEventListener('click', handleOrderActions);
}

function renderOrders(ordersToRender) {
    const container = document.getElementById('ordersListContainer');
    if (!ordersToRender || ordersToRender.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #aaa;">У вас пока нет заказов.</p>`;
        return;
    }
    container.innerHTML = ordersToRender.map(order => {
        const itemsArray = (typeof order.items === 'string') ? JSON.parse(order.items || '[]') : (order.items || []);
        const statusInfo = {
            delivered: { text: 'Доставлен', class: 'status-delivered' },
            processing: { text: 'В обработке', class: 'status-processing' },
            shipped: { text: 'Отправлен', class: 'status-shipped' },
            cancelled: { text: 'Отменен', class: 'status-cancelled' }
        };
        const currentStatus = statusInfo[order.status] || { text: 'Неизвестно', class: '' };
        return `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-number">Заказ №${order.id}</div>
                    <div class="order-date">${new Date(order.date).toLocaleDateString('ru-RU')}</div>
                    <div class="order-status ${currentStatus.class}">${currentStatus.text}</div>
                </div>
                <div class="order-items">
                    ${itemsArray.map(item => `
                        <div class="order-item">
                            <img src="${item.img ? item.img.replace(/\\/g, '/') : 'images/placeholder.png'}" alt="${item.name}" onerror="this.onerror=null;this.src='images/placeholder.png';">
                            <div class="item-info"><h4>${item.name}</h4><p>Количество: ${item.quantity}</p></div>
                            <div class="item-price">${(item.price * item.quantity).toFixed(2)} ₽</div>
                        </div>`).join('')}
                </div>
                <div class="order-total">
                    <span>Итого: ${parseFloat(order.total).toFixed(2)} ₽</span>
                    <div class="order-actions">
                        <button class="btn btn-outline btn-repeat-order" data-order-id="${order.id}">Повторить</button>
                        ${order.status === 'processing' ? `<button class="btn btn-danger btn-cancel-order" data-order-id="${order.id}">Отменить</button>` : ''}
                        ${order.status === 'delivered' || order.status === 'cancelled' ? `<button class="btn btn-secondary btn-hide-order" data-order-id="${order.id}">Удалить</button>` : ''}
                    </div>
                </div>
            </div>`;
    }).join('');
}

async function handleOrderActions(e) {
    const target = e.target.closest('button');
    if (!target) return;
    const orderId = target.dataset.orderId;
    try {
        if (target.classList.contains('btn-repeat-order')) {
            const confirmed = await showCustomConfirm(`Повторить заказ №${orderId}?`);
            if (confirmed) {
                const response = await fetchWithAuth(`${API_URL}/orders/${orderId}/repeat`, { method: 'POST' });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                showCustomAlert(`Заказ успешно повторен! Новый номер: ${result.newOrderId}`, 'success');
                initializeOrdersFeature();
            }
        } else if (target.classList.contains('btn-cancel-order')) {
            const confirmed = await showCustomConfirm(`Отменить заказ №${orderId}?`);
            if (confirmed) {
                const response = await fetchWithAuth(`${API_URL}/orders/${orderId}/cancel`, { method: 'PUT' });
                if (!response.ok) throw new Error('Ошибка отмены заказа');
                showCustomAlert('Заказ успешно отменен.', 'info');
                initializeOrdersFeature();
            }
        } else if (target.classList.contains('btn-hide-order')) {
            const confirmed = await showCustomConfirm(`Удалить заказ №${orderId} из истории?`);
            if (confirmed) {
                const response = await fetchWithAuth(`${API_URL}/orders/${orderId}/hide`, { method: 'PUT' });
                if (!response.ok) throw new Error('Ошибка скрытия заказа');
                showCustomAlert('Заказ удален из истории.', 'info');
                initializeOrdersFeature();
            }
        }
    } catch (error) {
        showCustomAlert(error.message, 'error');
    }
}

let ALL_ADDRESSES = [];
function initializeAddressesFeature() {
    const addAddressBtn = document.getElementById('addAddressBtn');
    const modalOverlay = document.getElementById('addressModalOverlay');
    const closeBtn = document.getElementById('closeAddressModalBtn');
    const addressForm = document.getElementById('addressForm');
    const addressesContainer = document.getElementById('addressesListContainer');
    const modalTitle = modalOverlay.querySelector('h3');

    const openModal = (address = null) => {
        addressForm.reset();
        if (address) {
            addressForm.setAttribute('data-editing-id', address.AddressID);
            modalTitle.textContent = 'Редактирование адреса';
            document.getElementById('addressType').value = address.AddressType;
            document.getElementById('city').value = address.City;
            document.getElementById('street').value = address.Street;
            document.getElementById('house').value = address.House;
            document.getElementById('apartment').value = address.Apartment || '';
            document.getElementById('postalCode').value = address.PostalCode || '';
        } else {
            addressForm.removeAttribute('data-editing-id');
            modalTitle.textContent = 'Новый адрес доставки';
        }
        modalOverlay.style.display = 'flex';
    };

    addAddressBtn.addEventListener('click', () => openModal());
    closeBtn.addEventListener('click', () => modalOverlay.style.display = 'none');
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) modalOverlay.style.display = 'none';
    });
    addressForm.addEventListener('submit', handleAddressFormSubmit);
    addressesContainer.addEventListener('click', async (e) => {
        const button = e.target.closest('button.btn');
        if (!button) return;
        const addressId = button.dataset.addressId;
        if (!addressId) return;
        if (button.classList.contains('btn-edit-address')) {
            const addressToEdit = ALL_ADDRESSES.find(addr => addr.AddressID == addressId);
            if (addressToEdit) openModal(addressToEdit);
        } else if (button.classList.contains('btn-delete-address')) {
            const confirmed = await showCustomConfirm('Вы уверены, что хотите удалить этот адрес?');
            if (confirmed) {
                try {
                    const response = await fetchWithAuth(`${API_URL}/addresses/${addressId}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message);
                    showCustomAlert(result.message, 'success');
                    loadAddresses();
                } catch (error) {
                    showCustomAlert(error.message, 'error');
                }
            }
        }
    });
    loadAddresses();
}

async function loadAddresses() {
    const container = document.getElementById('addressesListContainer');
    showLoading(container, true, 'Загрузка адресов...');
    try {
        const response = await fetchWithAuth(`${API_URL}/addresses`);
        if (!response.ok) throw new Error('Ошибка сети при загрузке адресов');
        ALL_ADDRESSES = await response.json();
        renderAddresses(ALL_ADDRESSES);
    } catch (error) {
        console.error(error.message);
        if (error.message.includes('Сессия истекла')) return;
        showLoading(container, false, '');
        container.innerHTML = '<p>Не удалось загрузить адреса.</p>';
    }
}

function renderAddresses(addresses) {
    const container = document.getElementById('addressesListContainer');
    if (!addresses || addresses.length === 0) {
        container.innerHTML = '<p>У вас пока нет сохраненных адресов.</p>';
        return;
    }
    container.innerHTML = addresses.map(addr => `
        <div class="address-card">
            <div class="address-header">
                <h4>${addr.AddressType}</h4>
                ${addr.IsDefault ? '<span class="address-default">Основной</span>' : ''}
            </div>
            <p>${addr.City}, ${addr.Street}, д. ${addr.House}${addr.Apartment ? `, кв. ${addr.Apartment}` : ''}</p>
            <p>Индекс: ${addr.PostalCode || 'не указан'}</p>
            <div class="address-actions">
                <button class="btn btn-outline btn-edit-address" data-address-id="${addr.AddressID}">Редактировать</button>
                ${!addr.IsDefault ? `<button class="btn btn-danger btn-delete-address" data-address-id="${addr.AddressID}">Удалить</button>` : ''}
            </div>
        </div>
    `).join('');
}

async function handleAddressFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const editingId = form.dataset.editingId;
    const addressData = {
        AddressType: document.getElementById('addressType').value,
        City: document.getElementById('city').value,
        Street: document.getElementById('street').value,
        House: document.getElementById('house').value,
        Apartment: document.getElementById('apartment').value,
        PostalCode: document.getElementById('postalCode').value
    };
    if (!addressData.AddressType || !addressData.City || !addressData.Street || !addressData.House) {
        showCustomAlert('Пожалуйста, заполните все обязательные поля.', 'error');
        return;
    }
    const url = editingId ? `${API_URL}/addresses/${editingId}` : `${API_URL}/addresses`;
    const method = editingId ? 'PUT' : 'POST';
    try {
        const response = await fetchWithAuth(url, { method, body: JSON.stringify(addressData) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        showCustomAlert(result.message || 'Адрес успешно сохранен!', 'success');
        document.getElementById('addressModalOverlay').style.display = 'none';
        loadAddresses();
    } catch (error) {
        showCustomAlert(`Ошибка: ${error.message}`, 'error');
    }
}

async function initializeSecurityFeature() {
    const passwordForm = document.getElementById('passwordChangeForm');
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;
        if (newPassword.length < 6) {
            return showCustomAlert('Новый пароль должен быть не менее 6 символов.', 'error');
        }
        if (newPassword !== confirmNewPassword) {
            return showCustomAlert('Новые пароли не совпадают.', 'error');
        }
        try {
            const response = await fetchWithAuth(`${API_URL}/user/change-password`, {
                method: 'POST',
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            showCustomAlert(result.message, 'success');
            e.target.reset();
        } catch (error) {
            showCustomAlert(`Ошибка: ${error.message}`, 'error');
        }
    });
}





