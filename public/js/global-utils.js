// Файл: global-utils.js
// Этот файл содержит только общие, переиспользуемые функции-утилиты.

window.showCustomAlert = function(message, type = 'success') {
    const container = document.getElementById('customAlertContainer');
    if (!container) { alert(message); return; }
    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert ${type}`;
    alertDiv.innerHTML = `<span>${message}</span><button class="custom-alert-close-btn">×</button>`;
    container.appendChild(alertDiv);
    alertDiv.querySelector('.custom-alert-close-btn').addEventListener('click', () => alertDiv.remove());
    setTimeout(() => {
        if (alertDiv.parentNode) alertDiv.remove();
    }, 5000);
};

window.showCustomConfirm = function(text, title = 'Подтвердите действие') {
    const modalOverlay = document.getElementById('confirmModalOverlay');
    const titleEl = document.getElementById('confirmModalTitle');
    const textEl = document.getElementById('confirmModalText');
    const yesBtn = document.getElementById('confirmModalYes');
    const noBtn = document.getElementById('confirmModalNo');

    if (!modalOverlay || !titleEl || !textEl || !yesBtn || !noBtn) {
        return Promise.resolve(confirm(text));
    }

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