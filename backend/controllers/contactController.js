const nodemailer = require('nodemailer');

exports.sendContactEmail = async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const smtpUser = process.env.CONTACT_EMAIL_USER;
    const smtpPassword = process.env.CONTACT_EMAIL_PASS;
    const recipient = process.env.CONTACT_EMAIL_TO;

    if (!smtpUser || !smtpPassword || !recipient) {
      return res.status(503).json({
        error: 'Contact email is not configured. Set CONTACT_EMAIL_USER, CONTACT_EMAIL_PASS, and CONTACT_EMAIL_TO.'
      });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    await transporter.sendMail({
      from: process.env.CONTACT_EMAIL_FROM || smtpUser,
      to: recipient,
      subject: 'New Contact Form Submission',
      replyTo: email,
      text: `From: ${name} <${email}>\n\n${message}`,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Contact form email error:', err);
    res.status(500).json({ error: 'Failed to send message. Please try again later.' });
  }
}; 
