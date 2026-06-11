import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendWelcomeEmail = async (to, name, userCode) => {
  const info = await transporter.sendMail({
    from: '"EduConnectZA" <no-reply@educonnect.co.za>',
    to,
    subject: 'Welcome to EduConnectZA',
    html: `<h1>Welcome, ${name}!</h1><p>Your unique user code: <strong>${userCode}</strong></p>`,
  });
  console.log('Email sent:', nodemailer.getTestMessageUrl(info));
};

export const sendPasswordResetEmail = async (to, resetUrl) => {
  const info = await transporter.sendMail({
    from: '"EduConnectZA" <no-reply@educonnect.co.za>',
    to,
    subject: 'Password Reset Request',
    html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. Link expires in 1 hour.</p>`,
  });
  console.log('Email sent:', nodemailer.getTestMessageUrl(info));
};
