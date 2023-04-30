const nodemailer = require('nodemailer'),
    sgTransport = require('nodemailer-sendgrid-transport');
require('dotenv').config();
const os = require('os');

const inDevelopment = os.hostname() != 'BERINT-SERVER';


// Creates connection to my gmail
var transporter = nodemailer.createTransport(sgTransport({
    service: 'gmail',
    auth: {
        api_key: process.env.SENDGRID_API_KEY
    }
}));

class Email {
    /**
     * 
     * @param {String} recipient 
     * @param {String} subject 
     */
    constructor(recipient, subject, attachments) {
        this.recipient = recipient;
        this.subject = subject;
        this.attachments = attachments;
    }

    /**
     * @description Sends the email. BE SURE TO PUT this.text OR this.html BEFORE SENDING
     * @param {Function} callback Optional (error, emailInfo)
     */
    send() {
        if (inDevelopment) {
            if (this.message) this.message = this.message.replace(new RegExp('https://tatorscout.org', 'gi'), 'http://localhost:2122');
            if (this.html) this.html = this.html.replace(new RegExp('https://tatorscout.org', 'gi'), 'http://localhost:2122');
        }

        let mailOptions = {
            from: 'tatorscout@gmail.com',
            to: this.recipient,
            subject: this.subject,
            text: this.message,
            html: this.html,
            cc: this.cc,
            bcc: this.bcc,
            attachments: Array.isArray(this.attachments) ? this.attachments : []
        }
        transporter.sendMail(mailOptions, (err, info) => {
            if (err) console.error(err);
            else console.log(info);
        });
    }
}

exports = module.exports = Email;