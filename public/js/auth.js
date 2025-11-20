// auth.js - ОБЪЕДИНЕННАЯ, АДАПТИРОВАННАЯ И БЕЗОПАСНАЯ ВЕРСИЯ

/**
 * Функция для экранирования HTML-тегов в строке для безопасного отображения.
 * Предотвращает XSS-атаки, преобразуя символы вроде < > в их HTML-сущности.
 * @param {string} str - Входная строка, которая может содержать вредоносный код.
 * @returns {string} - Безопасная для отображения строка.
 */
function escapeHTML(str) {
    // Проверяем, что на вход подана строка
    const str_val = String(str || '');
    const p = document.createElement('p');
    p.textContent = str_val;
    return p.innerHTML;
}


document.addEventListener('DOMContentLoaded', () => {
    // ==========================================================
    // --- БЛОК 1: ЛОГИКА ИНТЕРФЕЙСА (из auth1.js) ---
    // ==========================================================
    
    // Slider functionality
    let currentSlideIndex = 0;
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    let slideInterval;

    function goToSlide(index) {
        if (!slides.length || !dots.length || index < 0 || index >= slides.length) return;
        slides[currentSlideIndex].classList.remove('active');
        dots[currentSlideIndex].classList.remove('active');
        currentSlideIndex = index;
        slides[currentSlideIndex].classList.add('active');
        dots[currentSlideIndex].classList.add('active');
    }

    function nextSlide() {
        if (!slides.length) return;
        const nextIndex = (currentSlideIndex + 1) % slides.length;
        goToSlide(nextIndex);
    }
    
    function startSlider() {
        if(slides.length > 0) {
            clearInterval(slideInterval);
            slideInterval = setInterval(nextSlide, 5000);
        }
    }
    
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            goToSlide(index);
            startSlider(); // Перезапускаем таймер при ручном переключении
        });
    });

    startSlider();
    
    // Switch between login and register forms
    const loginFormContainer = document.getElementById('loginForm');
    const registerFormContainer = document.getElementById('registerForm');

    window.switchToRegister = function(event) {
        event.preventDefault();
        loginFormContainer.style.display = 'none';
        registerFormContainer.style.display = 'block';
        clearAllErrors();
    };

    window.switchToLogin = function(event) {
        event.preventDefault();
        registerFormContainer.style.display = 'none';
        loginFormContainer.style.display = 'block';
        clearAllErrors();
    };
    
    // Toggle password visibility
    window.togglePassword = function(button) {
        const input = button.parentElement.querySelector('input');
        const eyeOpen = button.querySelector('.eye-open');
        const eyeClosed = button.querySelector('.eye-closed');
        if (input.type === 'password') {
            input.type = 'text';
            if (eyeOpen) eyeOpen.style.display = 'none';
            if (eyeClosed) eyeClosed.style.display = 'block';
        } else {
            input.type = 'password';
            if (eyeOpen) eyeOpen.style.display = 'block';
            if (eyeClosed) eyeClosed.style.display = 'none';
        }
    };
    
    // Validation functions and helpers
    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
    const validatePassword = (password) => password.length >= 8;
    const validateName = (name) => name.length >= 2;
    
    const showError = (input, message) => {
        if (!input) return;
        const formGroup = input.closest('.form-group');
        const errorMessage = formGroup ? formGroup.querySelector('.error-message') : null;
        input.classList.add('error');
        input.classList.remove('success');
        if(errorMessage) {
          // ИСПОЛЬЗОВАНИЕ .textContent ЗДЕСЬ БЕЗОПАСНО
          errorMessage.textContent = message;
          errorMessage.classList.add('show');
        }
    };
    
    const showSuccess = (input) => {
        if (!input) return;
        const formGroup = input.closest('.form-group');
        const errorMessage = formGroup ? formGroup.querySelector('.error-message') : null;
        input.classList.remove('error');
        input.classList.add('success');
        if(errorMessage) errorMessage.classList.remove('show');
    };

    const clearError = (input) => {
        if (!input) return;
        const formGroup = input.closest('.form-group');
        const errorMessage = formGroup ? formGroup.querySelector('.error-message') : null;
        input.classList.remove('error', 'success');
        if(errorMessage) errorMessage.classList.remove('show');
    };
    
    const clearAllErrors = () => {
        document.querySelectorAll('.error-message').forEach(msg => msg.classList.remove('show'));
        document.querySelectorAll('input').forEach(input => input.classList.remove('error', 'success'));
    };
    
    // Real-time validation listeners
    document.querySelectorAll('input[name="email"]').forEach(input => {
        input.addEventListener('blur', () => {
            if (!input.value) return;
            if (!validateEmail(input.value)) showError(input, 'Введите корректный email'); else showSuccess(input);
        });
        input.addEventListener('input', () => clearError(input));
    });

    document.querySelectorAll('input[name="password"]').forEach(input => {
        input.addEventListener('blur', () => {
            if (!input.value) return;
            if (!validatePassword(input.value)) showError(input, 'Пароль должен быть не менее 8 символов'); else showSuccess(input);
        });
        input.addEventListener('input', () => clearError(input));
    });

    const passwordConfirmInput = document.querySelector('input[name="passwordConfirm"]');
    if (passwordConfirmInput) {
        passwordConfirmInput.addEventListener('input', () => {
            const passwordInput = registerFormContainer.querySelector('input[name="password"]');
            if (passwordConfirmInput.value === passwordInput.value) {
                showSuccess(passwordConfirmInput);
            } else {
                showError(passwordConfirmInput, 'Пароли не совпадают');
            }
        });
    }

    document.querySelector('input[name="companyName"]')?.addEventListener('blur', (e) => {
        if (!e.target.value) return;
        if (!validateName(e.target.value)) showError(e.target, 'Минимум 2 символа'); else showSuccess(e.target);
    });
    document.querySelector('input[name="username"]')?.addEventListener('blur', (e) => {
        if (!e.target.value) return;
        if (!validateName(e.target.value)) showError(e.target, 'Минимум 2 символа'); else showSuccess(e.target);
    });


    // ==========================================================
    // --- БЛОК 2: ЛОГИКА РАБОТЫ С API ---
    // ==========================================================
    
    const API_URL = 'http://localhost:process.env.PORT || 3000/api';
    
    // Привязываем обработчики отправки форм
    loginFormContainer.querySelector('form').addEventListener('submit', handleLogin);
    registerFormContainer.querySelector('form').addEventListener('submit', handleRegister);

    async function handleLogin(event) {
        event.preventDefault();
        const form = event.target;
        const emailInput = form.email;
        const passwordInput = form.password;
        
        let isValid = true;
        if (!validateEmail(emailInput.value)) { showError(emailInput, 'Введите корректный email'); isValid = false; }
        if (!passwordInput.value) { showError(passwordInput, 'Пароль не может быть пустым'); isValid = false; }
        if (!isValid) return;

        const submitBtn = form.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Входим...';
        
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput.value, password: passwordInput.value }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Ошибка входа');

            localStorage.setItem('accessToken', data.accessToken);
            document.cookie = `userLoggedIn=true; path=/; max-age=86400`;
            document.cookie = `userName=${encodeURIComponent(data.username)}; path=/; max-age=86400`;
            document.cookie = `userEmail=${encodeURIComponent(data.email)}; path=/; max-age=86400`;
            if (data.avatarUrl) {
                document.cookie = `userAvatar=${encodeURIComponent(data.avatarUrl)}; path=/; max-age=86400`;
            }
            
            // Это сообщение статично и безопасно, экранирование не требуется.
            window.showCustomAlert('Успешный вход! Перенаправляем...', 'success');
            
            setTimeout(() => { window.location.href = '/profile'; }, 1500);

        } catch (error) {
            // ИСПРАВЛЕНО: Сообщение от сервера экранируется перед отображением
            window.showCustomAlert(escapeHTML(error.message), 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Войти';
        }
    }

    async function handleRegister(event) {
        event.preventDefault();
        const form = event.target;
        const companyNameInput = form.companyName;
        const usernameInput = form.username;
        const emailInput = form.email;
        const passwordInput = form.password;
        const passwordConfirmInput = form.passwordConfirm;
        const termsInput = form.terms;

        let isValid = true;
        if (!validateName(companyNameInput.value)) { showError(companyNameInput, 'Название компании слишком короткое'); isValid = false; }
        if (!validateName(usernameInput.value)) { showError(usernameInput, 'Имя слишком короткое'); isValid = false; }
        if (!validateEmail(emailInput.value)) { showError(emailInput, 'Некорректный email'); isValid = false; }
        if (!validatePassword(passwordInput.value)) { showError(passwordInput, 'Пароль должен быть длиннее 8 символов'); isValid = false; }
        if (passwordInput.value !== passwordConfirmInput.value) { showError(passwordConfirmInput, 'Пароли не совпадают'); isValid = false; }
        // Сообщение о принятии условий статично и безопасно
        if (!termsInput.checked) { window.showCustomAlert('Нужно принять условия использования.', 'warning'); isValid = false; }
        if (!isValid) return;
        
        const submitBtn = form.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Регистрация...';

        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    companyName: companyNameInput.value, 
                    username: usernameInput.value, 
                    email: emailInput.value, 
                    password: passwordInput.value 
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Ошибка регистрации');

            // ИСПРАВЛЕНО: Сообщение от сервера экранируется перед отображением
            window.showCustomAlert(escapeHTML(data.message), 'success');
            form.reset();
            switchToLogin(event);

        } catch (error) {
            // ИСПРАВЛЕНО: Сообщение от сервера экранируется перед отображением
            window.showCustomAlert(escapeHTML(error.message), 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Создать аккаунт';
        }
    }
});



