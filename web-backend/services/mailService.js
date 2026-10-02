import nodemailer from 'nodemailer';
import mailConfig from '../config/mail.js';

/**
 * Nodemailer transporter used to establish a connection
 * with the configured SMTP mail server.
 *
 * The SMTP configuration is loaded from the application's
 * mail configuration, which is typically populated from
 * environment variables.
 *
 * @type {import('nodemailer').Transporter}
 */
const transporter = nodemailer.createTransport({
    host: mailConfig.host,
    port: mailConfig.port,
    /**
     * Uses a secure TLS connection when the SMTP server
     * is configured to use port 465.
     */
    secure: mailConfig.port === 465,
    auth: {
        user: mailConfig.user,
        pass: mailConfig.password,
    },
});

/**
 * Sends an email using the configured Nodemailer transporter.
 *
 * @param {Object} options - Email configuration.
 * @param {string} options.to - Recipient's email address.
 * @param {string} options.subject - Email subject.
 * @param {string} options.html - HTML content of the email.
 *
 * @returns {Promise<import('nodemailer').SentMessageInfo>}
 * A promise that resolves with the information returned
 * by Nodemailer after the email has been sent.
 *
 * @throws {Error} If an error occurs while sending the email.
 *
 * @example
 * await sendEmail({
 *     to: 'user@example.com',
 *     subject: 'Reset your password',
 *     html: '<h1>Reset your password</h1>',
 * });
 */
export const sendEmail = async ({ to, subject, html }) => {
    return await transporter.sendMail({
        from: mailConfig.from,
        to,
        subject,
        html,
    });
};
