// Файл: global-utils.js
// Этот файл содержит только общие, переиспользуемые функции-утилиты.

window.showCustomAlert = function(message, type = 'success') {
    const container = document.getElementById('customAlertContainer');
    // Если контейнера нет, используем стандартный alert, который безопасен (не парсит HTML).
    if (!container) { 
        alert(message); 
        return; 
    }
    
    // --- ИСПРАВЛЕНИЕ УЯЗВИМОСТИ: Создаем элементы программно ---

    // 1. Создаем основной div-контейнер для алерта
    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert ${type}`;

    // 2. Создаем span для текста сообщения
    const messageSpan = document.createElement('span');
    // Используем .textContent для безопасной вставки сообщения
    messageSpan.textContent = message; 

    // 3. Создаем кнопку закрытия
    const closeButton = document.createElement('button');
    closeButton.className = 'custom-alert-close-btn';
    // Используем .textContent для безопасного символа "×"
    closeButton.textContent = '×'; 
    closeButton.addEventListener('click', () => alertDiv.remove());

    // 4. Собираем алерт из созданных элементов
    alertDiv.appendChild(messageSpan);
    alertDiv.appendChild(closeButton);

    // 5. Добавляем готовый и безопасный алерт на страницу
    container.appendChild(alertDiv);
    
    setTimeout(() => {
        // Проверяем, существует ли еще элемент, перед удалением
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
};

// Эта функция изначально была безопасной, никаких изменений не требуется.
window.showCustomConfirm = function(text, title = 'Подтвердите действие') {
    const modalOverlay = document.getElementById('confirmModalOverlay');
    const titleEl = document.getElementById('confirmModalTitle');
    const textEl = document.getElementById('confirmModalText');
    const yesBtn = document.getElementById('confirmModalYes');
    const noBtn = document.getElementById('confirmModalNo');

    if (!modalOverlay || !titleEl || !textEl || !yesBtn || !noBtn) {
        // Стандартный confirm также безопасен.
        return Promise.resolve(confirm(text));
    }

    // Использование .textContent здесь абсолютно безопасно.
    titleEl.textContent = title;
    textEl.textContent = text;
    modalOverlay.style.display = 'flex';

    return new Promise((resolve) => {
        const onYesClick = () => { cleanup(); resolve(true); };
        const onNoClick = () => { cleanup(); resolve(false); };
        const cleanup = () => {
            modalOverlay.style.display = 'none';
            yesBtn.removeEventListener('click', onYesClick);
            noBtn.removeEventListener('click', onNoClick);
        };
        yesBtn.addEventListener('click', onYesClick);
        noBtn.addEventListener('click', onNoClick);
    });
};