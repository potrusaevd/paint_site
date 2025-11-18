// userAuth.js - ФИНАЛЬНАЯ ВЕРСЯ ДЛЯ ВСЕХ СТРАНИЦ

document.addEventListener('DOMContentLoaded', function () {
    const API_URL = 'http://localhost:3001';

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
        return null;
    }

    function deleteCookie(name) {
        document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }

    function handleLogout(event) {
        event.preventDefault();

        const confirmLogout = (typeof showCustomConfirm === 'function') 
            ? showCustomConfirm('Вы уверены, что хотите выйти?') 
            : Promise.resolve(confirm('Вы уверены, что хотите выйти?'));
        
        confirmLogout.then(confirmed => {
            if (confirmed) {
                localStorage.removeItem('accessToken');
                deleteCookie('userLoggedIn');
                deleteCookie('userName');
                deleteCookie('userEmail');
                deleteCookie('userAvatar');
                deleteCookie('userId');
                window.location.href = '/auth';
            }
        });
    }
    
    function initHeaderWidget() {
        const loginElement = document.querySelector('.account-login');
        const profileElement = document.querySelector('.user-profile');
        if (!loginElement || !profileElement) return;

        const isLoggedIn = getCookie('userLoggedIn') === 'true';

        if (isLoggedIn) {
            const userName = getCookie('userName') || 'Пользователь';
            const userEmail = getCookie('userEmail') || 'email@example.com';
            const userAvatar = getCookie('userAvatar');

            const avatarContainer = profileElement.querySelector('.user-avatar');
            const nameEl = profileElement.querySelector('.user-name');
            const emailEl = profileElement.querySelector('.user-email');
            
            // --- ИСПРАВЛЕНИЕ УЯЗВИМОСТИ: Программное создание элементов ---
            if (avatarContainer) {
                // Очищаем контейнер безопасным способом перед добавлением нового содержимого
                avatarContainer.innerHTML = ''; 

                if (userAvatar && userAvatar !== 'null' && userAvatar !== 'undefined') {
                    // Создаем элемент <img> программно
                    const img = document.createElement('img');
                    // Устанавливаем src. Браузер автоматически обработает URL, предотвращая 'javascript:' инъекции.
                    img.src = `${API_URL}/${userAvatar.replace(/\\/g, '/')}`;
                    img.alt = 'Аватар';
                    // Добавляем безопасный элемент в DOM
                    avatarContainer.appendChild(img);
                } else {
                    // Создаем <span> для инициала
                    const span = document.createElement('span');
                    span.className = 'user-initial';
                    // Используем .textContent для безопасной вставки текста
                    span.textContent = userName.charAt(0).toUpperCase();
                    // Добавляем безопасный элемент в DOM
                    avatarContainer.appendChild(span);
                }
            }
            
            // Использование .textContent здесь изначально было безопасным
            if (nameEl) nameEl.textContent = userName;
            if (emailEl) emailEl.textContent = userEmail;

            const logoutBtn = profileElement.querySelector('.logout');
            const dropdown = profileElement.querySelector('.user-dropdown');
            
            if (avatarContainer && dropdown) {
                avatarContainer.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdown.classList.toggle('show');
                });
            }
            if(logoutBtn) logoutBtn.addEventListener('click', handleLogout);
            
            document.addEventListener('click', (e) => {
                if (dropdown && !profileElement.contains(e.target)) {
                    dropdown.classList.remove('show');
                }
            });

            loginElement.style.display = 'none';
            profileElement.style.display = 'inline-block';
        } else {
            loginElement.style.display = 'block';
            profileElement.style.display = 'none';
        }
    }

    initHeaderWidget();
});
