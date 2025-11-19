const nodemailer = require('nodemailer');

let transporter;

async function initializeMailer() {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 465,
        secure: true, // Gmail требует SSL на 465
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    console.log("Gmail SMTP initialized for:", process.env.SMTP_USER);
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
