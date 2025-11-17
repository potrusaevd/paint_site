// ==========================================================
// --- ФУНКЦИИ ЭКРАНИРОВАНИЯ ДЛЯ БЕЗОПАСНОСТИ ---
// ==========================================================

/**
 * Функция для экранирования HTML-тегов в строке для безопасного отображения в текстовом контексте.
 * @param {string | number} str - Входная строка или число.
 * @returns {string} - Безопасная для отображения строка.
 */
function escapeHTML(str) {
    const str_val = String(str || '');
    const p = document.createElement('p');
    p.textContent = str_val;
    return p.innerHTML;
}

/**
 * Функция для экранирования строки для безопасного использования в значениях HTML-атрибутов.
 * @param {string | number} str - Входная строка или число.
 * @returns {string} - Безопасная для атрибута строка.
 */
function escapeAttribute(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}


// ==========================================================
// --- ГЛОБАЛЬНЫЙ МЕНЕДЖЕР ИЗБРАННОГО ---
// ==========================================================
window.FavoriteManager = {
    async syncFavoriteStatus() {
        if (!localStorage.getItem('accessToken')) return;
        try {
            const API_URL = 'http://localhost:3000/api';
            const response = await fetch(`${API_URL}/favorites/ids`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
            });
            if (!response.ok) return;
            const favoriteIds = await response.json();
            const favoriteIdSet = new Set(favoriteIds);
            document.querySelectorAll('.favorite-checkbox').forEach(checkbox => {
                const productId = parseInt(checkbox.dataset.productId, 10);
                if (!isNaN(productId)) {
                    checkbox.checked = favoriteIdSet.has(productId);
                }
            });
        } catch (error) {
            console.error("Ошибка при синхронизации статуса избранного:", error);
        }
    },
    async toggleFavorite(productId, checkbox) {
        if (!localStorage.getItem('accessToken')) {
            showCustomAlert('Пожалуйста, войдите в аккаунт, чтобы управлять избранным.');
            checkbox.checked = !checkbox.checked;
            return;
        }
        const API_URL = 'http://localhost:3000/api';
        try {
            const response = await fetch(`${API_URL}/favorites/toggle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify({ productId: productId })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Ошибка сервера');
            
            document.querySelectorAll(`.favorite-checkbox[data-product-id="${productId}"]`).forEach(cb => {
                cb.checked = (result.action === 'added');
            });
        } catch (error) {
            console.error('Ошибка при переключении избранного:', error);
            // ИСПРАВЛЕНО: Экранируем сообщение об ошибке
            if (typeof showCustomAlert === 'function') {
                showCustomAlert(escapeHTML('Ошибка: ' + error.message), 'error');
            }
            checkbox.checked = !checkbox.checked;
        }
    }
};

// ==========================================================
// --- ГЛОБАЛЬНАЯ ФУНКЦИЯ ДОБАВЛЕНИЯ В КОРЗИНУ ---
// ==========================================================
window.addToCart = async (productId, event) => {
    if (event) event.preventDefault();
    if (!productId) return;
    if (!localStorage.getItem('accessToken')) {
        showCustomAlert('Пожалуйста, войдите в аккаунт, чтобы добавить товар в корзину.');
        return;
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
        if (!response.ok) throw new Error('Ошибка добавления товара');
        if (window.CartManager) await window.CartManager.refreshCart();
        if (typeof showCustomAlert === 'function') {
            showCustomAlert('Товар добавлен в корзину!', 'success');
        } else {
            alert('Товар добавлен в корзину!');
        }
    } catch(err) { 
        console.error(err);
        // ИСПРАВЛЕНО: Экранируем сообщение об ошибке
        if (typeof showCustomAlert === 'function') {
            showCustomAlert(escapeHTML('Ошибка: ' + err.message), 'error');
        }
    }
};

// ==========================================================
// --- ОСНОВНОЙ СКРИПТ, ВЫПОЛНЯЕМЫЙ ПОСЛЕ ЗАГРУЗКИ DOM ---
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {

    document.querySelector('.btn-checkout')?.addEventListener('click', () => {
        const totalSumText = document.getElementById('cartTotalSum')?.textContent || '0';
        const totalSum = parseFloat(totalSumText.replace('₽', ''));
        
        if (totalSum > 0) {
            window.location.href = '/checkout';
        } else {
            showCustomAlert('Ваша корзина пуста. Добавьте товары, чтобы оформить заказ.');
        }
    });

    document.getElementById("closePrivacyBtn")?.addEventListener("click", () => {
        document.getElementById("privacyModal").style.display = "none";
    });

    // ==========================================================
    // --- ГЛОБАЛЬНАЯ СИСТЕМА УПРАВЛЕНИЯ КОРЗИНОЙ (объект и обработчики) ---
    // ==========================================================
    window.CartManager = {
        async refreshCart() {
            if (!localStorage.getItem('accessToken')) return;
            try {
                const response = await fetch('/api/cart', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
                });
                if (!response.ok) throw new Error('Ошибка загрузки корзины');
                const items = await response.json();
                this.updateIconCounter(items);
                this.renderCartModal(items);
            } catch (error) { 
                console.error("Ошибка обновления корзины:", error);
                // ИСПРАВЛЕНО: Экранируем сообщение об ошибке
                if (typeof showCustomAlert === 'function') {
                    showCustomAlert(escapeHTML('Ошибка обновления корзины: ' + error.message), 'error');
                }
            }
        },

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
            // ИСПРАВЛЕНО: Экранируем все данные от сервера перед вставкой в HTML
            modalBody.innerHTML = items.map(item => {
                const price = item.DiscountPrice || item.Price;
                totalSum += price * item.Quantity;
                const imagePath = item.ImageURL ? item.ImageURL.replace(/\\/g, '/') : 'images/placeholder.png';
                
                // Безопасное формирование строки с деталями
                const details = [
                    item.ProductSeries ? `Серия: ${escapeHTML(item.ProductSeries)}` : '',
                    item.RalColor ? `RAL: ${escapeHTML(item.RalColor)}` : '',
                    item.Volume ? `Объем: ${escapeHTML(item.Volume)} л` : ''
                ].filter(Boolean).join(' | ');

                // Экранирование для атрибутов и контента
                const safeImageSrc = escapeAttribute(`/${imagePath}`);
                const safeProductNameAttr = escapeAttribute(item.ProductName);
                const safeProductNameHTML = escapeHTML(item.ProductName);

                return `
                <div class="cart-item" data-product-id="${item.ProductID}">
                    <div class="cart-item-img-wrapper">
                        <img src="${safeImageSrc}" alt="${safeProductNameAttr}">
                    </div>
                    <div class="cart-item-info">
                        <div class="product-name">${safeProductNameHTML}</div>
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
    const cartButton = document.querySelector('.cart_button');
    if (cartButton) {
        cartButton.addEventListener('click', () => window.CartManager.toggleModal(true));
    }
    document.getElementById('closeCartBtn')?.addEventListener('click', () => window.CartManager.toggleModal(false));
    document.getElementById('continueShoppingBtn')?.addEventListener('click', () => window.CartManager.toggleModal(false));
    document.getElementById('cartModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'cartModal') window.CartManager.toggleModal(false);
    });
    
    document.getElementById('cartModalBody')?.addEventListener('click', async (e) => {
        const target = e.target;
        const itemEl = target.closest('.cart-item');
        if (!itemEl) return;
        
        const productId = itemEl.dataset.productId;
        if (!productId) return;

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
                
                itemEl.remove();
                window.CartManager.recalculateTotal();
                if (typeof showCustomAlert === 'function') {
                    showCustomAlert('Товар удален из корзины.', 'info');
                } else {
                    alert('Товар удален из корзины.');
                }

            } catch (err) {
                console.error(err);
                if (typeof showCustomAlert === 'function') {
                    showCustomAlert(escapeHTML('Ошибка: ' + err.message), 'error');
                }
            }
            return;
        }
        
        if (target.classList.contains('quantity-btn')) {
            const quantityInput = itemEl.querySelector('.quantity-input');
            let currentQuantity = parseInt(quantityInput.value, 10);
            
            if (target.classList.contains('increase-qty')) currentQuantity++;
            else if (target.classList.contains('decrease-qty')) currentQuantity--;

            quantityInput.value = currentQuantity;

            if (currentQuantity <= 0) {
                itemEl.querySelector('.cart-item-remove').click();
                return;
            }

            try {
                const response = await fetch('/api/cart/update', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
                    body: JSON.stringify({ productId: productId, quantity: currentQuantity })
                });
                if (!response.ok) throw new Error('Ошибка обновления количества');

                window.CartManager.recalculateTotal();
                window.CartManager.updateIconCounterFromDOM();

            } catch (err) {
                console.error(err);
                if (typeof showCustomAlert === 'function') {
                    showCustomAlert(escapeHTML('Ошибка: ' + err.message), 'error');
                }
            }
        }
    });

    window.CartManager.refreshCart();

    document.body.addEventListener('change', async (e) => {
        if (!e.target.classList.contains('favorite-checkbox')) return;
        const checkbox = e.target;
        const productId = parseInt(checkbox.dataset.productId, 10);
        if (isNaN(productId)) return;
        await window.FavoriteManager.toggleFavorite(productId, checkbox);
    });

    window.FavoriteManager.syncFavoriteStatus();
});