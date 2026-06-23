const nodemailer = require('nodemailer');

// Configure Email Transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

/**
 * Send an email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} html - HTML body (optional)
 */
const sendEmail = async (to, subject, text, html = '') => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('\n================================');
    console.log('📧 [SIMULATED EMAIL]');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Text: ${text}`);
    console.log('================================\n');
    return;
  }

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Tyre & Tube Store" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html
    });
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
  }
};

/**
 * Simulate sending an SMS
 * @param {string} to - Phone number
 * @param {string} message - SMS content
 */
const sendSMS = async (to, message) => {
  // Currently simulating SMS as per user request
  console.log('\n================================');
  console.log('📱 [SIMULATED SMS]');
  console.log(`To Phone: ${to}`);
  console.log(`Message: ${message}`);
  console.log('================================\n');
};

module.exports = {
  sendEmail,
  sendSMS
};
