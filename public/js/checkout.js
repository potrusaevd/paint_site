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
                // Используем кастомный алерт
                if (typeof window.showCustomAlert === 'function') {
                    window.showCustomAlert('Ваша корзина пуста. Перенаправляем в каталог.', 'warning');
                    setTimeout(() => {
                        window.location.href = '/catalog';
                    }, 2000);
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
            summaryItemsContainer.innerHTML = `<p>Ошибка загрузки данных.</p>`;
            
            // Используем кастомный алерт для ошибок
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
            customerNameInput.value = user.Username || '';
            customerEmailInput.value = user.Email || '';
        }

        if (addresses && addresses.length > 0) {
            savedAddressesContainer.innerHTML = addresses.map((addr, index) => `
                <label class="saved-address-label ${addr.IsDefault ? 'selected' : ''}">
                    <input type="radio" name="saved_address" value="${addr.AddressID}" ${addr.IsDefault ? 'checked' : ''}>
                    <span class="address-type">${addr.AddressType}</span>
                    <span class="address-details">${addr.City}, ${addr.Street}, ${addr.House}${addr.Apartment ? ', ' + addr.Apartment : ''}</span>
                </label>
            `).join('');

            // Сразу заполняем поля адреса по умолчанию
            const defaultAddress = addresses.find(addr => addr.IsDefault) || addresses[0];
            if (defaultAddress) {
                addressCityInput.value = defaultAddress.City;
                addressStreetInput.value = `${defaultAddress.Street}, ${defaultAddress.House}${defaultAddress.Apartment ? ', ' + defaultAddress.Apartment : ''}`;
            }

            // Добавляем обработчик для выбора другого адреса
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
        summaryItemsContainer.innerHTML = items.map(item => {
            const price = item.DiscountPrice || item.Price;
            total += price * item.Quantity;
            const imageSrc = item.ImageURL ? `/${item.ImageURL.replace(/\\/g, '/')}` : '/images/placeholder.png';
            return `
            <div class="summary-item">
                <img src="${imageSrc}" alt="${item.ProductName}" class="summary-item-img">
                <div class="summary-item-info">
                    <h4>${item.ProductName}</h4>
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
        
        // Используем кастомное подтверждение
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

            // Используем кастомный алерт для успеха
            if (typeof window.showCustomAlert === 'function') {
                window.showCustomAlert(`Спасибо! Ваш заказ №${result.orderId} успешно оформлен.`, 'success');
                setTimeout(() => {
                    window.location.href = '/profile#orders';
                }, 2500);
            } else {
                alert(`Спасибо! Ваш заказ №${result.orderId} успешно оформлен.`);
                window.location.href = '/profile#orders';
            }

        } catch (error) {
            // Используем кастомный алерт для ошибок
            if (typeof window.showCustomAlert === 'function') {
                window.showCustomAlert(`Ошибка оформления заказа: ${error.message}`, 'error');
            } else {
                alert(`Ошибка оформления заказа: ${error.message}`);
            }
            
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = 'Подтвердить заказ';
        }
    });

    // Запускаем загрузку всех данных при открытии страницы
    loadCheckoutData();
});