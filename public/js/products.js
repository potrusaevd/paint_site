document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000/api';
    
    // --- Элементы DOM ---
    const pageTitle = document.getElementById('pageTitle');
    const productsGrid = document.getElementById('productsGrid');
    const brandsFilterContainer = document.getElementById('brandsFilterContainer');
    const sortSelect = document.getElementById('sortSelect');
    const productCountEl = document.getElementById('productCount');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    
    // Находим главный контейнер макета
    const productsLayout = document.querySelector('.products-layout');

    let rawProductList = [];

    // --- Функция для отрисовки товаров ---
    function renderProducts(products) {
        if (!productsGrid) return;
        
        if (productCountEl) {
            productCountEl.textContent = `Найдено: ${products.length} шт.`;
        }

        if (products.length === 0) {
            const params = new URLSearchParams(window.location.search);
            productsGrid.innerHTML = params.has('search')
                ? "<p>По вашему запросу ничего не найдено. Попробуйте изменить поисковую фразу.</p>"
                : "<p>Товары не найдены. Попробуйте изменить фильтры.</p>";
            return;
        }
        
        productsGrid.innerHTML = products.map(p => {
            const imageSrc = p.ImageURL ? `/${p.ImageURL.replace(/\\/g, '/')}` : '/images/placeholder.png';
            return `
            <div class="unified-product-card" data-product-id="${p.ProductID}">
                <div class="product-img">
                    <a href="#"><img src="${imageSrc}" alt="${p.ProductName}" onerror="this.onerror=null;this.src='/images/placeholder.png';"></a>
                </div>
                <div class="product-list">
                    <h3><a href="#">${p.ProductName}</a></h3>
                    <div class="price-container">
                        ${p.DiscountPrice ? `<span class="old-price">₽ ${p.Price.toFixed(2)}</span>` : ''}
                        <span class="price">₽ ${(p.DiscountPrice || p.Price).toFixed(2)}</span>
                    </div>
                    <div class="actions">
                        <div class="add-to-cart">
                            <a href="#" class="cart-button" onclick="addToCart(${p.ProductID}, event)">В корзину</a>
                        </div>
                        <div class="add-to-links">
                            <div class="favorite-toggle">
                                <input type="checkbox" id="fav-catalog-${p.ProductID}" class="favorite-checkbox" data-product-id="${p.ProductID}">
                                <label for="fav-catalog-${p.ProductID}" class="wishlist-label" title="В избранное">♥</label>
                            </div>
                            <a href="#" class="compare" title="Сравнить">⇄</a>
                        </div>
                    </div>
                </div>
            </div>
            `;
        }).join('');
        
        if (window.FavoriteManager) {
            window.FavoriteManager.syncFavoriteStatus();
        }
    }

    // --- Функция отрисовки фильтров ---
    function renderFilters(products) {
        if (!brandsFilterContainer) return;
        const brands = [...new Set(products.map(p => p.Brand).filter(b => b))];
        brandsFilterContainer.innerHTML = brands.map(brand => `
            <label>${brand} <input type="checkbox" value="${brand}"><span class="checkmark"></span></label>
        `).join('');
    }

    // --- Универсальная функция фильтрации и сортировки ---
    function applyFiltersAndSort() {
        let processedProducts = [...rawProductList];
        
        if (brandsFilterContainer && brandsFilterContainer.offsetParent !== null) {
            const selectedBrands = Array.from(brandsFilterContainer.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
            if (selectedBrands.length > 0) {
                processedProducts = processedProducts.filter(p => selectedBrands.includes(p.Brand));
            }
        }
        
        const priceFromInput = document.getElementById('priceFrom');
        if (priceFromInput && priceFromInput.offsetParent !== null) {
            const priceFrom = parseFloat(priceFromInput.value);
            if (!isNaN(priceFrom)) {
                processedProducts = processedProducts.filter(p => p.Price >= priceFrom);
            }
            const priceTo = parseFloat(document.getElementById('priceTo').value);
            if (!isNaN(priceTo)) {
                processedProducts = processedProducts.filter(p => p.Price <= priceTo);
            }
        }
        
        if (sortSelect) {
            const [sortBy, order] = sortSelect.value.split('_');
            processedProducts.sort((a, b) => {
                const aVal = a[sortBy];
                const bVal = b[sortBy];
                if (sortBy === 'Price' || sortBy === 'Rating') {
                    return order === 'ASC' ? (aVal - bVal) : (bVal - aVal);
                }
                if (aVal < bVal) return order === 'ASC' ? -1 : 1;
                if (aVal > bVal) return order === 'ASC' ? 1 : -1;
                return 0;
            });
        }

        renderProducts(processedProducts);
    }

    // --- РЕЖИМ ПОИСКА ---
    async function runSearchMode(query) {
        if (pageTitle) pageTitle.textContent = `Результаты поиска: "${query}"`;
        
        if (productsLayout) productsLayout.classList.add('search-mode');

        if (productsGrid) productsGrid.innerHTML = '<div class="filter-loader"></div>';
        try {
            const response = await fetch(`${API_URL}/search?query=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Ошибка поиска');
            rawProductList = await response.json();
            
            // В режиме поиска сортировка применяется сразу после получения данных
            applyFiltersAndSort();
        } catch (error) {
            console.error("Ошибка при поиске:", error);
            if (productsGrid) productsGrid.innerHTML = "<p>Не удалось выполнить поиск.</p>";
        }
    }

    // --- РЕЖИМ КАТАЛОГА ---
    async function runCatalogMode(params) {
        if (productsLayout) productsLayout.classList.remove('search-mode');

        const category = params.get('category');
        const subcategory = params.get('subcategory');

        if (!category && !subcategory) {
            if (pageTitle) pageTitle.textContent = "Каталог";
            if (productsGrid) productsGrid.innerHTML = "<p>Выберите категорию для просмотра товаров.</p>";
            return;
        }

        const queryUrl = new URLSearchParams();
        if (category) queryUrl.append('category', category);
        if (subcategory) queryUrl.append('subcategory', subcategory);

        if (productsGrid) productsGrid.innerHTML = '<div class="filter-loader"></div>';
        try {
            const response = await fetch(`${API_URL}/products?${queryUrl.toString()}`);
            if (!response.ok) throw new Error('Ошибка сети');
            rawProductList = await response.json();
            
            const titleText = (subcategory || category || "").replace(/-/g, ' ');
            if (pageTitle) pageTitle.textContent = titleText.charAt(0).toUpperCase() + titleText.slice(1);
            
            renderFilters(rawProductList);
            applyFiltersAndSort();
        } catch (error) {
            console.error("Ошибка загрузки товаров:", error);
            if (productsGrid) productsGrid.innerHTML = "<p>Не удалось загрузить товары.</p>";
        }
    }
    
    // --- ОСНОВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ ---
    async function initPage() {
        const params = new URLSearchParams(window.location.search);
        const searchQuery = params.get('search');
        if (searchQuery) {
            await runSearchMode(searchQuery);
        } else {
            await runCatalogMode(params);
        }
    }

    // --- Навешиваем обработчики событий ---
    if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyFiltersAndSort);
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            if (brandsFilterContainer) {
                brandsFilterContainer.querySelectorAll('input').forEach(cb => cb.checked = false);
            }
            const priceFrom = document.getElementById('priceFrom');
            if (priceFrom) priceFrom.value = '';
            const priceTo = document.getElementById('priceTo');
            if (priceTo) priceTo.value = '';
            applyFiltersAndSort();
        });
    }
    if (sortSelect) sortSelect.addEventListener('change', applyFiltersAndSort);

    // --- Запускаем инициализацию ---
    initPage();
});