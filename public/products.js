// products.js - ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ

if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.error('GSAP or ScrollTrigger is not loaded. Animations will not work.');
} else {
    gsap.registerPlugin(ScrollTrigger);
}

document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'https://paint-site-vty0.onrender.com/api';
    
    // Мобильный toggle для фильтров
    const filtersContainer = document.querySelector('.products-filters');
    if (filtersContainer) {
        const toggleBtn = document.createElement('button');
        toggleBtn.innerHTML = 'Фильтры и поиск <span style="font-size: 12px">▼</span>';
        toggleBtn.className = 'mobile-filter-toggle btn';
        toggleBtn.style.cssText = `
            width: 100%;
            margin-bottom: 15px;
            background: var(--bg-surface);
            border: 1px solid var(--primary);
            color: var(--primary);
            padding: 12px;
            display: none; 
            align-items: center;
            justify-content: center;
            gap: 10px;
            font-weight: 600;
        `;
        
        filtersContainer.parentNode.insertBefore(toggleBtn, filtersContainer);

        const checkMobile = () => {
            if (window.innerWidth <= 1024) {
                toggleBtn.style.display = 'flex';
                if (!filtersContainer.classList.contains('open')) {
                    filtersContainer.style.display = 'none';
                }
            } else {
                toggleBtn.style.display = 'none';
                filtersContainer.style.display = 'block';
            }
        };

        toggleBtn.addEventListener('click', () => {
            const isOpen = filtersContainer.style.display === 'block';
            filtersContainer.style.display = isOpen ? 'none' : 'block';
            filtersContainer.classList.toggle('open');
            toggleBtn.innerHTML = isOpen 
                ? 'Фильтры и поиск <span style="font-size: 12px">▼</span>' 
                : 'Скрыть фильтры <span style="font-size: 12px">▲</span>';
        });

        window.addEventListener('resize', checkMobile);
        checkMobile();
    }

    // Глобальные переменные
    let filteredProducts = [];
    let currentPage = 1;
    const ITEMS_PER_PAGE = 30;

    // Элементы DOM
    const productsGrid = document.querySelector('.products-grid');
    const applyFiltersBtn = document.querySelector('.apply-filters-btn');
    const resetFiltersBtn = document.querySelector('.reset-filters');
    const ralInput = document.getElementById('ralInput');
    const paginationContainer = document.querySelector('.pagination');
    const detailsModal = document.getElementById('productDetailsModal');
    const detailsContent = detailsModal ? detailsModal.querySelector('.product-details-modal') : null;

    // ===================================
    // ФУНКЦИИ ЗАГРУЗКИ И ФИЛЬТРАЦИИ
    // ===================================

    async function loadFilterOptions() {
        const coatingContainer = document.getElementById('coating-filter-container');
        const ralContainer = document.getElementById('ral-chips-container');

        try {
            const response = await fetch(`${API_URL}/filters/options`);
            if (!response.ok) throw new Error('Ошибка загрузки фильтров');
            
            const data = await response.json();
            
            // Виды покрытий
            if (coatingContainer) {
                if (data.coatingTypes && data.coatingTypes.length > 0) {
                    coatingContainer.innerHTML = data.coatingTypes.map(coating => `
                        <label class="checkbox-label">
                            <label class="checkbox">
                                <input type="checkbox" name="coating" value="${coating}" />
                                <svg viewBox="0 0 24 24" filter="url(#goo-light)"><path class="tick" d="M4.5 10L10.5 16L24.5 1" /></svg>
                            </label>
                            <span>${coating}</span>
                        </label>
                    `).join('');
                } else {
                    coatingContainer.innerHTML = '<p>Нет опций.</p>';
                }
            }

            // RAL чипы
            if (ralContainer) {
                if (data.ralColors && data.ralColors.length > 0) {
                    ralContainer.innerHTML = data.ralColors.map(ral => `
                        <span class="ral-chip" onclick="selectRAL('${ral}')">${ral}</span>
                    `).join('');
                }
            }

        } catch (error) {
            console.error(error);
            if (coatingContainer) coatingContainer.innerHTML = '<p style="color: var(--error)">Ошибка.</p>';
            if (ralContainer) ralContainer.innerHTML = '';
        }
    }

    function collectFilters() {
        const filters = {};

        // 1. Наличие на складе
        const availabilityChecked = Array.from(document.querySelectorAll('input[name="availability"]:checked'))
            .map(cb => cb.value);
        
        if (availabilityChecked.length > 0) {
            if (availabilityChecked.includes('free') && availabilityChecked.includes('reserved')) {
                filters.availability = 'all';
            } else if (availabilityChecked.includes('free')) {
                filters.availability = 'free';
            } else if (availabilityChecked.includes('reserved')) {
                filters.availability = 'reserved';
            }
        }

        // 2. Вид покрытия
        const coatingCheckboxes = document.querySelectorAll('#coating-filter-container input[name="coating"]:checked');
        if (coatingCheckboxes.length > 0) {
            filters.coatings = Array.from(coatingCheckboxes).map(cb => cb.value);
        }

        // 3. Цвет RAL
        const ralValue = ralInput?.value.trim();
        if (ralValue) {
            filters.ral = ralValue;
        }

        // 4. Технические параметры
        const params = {};

        const viscosityMin = document.getElementById('viscosityMin')?.value;
        const viscosityMax = document.getElementById('viscosityMax')?.value;
        if (viscosityMin || viscosityMax) {
            params.viscosity = {};
            if (viscosityMin) params.viscosity.min = parseFloat(viscosityMin);
            if (viscosityMax) params.viscosity.max = parseFloat(viscosityMax);
        }

        const glossMin = document.getElementById('glossMin')?.value;
        const glossMax = document.getElementById('glossMax')?.value;
        if (glossMin || glossMax) {
            params.gloss = {};
            if (glossMin) params.gloss.min = parseFloat(glossMin);
            if (glossMax) params.gloss.max = parseFloat(glossMax);
        }

        const deltaEMin = document.getElementById('deltaEMin')?.value;
        const deltaEMax = document.getElementById('deltaEMax')?.value;
        if (deltaEMin || deltaEMax) {
            params.deltaE = {};
            if (deltaEMin) params.deltaE.min = parseFloat(deltaEMin);
            if (deltaEMax) params.deltaE.max = parseFloat(deltaEMax);
        }

        if (Object.keys(params).length > 0) {
            filters.params = params;
        }

        // 5. Остаток на складе
        const stockMin = document.getElementById('stockMin')?.value;
        const stockMax = document.getElementById('stockMax')?.value;
        if (stockMin || stockMax) {
            filters.stock = {};
            if (stockMin) filters.stock.min = parseFloat(stockMin);
            if (stockMax) filters.stock.max = parseFloat(stockMax);
        }

        return filters;
    }

    async function fetchFilteredBatches() {
        if (!productsGrid) return;
        productsGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Поиск партий...</p>';
        const filters = collectFilters();
        
        try {
            const queryParams = new URLSearchParams();
            if (filters.availability) queryParams.append('availability', filters.availability);
            if (filters.coatings) queryParams.append('coatings', JSON.stringify(filters.coatings));
            if (filters.ral) queryParams.append('ral', filters.ral);
            if (filters.params) queryParams.append('params', JSON.stringify(filters.params));
            if (filters.stock) queryParams.append('stock', JSON.stringify(filters.stock));

            const response = await fetch(`${API_URL}/filter-batches?${queryParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
            });
            
            if (response.status === 401 || response.status === 403) {
                window.location.href = '/auth';
                return;
            }
            
            if (!response.ok) throw new Error('Ошибка сети при загрузке партий');
            
            filteredProducts = await response.json();
            currentPage = 1;
            updateProductView();
        } catch (error) {
            console.error('Ошибка фильтрации:', error);
            productsGrid.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: var(--error);">Ошибка загрузки: ${error.message}</p>`;
        }
    }

    // ===================================
    // ФУНКЦИИ РЕНДЕРИНГА
    // ===================================

    function updateProductView() {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const paginatedItems = filteredProducts.slice(startIndex, endIndex);
        
        renderProducts(paginatedItems);
        renderPagination(filteredProducts.length, ITEMS_PER_PAGE, currentPage);
    }

   function renderProducts(productsToRender) {
        if (!productsGrid) return;
        if (productsToRender.length === 0) {
            productsGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">По вашему запросу ничего не найдено.</p>';
            return;
        }

        productsGrid.innerHTML = productsToRender.map(product => {
            const imageSrc = product.ImageURL ? `/${product.ImageURL.replace(/\\/g, '/')}` : '/images/placeholder.png';
            
            const glossValue = product.Gloss60 ? parseFloat(product.Gloss60).toFixed(1) : '–';
            const viscosityValue = product.Viscosity ? parseFloat(product.Viscosity).toFixed(1) : '–';
            const deltaEValue = product.DeltaE ? parseFloat(product.DeltaE).toFixed(2) : '–';

            // --- НОВАЯ ЛОГИКА ЦЕНЫ ---
            const price = parseFloat(product.Price);
            let priceHTML;

            if (price && price > 0) {
                // Форматируем цену (например: 1 200,00 ₽)
                const formattedPrice = new Intl.NumberFormat('ru-RU', { 
                    style: 'currency', 
                    currency: 'RUB',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2 
                }).format(price);

                // Отображаем цену текстом
                priceHTML = `<div class="product-price-val" style="font-weight: 700; font-size: 1.1rem; color: var(--text-main);">${formattedPrice} / кг</div>`;
            } else {
                // Если цены нет, показываем кнопку-заглушку
                priceHTML = `<button class="btn btn-price">Цена по запросу</button>`;
            }
            // --------------------------

            return `
            <div class="product-card" style="cursor: pointer;" data-product-id="${product.ProductID}" data-product-series="${product.ProductSeries}">
                <div class="card-header">
                    <div class="product-title">${product.CoatingType || 'Материал'}</div>
                    <div class="product-ral">${product.RalColor ? `RAL ${product.RalColor}` : ''}</div>
                </div>
                <div class="card-image">
                    <img class="product-image-svg" src="${imageSrc}" alt="${product.ProductName}">
                </div>
                <div class="series-info">
                    <div class="series-label">Серия партии</div>
                    <div class="series-value">${product.ProductSeries || 'Не указана'}</div>
                </div>
                <div class="tech-params">
                    <div class="params-grid">
                        <div class="param-item">
                            <div class="param-label">Блеск при 60°</div>
                            <div class="param-value">${glossValue}</div>
                        </div>
                        <div class="param-item">
                            <div class="param-label">Вязкость</div>
                            <div class="param-value">${viscosityValue}</div>
                        </div>
                        <div class="param-item">
                            <div class="param-label">ΔE</div>
                            <div class="param-value">${deltaEValue}</div>
                        </div>
                        <div class="param-item">
                            <div class="param-label">Остаток</div>
                            <div class="param-value">${product.StockQuantity || 0} <span class="param-unit">кг</span></div>
                        </div>
                    </div>
                </div>
                <div class="card-footer" style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                    ${priceHTML}
                    <button class="btn btn-add" data-product-id="${product.ProductID}">В заявку +</button>
                </div>
            </div>
            `;
        }).join('');
        
        setupCardAnimations();
    }
    
    function renderPagination(totalItems, itemsPerPage, currentPage) {
        if (!paginationContainer) return;
        
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = '<ul class="pagination__list" role="list">';
        
        paginationHTML += `
            <li class="pagination__item">
                <a href="#" aria-label="Previous" class="pagination__link pagination__link--arrow ${currentPage === 1 ? 'pagination__link--disabled' : ''}" data-page="${currentPage - 1}">
                    <svg width="8" height="12" viewBox="0 0 8 12"><path d="M7 11L2 6L7 1" stroke="currentColor" stroke-width="1.5"/></svg>
                </a>
            </li>`;

        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `
                <li class="pagination__item">
                    <a href="#" aria-label="Page ${i}" class="pagination__link ${i === currentPage ? 'pagination__link--current' : ''}" data-page="${i}">${i}</a>
                </li>`;
        }

        paginationHTML += `
            <li class="pagination__item">
                <a href="#" aria-label="Next" class="pagination__link pagination__link--arrow ${currentPage === totalPages ? 'pagination__link--disabled' : ''}" data-page="${currentPage + 1}">
                    <svg width="8" height="12" viewBox="0 0 8 12"><path d="M1 1L6 6L1 11" stroke="currentColor" stroke-width="1.5"/></svg>
                </a>
            </li>`;

        paginationHTML += '</ul>';
        paginationContainer.innerHTML = paginationHTML;
    }

    // ===================================
    // МОДАЛЬНОЕ ОКНО
    // ===================================

    async function openDetailsModal(productSeries) {
        if (!productSeries || !detailsModal || !detailsContent) return;

        detailsModal.classList.add('show');
        detailsContent.innerHTML = `<div class="details-loader"><div class="spinner"></div></div>`;

        try {
            console.log(`Запрос деталей для серии: ${productSeries}`);

            const response = await fetch(`${API_URL}/batch-details/${encodeURIComponent(productSeries)}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Сервер ответил с ошибкой: ${response.status}. ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Данные с сервера успешно получены:', data);
            
            let paramsHTML = '';
            const paramLabels = {
                Gloss60: 'Блеск при 60°', 
                Viscosity: 'Условная вязкость',
                DeltaE: 'ΔE', 
                DeltaL: 'ΔL', 
                DeltaA: 'Δa', 
                DeltaB: 'Δb'
            };

            for (const key in data) {
                if (data[key] !== null && paramLabels[key]) {
                    paramsHTML += `
                        <div class="param-item">
                            <div class="param-label">${paramLabels[key]}</div>
                            <div class="param-value">${parseFloat(data[key]).toFixed(2)}</div>
                        </div>
                    `;
                }
            }
            
            const imageSrc = data.ImageURL ? `/${data.ImageURL.replace(/\\/g, '/')}` : '/images/placeholder.png';

            const finalHTML = `
                <button class="modal-close" onclick="closeDetailsModal()">&times;</button>
                <div class="details-content">
                    <div class="details-image"><img src="${imageSrc}" alt="${data.ProductName}"></div>
                    <div class="details-info">
                        <h2 class="details-title">${data.ProductName}</h2>
                        <p class="details-coating">${data.CoatingType}</p>
                        <div class="series-info" style="text-align: left; padding-left: 0;">
                            <div class="series-label">Серия партии</div>
                            <div class="series-value">${data.ProductSeries}</div>
                        </div>
                        <div class="details-params-grid">${paramsHTML}</div>
                    </div>
                </div>
            `;

            console.log('HTML для модального окна сгенерирован. Вставляем в DOM...');
            detailsContent.innerHTML = finalHTML;
            console.log('HTML успешно вставлен. Модальное окно должно быть видно.');

        } catch (error) {
            console.error('КРИТИЧЕСКАЯ ОШИБКА в openDetailsModal:', error);
            detailsContent.innerHTML = `<button class="modal-close" onclick="closeDetailsModal()">&times;</button><p style="padding: 2rem;">${error.message}</p>`;
        }
    }
    
    window.closeDetailsModal = function() {
        if (detailsModal) {
            detailsModal.classList.remove('show');
        }
    }

    // ===================================
    // ОБРАБОТЧИКИ СОБЫТИЙ
    // ===================================

    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', fetchFilteredBatches);
    }
    
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            document.querySelectorAll('.products-filters input').forEach(input => {
                if(input.type === 'checkbox' || input.type === 'radio') input.checked = false;
                else input.value = '';
            });
            fetchFilteredBatches();
            gsap.from('.sidebar-filters', { scale: 0.98, duration: 0.3, ease: 'back.out(2)' });
        });
    }

    if (paginationContainer) {
        paginationContainer.addEventListener('click', (e) => {
            e.preventDefault();
            const link = e.target.closest('.pagination__link');
            if (!link || link.classList.contains('pagination__link--disabled')) return;
            
            const page = parseInt(link.dataset.page, 10);
            if (page && page !== currentPage) {
                currentPage = page;
                
                const productsSection = document.querySelector('.products-section');
                if (productsSection) {
                    productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                
                setTimeout(() => {
                    updateProductView();
                }, 300);
            }
        });
    }

    window.selectRAL = function(ral) {
        if (ralInput) {
            ralInput.value = ral;
            fetchFilteredBatches();
        }
    }

    if (productsGrid) {
        productsGrid.addEventListener('click', (e) => {
            console.log('--- Клик по сетке товаров (.products-grid) ---');

            const card = e.target.closest('.product-card');
            if (!card) {
                console.log('Клик был вне какой-либо карточки. Выход.');
                return;
            }

            console.log('Клик пришелся на карточку:', card);
            
            const addButton = e.target.closest('.btn-add');
            const priceButton = e.target.closest('.btn-price');
            
            if (addButton) {
                e.stopPropagation();
                console.log('Обнаружен клик по кнопке "В заявку".');
                const productId = addButton.dataset.productId;
                if (window.addToCart && productId) {
                    console.log(`Product ID найден: ${productId}. Вызываем addToCart...`);
                    window.addToCart(productId, e);
                } else {
                    console.error('Не удалось найти data-product-id на родительской карточке!');
                }
                return;
            }

            if (priceButton) {
                e.stopPropagation();
                console.log('Обнаружен клик по кнопке "Цена по запросу".');
                window.showCustomAlert('Менеджер свяжется с вами для уточнения цены.', 'info');
                return; 
            }

            console.log('Клик был по карточке, но не по кнопке. Ищем серию...');
            const series = card.dataset.productSeries;
            
            if (series && series !== 'null' && series !== 'undefined') {
                console.log(`Найдена серия: "${series}". Вызываем openDetailsModal...`);
                openDetailsModal(series);
            } else {
                console.warn('Серия не найдена или не указана. Модальное окно не будет открыто.');
                window.showCustomAlert('Детальная информация для этой партии отсутствует.', 'info');
            }
        });
    }
    
    if(detailsModal) {
        detailsModal.addEventListener('click', (e) => {
            if (e.target === detailsModal) closeDetailsModal();
        });
    }

    // ===================================
    // АНИМАЦИИ
    // ===================================

    window.toggleFilter = function(element) {
        const content = element.nextElementSibling;
        const isActive = element.classList.contains('active');

        document.querySelectorAll('.filter-title.active').forEach(activeTitle => {
            if (activeTitle !== element) {
                activeTitle.classList.remove('active');
                gsap.to(activeTitle.nextElementSibling, { height: 0, duration: 0.3, ease: 'power2.in' });
            }
        });
        
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

            if (index === 0) {
                title.classList.add('active');
                gsap.set(content, { height: 'auto' });
            } else {
                title.classList.remove('active');
                gsap.set(content, { height: 0 });
            }
        });
    }

    function setupCardAnimations() {
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

        document.querySelectorAll('.product-card').forEach(card => {
            const params = card.querySelectorAll('.param-item');
            card.addEventListener('mouseenter', () => {
                gsap.to(params, { 
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    stagger: 0.05 
                });
            });
            card.addEventListener('mouseleave', () => {
                gsap.to(params, { 
                    backgroundColor: 'rgba(0,0,0,0.1)', 
                    stagger: 0.05 
                });
            });
        });
    }

    gsap.from('.products-filters', { x: -50, opacity: 0, duration: 0.8, delay: 0.3, ease: 'power3.out' });

    // ===================================
    // ИНИЦИАЛИЗАЦИЯ
    // ===================================
    
    initializeFilters();
    loadFilterOptions();
    fetchFilteredBatches();
});
