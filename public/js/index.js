document.addEventListener('DOMContentLoaded', () => {
    const pageContainer = document.querySelector('.page-container');
    const panelsContainer = document.querySelector('.panels-container');
    const panels = document.querySelectorAll('.panel');
    const progressFill = document.querySelector('.nav-progress-fill');
    const navText = document.querySelectorAll('.nav-text')[1];
    const parallaxElements = document.querySelectorAll('.parallax');
    const leftMenu = document.querySelector('.left-menu');
    const menuBtn = document.querySelector('.menu-btn');
    const sectionNavItems = document.querySelectorAll('.section-nav-item');
    const copyEmailBtn = document.querySelector('.copy-email');
    const copyTooltip = document.querySelector('.copy-tooltip');

    const SMOOTH_FACTOR = 0.065;
    const PANEL_COUNT = panels.length;
    
    let targetX = 0;
    let currentX = 0;
    let currentProgress = 0;
    let targetProgress = 0;
    let panelWidth = window.innerWidth;
    let maxScroll = (PANEL_COUNT - 1) * panelWidth;
    let isAnimating = false;
    let currentPanel = 0;
    let lastPanel = -1;
    let menuExpanded = false;
    
    let isDragging = false;
    let startX = 0;
    let startScrollX = 0;
    let velocityX = 0;
    let lastTouchX = 0;
    let lastTouchTime = 0;

    const lerp = (start, end, factor) => start + (end - start) * factor;
    const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

    window.goToPanel = function(index) { 
    targetX = index * panelWidth;
    startAnimation();
}
window.addEventListener('load', () => {
    if (window.location.hash === '#contacts') {
        // Проверяем, что функция для прокрутки существует
        if (window.goToPanel) {
            // Плавно прокручиваем к панели с индексом 5
            window.goToPanel(5);
        }
        
    }
});
   
    // Carousel functionality
    const carouselTrack = document.querySelector('.carousel-track');
    const carouselSlides = document.querySelectorAll('.carousel-slide');
    const prevBtn = document.querySelector('.carousel-prev');
    const nextBtn = document.querySelector('.carousel-next');
    const dotsContainer = document.querySelector('.carousel-dots');
    
    let currentSlideIndex = 0;
    const totalSlides = carouselSlides.length;
    
    // Calculate how many slides fit in viewport
    function getSlidesToShow() {
        const containerWidth = document.querySelector('.carousel-track-container').offsetWidth - 120; // minus padding
        const slideWidth = carouselSlides[0].offsetWidth;
        return Math.floor(containerWidth / (slideWidth + 24)); // 24 is gap
    }
    
    let slidesToShow = getSlidesToShow();
    let maxIndex = Math.max(0, totalSlides - slidesToShow);
    
    // Create dots
    function createDots() {
        dotsContainer.innerHTML = '';
        for (let i = 0; i <= maxIndex; i++) {
            const dot = document.createElement('div');
            dot.classList.add('carousel-dot');
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => goToSlide(i));
            dotsContainer.appendChild(dot);
        }
    }
    
    createDots();
    const dots = document.querySelectorAll('.carousel-dot');
    
    function updateCarousel() {
        const slideWidth = carouselSlides[0].offsetWidth;
        const gap = 24;
        const offset = -(currentSlideIndex * (slideWidth + gap));
        carouselTrack.style.transform = `translateX(${offset}px)`;
        
        // Update dots
        document.querySelectorAll('.carousel-dot').forEach((dot, index) => {
            dot.classList.toggle('active', index === currentSlideIndex);
        });
        
        // Update buttons
        prevBtn.disabled = currentSlideIndex === 0;
        nextBtn.disabled = currentSlideIndex >= maxIndex;
    }
    
    function goToSlide(index) {
        currentSlideIndex = Math.max(0, Math.min(index, maxIndex));
        updateCarousel();
    }
    
    prevBtn.addEventListener('click', () => {
        if (currentSlideIndex > 0) {
            currentSlideIndex--;
            updateCarousel();
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (currentSlideIndex < maxIndex) {
            currentSlideIndex++;
            updateCarousel();
        }
    });
    
    // Certificates carousel
    const certificatesTrack = document.querySelector('.certificates-track');
    const certificatesSlides = document.querySelectorAll('.certificate-slide');
    const certificatesPrev = document.querySelector('.certificates-prev');
    const certificatesNext = document.querySelector('.certificates-next');
    const certificatesDotsContainer = document.querySelector('.certificates-dots');
    
    let currentCertIndex = 0;
    const totalCerts = certificatesSlides.length;
    
    function getCertsSlidesToShow() {
        const containerWidth = document.querySelector('.certificates-track-container').offsetWidth - 40;
        const slideWidth = certificatesSlides[0].offsetWidth;
        return Math.floor(containerWidth / (slideWidth + 30));
    }
    
    let certsSlidesToShow = getCertsSlidesToShow();
    let maxCertIndex = Math.max(0, totalCerts - certsSlidesToShow);
    
    // Create certificate dots
    function createCertDots() {
        certificatesDotsContainer.innerHTML = '';
        for (let i = 0; i <= maxCertIndex; i++) {
            const dot = document.createElement('div');
            dot.classList.add('certificate-dot');
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => goToCertSlide(i));
            certificatesDotsContainer.appendChild(dot);
        }
    }
    
    createCertDots();
    
    function updateCertificatesCarousel() {
        const slideWidth = certificatesSlides[0].offsetWidth;
        const gap = 30;
        const offset = -(currentCertIndex * (slideWidth + gap));
        certificatesTrack.style.transform = `translateX(${offset}px)`;
        
        document.querySelectorAll('.certificate-dot').forEach((dot, index) => {
            dot.classList.toggle('active', index === currentCertIndex);
        });
        
        certificatesPrev.disabled = currentCertIndex === 0;
        certificatesNext.disabled = currentCertIndex >= maxCertIndex;
    }
    
    function goToCertSlide(index) {
        currentCertIndex = Math.max(0, Math.min(index, maxCertIndex));
        updateCertificatesCarousel();
    }
    
    certificatesPrev.addEventListener('click', () => {
        if (currentCertIndex > 0) {
            currentCertIndex--;
            updateCertificatesCarousel();
        }
    });
    
    certificatesNext.addEventListener('click', () => {
        if (currentCertIndex < maxCertIndex) {
            currentCertIndex++;
            updateCertificatesCarousel();
        }
    });
    
    // Auto-adjust carousels on resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            // Recalculate for projects carousel
            slidesToShow = getSlidesToShow();
            maxIndex = Math.max(0, totalSlides - slidesToShow);
            currentSlideIndex = Math.min(currentSlideIndex, maxIndex);
            createDots();
            updateCarousel();
            
            // Recalculate for certificates carousel
            certsSlidesToShow = getCertsSlidesToShow();
            maxCertIndex = Math.max(0, totalCerts - certsSlidesToShow);
            currentCertIndex = Math.min(currentCertIndex, maxCertIndex);
            createCertDots();
            updateCertificatesCarousel();
        }, 250);
    });

    // Copy email
    if (copyEmailBtn) {
        copyEmailBtn.addEventListener('click', () => {
            const email = document.querySelector('.email').textContent;
            navigator.clipboard.writeText(email).then(() => {
                copyTooltip.classList.add('active');
                setTimeout(() => {
                    copyTooltip.classList.remove('active');
                }, 2000);
            });
        });
    }

    // Menu toggle
    const animateMenuItems = (show) => {
        sectionNavItems.forEach((item, index) => {
            if (show) {
                setTimeout(() => {
                    item.classList.add('animate-in');
                }, 50 + index * 30);
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
        
        setTimeout(() => updateDimensions(false), 400);
    });

    // Parallax
    const updateParallax = () => {
        parallaxElements.forEach(element => {
            if (!element) return;
            const speed = parseFloat(element.dataset.speed) || 0.2;
            const moveX = -currentX * speed * 0.2;
            element.style.transform = `translateX(${moveX}px)`;
        });
    };

    // Update dimensions
    const updateDimensions = (animate = true) => {
        panelWidth = window.innerWidth;
        maxScroll = (PANEL_COUNT - 1) * panelWidth;
        targetX = currentPanel * panelWidth;
        currentX = targetX;
        
        panels.forEach(panel => {
            panel.style.width = `${panelWidth}px`;
        });
        
        panelsContainer.style.transform = `translateX(-${currentX}px)`;
        updateParallax();
    };

    // Section navigation
    sectionNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.getAttribute('data-index'));
            targetX = index * panelWidth;
            
            sectionNavItems.forEach(navItem => navItem.classList.remove('active'));
            item.classList.add('active');
            
            startAnimation();
            
            if (window.innerWidth < 768 && menuExpanded) {
                menuExpanded = false;
                leftMenu.classList.remove('expanded');
                document.body.classList.remove('menu-expanded');
                animateMenuItems(false);
                setTimeout(() => updateDimensions(false), 400);
            }
        });
    });

    // Update page counter
    const updatePageCount = () => {
        const currentPanelIndex = Math.round(currentX / panelWidth) + 1;
        const formattedIndex = currentPanelIndex.toString().padStart(2, '0');
        const totalPanels = PANEL_COUNT.toString().padStart(2, '0');
        navText.textContent = `${formattedIndex} / ${totalPanels}`;
        
        sectionNavItems.forEach((item, index) => {
            if (index === currentPanelIndex - 1) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    };

    // Update progress
    const updateProgress = () => {
        targetProgress = currentX / maxScroll;
        currentProgress = lerp(currentProgress, targetProgress, SMOOTH_FACTOR * 1.5);
        progressFill.style.transform = `scaleX(${currentProgress})`;
    };

    // Update active panel
    const updateActivePanel = () => {
        currentPanel = Math.round(currentX / panelWidth);
        if (currentPanel !== lastPanel) {
            if (lastPanel >= 0 && panels[lastPanel]) {
                panels[lastPanel].classList.remove('active');
            }
            
            if (panels[currentPanel]) {
                panels[currentPanel].classList.add('active');
            }
            
            lastPanel = currentPanel;
        }
    };

    // Animation loop
    const animate = () => {
        currentX = lerp(currentX, targetX, SMOOTH_FACTOR);
        panelsContainer.style.transform = `translateX(-${currentX}px)`;
        
        updateProgress();
        updatePageCount();
        updateActivePanel();
        updateParallax();
        
        if (Math.abs(targetX - currentX) > 0.1 || isAnimating) {
            requestAnimationFrame(animate);
        } else {
            isAnimating = false;
        }
    };

    const startAnimation = () => {
        if (!isAnimating) {
            isAnimating = true;
            requestAnimationFrame(animate);
        }
    };

    // Wheel event
    const handleWheel = (e) => {
        e.preventDefault();
        targetX = clamp(targetX + e.deltaY, 0, maxScroll);
        startAnimation();
    };

    // Mouse drag
    const handleMouseDown = (e) => {
        if (e.target.closest('.left-menu') || e.target.closest('.copy-email')) return;
        isDragging = true;
        startX = e.clientX;
        startScrollX = currentX;
        lastTouchX = e.clientX;
        lastTouchTime = Date.now();
        document.body.style.cursor = 'grabbing';
        e.preventDefault();
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        targetX = clamp(startScrollX - dx, 0, maxScroll);
        
        const currentTime = Date.now();
        const timeDelta = currentTime - lastTouchTime;
        if (timeDelta > 0) {
            const touchDelta = lastTouchX - e.clientX;
            velocityX = (touchDelta / timeDelta) * 15;
        }
        
        lastTouchX = e.clientX;
        lastTouchTime = currentTime;
        startAnimation();
    };

    const handleMouseUp = () => {
        if (!isDragging) return;
        isDragging = false;
        document.body.style.cursor = 'grab';
        
        if (Math.abs(velocityX) > 0.5) {
            targetX = clamp(targetX + velocityX * 8, 0, maxScroll);
        }
        
        const nearestPanel = Math.round(targetX / panelWidth);
        targetX = nearestPanel * panelWidth;
        startAnimation();
    };

    // Touch events
    const handleTouchStart = (e) => {
        if (e.target.closest('.left-menu') || e.target.closest('.copy-email')) return;
        isDragging = true;
        startX = e.touches[0].clientX;
        startScrollX = currentX;
        lastTouchX = e.touches[0].clientX;
        lastTouchTime = Date.now();
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        const dx = e.touches[0].clientX - startX;
        targetX = clamp(startScrollX - dx, 0, maxScroll);
        
        const currentTime = Date.now();
        const timeDelta = currentTime - lastTouchTime;
        if (timeDelta > 0) {
            const touchDelta = lastTouchX - e.touches[0].clientX;
            velocityX = (touchDelta / timeDelta) * 12;
        }
        
        lastTouchX = e.touches[0].clientX;
        lastTouchTime = currentTime;
        e.preventDefault();
        startAnimation();
    };

    const handleTouchEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        
        if (Math.abs(velocityX) > 0.5) {
            targetX = clamp(targetX + velocityX * 6, 0, maxScroll);
        }
        
        const nearestPanel = Math.round(targetX / panelWidth);
        targetX = nearestPanel * panelWidth;
        startAnimation();
    };

    // Event listeners
    pageContainer.addEventListener('wheel', handleWheel, { passive: false });
    pageContainer.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    pageContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
    pageContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    pageContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('resize', () => updateDimensions());

    // Initialize
    updateDimensions();
    updateActivePanel();
    updatePageCount();
    startAnimation();
    
    setTimeout(() => {
        panels[0].classList.add('active');
        sectionNavItems[0].classList.add('active');
    }, 100);
    
});
