// auth.js - ФИНАЛЬНАЯ ПОЛНАЯ ВЕРСИЯ

document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000/api';

    // --- Утилита для чтения cookie ---
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
        return null;
    }


    // -----------------------------------------


    // --- Элементы страницы (этот код сработает, только если пользователь НЕ вошел) ---
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const messageContainer = document.getElementById('messageContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');

    // --- 1. Инициализация переключения вкладок ---
    if (tabs.length && forms.length) {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetFormId = tab.dataset.tab + 'Form';

                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                forms.forEach(f => f.classList.remove('active'));
                const targetForm = document.getElementById(targetFormId);
                if (targetForm) {
                    targetForm.classList.add('active');
                }
                
                if (messageContainer) messageContainer.innerHTML = '';
            });
        });
    }

    // --- 2. Обработчики отправки форм ---
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // --- 3. Логика функций (оставляем ваш рабочий код) ---

    function showMessage(message, type = 'success') {
        if (messageContainer) {
            const messageClass = type === 'error' ? 'error' : 'success';
            messageContainer.innerHTML = `<div class="message ${messageClass}">${message}</div>`;
        }
    }

    function clearMessages() {
        if (messageContainer) {
            messageContainer.innerHTML = '';
        }
    }

    function showLoading(isLoading) {
        if (loadingIndicator) {
            loadingIndicator.classList.toggle('show', isLoading);
        }
    }
    
    function setFormDisabled(form, isDisabled) {
        const button = form.querySelector('button[type="submit"]');
        if (button) button.disabled = isDisabled;
    }

    // ЗАМЕНИТЕ функцию handleLogin в файле auth.js

async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.querySelector('#loginEmail')?.value;
    const password = form.querySelector('#loginPassword')?.value;

    if (!email || !password) {
        return showMessage('Пожалуйста, заполните все поля.', 'error');
    }

    clearMessages();
    showLoading(true);
    setFormDisabled(form, true);

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Ошибка входа');

        // --- ГЛАВНОЕ ИЗМЕНЕНИЕ ---
        // 1. Сохраняем токен в localStorage
        if (data.accessToken) {
            localStorage.setItem('accessToken', data.accessToken);
        } else {
            // Если токен не пришел, это ошибка
            throw new Error('Не удалось получить токен авторизации.');
        }

        // 2. Сохраняем остальные данные в cookie, как и раньше
        document.cookie = `userLoggedIn=true; path=/; max-age=86400`;
        document.cookie = `userId=${data.userId}; path=/; max-age=86400`;
        document.cookie = `userName=${encodeURIComponent(data.username)}; path=/; max-age=86400`;
        document.cookie = `userEmail=${encodeURIComponent(data.email)}; path=/; max-age=86400`;
        if (data.avatarUrl) {
            document.cookie = `userAvatar=${encodeURIComponent(data.avatarUrl)}; path=/; max-age=86400`;
        } else {
             // Чистим старый аватар, если нового нет
            document.cookie = 'userAvatar=; path=/; max-age=-1';
        }
        
        showMessage('Успешный вход! Перенаправляем...', 'success');
        
        setTimeout(() => {
            window.location.href = '/profile';
        }, 500); // Немного увеличим задержку для наглядности

    } catch (error) {
        showMessage(error.message, 'error');
        // В случае ошибки очищаем токен, если он вдруг был записан
        localStorage.removeItem('accessToken');
    } finally {
        showLoading(false);
        setFormDisabled(form, false);
    }
}

    async function handleRegister(event) {
        event.preventDefault();
        const form = event.target;
        const username = form.querySelector('#registerUsername')?.value;
        const email = form.querySelector('#registerEmail')?.value;
        const password = form.querySelector('#registerPassword')?.value;
        const confirmPassword = form.querySelector('#confirmPassword')?.value;

        if (password.length < 6) {
             return showMessage('Пароль должен быть не менее 6 символов.', 'error');
        }
        if (password !== confirmPassword) {
            return showMessage('Пароли не совпадают.', 'error');
        }

        clearMessages();
        showLoading(true);
        setFormDisabled(form, true);

        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password }),
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Ошибка регистрации');

            showMessage(data.message, 'success');
            form.reset();

        } catch (error) {
            showMessage(error.message, 'error');
        } finally {
            showLoading(false);
            setFormDisabled(form, false);
        }
    }
});