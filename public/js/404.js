document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('back-btn');

    backBtn.addEventListener('click', () => {
        // Используем History API браузера
        if (window.history.length > 1) {
            window.history.back();
        } else {
            // Если истории нет, перенаправляем на главную
            window.location.href = '/';
        }
    });
    
    console.log('404 Page Loaded');
});