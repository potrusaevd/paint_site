/**
 * Функция для экранирования HTML-тегов в строке для безопасного отображения.
 * Предотвращает XSS-атаки, преобразуя символы вроде < > в их HTML-сущности.
 * @param {string | number} str - Входная строка или число.
 * @returns {string} - Безопасная для отображения строка.
 */
function escapeHTML(str) {
    const str_val = String(str || '');
    const p = document.createElement('p');
    p.textContent = str_val;
    return p.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
    // Проверяем авторизацию
    if (!localStorage.getItem('accessToken')) {
        window.location.href = '/auth';
        return;
    }

    const summaryItemsContainer = document.getElementById('summaryItems');
    const summaryTotalEl = document.getElementById('summaryTotal');
    const checkoutForm = document.getElementById('checkoutForm');
    const customerNameInput = document.getElementById('customerName');
    const customerEmailInput = document.getElementById('customerEmail');
    const addressCityInput = document.getElementById('addressCity');
    const addressStreetInput = document.getElementById('addressStreet');
    const savedAddressesContainer = document.getElementById('savedAddresses');

    // --- Функция загрузки ВСЕХ данных для страницы ---
    async function loadCheckoutData() {
        try {
            // Одновременно запрашиваем данные о пользователе/адресах и о корзине
            const [infoResponse, cartResponse] = await Promise.all([
                fetch('/api/checkout-info', { headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` } }),
                fetch('/api/cart', { headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` } })
            ]);

            if (!infoResponse.ok || !cartResponse.ok) throw new Error('Не удалось загрузить данные для оформления заказа');
            
            const infoData = await infoResponse.json();
            const cartItems = await cartResponse.json();

            if (cartItems.length === 0) {
                if (typeof window.showCustomAlert === 'function') {
                    window.showCustomAlert('Ваша корзина пуста. Перенаправляем в каталог.', 'warning');
                    setTimeout(() => { window.location.href = '/catalog'; }, 2000);
                } else {
                    alert('Ваша корзина пуста. Перенаправляем в каталог.');
                    window.location.href = '/catalog';
                }
                return;
            }

            // Заполняем форму и рисуем заказ
            populateForm(infoData.user, infoData.addresses);
            renderSummary(cartItems);

        } catch (error) {
            console.error(error);
            // Используем .textContent для безопасного вывода
            summaryItemsContainer.textContent = 'Ошибка загрузки данных.';
            
            if (typeof window.showCustomAlert === 'function') {
                window.showCustomAlert('Ошибка загрузки данных для оформления заказа', 'error');
            } else {
                alert('Ошибка загрузки данных для оформления заказа');
            }
        }
    }

    // --- Функция для заполнения полей формы ---
    function populateForm(user, addresses) {
        if (user) {
            // Использование .value для input безопасно
            customerNameInput.value = user.Username || '';
            customerEmailInput.value = user.Email || '';
        }

        if (addresses && addresses.length > 0) {
            // ИСПРАВЛЕНО: Экранируем все динамические данные перед вставкой в HTML
            savedAddressesContainer.innerHTML = addresses.map((addr) => {
                const safeAddressType = escapeHTML(addr.AddressType);
                const safeCity = escapeHTML(addr.City);
                const safeStreet = escapeHTML(addr.Street);
                const safeHouse = escapeHTML(addr.House);
                const safeApartment = addr.Apartment ? `, ${escapeHTML(addr.Apartment)}` : '';
                
                return `
                <label class="saved-address-label ${addr.IsDefault ? 'selected' : ''}">
                    <input type="radio" name="saved_address" value="${addr.AddressID}" ${addr.IsDefault ? 'checked' : ''}>
                    <span class="address-type">${safeAddressType}</span>
                    <span class="address-details">${safeCity}, ${safeStreet}, ${safeHouse}${safeApartment}</span>
                </label>
            `;
            }).join('');

            const defaultAddress = addresses.find(addr => addr.IsDefault) || addresses[0];
            if (defaultAddress) {
                // Использование .value безопасно
                addressCityInput.value = defaultAddress.City;
                addressStreetInput.value = `${defaultAddress.Street}, ${defaultAddress.House}${defaultAddress.Apartment ? ', ' + defaultAddress.Apartment : ''}`;
            }

            savedAddressesContainer.addEventListener('change', (e) => {
                if (e.target.name === 'saved_address') {
                    const selectedId = parseInt(e.target.value, 10);
                    const selectedAddress = addresses.find(addr => addr.AddressID === selectedId);
                    
                    document.querySelectorAll('.saved-address-label').forEach(label => label.classList.remove('selected'));
                    e.target.closest('.saved-address-label').classList.add('selected');

                    if (selectedAddress) {
                        addressCityInput.value = selectedAddress.City;
                        addressStreetInput.value = `${selectedAddress.Street}, ${selectedAddress.House}${selectedAddress.Apartment ? ', ' + selectedAddress.Apartment : ''}`;
                    }
                }
            });

        } else {
            savedAddressesContainer.innerHTML = '<p>У вас нет сохраненных адресов.</p>';
        }
    }

    // --- Функция отрисовки состава заказа ---
    function renderSummary(items) {
        let total = 0;
        // ИСПРАВЛЕНО: Экранируем название товара перед вставкой
        summaryItemsContainer.innerHTML = items.map(item => {
            const price = item.DiscountPrice || item.Price;
            total += price * item.Quantity;
            const imageSrc = item.ImageURL ? `/${item.ImageURL.replace(/\\/g, '/')}` : '/images/placeholder.png';
            const safeProductName = escapeHTML(item.ProductName); // Экранируем!

            return `
            <div class="summary-item">
                <img src="${imageSrc}" alt="${safeProductName}" class="summary-item-img">
                <div class="summary-item-info">
                    <h4>${safeProductName}</h4>
                    <p>Кол-во: ${item.Quantity}</p>
                </div>
                <span class="summary-item-price">${(price * item.Quantity).toFixed(2)} ₽</span>
            </div>
            `;
        }).join('');
        summaryTotalEl.textContent = `${total.toFixed(2)} ₽`;
    }

    // --- Обработчик отправки формы ---
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        let confirmed = true;
        if (typeof window.showCustomConfirm === 'function') {
            confirmed = await window.showCustomConfirm('Вы уверены, что хотите оформить заказ?', 'Подтверждение заказа');
        } else {
            confirmed = confirm('Вы уверены, что хотите оформить заказ?');
        }
        
        if (!confirmed) return;
        
        const placeOrderBtn = document.querySelector('.btn-place-order');
        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent = 'Обработка...';

        try {
            const response = await fetch('/api/orders/create', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            // ИСПРАВЛЕНО: Экранируем номер заказа, полученный от сервера
            const safeOrderId = escapeHTML(result.orderId);

            if (typeof window.showCustomAlert === 'function') {
                window.showCustomAlert(`Спасибо! Ваш заказ №${safeOrderId} успешно оформлен.`, 'success');
                setTimeout(() => { window.location.href = '/profile#orders'; }, 2500);
            } else {
                alert(`Спасибо! Ваш заказ №${safeOrderId} успешно оформлен.`);
                window.location.href = '/profile#orders';
            }

        } catch (error) {
            // ИСПРАВЛЕНО: Экранируем сообщение об ошибке
            const safeErrorMessage = escapeHTML(error.message);

            if (typeof window.showCustomAlert === 'function') {
                window.showCustomAlert(`Ошибка оформления заказа: ${safeErrorMessage}`, 'error');
            } else {
                alert(`Ошибка оформления заказа: ${safeErrorMessage}`);
            }
            
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = 'Подтвердить заказ';
        }
    });

    loadCheckoutData();
});