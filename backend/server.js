const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto =require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { sql, poolPromise } = require('./db');
const { sendVerificationEmail } = require('./mailer');
const ejsLayouts = require('express-ejs-layouts');
// ИЗМЕНЕНИЕ: Импортируем необходимые функции из express-validator
const { body, validationResult } = require('express-validator');

const app = express();
console.log("A: Express создан");
const port = 3000;

// ===========================================
// --- Настройки Express и Middleware ---
// ===========================================

app.use(ejsLayouts);
app.set('layout', 'partials/_layout');

// 1. Настройка шаблонизатора EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 2. Настройка раздачи статических файлов
app.use(express.static(path.join(__dirname, '..', 'public')));

// Отдельно указываем путь к загруженным аватарам
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 3. Другие Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// ИЗМЕНЕНИЕ: Убран устаревший пакет xss-clean, вызывавший ошибку.
// app.use(xss());

// Генерируем секретный ключ при каждом запуске. Для продакшена выносится в .env
const SECRET_KEY = crypto.randomBytes(64).toString('hex');

// --- Multer для загрузки файлов ---
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) { fs.mkdirSync(uploadsDir); }
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Ограничение 5 МБ
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const mimetype = allowedTypes.test(file.mimetype);
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Ошибка: Разрешены только изображения (jpeg, jpg, png, gif)!'));
    }
});

// --- MIDDLEWARE для проверки JWT токена ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.status(401).json({ message: 'Доступ запрещен. Токен не предоставлен.' });
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: 'Доступ запрещен. Невалидный токен.' });
        req.user = user;
        next();
    });
};

// ===========================================
// --- НОВЫЙ РАЗДЕЛ: Маршруты для рендеринга страниц ---
// ===========================================
app.get("/", (req, res) => {
    res.render("index", {
        title: "Прайм Топ - Производитель красок",
        pageStyles: ['/css/main.css'],
        pageScripts: ['/js/index.js']
    });
});

app.get("/catalog", (req, res) => {
    res.render("catalog", {
        title: "Каталог товаров - Lime Details",
        pageStyles: ['/css/catalog.css'],
        pageScripts: ['/js/catalog.js']
    });
});

app.get("/products", (req, res) => {
    res.render("products", {
        title: "Товары - Lime Details",
        pageStyles: ['/css/products.css'],
        pageScripts: ['/js/products.js']
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
        pageStyles: ['/css/profile.css'],
        pageScripts: ['/js/profile.js']
    });
});

app.get("/delivery", (req, res) => {
    res.render("delivery", {
        title: "Оплата и доставка — Lime Details",
        pageStyles: ['/css/info-page.css']
    });
});

app.get("/warranty", (req, res) => {
    res.render("warranty", {
        title: "Гарантия — Lime Details",
        pageStyles: ['/css/info-page.css']
    });
});

app.get("/support", (req, res) => {
    res.render("support", {
        title: "Поддержка | Lime Details",
        pageStyles: ['/css/support.css'],
        pageScripts: ['/js/support.js']
    });
});

app.get("/checkout", (req, res) => {
    res.render("checkout", {
        title: "Оформление заказа - Lime Details",
        pageStyles: ['/css/checkout.css'],
        pageScripts: ['/js/checkout.js']
    });
});



// --- ОТКРЫТЫЕ API  ---
app.get('/api/search', async (req, res) => {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
        return res.json([]);
    }

    try {
        const pool = await poolPromise;
        const searchQuery = `%${query}%`;

        const result = await pool.request()
            .input('SearchQuery', sql.NVarChar, searchQuery)
            .query(`
                SELECT TOP 20
                    ProductID,
                    ProductName,
                    Brand,
                    Price,
                    DiscountPrice,
                    ImageURL
                FROM Products
                WHERE ProductName LIKE @SearchQuery OR Brand LIKE @SearchQuery
            `);

        res.json(result.recordset);
    } catch (error) {
        console.error("Ошибка при выполнении поиска:", error);
        res.status(500).json({ message: "Ошибка на сервере при поиске." });
    }
});

// ИЗМЕНЕНИЕ: Добавлен массив middleware для валидации и санитизации данных
app.post('/api/register', [
    body('username', 'Имя пользователя не должно быть пустым').trim().notEmpty().escape(),
    body('email', 'Некорректный email').isEmail().normalizeEmail(),
    body('companyName', 'Название компании не должно быть пустым').trim().notEmpty().escape(),
    body('password', 'Пароль должен содержать минимум 6 символов').isLength({ min: 6 })
], async (req, res) => {
    // ИЗМЕНЕНИЕ: Блок проверки результатов валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Если есть ошибки, возвращаем статус 400 и список ошибок
        return res.status(400).json({ message: 'Ошибка ввода данных', errors: errors.array() });
    }

    const { username, email, password, companyName } = req.body;

    // Дополнительная проверка на всякий случай, хотя express-validator уже это делает
    if (!username || !email || !password || !companyName) {
        return res.status(400).json({ message: 'Все поля (Имя, Email, Пароль, Название компании) обязательны.' });
    }

    let pool;
    try {
        pool = await poolPromise;

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            let request = new sql.Request(transaction);

            const existingUser = await request.input('Email', sql.NVarChar, email).query('SELECT UserID FROM Users WHERE Email = @Email');
            if (existingUser.recordset.length > 0) {
                await transaction.rollback();
                return res.status(409).json({ message: 'Пользователь с таким email уже существует.' });
            }

            request = new sql.Request(transaction);
            const companyResult = await request
                .input('CompanyName', sql.NVarChar, companyName)
                .query('INSERT INTO Companies (CompanyName) OUTPUT INSERTED.CompanyID VALUES (@CompanyName)');
            const newCompanyId = companyResult.recordset[0].CompanyID;

            const passwordHash = await bcrypt.hash(password, 10);
            const verificationToken = crypto.randomBytes(32).toString('hex');
            const tokenExpiry = new Date(Date.now() + 3600000);

            request = new sql.Request(transaction);
            await request
                .input('Username', sql.NVarChar, username)
                .input('Email', sql.NVarChar, email)
                .input('PasswordHash', sql.NVarChar, passwordHash)
                .input('VerificationToken', sql.NVarChar, verificationToken)
                .input('TokenExpiry', sql.DateTime, tokenExpiry)
                .input('CompanyID', sql.Int, newCompanyId)
                .query('INSERT INTO Users (Username, Email, PasswordHash, VerificationToken, TokenExpiry, CompanyID) VALUES (@Username, @Email, @PasswordHash, @VerificationToken, @TokenExpiry, @CompanyID)');

            await transaction.commit();

            await sendVerificationEmail(email, verificationToken);
            res.status(201).json({ message: 'Регистрация прошла успешно! Проверьте почту для подтверждения аккаунта.' });

        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error('Критическая ошибка при регистрации в транзакции:', err);
        res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request().input('Email', sql.NVarChar, email).query('SELECT * FROM Users WHERE Email = @Email');
        const user = result.recordset[0];
        if (!user) return res.status(401).json({ message: 'Неверные учетные данные.' });
        if (!user.IsEmailVerified) return res.status(403).json({ message: 'Пожалуйста, подтвердите ваш email перед входом.' });
        const isPasswordMatch = await bcrypt.compare(password, user.PasswordHash);
        if (!isPasswordMatch) return res.status(401).json({ message: 'Неверные учетные данные.' });

        const accessToken = jwt.sign(
    { userId: user.UserID, email: user.Email, companyId: user.CompanyID },
        SECRET_KEY,
        { expiresIn: '6h' }
    );

    res.status(200).json({
        accessToken,
        userId: user.UserID,
        username: user.Username,
        email: user.Email,
        avatarUrl: user.AvatarURL,
        companyId: user.CompanyID
    });
    } catch (err) {
        console.error('Ошибка входа:', err);
        res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
    }
});

app.get('/api/verify-email', async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).send('<h1>Ошибка верификации</h1><p>Токен не предоставлен.</p>');
    try {
        const pool = await poolPromise;
        const result = await pool.request().input('VerificationToken', sql.NVarChar, token).query('SELECT * FROM Users WHERE VerificationToken = @VerificationToken AND TokenExpiry > GETUTCDATE()');
        const user = result.recordset[0];
        if (!user) return res.status(400).send('<h1>Ошибка верификации</h1><p>Неверный или просроченный токен.</p>');
        await pool.request().input('UserID', sql.Int, user.UserID).query('UPDATE Users SET IsEmailVerified = 1, VerificationToken = NULL, TokenExpiry = NULL WHERE UserID = @UserID');
        res.send('<h1>Email успешно подтвержден!</h1><p>Теперь вы можете закрыть эту вкладку и войти в свой аккаунт на сайте.</p>');
    } catch (err) {
        console.error('Ошибка верификации:', err);
        res.status(500).send('<h1>Ошибка сервера</h1><p>Не удалось завершить верификацию. Попробуйте позже.</p>');
    }
});

app.get('/api/products', async (req, res) => {
    const { category, subcategory, brands, sortBy, order = 'ASC' } = req.query;
    try {
        const pool = await poolPromise;
        const request = pool.request();
        let query = 'SELECT ProductID, ProductName, Description, Price, Brand, Category, SubCategory, StockQuantity, ImageURL, Rating, ReviewCount FROM Products';
        let conditions = [];
        if (category && category !== 'all') {
            conditions.push(`Category = @Category`);
            request.input('Category', sql.NVarChar, category);
        }
        if (subcategory) {
            conditions.push(`SubCategory = @SubCategory`);
            request.input('SubCategory', sql.NVarChar, subcategory);
        }
        const { ralColor, coatingType } = req.query;
        if (ralColor) {
            conditions.push(`RalColor = @RalColor`);
            request.input('RalColor', sql.NVarChar, ralColor);
        }
        if (coatingType) {
            conditions.push(`CoatingType = @CoatingType`);
            request.input('CoatingType', sql.NVarChar, coatingType);
        }
        if (brands) {
            const brandList = brands.split(',');
            const brandPlaceholders = brandList.map((_, index) => `@brand${index}`).join(',');
            conditions.push(`Brand IN (${brandPlaceholders})`);
            brandList.forEach((brand, index) => {
                request.input(`brand${index}`, sql.NVarChar, brand);
            });
        }
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        if (sortBy) {
            const allowedSortBy = ['Price', 'ProductName', 'Brand', 'Rating'];
            if (allowedSortBy.includes(sortBy)) {
                const sortOrder = (order.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';
                query += ` ORDER BY ${sortBy} ${sortOrder}`;
            }
        }
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (error) {
        console.error("Ошибка при получении продуктов:", error);
        res.status(500).json({ message: "Ошибка на сервере при получении списка товаров." });
    }
});

app.get('/api/products/promo', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT TOP 10
                ProductID,
                ProductName,
                Price,
                DiscountPrice,
                ImageURL,
                Rating
            FROM Products
            WHERE DiscountPrice IS NOT NULL AND StockQuantity > 0
            ORDER BY NEWID()
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error("Ошибка при получении промо-товаров:", error);
        res.status(500).json({ message: "Ошибка на сервере при получении промо-товаров." });
    }
});

// --- ЗАЩИЩЕННЫЕ API  ---
app.post('/api/avatar/upload', authenticateToken, upload.single('avatar'), async (req, res) => {
    const email = req.user.email;
    if (!req.file || !email) return res.status(400).json({ message: 'Файл или email не предоставлены.' });
    try {
        const filePath = `uploads/${req.file.filename}`;
        const pool = await poolPromise;
        await pool.request()
            .input('AvatarURL', sql.NVarChar, filePath)
            .input('Email', sql.NVarChar, email)
            .query('UPDATE Users SET AvatarURL = @AvatarURL WHERE Email = @Email');
        res.status(200).json({ message: 'Аватар успешно загружен!', filePath: filePath });
    } catch (err) {
        console.error('Ошибка загрузки аватара:', err);
        res.status(500).json({ message: 'Ошибка сервера при загрузке аватара.' });
    }
});

// ИЗМЕНЕНИЕ: Добавлена валидация и санитизация имени пользователя
app.put('/api/user/update', [
    authenticateToken,
    body('username', 'Имя пользователя не может быть пустым').trim().notEmpty().escape()
], async (req, res) => {
    // ИЗМЕНЕНИЕ: Блок проверки результатов валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.userId;
    const { username } = req.body;
    if (!username) return res.status(400).json({ message: 'Имя пользователя не предоставлено.' });
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('UserID', sql.Int, userId)
            .input('Username', sql.NVarChar, username)
            .query('UPDATE Users SET Username = @Username WHERE UserID = @UserID');
        res.status(200).json({ message: 'Данные успешно обновлены!', newUsername: username });
    } catch (error) {
        console.error('Ошибка обновления данных пользователя:', error);
        res.status(500).json({ message: 'Ошибка сервера.' });
    }
});

// Создать новый заказ из корзины
app.post('/api/orders/create', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const companyId = req.user.companyId;
    let transaction;
    try {
        const pool = await poolPromise;
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        let request = new sql.Request(transaction);

        // 1. Получаем товары из корзины
        const cartItemsResult = await request
            .input('UserID_Cart', sql.Int, userId)
            .query('SELECT ci.ProductID, ci.Quantity, p.ProductName, p.Price, p.DiscountPrice, p.ImageURL FROM CartItems ci JOIN Products p ON ci.ProductID = p.ProductID WHERE ci.UserID = @UserID_Cart');

        const cartItems = cartItemsResult.recordset;
        if (cartItems.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Ваша корзина пуста.' });
        }

        // 2. Рассчитываем итоговую сумму
        const total = cartItems.reduce((sum, item) => {
            const price = item.DiscountPrice || item.Price;
            return sum + (price * item.Quantity);
        }, 0);

        // 3. Создаем запись в таблице Orders
        request = new sql.Request(transaction);
        const orderResult = await request
            .input('UserID_Order', sql.Int, userId)
            .input('CompanyID_Order', sql.Int, companyId)
            .input('Total', sql.Decimal(10, 2), total)
            .query('INSERT INTO Orders (UserID, CompanyID, Status, Total) OUTPUT INSERTED.OrderID VALUES (@UserID_Order, @CompanyID_Order, \'processing\', @Total)');
        const newOrderId = orderResult.recordset[0].OrderID;

        // 4. Переносим товары из корзины в OrderItems
        for (const item of cartItems) {
            request = new sql.Request(transaction);
            await request
                .input('OrderID', sql.Int, newOrderId)
                .input('ProductName', sql.NVarChar, item.ProductName)
                .input('Quantity', sql.Int, item.Quantity)
                .input('Price', sql.Decimal(10, 2), item.DiscountPrice || item.Price)
                .input('ImageURL', sql.NVarChar, item.ImageURL)
                .query('INSERT INTO OrderItems (OrderID, ProductName, Quantity, Price, ImageURL) VALUES (@OrderID, @ProductName, @Quantity, @Price, @ImageURL)');
        }

        // 5. Очищаем корзину
        request = new sql.Request(transaction);
        await request
            .input('UserID_Clear', sql.Int, userId)
            .query('DELETE FROM CartItems WHERE UserID = @UserID_Clear');

        // 6. Подтверждаем транзакцию
        await transaction.commit();
        res.status(201).json({ message: 'Заказ успешно создан!', orderId: newOrderId });

    } catch (err) {
        if (transaction && transaction.active) {
            await transaction.rollback();
        }
        console.error("КРИТИЧЕСКАЯ ОШИБКА СОЗДАНИЯ ЗАКАЗА:", err);
        res.status(500).json({ message: 'Внутренняя ошибка сервера при создании заказа.' });
    }
});

app.get('/api/checkout-info', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const pool = await poolPromise;

        // Запрос 1: Получаем данные пользователя
        const userResult = await pool.request()
            .input('UserID', sql.Int, userId)
            .query('SELECT Username, Email FROM Users WHERE UserID = @UserID');

        // Запрос 2: Получаем адреса пользователя
        const addressesResult = await pool.request()
            .input('UserID', sql.Int, userId)
            .query('SELECT * FROM Addresses WHERE UserID = @UserID ORDER BY IsDefault DESC, AddressID ASC');

        if (userResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Пользователь не найден.' });
        }

        res.json({
            user: userResult.recordset[0],
            addresses: addressesResult.recordset
        });

    } catch (error) {
        console.error('Ошибка получения данных для оформления заказа:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// ===========================================
// --- API для Корзины  ---
// ===========================================

// Получить содержимое корзины пользователя
app.get('/api/cart', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('UserID', sql.Int, req.user.userId)
            .query(`
                SELECT
                    ci.ProductID,
                    ci.Quantity,
                    p.ProductName,
                    p.Price,
                    p.DiscountPrice,
                    p.ImageURL,
                    p.ProductSeries,
                    p.RalColor,
                    p.VolumeLiters as Volume
                FROM CartItems ci
                JOIN Products p ON ci.ProductID = p.ProductID
                WHERE ci.UserID = @UserID
            `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Ошибка получения корзины' }); }
});

// Добавить товар в корзину
app.post('/api/cart/add', authenticateToken, async (req, res) => {
    const { productId, quantity = 1 } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('UserID', sql.Int, req.user.userId)
            .input('ProductID', sql.Int, productId)
            .input('Quantity', sql.Int, quantity)
            .query(`
                MERGE INTO CartItems AS target
                USING (SELECT @UserID AS UserID, @ProductID AS ProductID) AS source
                ON (target.UserID = source.UserID AND target.ProductID = source.ProductID)
                WHEN MATCHED THEN
                    UPDATE SET Quantity = target.Quantity + @Quantity
                WHEN NOT MATCHED THEN
                    INSERT (UserID, ProductID, Quantity) VALUES (source.UserID, source.ProductID, @Quantity);
            `);
        res.status(200).json({ message: 'Товар добавлен в корзину' });
    } catch (err) { res.status(500).json({ message: 'Ошибка добавления товара' }); }
});

// Обновить количество товара
app.put('/api/cart/update', authenticateToken, async (req, res) => {
    const { productId, quantity } = req.body;
    if (quantity <= 0) {
         // Вместо небезопасного redirect, который не работает для API,
         // просто удаляем товар здесь же
        try {
            const pool = await poolPromise;
            await pool.request()
                .input('UserID', sql.Int, req.user.userId)
                .input('ProductID', sql.Int, productId)
                .query('DELETE FROM CartItems WHERE UserID = @UserID AND ProductID = @ProductID');
            return res.status(200).json({ message: 'Товар удален из корзины' });
        } catch (err) {
            return res.status(500).json({ message: 'Ошибка удаления товара при обновлении количества' });
        }
    }
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('UserID', sql.Int, req.user.userId)
            .input('ProductID', sql.Int, productId)
            .input('Quantity', sql.Int, quantity)
            .query('UPDATE CartItems SET Quantity = @Quantity WHERE UserID = @UserID AND ProductID = @ProductID');
        res.status(200).json({ message: 'Количество обновлено' });
    } catch (err) { res.status(500).json({ message: 'Ошибка обновления количества' }); }
});

// Удалить товар из корзины
app.delete('/api/cart/remove', authenticateToken, async (req, res) => {
    const { productId } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('UserID', sql.Int, req.user.userId)
            .input('ProductID', sql.Int, productId)
            .query('DELETE FROM CartItems WHERE UserID = @UserID AND ProductID = @ProductID');
        res.status(200).json({ message: 'Товар удален из корзины' });
    } catch (err) { res.status(500).json({ message: 'Ошибка удаления товара' }); }
});

app.post('/api/user/change-password', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request().input('UserID', sql.Int, userId).query('SELECT PasswordHash FROM Users WHERE UserID = @UserID');
        const user = result.recordset[0];
        if (!user) return res.status(404).json({ message: "Пользователь не найден." });
        const isPasswordMatch = await bcrypt.compare(currentPassword, user.PasswordHash);
        if (!isPasswordMatch) return res.status(400).json({ message: "Текущий пароль неверен." });
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await pool.request()
            .input('UserID', sql.Int, userId)
            .input('PasswordHash', sql.NVarChar, newPasswordHash)
            .query('UPDATE Users SET PasswordHash = @PasswordHash WHERE UserID = @UserID');
        res.status(200).json({ message: "Пароль успешно изменен." });
    } catch (error) {
        console.error('Ошибка смены пароля:', error);
        res.status(500).json({ message: "Ошибка сервера." });
    }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
    const companyId = req.user.companyId;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('CompanyID', sql.Int, companyId)
            .query(`
                SELECT o.OrderID as id, o.OrderDate as date, o.Status as status, o.Total as total,
                    (SELECT oi.ProductName as name, oi.Quantity as quantity, oi.Price as price, oi.ImageURL as img
                     FROM OrderItems oi WHERE oi.OrderID = o.OrderID FOR JSON PATH) as items
                FROM Orders o
                WHERE o.IsHidden = 0 AND o.CompanyID = @CompanyID
                ORDER BY CASE o.Status WHEN 'processing' THEN 1 WHEN 'shipped' THEN 2 WHEN 'delivered' THEN 3 WHEN 'cancelled' THEN 4 ELSE 5 END, o.OrderDate DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Ошибка получения заказов:', err);
        res.status(500).send(err.message);
    }
});

app.post('/api/orders/:id/repeat', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const companyId = req.user.companyId;
    const originalOrderId = req.params.id;
    let transaction;
    try {
        const pool = await poolPromise;
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const originalOrderRequest = new sql.Request(transaction);
        const originalOrder = await originalOrderRequest
            .input('OrderID', sql.Int, originalOrderId)
            .input('CompanyID', sql.Int, companyId)
            .query('SELECT * FROM Orders WHERE OrderID = @OrderID AND CompanyID = @CompanyID');

        if (originalOrder.recordset.length === 0) {
             await transaction.rollback();
             return res.status(404).send('Исходный заказ не найден или не принадлежит вашей компании');
        }

        const newOrderRequest = new sql.Request(transaction);
        const newOrderResult = await newOrderRequest
            .input('UserID', sql.Int, userId)
            .input('CompanyID', sql.Int, companyId)
            .input('Total', sql.Decimal(10, 2), originalOrder.recordset[0].Total)
            .query('INSERT INTO Orders (UserID, CompanyID, Status, Total) OUTPUT INSERTED.OrderID VALUES (@UserID, @CompanyID, \'processing\', @Total)');
        const newOrderId = newOrderResult.recordset[0].OrderID;

        const itemsRequest = new sql.Request(transaction);
        await itemsRequest.input('NewOrderID', sql.Int, newOrderId).input('OldOrderID', sql.Int, originalOrderId).query('INSERT INTO OrderItems (OrderID, ProductName, Quantity, Price, ImageURL) SELECT @NewOrderID, ProductName, Quantity, Price, ImageURL FROM OrderItems WHERE OrderID = @OldOrderID');

        await transaction.commit();
        res.status(201).json({ message: 'Заказ успешно повторен!', newOrderId: newOrderId });
    } catch (err) {
        if (transaction && transaction.active) {
            await transaction.rollback();
        }
        console.error("Ошибка при повторе заказа:", err);
        res.status(500).send(err.message);
    }
});

app.put('/api/orders/:id/cancel', authenticateToken, async (req, res) => {
    const companyId = req.user.companyId;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('OrderID', sql.Int, req.params.id)
            .input('CompanyID', sql.Int, companyId)
            .query('UPDATE Orders SET Status = \'cancelled\' WHERE OrderID = @OrderID AND CompanyID = @CompanyID');
        if (result.rowsAffected[0] === 0) return res.status(404).send('Заказ не найден или не принадлежит вашей компании');
        res.status(200).send('Заказ отменен');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// ===========================================
// --- API для Избранного  ---
// ===========================================

app.get('/api/favorites', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('UserID', sql.Int, userId)
            .query(`
                SELECT p.ProductID, p.ProductName, p.Price, p.DiscountPrice, p.ImageURL
                FROM UserFavorites uf
                JOIN Products p ON uf.ProductID = p.ProductID
                WHERE uf.UserID = @UserID
                ORDER BY uf.DateAdded DESC
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Ошибка получения избранных товаров:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

app.post('/api/favorites/toggle', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    let { productId } = req.body;

    productId = parseInt(productId, 10);
    if (!productId || isNaN(productId)) {
        return res.status(400).json({ message: 'Передан некорректный ID товара.' });
    }

    try {
        const pool = await poolPromise;

        const existingFavorite = await pool.request()
            .input('UserID', sql.Int, userId)
            .input('ProductID', sql.Int, productId)
            .query('SELECT FavoriteID FROM UserFavorites WHERE UserID = @UserID AND ProductID = @ProductID');

        if (existingFavorite.recordset.length > 0) {
            await pool.request()
                .input('UserID', sql.Int, userId)
                .input('ProductID', sql.Int, productId)
                .query('DELETE FROM UserFavorites WHERE UserID = @UserID AND ProductID = @ProductID');
            res.status(200).json({ message: 'Товар удален из избранного.', action: 'removed' });
        } else {
            await pool.request()
                .input('UserID', sql.Int, userId)
                .input('ProductID', sql.Int, productId)
                .query('INSERT INTO UserFavorites (UserID, ProductID) VALUES (@UserID, @ProductID)');
            res.status(201).json({ message: 'Товар добавлен в избранное.', action: 'added' });
        }
    } catch (error) {
        console.error('Ошибка при переключении избранного:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера при работе с избранным.' });
    }
});

app.delete('/api/favorites/all', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('UserID', sql.Int, userId)
            .query('DELETE FROM UserFavorites WHERE UserID = @UserID');

        res.status(200).json({ message: 'Избранное успешно очищено.' });
    } catch (error) {
        console.error('Ошибка при очистке избранного:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

app.get('/api/favorites/ids', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('UserID', sql.Int, userId)
            .query('SELECT ProductID FROM UserFavorites WHERE UserID = @UserID');

        const favoriteIds = result.recordset.map(item => item.ProductID);
        res.json(favoriteIds);

    } catch (error) {
        console.error('Ошибка получения ID избранных товаров:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

app.put('/api/orders/:id/hide', authenticateToken, async (req, res) => {
    const companyId = req.user.companyId;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('OrderID', sql.Int, req.params.id)
            .input('CompanyID', sql.Int, companyId)
            .query('UPDATE Orders SET IsHidden = 1 WHERE OrderID = @OrderID AND CompanyID = @CompanyID');
        if (result.rowsAffected[0] === 0) return res.status(404).send('Заказ не найден или не принадлежит вашей компании');
        res.status(200).send('Заказ скрыт');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/addresses', authenticateToken, async (req, res) => {
    const companyId = req.user.companyId;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('CompanyID', sql.Int, companyId)
            .query('SELECT * FROM Addresses WHERE CompanyID = @CompanyID');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// ИЗМЕНЕНИЕ: Добавлена валидация и санитизация полей адреса
const addressValidator = [
    body('AddressType').trim().notEmpty().escape(),
    body('City').trim().notEmpty().escape(),
    body('Street').trim().notEmpty().escape(),
    body('House').trim().notEmpty().escape(),
    body('Apartment').trim().escape(),
    body('PostalCode').trim().escape()
];

app.post('/api/addresses', authenticateToken, addressValidator, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Ошибка ввода данных', errors: errors.array() });
    }

    const companyId = req.user.companyId;
    const { AddressType, City, Street, House, Apartment, PostalCode } = req.body;
    if (!AddressType || !City || !Street || !House) {
        return res.status(400).json({ message: 'Не все обязательные поля были заполнены.' });
    }
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('CompanyID', sql.Int, companyId)
            .input('AddressType', sql.NVarChar, AddressType)
            .input('City', sql.NVarChar, City)
            .input('Street', sql.NVarChar, Street)
            .input('House', sql.NVarChar, House)
            .input('Apartment', sql.NVarChar, Apartment || null)
            .input('PostalCode', sql.NVarChar, PostalCode || null)
            .query('INSERT INTO Addresses (CompanyID, AddressType, City, Street, House, Apartment, PostalCode, IsDefault) OUTPUT INSERTED.* VALUES (@CompanyID, @AddressType, @City, @Street, @House, @Apartment, @PostalCode, 0)');
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error('SQL Error in POST /api/addresses:', err.message);
        res.status(500).json({ message: 'Ошибка на сервере при добавлении адреса.' });
    }
});

app.put('/api/addresses/:addressId', authenticateToken, addressValidator, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Ошибка ввода данных', errors: errors.array() });
    }

    const { addressId } = req.params;
    const companyId = req.user.companyId;
    const { AddressType, City, Street, House, Apartment, PostalCode } = req.body;
    if (!AddressType || !City || !Street || !House) {
        return res.status(400).json({ message: 'Не все обязательные поля были заполнены.' });
    }
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('AddressID', sql.Int, addressId)
            .input('CompanyID', sql.Int, companyId)
            .input('AddressType', sql.NVarChar, AddressType)
            .input('City', sql.NVarChar, City)
            .input('Street', sql.NVarChar, Street)
            .input('House', sql.NVarChar, House)
            .input('Apartment', sql.NVarChar, Apartment || null)
            .input('PostalCode', sql.NVarChar, PostalCode || null)
            .query(`UPDATE Addresses SET AddressType = @AddressType, City = @City, Street = @Street, House = @House, Apartment = @Apartment, PostalCode = @PostalCode WHERE AddressID = @AddressID AND CompanyID = @CompanyID`);
        if (result.rowsAffected[0] === 0) return res.status(404).json({ message: 'Адрес не найден или не принадлежит вам.' });
        res.status(200).json({ message: 'Адрес успешно обновлен.' });
    } catch (error) {
        console.error('Ошибка обновления адреса:', error);
        res.status(500).json({ message: 'Ошибка сервера при обновлении адреса.' });
    }
});

app.delete('/api/addresses/:addressId', authenticateToken, async (req, res) => {
    const { addressId } = req.params;
    const companyId = req.user.companyId;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('AddressID', sql.Int, addressId)
            .input('CompanyID', sql.Int, companyId)
            .query('DELETE FROM Addresses WHERE AddressID = @AddressID AND IsDefault = 0 AND CompanyID = @CompanyID');
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Адрес не найден, является основным или не принадлежит вам.' });
        }
        res.status(200).json({ message: 'Адрес успешно удален.' });
    } catch (err) {
        res.status(500).send(err.message);
    }
});


// ===========================================
// --- НОВЫЕ API для B2B Портала ---
// ===========================================

// Получение информации о компании пользователя
app.get('/api/company-info', authenticateToken, async (req, res) => {
    const companyId = req.user.companyId;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('CompanyID', sql.Int, companyId)
            .query('SELECT * FROM Companies WHERE CompanyID = @CompanyID');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Компания не найдена.' });
        }
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Ошибка получения информации о компании:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});


// Получение остатков на складе
app.get('/api/stock-levels', authenticateToken, async (req, res) => {
    const companyId = req.user.companyId;
    try {
        const pool = await poolPromise;

        const reservedStockResult = await pool.request()
            .input('CompanyID', sql.Int, companyId)
            .query(`
                SELECT p.ProductName, p.RalColor, p.CoatingType, s.Quantity
                FROM StockLevels s
                JOIN Products p ON s.ProductID = p.ProductID
                WHERE s.CompanyID = @CompanyID AND s.StockType = 'Reserved'
            `);

        const freeStockResult = await pool.request()
            .query(`
                SELECT p.ProductName, p.RalColor, p.CoatingType, s.Quantity
                FROM StockLevels s
                JOIN Products p ON s.ProductID = p.ProductID
                WHERE s.StockType = 'Free'
            `);

        res.json({
            reserved: reservedStockResult.recordset,
            free: freeStockResult.recordset
        });

    } catch (error) {
        console.error('Ошибка получения складских остатков:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});


// ===========================================
// --- Обработка 404 и запуск сервера ---
// ===========================================

app.use((req, res, next) => {
    res.status(404).render('404', {
        title: 'Страница не найдена | Lime Details',
        layout: false
    });
});
console.log("B: Перед app.listen");

app.listen(port, () => {
    console.log("C: app.listen запущен");
    console.log(`Server is running at http://localhost:${port}`);
});