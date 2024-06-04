const nodemailer = require('nodemailer');

// setup a transporter
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth : {
        user: 'jeremiahmills93@gmail.com',
        pass: 'Jesusislord!23'
    }
});

// setup html context


const sendEmail = async (emailTo, subject, text, html) => {
    try {
        const email = await transporter.sendMail({
            from: 'WePayGH <noreply@wepaygh.com>',
            to: emailTo,
            subject: subject,
            text: text,
            html: html
        })
        console.log("Email sent successfully");

    } catch (error) {
        console.log(error)
    }
}

module.exports = sendEmail