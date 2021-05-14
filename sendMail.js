const nodemailer = require('nodemailer')

async function sendMail({ subject, text }) {
    let transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
        },
    })

    let info = await transporter.sendMail({
        to: process.env.EMAIL_TO_FIELD,
        from: process.env.EMAIL_FROM_FIELD,
        subject: subject, // Subject line
        text: text, // plain text body
    })
}

module.exports = sendMail
