const nodemailer = require("nodemailer")
const { mailer } = require('../.env')
// const { mailer, mailerBot } = require('../.env')

module.exports = app => {
    // create reusable transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport(mailer);
    // const transporterBot = nodemailer.createTransport(mailerBot);

    return { transporter }
    // return { transporter, transporterBot }
}