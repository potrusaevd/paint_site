document.addEventListener('DOMContentLoaded', () => {
  // --- Переключение вкладок ---
  const menuItems = document.querySelectorAll('.support-menu .menu-item');
  const tabContents = document.querySelectorAll('.tab-content');

  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.dataset.tab;

      // Активный пункт меню
      menuItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      // Показать только нужный таб
      tabContents.forEach(content => {
        content.classList.toggle('active', content.id === targetTab);
      });
    });
  });

  // --- ИИ чат ---
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const chatMessages = document.getElementById('chatMessages');

  // Конфигурация ИИ
  const AI_CONFIG = {
    // Здесь нужно указать ваш API ключ (лучше получать с сервера)
    apiKey: 'YOUR_API_KEY_HERE', 
    // Можно использовать разные API: OpenAI, Claude, Gemini и т.д.
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo',
    // Контекст для ИИ - что он должен знать о магазине
    systemPrompt: `
      Ты - ассистент службы поддержки магазина автозапчастей "Lime Details".
      
      Информация о магазине:
      - Продаем автозапчасти, масла, шины, диски, автоэлектронику
      - Работаем Пн-Вс с 10:00 до 20:00
      - Телефон: +375 (29) 111-22-33
      - Доставка: 2-7 рабочих дней
      - Оплата: картой, наличными при получении, электронные кошельки
      - Возврат товара в течение 14 дней
      - Поиск запчастей по VIN или марке авто
      
      Ты должен:
      - Отвечать дружелюбно и профессионально
      - Помогать с выбором запчастей
      - Консультировать по заказам и доставке
      - Решать проблемы клиентов
      - Если не знаешь ответ, предложи связаться с менеджером
      - Отвечай кратко и по делу
      - Используй emoji для дружелюбности 😊
    `
  };

  // История разговора для контекста
  let conversationHistory = [
    {
      role: "system",
      content: AI_CONFIG.systemPrompt
    },
    {
      role: "assistant", 
      content: "Привет! Я ассистент Lime Details. Как могу помочь? 😊"
    }
  ];

  // Функция отправки запроса к ИИ
  async function sendToAI(userMessage) {
    try {
      // Добавляем сообщение пользователя в историю
      conversationHistory.push({
        role: "user",
        content: userMessage
      });

      // Показываем индикатор загрузки
      showTypingIndicator();

      const response = await fetch(AI_CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_CONFIG.apiKey}`
        },
        body: JSON.stringify({
          model: AI_CONFIG.model,
          messages: conversationHistory,
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      // Добавляем ответ ИИ в историю
      conversationHistory.push({
        role: "assistant",
        content: aiResponse
      });

      return aiResponse;

    } catch (error) {
      console.error('Ошибка при обращении к ИИ:', error);
      return getFallbackResponse(userMessage);
    }
  }

  // Показать индикатор печати
  function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('message', 'bot-message', 'typing-indicator');
    typingDiv.innerHTML = `
      <span class="typing-dots">
        <span>.</span><span>.</span><span>.</span>
      </span>
      Печатаю...
    `;
    typingDiv.id = 'typing-indicator';
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Убрать индикатор печати
  function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  // Резервные ответы если ИИ недоступен
  function getFallbackResponse(userMessage) {
    const message = userMessage.toLowerCase();
    
    // Простые правила для базовых ответов
    if (message.includes('заказ') || message.includes('доставка')) {
      return 'По вопросам заказов и доставки звоните +375 (29) 111-22-33. Доставка занимает 2-7 рабочих дней 📦';
    }
    
    if (message.includes('оплата') || message.includes('платить')) {
      return 'Принимаем карты, наличные при получении и электронные кошельки 💳';
    }
    
    if (message.includes('возврат') || message.includes('обмен')) {
      return 'Возврат товара возможен в течение 14 дней. Свяжитесь с нами для оформления 🔄';
    }
    
    if (message.includes('запчаст') || message.includes('деталь')) {
      return 'Для подбора запчастей используйте каталог на сайте или назовите VIN номер автомобиля 🔧';
    }
    
    if (message.includes('время') || message.includes('работа')) {
      return 'Мы работаем ежедневно с 10:00 до 20:00 🕙';
    }
    
    // Ответ по умолчанию
    return 'Спасибо за обращение! Сейчас ИИ недоступен, но наш менеджер скоро ответит. Или звоните +375 (29) 111-22-33 📞';
  }

  // Основная логика чата
  if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const messageText = chatInput.value.trim();
      if (!messageText) return;

      // Сообщение пользователя
      const userMessage = document.createElement('div');
      userMessage.classList.add('message', 'user-message');
      userMessage.textContent = messageText;
      chatMessages.appendChild(userMessage);

      // Прокрутка вниз
      chatMessages.scrollTop = chatMessages.scrollHeight;

      // Очищаем поле ввода
      chatInput.value = '';
      chatInput.focus();

      // Получаем ответ от ИИ
      try {
        const aiResponse = await sendToAI(messageText);
        
        // Убираем индикатор печати
        hideTypingIndicator();
        
        // Показываем ответ ИИ
        const botMessage = document.createElement('div');
        botMessage.classList.add('message', 'bot-message');
        botMessage.textContent = aiResponse;
        chatMessages.appendChild(botMessage);
        
        // Прокрутка вниз
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
      } catch (error) {
        hideTypingIndicator();
        console.error('Ошибка чата:', error);
        
        // Показываем сообщение об ошибке
        const errorMessage = document.createElement('div');
        errorMessage.classList.add('message', 'bot-message');
        errorMessage.textContent = 'Извините, произошла ошибка. Попробуйте позже или свяжитесь с нами по телефону.';
        chatMessages.appendChild(errorMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    });
  }

  // Альтернативный вариант с использованием бесплатного API
  // Можно использовать Hugging Face Inference API (бесплатно)
  async function sendToHuggingFace(userMessage) {
    try {
      const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer YOUR_HUGGINGFACE_TOKEN',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: userMessage,
          parameters: {
            max_length: 100,
            temperature: 0.7
          }
        })
      });

      const data = await response.json();
      return data.generated_text || 'Извините, не смог обработать запрос';
      
    } catch (error) {
      console.error('Ошибка Hugging Face API:', error);
      return getFallbackResponse(userMessage);
    }
  }
});

 