'use strict';

const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

function getTransporter() {
  if (!config.smtp.host) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port || 587,
      secure: (config.smtp.port || 587) === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password,
      },
    });
  }

  return transporter;
}

/**
 * Send an email.
 * If SMTP is not configured, logs to console instead.
 * @param {{ to: string, subject: string, html: string }} options
 */
async function sendEmail({ to, subject, html }) {
  const transport = getTransporter();

  if (!transport) {
    console.log('[email] SMTP not configured. Would have sent:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body: ${html}`);
    return;
  }

  const from = config.smtp.from || config.smtp.user;

  await transport.sendMail({ from, to, subject, html });
}

/**
 * Send a verification email to a user.
 * @param {object} user - User document
 * @param {string} token - Verification token
 * @param {string} appUrl - Base URL of the application
 */
async function sendVerificationEmail(user, token, appUrl) {
  const verifyUrl = `${appUrl}/api/auth/verify-email/${token}`;
  const appName = config.appName;

  await sendEmail({
    to: user.email,
    subject: `Verify your email – ${appName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${appName} – Email Verification</h2>
        <p>Hello ${user.name || ''},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <p>
          <a href="${verifyUrl}"
             style="display: inline-block; padding: 12px 24px; background: #4f6ef7; color: white;
                    text-decoration: none; border-radius: 6px; font-weight: bold;">
            Verify Email
          </a>
        </p>
        <p>Or copy this link into your browser:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p>This link does not expire unless you re-register.</p>
        <p>— ${appName} team</p>
      </div>
    `,
  });
}

module.exports = { sendEmail, sendVerificationEmail };
