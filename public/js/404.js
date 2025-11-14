// FuzzyText эффект для страницы 404
function initFuzzyText() {
    const canvas = document.getElementById('fuzzyCanvas');
    if (!canvas) return;

    let animationFrameId;
    let isInitialized = false;

    const init = async () => {
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const text = '404';
        const fontSize = 120;
        const fontWeight = 900;
        const fontFamily = 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
        const color = '#4fa690';

        // Создаем оффскрин canvas для текста
        const offscreen = document.createElement('canvas');
        const offCtx = offscreen.getContext('2d');
        if (!offCtx) return;

        // Настраиваем шрифт
        offCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        offCtx.textBaseline = 'alphabetic';
        const metrics = offCtx.measureText(text);

        // Вычисляем размеры
        const actualLeft = metrics.actualBoundingBoxLeft || 0;
        const actualRight = metrics.actualBoundingBoxRight || metrics.width;
        const actualAscent = metrics.actualBoundingBoxAscent || fontSize;
        const actualDescent = metrics.actualBoundingBoxDescent || fontSize * 0.2;

        const textBoundingWidth = Math.ceil(actualLeft + actualRight);
        const tightHeight = Math.ceil(actualAscent + actualDescent);

        const extraWidthBuffer = 20;
        const offscreenWidth = textBoundingWidth + extraWidthBuffer;

        // Настраиваем размеры оффскрин canvas
        offscreen.width = offscreenWidth;
        offscreen.height = tightHeight;

        const xOffset = extraWidthBuffer / 2;
        offCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        offCtx.textBaseline = 'alphabetic';
        offCtx.fillStyle = color;
        offCtx.fillText(text, xOffset - actualLeft, actualAscent);

        // Настраиваем основной canvas
        const horizontalMargin = 50;
        const verticalMargin = 20;
        canvas.width = offscreenWidth + horizontalMargin * 2;
        canvas.height = tightHeight + verticalMargin * 2;
        
        // Устанавливаем CSS размеры для адаптивности
        canvas.style.maxWidth = '100%';
        canvas.style.height = 'auto';
        
        ctx.translate(horizontalMargin, verticalMargin);

        // Параметры интерактивности
        const interactiveLeft = horizontalMargin + xOffset;
        const interactiveTop = verticalMargin;
        const interactiveRight = interactiveLeft + textBoundingWidth;
        const interactiveBottom = interactiveTop + tightHeight;

        let isHovering = false;
        const fuzzRange = 40;
        const baseIntensity = 0.25;
        const hoverIntensity = 0.8;

        // Функция анимации
        const animate = () => {
            ctx.clearRect(
                -fuzzRange,
                -fuzzRange,
                offscreenWidth + 2 * fuzzRange,
                tightHeight + 2 * fuzzRange
            );

            const intensity = isHovering ? hoverIntensity : baseIntensity;
            
            // Рисуем текст с эффектом помех
            for (let j = 0; j < tightHeight; j++) {
                const dx = Math.floor(intensity * (Math.random() - 0.5) * fuzzRange);
                ctx.drawImage(
                    offscreen,
                    0, j, offscreenWidth, 1,
                    dx, j, offscreenWidth, 1
                );
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        // Проверка попадания в область текста
        const isInsideTextArea = (x, y) => {
            return (
                x >= interactiveLeft &&
                x <= interactiveRight &&
                y >= interactiveTop &&
                y <= interactiveBottom
            );
        };

        // Обработчики событий мыши
        const handleMouseMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            isHovering = isInsideTextArea(x, y);
        };

        const handleMouseLeave = () => {
            isHovering = false;
        };

        // Обработчики событий касания
        const handleTouchMove = (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const touch = e.touches[0];
            const x = (touch.clientX - rect.left) * scaleX;
            const y = (touch.clientY - rect.top) * scaleY;
            isHovering = isInsideTextArea(x, y);
        };

        const handleTouchEnd = () => {
            isHovering = false;
        };

        // Добавляем обработчики событий
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseleave', handleMouseLeave);
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd);

        // Функция очистки
        const cleanup = () => {
            cancelAnimationFrame(animationFrameId);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseleave', handleMouseLeave);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
        };

        // Сохраняем функцию очистки
        canvas.cleanupFuzzyText = cleanup;

        // Запускаем анимацию
        animate();
        isInitialized = true;
    };

    // Очистка при повторной инициализации
    const cleanup = () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        if (canvas && canvas.cleanupFuzzyText) {
            canvas.cleanupFuzzyText();
        }
    };

    // Инициализируем
    cleanup();
    init();

    // Возвращаем функцию очистки
    return cleanup;
}

// Дополнительные функции для интерактивности
document.addEventListener('DOMContentLoaded', () => {
    // Добавляем плавное появление элементов
    const animateElements = () => {
        const elements = document.querySelectorAll('.error-content-panel > *');
        elements.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            
            setTimeout(() => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, index * 100);
        });
    };

    // Запускаем анимацию появления
    setTimeout(animateElements, 300);

    // Добавляем обработчик для кнопки "Вернуться назад"
    const backButton = document.querySelector('a[href="javascript:history.back();"]');
    if (backButton) {
        backButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = 'Lime Ditails(osn).html';
            }
        });
    }

    // Добавляем пульсацию для кнопок при наведении
    const buttons = document.querySelectorAll('.btn-primary, .btn-secondary');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', () => {
            button.style.animation = 'pulse 0.6s ease-in-out';
        });
        
        button.addEventListener('animationend', () => {
            button.style.animation = '';
        });
    });
});

// CSS анимация пульсации (добавляется динамически)
const addPulseAnimation = () => {
    if (!document.getElementById('pulse-animation')) {
        const style = document.createElement('style');
        style.id = 'pulse-animation';
        style.textContent = `
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
};

// Добавляем анимацию при загрузке
addPulseAnimation();

// Обработка изменения размера окна
window.addEventListener('resize', () => {
    // Перезапускаем FuzzyText при изменении размера
    setTimeout(() => {
        initFuzzyText();
    }, 100);
});

// Обработка ошибок
window.addEventListener('error', (e) => {
    console.error('Ошибка на странице 404:', e.error);
});

// Экспорт функций для возможного использования извне
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initFuzzyText,
        addPulseAnimation
    };
}