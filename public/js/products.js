app.get("/", (req, res) => {
    res.render("index", { 
        title: "Прайм Топ - Производитель красок",
        pageStyles: ['/css/main.css'], 
        pageScripts: ['/js/index.js'],
        bodyClass: 'home-page' 
    });
});


app.get("/products", (req, res) => {
    res.render("products", { 
        title: "Каталог - Прайм Топ",
        pageStyles: ['/css/products.css', '/css/ui-elements.css'], 
        pageScripts: ['https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js','https://cdn.skypack.dev/tweakpane@4.0.4','https://cdn.skypack.dev/gsap@3.13.0/Draggable','https://cdn.skypack.dev/gsap@3.13.0','https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js','/js/products.js','/js/ui-elements.js']
    });
});

app.get('/auth', (req, res) => {
    res.render('auth', { 
        title: 'Вход - Прайм Топ',
        layout: false 
    });
});

app.get("/profile", (req, res) => {
    res.render("profile", { 
        title: "Профиль пользователя - Lime Details",
        pageStyles: ['/css/profile.css', '/css/dashboard.css'], // <-- Добавить CSS
        pageScripts: ['/js/profile.js', '/js/chart.js', 'https://cdn.jsdelivr.net/npm/chart.js'],  // <-- Добавить JS
        bodyClass: 'page-profile'
    });
});

app.get("/checkout", (req, res) => {
    res.render("checkout", { 
        title: "Оформление заказа - Lime Details",
        pageStyles: ['/css/checkout.css'],
        pageScripts: ['/js/checkout.js'],
        bodyClass: 'page-checkout' // <-- ДОБАВИТЬ ЭТОТ КЛАСС
    });
});
