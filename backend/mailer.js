const nodemailer = require('nodemailer');

let transporter;

async function initializeMailer() {
    let authData = {
        user: 'awgq2d3jhxsvikdo@ethereal.email',
        pass: 'YV6trmbBKUece1kHb1',
    };

    if (!authData.user || !authData.pass) {
        console.log('Данные для Ethereal не найдены, создаем новый тестовый аккаунт...');
        const testAccount = await nodemailer.createTestAccount();
        authData = {
            user: testAccount.user,
            pass: testAccount.pass,
        };
        console.log('--- Ethereal.email Credentials (вставьте их в mailer.js) ---');
        console.log('User:', authData.user);
        console.log('Pass:', authData.pass);
        console.log('-----------------------------------------------------------');
    }

    transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: authData,
    });

    console.log('Mailer инициализирован с пользователем:', authData.user);
}

initializeMailer().catch(console.error);


async function sendVerificationEmail(to, token) {
    if (!transporter) {
        throw new Error('Mailer не инициализирован. Проверьте консоль сервера на ошибки.');
    }
    
    const verificationLink = `http://localhost:3000/api/verify-email?token=${token}`;

    const info = await transporter.sendMail({
        from: '"Lime Details" <noreply@limedetails.com>',
        to: to,
        subject: "Подтверждение регистрации на Lime Details",
        html: `
            <h1>Добро пожаловать в Lime Details!</h1>
            <p>Спасибо за регистрацию. Пожалуйста, подтвердите ваш email, перейдя по ссылке ниже:</p>
            <a href="${verificationLink}" style="padding: 10px 20px; background-color: #4fa690; color: white; text-decoration: none; border-radius: 5px;">
                Подтвердить Email
            </a>
            <p>Если вы не регистрировались на нашем сайте, просто проигнорируйте это письмо.</p>
        `,
    });

    console.log("Сообщение отправлено: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}

module.exports = { sendVerificationEmail };