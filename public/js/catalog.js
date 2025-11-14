document.addEventListener('DOMContentLoaded', () => {
    // 1. ЕДИНЫЙ ИСТОЧНИК ДАННЫХ ДЛЯ КАТАЛОГА
    const catalogData = {
        all: {
            title: 'Все каталоги',
            subcategories: [
                { name: 'Общий каталог', link: 'products?category=all' },
                { name: 'Оригинальный каталог', link: 'products?category=original' }
            ]
        },
        oils: {
            title: 'Масла и автохимия',
            subcategories: [
                { name: 'Моторные масла', link: 'products?subcategory=motor-oils' },
                { name: 'Трансмиссионные масла', link: 'products?subcategory=transmission-oils' },
                { name: 'Тормозные жидкости', link: 'products?subcategory=brake-fluids' },
                { name: 'Охлаждающие жидкости', link: 'products?subcategory=coolants' },
                { name: 'Жидкости для омывателя', link: 'products?subcategory=washer-fluids' }
            ]
        },
        tires: {
            title: 'Шины и диски',
            subcategories: [
                { name: 'Летние шины', link: 'products?subcategory=summer-tires' },
                { name: 'Зимние шины', link: 'products?subcategory=winter-tires' },
                { name: 'Шины мотоциклетные', link: 'products?subcategory=moto-tires' },
                { name: 'Литые диски', link: 'products?subcategory=alloy-wheels' },
                { name: 'Штампованные диски', link: 'products?subcategory=stamped-wheels' }
            ]
        },
        electronics: {
            title: 'Автоэлектроника',
            subcategories: [
                { name: 'Лампы', link: 'products?subcategory=bulbs' },
                { name: 'Аккумуляторы', link: 'products?subcategory=batteries' },
                { name: 'Камеры заднего вида', link: 'products?subcategory=rear-view-cameras' },
                { name: 'Предохранители', link: 'products?subcategory=fuses' },
                { name: 'Парковочные радары', link: 'products?subcategory=parking-radars' }
            ]
        },
        tools: {
            title: 'Инструмент',
            subcategories: [
                { name: 'Все для сада', link: 'products?subcategory=garden-tools' },
                { name: 'Оснастка', link: 'products?subcategory=tooling' },
                { name: 'Пневматический инструмент', link: 'products?subcategory=pneumatic-tools' },
                { name: 'Ручной инструмент', link: 'products?subcategory=hand-tools' },
                { name: 'Электроинструмент', link: 'products?subcategory=power-tools' }
            ]
        },
        accessories: {
            title: 'Аксессуары',
            link: 'products?category=accessories' // Категория без подкатегорий
        },
        service: {
            title: 'Все для автосервиса',
            subcategories: [
                { name: 'Оборудование для сервиса', link: 'products?subcategory=service-equipment' },
                { name: 'Профессиональная автохимия', link: 'products?subcategory=pro-chemistry' }
            ]
        },
        clothing: {
            title: 'Одежда и экипировка',
            link: 'products?category=clothing' // Категория без подкатегорий
        },
        vehicles: {
            title: 'Велосипеды и самокаты',
            subcategories: [
                { name: 'Велосипеды', link: 'products?subcategory=bicycles' },
                { name: 'Самокаты', link: 'products?subcategory=scooters' }
            ]
        }
    };

    // 2. ЭЛЕМЕНТЫ DOM
    const sidebar = document.getElementById('catalogSidebar');
    const content = document.getElementById('catalogContent');
    if (!sidebar || !content) {
        console.error('Не найдены контейнеры #catalogSidebar или #catalogContent');
        return;
    }

    // 3. ФУНКЦИИ ГЕНЕРАЦИИ И ОТОБРАЖЕНИЯ
    const renderSidebar = (activeCategoryId) => {
        const nav = document.createElement('nav');
        nav.className = 'catalog-nav';
        const ul = document.createElement('ul');
        
        Object.keys(catalogData).forEach(key => {
            const category = catalogData[key];
            const li = document.createElement('li');
            const a = document.createElement('a');
            
            // Если у категории есть прямая ссылка, используем ее. Иначе - якорь.
            a.href = category.link ? `/${category.link}` : `#${key}`;
            
            a.className = 'catalog-nav-item';
            a.dataset.category = key;
            a.textContent = category.title;
            if (key === activeCategoryId) {
                a.classList.add('active');
            }
            li.appendChild(a);
            ul.appendChild(li);
        });
        nav.appendChild(ul);
        sidebar.innerHTML = '<h3>Категории</h3>';
        sidebar.appendChild(nav);
    };

    const renderContent = (categoryId) => {
        const category = catalogData[categoryId];
        // Если у категории нет подкатегорий, показываем заглушку
        if (!category || !category.subcategories) {
            content.innerHTML = '<p style="text-align:center; padding: 2rem; color: #aaa;">Выберите категорию с подразделами из меню слева.</p>';
            return;
        }

        const block = document.createElement('div');
        block.className = 'category-block active';
        
        block.innerHTML = category.subcategories.map(subcat => {
            const subcatKey = subcat.link.split('subcategory=')[1] || subcat.name.toLowerCase().replace(/\s/g, '-');
            const imgSrc = `/images/catalog/${subcatKey}.webp`; // Абсолютный путь

            return `
            <a href="/${subcat.link}" class="subcategory-card">
                <img src="${imgSrc}" alt="${subcat.name}" onerror="this.style.display='none'">
                <span>${subcat.name}</span>
            </a>`;
        }).join('');

        content.innerHTML = '';
        content.appendChild(block);
    };

    // 4. ОСНОВНАЯ ЛОГИКА
    const handleCategoryChange = () => {
        // Категория по умолчанию - первая, у которой есть подкатегории
        const defaultCategory = Object.keys(catalogData).find(key => catalogData[key].subcategories) || Object.keys(catalogData)[0];
        let categoryId = window.location.hash.substring(1) || defaultCategory;
        
        // Проверяем, существует ли такая категория, если нет - используем дефолтную
        if (!catalogData[categoryId]) {
            categoryId = defaultCategory;
        }

        renderSidebar(categoryId);
        renderContent(categoryId);
    };

    // 5. ОБРАБОТЧИКИ СОБЫТИЙ
    sidebar.addEventListener('click', (e) => {
        const link = e.target.closest('a.catalog-nav-item');
        // Реагируем только на якоря (ссылки, содержащие #)
        if (link && link.getAttribute('href').startsWith('#')) { 
            e.preventDefault();
            const categoryId = link.dataset.category;
            // Просто меняем хэш, остальное сделает 'hashchange'
            if (window.location.hash !== `#${categoryId}`) {
                window.location.hash = categoryId;
            }
        }
    });

    window.addEventListener('hashchange', handleCategoryChange);

    // --- ПЕРВЫЙ ЗАПУСК ---
    handleCategoryChange();
});