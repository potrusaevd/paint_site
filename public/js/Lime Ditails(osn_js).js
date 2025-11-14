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
            showCustomAlert('Ошибка: ' + error.message);
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
            showCustomAlert('Товар добавлен в корзину!');
        }
    } catch(err) { console.error(err); }
};




// ==========================================================
// --- ОСНОВНОЙ СКРИПТ, ВЫПОЛНЯЕМЫЙ ПОСЛЕ ЗАГРУЗКИ DOM ---
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {

        // Обработчик для кнопки "Оформить заказ"
    document.querySelector('.btn-checkout')?.addEventListener('click', () => {
        // Проверяем, есть ли товары в корзине
        const totalSumText = document.getElementById('cartTotalSum')?.textContent || '0';
        const totalSum = parseFloat(totalSumText.replace('₽', ''));
        
        if (totalSum > 0) {
            window.location.href = '/checkout';
        } else {
            showCustomAlert('Ваша корзина пуста. Добавьте товары, чтобы оформить заказ.');
        }
    });


document.getElementById("closePrivacyBtn").addEventListener("click", () => {
  document.getElementById("privacyModal").style.display = "none";
});

// ==========================================================
// --- ЛОГИКА ПОИСКА ---
// ==========================================================
(function() {
    const searchToggleBtn = document.getElementById('searchToggle');
    const searchCloseBtn = document.getElementById('searchClose');
    const headerWrapper = document.querySelector('.header__wrapper');
    const searchInput = document.querySelector('.search-expanded__input');

    if (!searchToggleBtn || !searchCloseBtn || !headerWrapper || !searchInput) return;

    function performSearch(query) {
        if (query && query.trim().length > 0) {
            window.location.href = `/products?search=${encodeURIComponent(query.trim())}`;
        }
    }

    // Открытие поиска
    searchToggleBtn.addEventListener('click', () => {
        headerWrapper.classList.add('search-active');
        searchInput.setAttribute('aria-hidden', 'false');
        searchInput.focus();
    });

    // Крестик — только закрытие
    searchCloseBtn.addEventListener('click', () => {
        headerWrapper.classList.remove('search-active');
        searchInput.value = '';
        searchInput.setAttribute('aria-hidden', 'true');
        searchToggleBtn.focus();
    });

    // Enter в поле поиска
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch(searchInput.value);
        }
    });
})();


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
                modalBody.innerHTML = '<p class="cart-empty-message">В корзине пока пусто.</p>';
                totalSumEl.textContent = '0 ₽';
                return;
            }

            let totalSum = 0;
            modalBody.innerHTML = items.map(item => {
                const price = item.DiscountPrice || item.Price;
                totalSum += price * item.Quantity;
                const imageSrc = item.ImageURL ? `/${item.ImageURL.replace(/\\/g, '/')}` : '/images/placeholder.png';
                return `
                <div class="cart-item" data-product-id="${item.ProductID}">
                    <img src="${imageSrc}" alt="${item.ProductName}" class="cart-item-img">
                    <div class="cart-item-info">
                        <h4>${item.ProductName}</h4>
                        <span class="price">${price.toFixed(2)} ₽</span>
                        <div class="quantity-control">
                            <button class="quantity-btn decrease-qty">-</button>
                            <input type="number" class="quantity-input" value="${item.Quantity}" min="1">
                            <button class="quantity-btn increase-qty">+</button>
                        </div>
                    </div>
                    <button class="cart-item-remove">Удалить</button>
                </div>
                `;
            }).join('');
            totalSumEl.textContent = `${totalSum.toFixed(2)} ₽`;
        },

        // Показать/скрыть модальное окно
        toggleModal(show) {
            const modal = document.getElementById('cartModal');
            if(modal) modal.style.display = show ? 'flex' : 'none';
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
    document.getElementById('cartIconBtn')?.addEventListener('click', () => window.CartManager.toggleModal(true));
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

    // --- ЕДИНЫЙ ОБРАБОТЧИК ДЛЯ ВСЕХ ЧЕКБОКСОВ ИЗБРАННОГО ---
    document.body.addEventListener('change', async (e) => {
        if (!e.target.classList.contains('favorite-checkbox')) return;
        const checkbox = e.target;
        const productId = parseInt(checkbox.dataset.productId, 10);
        if (isNaN(productId)) return;
        await window.FavoriteManager.toggleFavorite(productId, checkbox);
    });

    // --- Поиск, Меню, Карусель (остаются здесь) ---
    const searchToggleBtn = document.getElementById('searchToggle');
    const searchCloseBtn = document.getElementById('searchClose');
    const headerWrapper = document.querySelector('.header__wrapper');
    const searchInput = document.querySelector('.search-expanded__input');

    if (searchToggleBtn && searchCloseBtn && headerWrapper && searchInput) {
        searchToggleBtn.addEventListener('click', () => {
            headerWrapper.classList.add('search-active');
            searchInput.setAttribute('aria-hidden', 'false');
            searchInput.focus();
        });
        searchCloseBtn.addEventListener('click', () => {
            headerWrapper.classList.remove('search-active');
            searchInput.value = '';
            searchInput.setAttribute('aria-hidden', 'true');
            searchToggleBtn.focus();
        });
    }
    const submenuLinks = document.querySelectorAll(".dropdown-content .has-submenu");
    submenuLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            const hasSubmenu = link.nextElementSibling && link.nextElementSibling.classList.contains('submenu');
            if (hasSubmenu) {
                e.preventDefault(); 
                const parentLi = link.parentElement;
                submenuLinks.forEach(otherLink => {
                    if (otherLink !== link) {
                        otherLink.parentElement.classList.remove("open");
                    }
                });
                parentLi.classList.toggle("open");
            }
        });
    });

    const catalogDropdown = document.querySelector('.dropdown');
    if (catalogDropdown) {
        catalogDropdown.addEventListener('mouseleave', () => {
            submenuLinks.forEach(link => {
                link.parentElement.classList.remove("open");
            });
        });
    }

    function initializeCarousel() {
        const track = document.querySelector('.promo-carousel__track');
        const prevBtn = document.querySelector('.promo-carousel__btn--prev');
        const nextBtn = document.querySelector('.promo-carousel__btn--next');
        const items = track ? Array.from(track.children) : [];

        if (!track || !prevBtn || !nextBtn || items.length === 0) return;

        let currentIndex = 0;
        const updateCarousel = () => {
            if (!items[0]) return;
            const itemWidth = items[0].offsetWidth;
            const gap = parseFloat(getComputedStyle(track).gap) || 24;
            const totalItemWidth = itemWidth + gap;
            track.style.transform = `translateX(-${currentIndex * totalItemWidth}px)`;
        };

        nextBtn.addEventListener('click', () => {
            if (!items[0]) return;
            const visibleItems = Math.floor(track.parentElement.offsetWidth / (items[0].offsetWidth + parseFloat(getComputedStyle(track).gap)));
            if (currentIndex < items.length - visibleItems) {
                currentIndex++;
                updateCarousel();
            }
        });
        prevBtn.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                updateCarousel();
            }
        });
        window.addEventListener('resize', () => {
            currentIndex = 0; 
            updateCarousel();
        });
        updateCarousel();
    }
    
    async function renderPromoCarousel() {
        const track = document.querySelector('.promo-carousel__track');
        if (!track) return;

        try {
            const response = await fetch('/api/products/promo');
            if (!response.ok) throw new Error('Network response was not ok');
            const products = await response.json();

            track.innerHTML = products.map(product => {
                const imageSrc = product.ImageURL ? `/${product.ImageURL.replace(/\\/g, '/')}` : '/images/placeholder.png';
                return `
                <li class="promo-carousel__item">
                    <div class="unified-product-card" data-product-id="${product.ProductID}">
                        <div class="product-img">
                            <a href="#"><img src="${imageSrc}" alt="${product.ProductName}"></a>
                        </div>
                        <div class="product-list">
                            <h3><a href="#">${product.ProductName}</a></h3>
                            <div class="price-container">
                                <span class="old-price">₽ ${product.Price.toFixed(2)}</span>
                                <span class="price">₽ ${product.DiscountPrice.toFixed(2)}</span>
                            </div>
                            <div class="actions">
                                <div class="add-to-cart">
                                    <a href="#" class="cart-button" onclick="addToCart(${product.ProductID}, event)">В корзину</a>
                                </div>
                                <div class="add-to-links">
                                    <div class="favorite-toggle">
                                        <input type="checkbox" id="fav-carousel-${product.ProductID}" class="favorite-checkbox" data-product-id="${product.ProductID}">
                                        <label for="fav-carousel-${product.ProductID}" class="wishlist-label" title="В избранное">♥</label>
                                    </div>
                                    <a href="#" class="compare" title="Сравнить">⇄</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </li>
                `;
            }).join('') + `
            <li class="promo-carousel__item">
                <a href="/products?category=all" class="unified-product-card view-all-card">
                    <span>Смотреть<br>все акции →</span>
                </a>
            </li>
            `;

            initializeCarousel();
            await window.FavoriteManager.syncFavoriteStatus();

        } catch (error) {
            console.error('Не удалось загрузить промо-товары:', error);
            track.innerHTML = '<li><p>Не удалось загрузить акции.</p></li>';
        }
    }
    
    if (document.querySelector('.promo-carousel')) {
        renderPromoCarousel();
    }

    // --- ПЕРВИЧНАЯ СИНХРОНИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ---
    window.FavoriteManager.syncFavoriteStatus();
});