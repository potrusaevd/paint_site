
document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'https://paint-site-vty0.onrender.com/api';

    // Check authorization
    if (!localStorage.getItem('accessToken')) {
        window.location.href = '/auth';
        return;
    }

    // DOM Elements
    const summaryItemsContainer = document.getElementById('summaryItems');
    const summarySubtotalEl = document.getElementById('summarySubtotal');
    const summaryVatEl = document.getElementById('summaryVat');
    const summaryTotalEl = document.getElementById('summaryTotal');
    const checkoutForm = document.getElementById('checkoutForm');
    
    // Form inputs - Contact
    const customerNameInput = document.getElementById('customerName');
    const customerPositionInput = document.getElementById('customerPosition');
    const customerPhoneInput = document.getElementById('customerPhone');
    const customerEmailInput = document.getElementById('customerEmail');
    
    // Form inputs - Company
    const companyNameInput = document.getElementById('companyName');
    const companyInnInput = document.getElementById('companyInn');
    const companyKppInput = document.getElementById('companyKpp');
    const companyLegalAddressInput = document.getElementById('companyLegalAddress');
    
    // Delivery & Payment
    const savedAddressesLoader = document.getElementById('savedAddressesLoader');
    const savedAddressesContainer = document.getElementById('savedAddresses');
    const deliveryDateInput = document.getElementById('deliveryDate');
    const deliveryTimeInput = document.getElementById('deliveryTime');
    const deliveryCommentInput = document.getElementById('deliveryComment');
    const orderCommentInput = document.getElementById('orderComment');
    const needDocumentsInput = document.getElementById('needDocuments');
    const urgentOrderInput = document.getElementById('urgentOrder');
    
    // Multi-step elements
    const infoStep = document.getElementById('infoStep');
    const paymentStep = document.getElementById('paymentStep');
    const checkoutNextBtn = document.getElementById('checkoutNextBtn');
    const stepsIndicators = document.querySelectorAll('.checkout-steps .step');

    let currentStep = 1;

    // ========== FIX LAYOUT FOR COMMENTS (Full Width) ==========
    // Делаем поля комментариев на всю ширину строки
    [deliveryCommentInput, orderCommentInput].forEach(input => {
        if (input) {
            const parentGroup = input.closest('.form-group');
            if (parentGroup) {
                parentGroup.style.flexBasis = '100%'; // Растягиваем контейнер на 100%
            }
        }
    });

    // ========== MAIN LOAD FUNCTION ==========
    async function loadCheckoutData() {
        try {
            const [addressesResponse, cartResponse] = await Promise.all([
                fetch(`${API_URL}/addresses`, { 
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` } 
                }),
                fetch(`${API_URL}/cart`, { 
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` } 
                })
            ]);

            if (!addressesResponse.ok || !cartResponse.ok) {
                throw new Error('Failed to load checkout data');
            }
            
            const addressesData = await addressesResponse.json();
            const cartItems = await cartResponse.json();

            if (cartItems.length === 0) {
                window.showCustomAlert('Ваша заявка пуста. Перенаправляем в каталог.', 'warning');
                setTimeout(() => { window.location.href = '/products'; }, 2000);
                return;
            }

            populateUserInfo();
            populateAddresses(addressesData);
            renderSummary(cartItems);
            setupDeliveryDate();

        } catch (error) {
            console.error('Error loading checkout data:', error);
            if (summaryItemsContainer) {
                summaryItemsContainer.innerHTML = `<p style="color: var(--error);">Ошибка загрузки.</p>`;
            }
            window.showCustomAlert('Ошибка загрузки данных для оформления', 'error');
        }
    }

    // ========== POPULATE FUNCTIONS ==========
    function populateUserInfo() {
        if (customerNameInput) customerNameInput.value = getCookie('userName') || '';
        if (customerEmailInput) customerEmailInput.value = getCookie('userEmail') || '';
        if (companyNameInput) companyNameInput.value = getCookie('companyName') || '';
        if (companyInnInput) companyInnInput.value = getCookie('companyInn') || '';
    }

    function populateAddresses(addresses) {
        if (!savedAddressesLoader || !savedAddressesContainer) return;
        savedAddressesLoader.style.display = 'none';
        savedAddressesContainer.style.display = 'flex';
        
        if (addresses && addresses.length > 0) {
            savedAddressesContainer.innerHTML = addresses.map(addr => `
                <label class="saved-address-label ${addr.IsDefault ? 'selected' : ''}">
                    <input type="radio" name="delivery_address" value="${addr.AddressID}" ${addr.IsDefault ? 'checked' : ''}>
                    <div>
                        <div class="address-type">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                <circle cx="12" cy="10" r="3"/>
                            </svg>
                            ${addr.AddressType}
                        </div>
                        <div class="address-details">${addr.City}, ${addr.Street}, д. ${addr.House}${addr.Apartment ? ', кв. ' + addr.Apartment : ''}</div>
                    </div>
                </label>
            `).join('');
            
            // Add event listeners for radio buttons
            savedAddressesContainer.querySelectorAll('input[type="radio"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    savedAddressesContainer.querySelectorAll('.saved-address-label').forEach(label => {
                        label.classList.remove('selected');
                    });
                    e.target.closest('.saved-address-label').classList.add('selected');
                });
            });
        } else {
            savedAddressesContainer.innerHTML = '<p style="color: var(--text-secondary); padding: 1rem; text-align: center;">У вас нет сохраненных адресов. Пожалуйста, добавьте адрес доставки.</p>';
        }
    }

    function setupDeliveryDate() {
        if (deliveryDateInput) {
            // Set minimum date to tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            deliveryDateInput.min = tomorrow.toISOString().split('T')[0];
        }
    }

    function renderSummary(items) {
        let subtotal = 0;
        if (!summaryItemsContainer) return;

        summaryItemsContainer.innerHTML = items.map(item => {
            const price = item.Price || 0;
            subtotal += price * item.Quantity;
            const imageSrc = item.ImageURL ? `/${item.ImageURL.replace(/\\/g, '/')}` : '/images/placeholder.png';
            return `
            <div class="summary-item">
                <img src="${imageSrc}" alt="${item.ProductName}" class="summary-item-img">
                <div class="item-details">
                    <h4>${item.ProductName}</h4>
                    <p>${(price).toFixed(2)} ₽ × ${item.Quantity} шт.</p>
                </div>
                <strong>${(price * item.Quantity).toFixed(2)} ₽</strong>
            </div>
            `;
        }).join('');
        
        const vat = subtotal * 0.20;
        // FIX: Итоговая сумма должна включать НДС
        const total = subtotal + vat; 

        if (summarySubtotalEl) summarySubtotalEl.textContent = `${subtotal.toFixed(2)} ₽`;
        if (summaryVatEl) summaryVatEl.textContent = `${vat.toFixed(2)} ₽`;
        if (summaryTotalEl) summaryTotalEl.textContent = `${total.toFixed(2)} ₽`;
    }

    // ========== FORM VALIDATION ==========
    function validateStep1() {
        const required = [
            customerNameInput,
            customerEmailInput,
            customerPhoneInput,
            companyNameInput,
            companyInnInput
        ];

        for (let input of required) {
            if (!input || !input.value.trim()) {
                window.showCustomAlert('Пожалуйста, заполните все обязательные поля', 'warning');
                input?.focus();
                return false;
            }
        }

        // INN validation
        const inn = companyInnInput.value.trim();
        if (inn.length !== 10 && inn.length !== 12) {
            window.showCustomAlert('ИНН должен содержать 10 или 12 цифр', 'warning');
            companyInnInput.focus();
            return false;
        }

        return true;
    }

    function validateStep2() {
        const selectedAddress = document.querySelector('input[name="delivery_address"]:checked');
        if (!selectedAddress) {
            window.showCustomAlert('Пожалуйста, выберите адрес доставки', 'warning');
            return false;
        }
        return true;
    }

    // ========== FORM SUBMIT HANDLER ==========
    if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (currentStep === 1) {
            if (!validateStep1()) return;

            infoStep.style.display = 'none';
            paymentStep.style.display = 'block';
            stepsIndicators[0].classList.remove('active');
            stepsIndicators[1].classList.add('active');
            checkoutNextBtn.textContent = 'Отправить заявку';
            currentStep = 2;
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } else if (currentStep === 2) {
            if (!validateStep2()) return;

            const placeOrderBtn = document.getElementById('checkoutNextBtn');
            placeOrderBtn.disabled = true; // Блокируем кнопку сразу

            let confirmed = false;
            try {
                // Показываем подтверждение
                console.log("Показываю модальное окно подтверждения...");
                confirmed = await window.showCustomConfirm(
                    'Вы уверены, что хотите отправить заявку? Наш менеджер свяжется с вами в ближайшее время.', 
                    'Подтверждение заявки'
                );
                console.log("Результат подтверждения:", confirmed);

            } catch (error) {
                console.error("Ошибка в showCustomConfirm:", error);
                placeOrderBtn.disabled = false; // Разблокируем кнопку, если модалка сломалась
                return;
            }

            // Если пользователь нажал "Нет", выходим и разблокируем кнопку
            if (!confirmed) {
                console.log("Пользователь отменил отправку.");
                placeOrderBtn.disabled = false;
                return;
            }
            
            // Если пользователь нажал "Да", продолжаем
            placeOrderBtn.textContent = 'Обработка...';
            try {
                    const orderData = {
                        // Contact info
                        customerName: customerNameInput.value,
                        customerPosition: customerPositionInput.value,
                        customerPhone: customerPhoneInput.value,
                        customerEmail: customerEmailInput.value,
                        
                        // Company info
                        companyName: companyNameInput.value,
                        companyInn: companyInnInput.value,
                        companyKpp: companyKppInput.value,
                        companyLegalAddress: companyLegalAddressInput.value,
                        
                        // Delivery
                        deliveryAddressId: document.querySelector('input[name="delivery_address"]:checked')?.value,
                        deliveryDate: deliveryDateInput.value,
                        deliveryTime: deliveryTimeInput.value,
                        deliveryComment: deliveryCommentInput.value,
                        
                        // Payment & options
                        paymentMethod: document.querySelector('input[name="payment_method"]:checked')?.value,
                        orderComment: orderCommentInput.value,
                        needDocuments: needDocumentsInput.checked,
                        urgentOrder: urgentOrderInput.checked
                    };

                    const response = await fetch(`${API_URL}/orders/create`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
                    body: JSON.stringify(orderData)
                });
                
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);

                window.showCustomAlert(`Спасибо! Ваша заявка №${result.orderId} успешно оформлена.`, 'success');
                stepsIndicators[1].classList.remove('active');
                stepsIndicators[2].classList.add('active');
                placeOrderBtn.textContent = 'Заявка отправлена!';
                setTimeout(() => { window.location.href = '/profile#orders'; }, 3000);

                } catch (error) {
                    console.error('Order creation error:', error);
                    window.showCustomAlert(`Ошибка оформления заявки: ${error.message}`, 'error');
                    checkoutNextBtn.disabled = false;
                    checkoutNextBtn.textContent = 'Отправить заявку';
                }
            }
        });
    }

    // ========== ADDRESS MODAL LOGIC ==========
    const addAddressLink = document.querySelector('.add-link');
    const addressModalOverlay = document.getElementById('addressModalOverlay');
    const closeAddressModalBtn = document.getElementById('closeAddressModalBtn');
    const addressForm = document.getElementById('addressForm');

    function openModal(modalElement) {
        if (!modalElement) return;
        modalElement.classList.add('show'); // ДОБАВИТЬ
    }

    function closeModal(modalElement) {
        if (!modalElement) return;
        modalElement.classList.remove('show'); 
    }

    if (addAddressLink && addressModalOverlay) {
        addAddressLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (addressForm) {
                addressForm.reset();
                addressForm.removeAttribute('data-editing-id');
            }
            const modalTitle = addressModalOverlay.querySelector('h3');
            if (modalTitle) modalTitle.textContent = 'Новый адрес доставки';
            openModal(addressModalOverlay);
        });
    }
    
    if (closeAddressModalBtn && addressModalOverlay) {
        closeAddressModalBtn.addEventListener('click', () => {
            closeModal(addressModalOverlay);
        });
    }

    if (addressModalOverlay) {
        addressModalOverlay.addEventListener('click', (e) => {
            if (e.target === addressModalOverlay) {
                closeModal(addressModalOverlay);
            }
        });
    }

    if (addressForm) {
        addressForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = addressForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Сохранение...';

            // 1. Собираем данные из полей формы
            const newAddressData = {
                AddressType: document.getElementById('addressType').value,
                City: document.getElementById('city').value,
                Street: document.getElementById('street').value,
                House: document.getElementById('house').value,
                Apartment: document.getElementById('apartment').value,
                PostalCode: document.getElementById('postalCode').value
            };

            try {
                // 2. Отправляем данные на сервер
                const response = await fetch(`${API_URL}/addresses`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                    },
                    body: JSON.stringify(newAddressData)
                });

                const result = await response.json();
                if (!response.ok) {
                    // Если сервер вернул ошибку, показываем ее
                    throw new Error(result.message || 'Не удалось сохранить адрес.');
                }
                
                // 3. Если все успешно:
                window.showCustomAlert('Адрес успешно добавлен!', 'success');
                closeModal(addressModalOverlay); // Используем твою новую функцию для плавного закрытия

                // 4. Перезагружаем список адресов, чтобы увидеть новый
                const addressesResponse = await fetch(`${API_URL}/addresses`, { 
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` } 
                });
                const addressesData = await addressesResponse.json();
                populateAddresses(addressesData);

            } catch (error) {
                console.error('Ошибка добавления адреса:', error);
                window.showCustomAlert(error.message, 'error');
            } finally {
                // 5. Возвращаем кнопку в исходное состояние в любом случае
                submitButton.disabled = false;
                submitButton.textContent = 'Сохранить адрес';
            }
        });
    }

    // ========== PAYMENT METHOD SELECTION ==========
    const paymentMethodRadios = document.querySelectorAll('input[name="payment_method"]');
    paymentMethodRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.querySelectorAll('.payment-method').forEach(method => {
                method.classList.remove('selected');
            });
            e.target.closest('.payment-method').classList.add('selected');
        });
    });

    // ========== HELPER FUNCTIONS ==========
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
        return null;
    }

    // Initialize
    loadCheckoutData();
});