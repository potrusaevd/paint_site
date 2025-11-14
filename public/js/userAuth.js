// userAuth.js - ФИНАЛЬНАЯ ВЕРСЯ ДЛЯ ВСЕХ СТРАНИЦ

document.addEventListener('DOMContentLoaded', function () {
    const API_URL = 'http://localhost:3000';

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

    // Можно использовать кастомное подтверждение, если оно есть на странице
    const confirmLogout = (typeof showCustomConfirm === 'function') 
        ? showCustomConfirm('Вы уверены, что хотите выйти?') 
        : Promise.resolve(confirm('Вы уверены, что хотите выйти?'));
    
    confirmLogout.then(confirmed => {
        if (confirmed) {
            // Удаляем токен из localStorage
            localStorage.removeItem('accessToken');

            // Удаляем все известные нам cookie
            deleteCookie('userLoggedIn');
            deleteCookie('userName');
            deleteCookie('userEmail');
            deleteCookie('userAvatar');
            deleteCookie('userId');
            
            // Перенаправляем на страницу входа
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

            // ИЩЕМ ЭЛЕМЕНТЫ СТРОГО ВНУТРИ ВИДЖЕТА В ШАПКЕ
            const avatarContainer = profileElement.querySelector('.user-avatar');
            const nameEl = profileElement.querySelector('.user-name');
            const emailEl = profileElement.querySelector('.user-email'); // Находит .user-email внутри .user-profile
            
            if (avatarContainer) {
                if (userAvatar) {
                    avatarContainer.innerHTML = `<img src="${API_URL}/${userAvatar.replace(/\\/g, '/')}" alt="Аватар">`;
                } else {
                    avatarContainer.innerHTML = `<span class="user-initial">${userName.charAt(0).toUpperCase()}</span>`;
                }
            }
            if (nameEl) nameEl.textContent = userName;
            if (emailEl) emailEl.textContent = userEmail; // Заполняет почту ТОЛЬКО в шапке

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