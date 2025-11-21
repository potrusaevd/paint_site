
// ==========================================================
// --- ГЛОБАЛЬНАЯ ФУНКЦИЯ ДОБАВЛЕНИЯ В КОРЗИНУ ---
// ==========================================================
window.addToCart = async (productId, event) => {
    if (event) {
        event.preventDefault();
        event.stopPropagation(); // Останавливаем всплытие, чтобы не сработали другие клики
    }

    if (!productId) return;
    
    if (!localStorage.getItem('accessToken')) {
        window.showCustomAlert('Пожалуйста, войдите в аккаунт, чтобы добавить товар в заявку.', 'info');
        return;
    }

    // --- НОВАЯ ЛОГИКА: Визуальная обратная связь ---
    const button = event.target.closest('.card-action-button');
    if (button) {
        button.disabled = true; // Блокируем кнопку на время запроса
        button.querySelector('span:last-child').textContent = 'Добавление...';
    }

    try {
        const response = await fetch('/api/cart/add', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: JSON.stringify({ productId: productId })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Ошибка добавления товара');
        }

        // Обновляем состояние корзины
        if (window.CartManager) {
            await window.CartManager.refreshCart();
        }
        
        // Показываем успешное уведомление
        window.showCustomAlert('Товар успешно добавлен в заявку!', 'success');

        // Возвращаем кнопку в исходное состояние с небольшой задержкой
        if (button) {
            setTimeout(() => {
                button.querySelector('span:last-child').textContent = 'В заявку →';
                button.disabled = false;
            }, 1000); // 1 секунда
        }

    } catch(err) { 
        console.error(err); 
        window.showCustomAlert(err.message, 'error');
        // Возвращаем кнопку в исходное состояние в случае ошибки
        if (button) {
            button.querySelector('span:last-child').textContent = 'В заявку →';
            button.disabled = false;
        }
    }
};




// ==========================================================
// --- ОСНОВНОЙ СКРИПТ, ВЫПОЛНЯЕМЫЙ ПОСЛЕ ЗАГРУЗКИ DOM ---
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {


    // --- ОБРАБОТЧИК ДЛЯ КНОПКИ "ОФОРМИТЬ" В КОРЗИНЕ ---
    const checkoutBtn = document.querySelector('.btn-checkout');

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            // ИЗМЕНЕНИЕ: Проверяем не сумму, а количество товаров
            const cartItems = document.querySelectorAll('.cart-item');
            const itemCount = cartItems.length;

            console.log(`[DEBUG] Проверка количества товаров в корзине: ${itemCount}`);
            
            if (itemCount > 0) {
                console.log('[DEBUG] Товары в корзине есть. Перенаправление на /checkout...');
                window.location.href = '/checkout';
            } else {
                console.warn('[DEBUG] Корзина пуста.');
                if (window.showCustomAlert) {
                    window.showCustomAlert('Ваша заявка пуста. Добавьте товары, чтобы перейти к оформлению.', 'warning');
                } else {
                    alert('Ваша заявка пуста.');
                }
            }
        });

    } else {
        console.error('[DEBUG] Кнопка .btn-checkout НЕ найдена на странице.');
    }



    // ==========================================================
    // --- ГЛОБАЛЬНАЯ СИСТЕМА УПРАВЛЕНИЯ КОРЗИНОЙ (объект и обработчики) ---
    // ==========================================================
    window.CartManager = {
        // Получение данных с сервера и полная перерисовка корзины
        async refreshCart() {
            if (!localStorage.getItem('accessToken')) return;
            try {
                const response = await fetch('/api/cart', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
                });
                if (!response.ok) return;
                const items = await response.json();
                this.updateIconCounter(items);
                this.renderCartModal(items);
            } catch (error) { 
                console.error("Ошибка обновления корзины:", error); 
            }
        },

        // Обновление счетчика на иконке на основе данных с сервера
        updateIconCounter(items) {
            const counter = document.getElementById('cartCounter');
            if(!counter) return;
            const totalQuantity = items.reduce((sum, item) => sum + item.Quantity, 0);
            if (totalQuantity > 0) {
                counter.textContent = totalQuantity;
                counter.style.display = 'flex';
            } else {
                counter.style.display = 'none';
            }
        },
        
        // Полная отрисовка товаров в модальном окне
        renderCartModal(items) {
        const modalBody = document.getElementById('cartModalBody');
        const totalSumEl = document.getElementById('cartTotalSum');
        if (!modalBody || !totalSumEl) return;

        if (items.length === 0) {
            modalBody.innerHTML = '<p class="cart-empty-message">Здесь пока пусто.</p>';
            totalSumEl.textContent = '0 ₽';
            return;
        }

        let totalSum = 0;
        modalBody.innerHTML = items.map(item => {
            const price = item.DiscountPrice || item.Price;
            totalSum += price * item.Quantity;
            const imageSrc = item.ImageURL ? `/${item.ImageURL.replace(/\\/g, '/')}` : '/images/placeholder.png'; // плейсхолдер
            
            // Формируем строку с деталями товара
            const details = [
                item.ProductSeries ? `Серия: ${item.ProductSeries}` : '',
                item.RalColor ? `RAL: ${item.RalColor}` : '',
                item.Volume ? `Объем: ${item.Volume} л` : ''
            ].filter(Boolean).join(' | '); // Собираем только существующие детали

            return `
            <div class="cart-item" data-product-id="${item.ProductID}">
                <div class="cart-item-img-wrapper">
                    <img src="${imageSrc}" alt="${item.ProductName}">
                </div>
                <div class="cart-item-info">
                    <div class="product-name">${item.ProductName}</div>
                    <div class="product-details">
                        <span>${details}</span>
                    </div>
                    <div class="price">${price.toFixed(2)} ₽</div>
                    <div class="quantity-control">
                        <button class="quantity-btn decrease-qty">-</button>
                        <input type="number" class="quantity-input" value="${item.Quantity}" min="1">
                        <button class="quantity-btn increase-qty">+</button>
                    </div>
                </div>
                <button class="cart-item-remove" title="Удалить товар">&times;</button>
            </div>
            `;
        }).join('');
        totalSumEl.textContent = `${totalSum.toFixed(2)} ₽`;
    },

    // Также замените функцию toggleModal для плавной анимации
    toggleModal(show) {
        const modal = document.getElementById('cartModal');
        if(modal) {
            if (show) {
                modal.classList.add('show');
            } else {
                modal.classList.remove('show');
            }
        }
    },

        // --- НОВЫЕ ФУНКЦИИ ---

        // НОВАЯ ФУНКЦИЯ: Пересчет итоговой суммы на основе данных из DOM
        recalculateTotal() {
            const modalBody = document.getElementById('cartModalBody');
            const totalSumEl = document.getElementById('cartTotalSum');
            if (!modalBody || !totalSumEl) return;
            
            const allItems = modalBody.querySelectorAll('.cart-item');
            let totalSum = 0;

            if (allItems.length === 0) {
                modalBody.innerHTML = '<p class="cart-empty-message">В корзине пока пусто.</p>';
            } else {
                allItems.forEach(item => {
                    const priceText = item.querySelector('.price').textContent;
                    const price = parseFloat(priceText.replace('₽', '').trim());
                    const quantity = parseInt(item.querySelector('.quantity-input').value, 10);
                    totalSum += price * quantity;
                });
            }
        
            totalSumEl.textContent = `${totalSum.toFixed(2)} ₽`;
        },

        // НОВАЯ ФУНКЦИЯ: Обновление счетчика на иконке на основе данных из DOM
        updateIconCounterFromDOM() {
            const modalBody = document.getElementById('cartModalBody');
            if (!modalBody) return;

            const allInputs = modalBody.querySelectorAll('.quantity-input');
            let totalQuantity = 0;
            allInputs.forEach(input => {
                totalQuantity += parseInt(input.value, 10);
            });

            const counter = document.getElementById('cartCounter');
            if(!counter) return;

            if (totalQuantity > 0) {
                counter.textContent = totalQuantity;
                counter.style.display = 'flex';
            } else {
                counter.style.display = 'none';
            }
        }
    };

    // --- Обработчики событий для корзины ---
    const cartButton = document.querySelector('.cart_button'); // Ищем кнопку по новому классу
    if (cartButton) {
        cartButton.addEventListener('click', () => window.CartManager.toggleModal(true));
    }
    document.getElementById('closeCartBtn')?.addEventListener('click', () => window.CartManager.toggleModal(false));
    document.getElementById('continueShoppingBtn')?.addEventListener('click', () => window.CartManager.toggleModal(false));
    document.getElementById('cartModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'cartModal') window.CartManager.toggleModal(false);
    });
    
    // (обработчик для кнопок "В корзину" теперь глобальный через onclick)

    document.getElementById('cartModalBody')?.addEventListener('click', async (e) => {
        const target = e.target;
        const itemEl = target.closest('.cart-item');
        if (!itemEl) return;
        
        const productId = itemEl.dataset.productId;
        if (!productId) return;

        // --- Логика удаления товара ---
        if (target.classList.contains('cart-item-remove')) {
            try {
                const response = await fetch('/api/cart/remove', {
                    method: 'DELETE',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                    },
                    body: JSON.stringify({ productId: productId })
                });
                if (!response.ok) throw new Error('Ошибка удаления');
                
                // Удаляем элемент из DOM и обновляем итоговую сумму
                itemEl.remove();
                window.CartManager.recalculateTotal();
                showCustomAlert ? showCustomAlert('Товар удален из корзины.', 'info') : showCustomAlert('Товар удален из корзины.');

            } catch (err) {
                console.error(err);
                showCustomAlert(err.message);
            }
            return; // Завершаем выполнение
        }
        
        // --- Логика изменения количества ---
        if (target.classList.contains('quantity-btn')) {
            const quantityInput = itemEl.querySelector('.quantity-input');
            let currentQuantity = parseInt(quantityInput.value, 10);
            
            if (target.classList.contains('increase-qty')) {
                currentQuantity++;
            } else if (target.classList.contains('decrease-qty')) {
                currentQuantity--;
            }

            quantityInput.value = currentQuantity;

            if (currentQuantity <= 0) {
                itemEl.querySelector('.cart-item-remove').click();
                return;
            }

            try {
                const response = await fetch('/api/cart/update', {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                    },
                    body: JSON.stringify({ productId: productId, quantity: currentQuantity })
                });
                if (!response.ok) throw new Error('Ошибка обновления количества');

                // ЛОКАЛЬНОЕ ОБНОВЛЕНИЕ: Пересчитываем только итоговую сумму
                window.CartManager.recalculateTotal();
                // Обновляем счетчик на иконке
                window.CartManager.updateIconCounterFromDOM();


            } catch (err) {
                console.error(err);
                showCustomAlert(err.message);
            }
        }
    });



    // --- Первоначальная загрузка корзины ---
    window.CartManager.refreshCart();


});
