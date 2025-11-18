document.addEventListener('DOMContentLoaded', () => {

    // --- Элементы DOM для шапки ---
    const centerMenu = document.querySelector('.center-menu');
    const searchBtn = document.querySelector('.search-btn');
    const catalogBtn = document.querySelector('.catalog-btn');
    const aboutBtn = document.querySelector('.about-btn');
    const cabinetBtn = document.querySelector('.cabinet-btn');
    const cartBtn = document.querySelector('.cart_button');
    const leftMenu = document.querySelector('.left-menu');
    const menuBtn = document.querySelector('.menu-btn');

    // ===================================
    // --- ЛОГИКА ПОИСКА ---
    // ===================================
    if (searchBtn && centerMenu) {
        let searchInputEl = null;

        const openSearch = () => {
            if (centerMenu.classList.contains('search-mode')) return;
            centerMenu.classList.add('search-mode');
            centerMenu.querySelectorAll('.center-menu-btn:not(.search-btn)').forEach(btn => btn.style.display = 'none');
            
            searchInputEl = document.createElement('input');
            searchInputEl.className = 'search-input-inline';
            searchInputEl.placeholder = 'Поиск по каталогу...';
            
            const closeBtn = document.createElement('button');
            closeBtn.className = 'search-close-btn';
            closeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
            
            searchBtn.after(searchInputEl);
            searchInputEl.after(closeBtn);
            searchInputEl.focus();

            closeBtn.addEventListener('click', closeSearch);
            searchInputEl.addEventListener('keydown', handleSearchInput);
            
            setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
        };

        const closeSearch = () => {
            if (!centerMenu.classList.contains('search-mode')) return;
            centerMenu.classList.remove('search-mode');
            centerMenu.querySelectorAll('.center-menu-btn:not(.search-btn)').forEach(btn => btn.style.display = 'flex');
            centerMenu.querySelector('.search-input-inline')?.remove();
            centerMenu.querySelector('.search-close-btn')?.remove();
            searchInputEl = null;
            document.removeEventListener('click', handleClickOutside);
        };

        const handleSearchInput = (e) => {
            if (e.key === 'Enter' && searchInputEl.value.trim()) {
                window.location.href = `/products?search=${encodeURIComponent(searchInputEl.value.trim())}`;
            }
        };

        const handleClickOutside = (e) => {
            if (centerMenu && !centerMenu.contains(e.target)) {
                closeSearch();
            }
        };

        searchBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!centerMenu.classList.contains('search-mode')) openSearch();
        });

        centerMenu.addEventListener('click', (e) => e.stopPropagation());
    }

    // ===================================
    // --- НАВИГАЦИЯ ЦЕНТРАЛЬНОГО МЕНЮ ---
    // ===================================
    if (catalogBtn) {
        catalogBtn.addEventListener('click', () => {
            // Если мы уже в каталоге, ничего не делаем
            if (window.location.pathname.startsWith('/products')) return;
            window.location.href = '/products';
        });
    }

    if (aboutBtn) { 
        aboutBtn.addEventListener('click', () => {
            if (window.location.pathname === '/') {
                if (window.goToPanel) {
                    window.goToPanel(5); 
                } else {
                    window.location.hash = "contacts";
                }
            } else {
                window.location.href = '/#contacts';
            }
        });
    }

    if (cabinetBtn) {
        cabinetBtn.addEventListener('click', () => {
            if (localStorage.getItem('accessToken')) {
                window.location.href = '/profile';
            } else {
                window.location.href = '/auth';
            }
        });
    }

    // ===================================
    // --- ЛОГИКА КОРЗИНЫ ---
    // ===================================
    if (cartBtn && window.CartManager) {
        cartBtn.addEventListener('click', () => {
            window.CartManager.toggleModal(true);
        });
    }

    // ===================================
    // --- ЛОГИКА ЛЕВОГО МЕНЮ (ТОЛЬКО ОТКРЫТИЕ/ЗАКРЫТИЕ) ---
    // ===================================
    if (menuBtn && leftMenu) {
        const sectionNavItems = document.querySelectorAll('.section-nav-item');
        let menuExpanded = false;

        const animateMenuItems = (show) => {
            sectionNavItems.forEach((item, index) => {
                if (show) {
                    setTimeout(() => item.classList.add('animate-in'), 50 + index * 30);
                } else {
                    item.classList.remove('animate-in');
                }
            });
        };

        menuBtn.addEventListener('click', () => {
            menuExpanded = !menuExpanded;
            leftMenu.classList.toggle('expanded');
            document.body.classList.toggle('menu-expanded');
            
            if (menuExpanded) {
                setTimeout(() => animateMenuItems(true), 150);
            } else {
                animateMenuItems(false);
            }
        });
    }

});
