// products.js - ОБЪЕДИНЕННАЯ ВЕРСИЯ (Анимации + Логика API)

// Проверяем, что GSAP и ScrollTrigger загружены
if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.error('GSAP or ScrollTrigger is not loaded. Animations will not work.');
} else {
    gsap.registerPlugin(ScrollTrigger);
}

document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3001/api';
    
    // --- Глобальные переменные ---
    let allProducts = []; // Массив для хранения всех загруженных с сервера продуктов
    let filteredProducts = []; // Массив для отфильтрованных продуктов

    // --- Элементы DOM ---
    const productsGrid = document.querySelector('.products-grid');
    const applyFiltersBtn = document.querySelector('.apply-filters-btn');
    const resetFiltersBtn = document.querySelector('.reset-filters');
    const ralInput = document.getElementById('ralInput');

    // ==========================================================
    // --- БЛОК 1: ЗАГРУЗКА И РЕНДЕРИНГ ДАННЫХ ---
    // ==========================================================

    /**
     * Рендерит карточки продуктов в DOM
     * @param {Array} productsToRender - Массив продуктов для отображения
     */
    function renderProducts(productsToRender) {
        if (!productsGrid) return;
        
        if (productsToRender.length === 0) {
            productsGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-muted);">По вашему запросу ничего не найдено. Попробуйте изменить фильтры.</p>';
            return;
        }

        productsGrid.innerHTML = productsToRender.map(product => {
            const imageSrc = product.ImageURL ? `/${product.ImageURL.replace(/\\/g, '/')}` : '/images/placeholder.png';
            const priceText = product.Price > 0 ? `₽ ${product.Price.toFixed(2)}` : 'Цена по запросу';

            return `
            <div class="product-card">
                <div class="card-image">
                    <img src="${imageSrc}" alt="${product.ProductName}">
                </div>
                <div class="card-header">
                    <div class="card-header-info">
                        <span class="card-coating-type">${product.CoatingType || 'Материал'}</span>
                        <span class="card-ral-color">${product.RalColor ? `RAL ${product.RalColor}` : ''}</span>
                    </div>
                </div>
                <div class="card-body">
                    <div class="card-series">${product.ProductSeries || 'Стандартная серия'}</div>
                    <h3 class="card-title">${product.ProductName}</h3>
                    <p class="card-details">
                        Остаток на складе: <strong>${product.StockQuantity || 0} кг</strong>
                    </p>
                    <button class="card-action-button" onclick="window.addToCart(${product.ProductID}, event)">
                        <span>${priceText}</span>
                        <span>В заявку &rarr;</span>
                    </button>
                </div>
            </div>
            `;
        }).join('');
        
        // Переинициализируем анимации для новых карточек
        setupCardAnimations();
    }
    
    /**
     * Асинхронно загружает все продукты с сервера
     */
    async function fetchProducts() {
        if (!productsGrid) return;
        productsGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Загрузка товаров...</p>';
        try {
            const response = await fetch(`${API_URL}/products`);
            if (!response.ok) throw new Error('Ошибка сети при загрузке товаров');
            
            allProducts = await response.json();
            filteredProducts = [...allProducts]; // Изначально показываем все
            
            updateProductView();
            
            // Динамическое заполнение фильтров на основе полученных данных (опционально, но рекомендуется)
            // populateFilters(allProducts); 
            
        } catch (error) {
            console.error(error);
            productsGrid.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: var(--warning);">${error.message}</p>`;
        }
    }

    // ==========================================================
    // --- БЛОК 2: ЛОГИКА ФИЛЬТРАЦИИ И СОРТИРОВКИ ---
    // ==========================================================

    /**
     * Собирает все значения из фильтров и обновляет список продуктов
     */
    function applyFiltersAndSort() {
        let filteredProducts = [...allProducts];

        // Фильтр по виду покрытия
        const coatingCheckboxes = document.querySelectorAll('input[name="coating"]:checked');
        if (coatingCheckboxes.length > 0) {
            // Получаем значения из атрибута value, а не из текста
            const selectedCoatings = Array.from(coatingCheckboxes).map(cb => cb.value); 
            // Пример: ['polyester', 'polyurethane']

            filteredProducts = filteredProducts.filter(p => {
                // Упрощенная проверка, ищет совпадение по части строки
                const productCoating = p.CoatingType.toLowerCase();
                return selectedCoatings.some(selected => productCoating.includes(selected));
            });
        }
        
        // Фильтр по RAL
        const ralInput = document.getElementById('ralInput');
        if (ralInput.value.trim() !== '') {
            filteredProducts = filteredProducts.filter(p => p.RalColor && p.RalColor.includes(ralInput.value.trim()));
        }
        
        currentPage = 1;
        updateProductView();
    }
    
    // Обработчик для кнопки "Применить"
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFiltersAndSort);
    }
    
    // Обработчик для кнопки "Сбросить"
    if(resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            document.querySelectorAll('.products-filters input[type="checkbox"]').forEach(cb => cb.checked = false);
            document.querySelectorAll('.products-filters input[type="text"], .products-filters input[type="number"]').forEach(input => input.value = '');
            filteredProducts = [...allProducts];
            updateProductView();
            gsap.from('.sidebar-filters', { scale: 0.98, duration: 0.3, ease: 'back.out(2)' });
        });
    }

    // Обработчик для "чипов" RAL
    window.selectRAL = function(ral) {
        if (ralInput) {
            ralInput.value = ral;
            applyFiltersAndSort();
        }
    }


    // ==========================================================
    // --- БЛОК 2.5: ЛОГИКА ПАГИНАЦИИ ---
    // ==========================================================
    const paginationContainer = document.querySelector('.pagination');
    let currentPage = 1;
    const ITEMS_PER_PAGE = 30; // Устанавливаем количество товаров на странице

    /**
     * Генерирует и отображает пагинацию
     * @param {number} totalItems - Общее количество отфильтрованных товаров
     * @param {number} itemsPerPage - Товаров на странице
     * @param {number} currentPage - Текущая страница
     */
    function renderPagination(totalItems, itemsPerPage, currentPage) {
        if (!paginationContainer) return;
        
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (totalPages <= 1) {
            paginationContainer.innerHTML = ''; // Скрываем пагинацию, если страница одна
            return;
        }

        let paginationHTML = '<ul class="pagination__list" role="list">';
        
        // Кнопка "Назад"
        paginationHTML += `
            <li class="pagination__item">
                <a href="#" aria-label="Previous" class="pagination__link pagination__link--arrow ${currentPage === 1 ? 'pagination__link--disabled' : ''}" data-page="${currentPage - 1}">
                    <svg width="8" height="12" viewBox="0 0 8 12"><path d="M7 11L2 6L7 1" stroke="currentColor" stroke-width="1.5"/></svg>
                </a>
            </li>`;

        // Генерируем номера страниц
        // ... (здесь можно добавить сложную логику с многоточиями, пока сделаем просто)
        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `
                <li class="pagination__item">
                    <a href="#" aria-label="Page ${i}" class="pagination__link ${i === currentPage ? 'pagination__link--current' : ''}" data-page="${i}">${i}</a>
                </li>`;
        }

        // Кнопка "Вперед"
        paginationHTML += `
            <li class="pagination__item">
                <a href="#" aria-label="Next" class="pagination__link pagination__link--arrow ${currentPage === totalPages ? 'pagination__link--disabled' : ''}" data-page="${currentPage + 1}">
                    <svg width="8" height="12" viewBox="0 0 8 12"><path d="M1 1L6 6L1 11" stroke="currentColor" stroke-width="1.5"/></svg>
                </a>
            </li>`;

        paginationHTML += '</ul>';
        paginationContainer.innerHTML = paginationHTML;

        const activeLink = paginationContainer.querySelector('.pagination__link--current');
        if (activeLink) {
            const offsetLeft = activeLink.parentElement.offsetLeft;
            paginationContainer.querySelector('.pagination__list').style.setProperty('--indicator-left', `${offsetLeft}px`);
        }
    }

    // Обработчик кликов по пагинации
    paginationContainer.addEventListener('click', (e) => {
    e.preventDefault();
    const link = e.target.closest('.pagination__link');
    if (!link || link.classList.contains('pagination__link--disabled')) return;
    
    const page = parseInt(link.dataset.page, 10);
    if (page && page !== currentPage) {
        currentPage = page;
        
        // --- ДОБАВЛЕНО: Плавный скролл к началу секции ---
        const productsSection = document.querySelector('.products-section');
        if (productsSection) {
            productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        // Небольшая задержка перед обновлением, чтобы скролл успел начаться
        setTimeout(() => {
            updateProductView();
        }, 300); // 300 миллисекунд
    }
    });

    function updateProductView() {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        
        // Берем только нужный "срез" отфильтрованных товаров
        const paginatedItems = filteredProducts.slice(startIndex, endIndex);
        
        renderProducts(paginatedItems);  // Рендерим только товары для текущей страницы
        renderPagination(filteredProducts.length, ITEMS_PER_PAGE, currentPage); // Обновляем пагинацию
    }


    // ==========================================================
    // --- БЛОК 3: АНИМАЦИИ И UI-ЭФФЕКТЫ ---
    // ==========================================================

    // Анимация шапки
    gsap.from('.center-menu, .cart', { y: -50, opacity: 0, duration: 0.8, delay: 0.1, ease: 'power3.out' });
    // Анимация фильтров
    gsap.from('.products-filters', { x: -50, opacity: 0, duration: 0.8, delay: 0.3, ease: 'power3.out' });
    
    // Раскрытие/сворачивание групп фильтров
    window.toggleFilter = function(element) {
        const content = element.nextElementSibling;
        const isActive = element.classList.contains('active');

        // Закрываем все другие открытые фильтры
        document.querySelectorAll('.filter-title.active').forEach(activeTitle => {
            if (activeTitle !== element) {
                activeTitle.classList.remove('active');
                gsap.to(activeTitle.nextElementSibling, { height: 0, duration: 0.3, ease: 'power2.in' });
            }
        });
        
        // Открываем или закрываем текущий
        if (!isActive) {
            element.classList.add('active');
            gsap.to(content, { height: 'auto', duration: 0.4, ease: 'power2.out' });
        } else {
            element.classList.remove('active');
            gsap.to(content, { height: 0, duration: 0.3, ease: 'power2.in' });
        }
    }

    function initializeFilters() {
        const allFilters = document.querySelectorAll('.filter-group');
        allFilters.forEach((filter, index) => {
            const title = filter.querySelector('.filter-title');
            const content = filter.querySelector('.filter-content');

            // Открываем только первый фильтр по умолчанию
            if (index === 0) {
                title.classList.add('active');
                gsap.set(content, { height: 'auto' }); // Устанавливаем высоту без анимации
            } else {
                title.classList.remove('active');
                gsap.set(content, { height: 0 }); // Сворачиваем остальные
            }
        });
    }
    
    /**
     * Настраивает анимации для карточек продуктов (появление, наведение, клики)
     */
    function setupCardAnimations() {
        // Анимация появления карточек при скролле
        gsap.utils.toArray('.product-card').forEach(card => {
            gsap.fromTo(card, 
                { y: 30, opacity: 0 }, 
                {
                    y: 0, 
                    opacity: 1, 
                    duration: 0.6,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: card,
                        start: 'top 95%',
                        toggleActions: 'play none none none'
                    }
                }
            );
        });

        // Анимация наведения
        document.querySelectorAll('.product-card').forEach(card => {
            const image = card.querySelector('.product-image img');
            card.addEventListener('mouseenter', () => gsap.to(image, { scale: 1.05, duration: 0.3, ease: 'power2.out' }));
            card.addEventListener('mouseleave', () => gsap.to(image, { scale: 1, duration: 0.3, ease: 'power2.out' }));
        });

        // Анимация кнопок
        document.querySelectorAll('.btn-add, .btn-buy').forEach(btn => {
            btn.addEventListener('click', function(e) {
                gsap.to(this, { scale: 0.95, duration: 0.1, yoyo: true, repeat: 1, ease: 'power2.inOut' });
            });
        });
    }

    // ==========================================================
    // --- ИНИЦИАЛИЗАЦИЯ СТРАНИЦЫ ---
    // ==========================================================
    initializeFilters();
    fetchProducts();
});
