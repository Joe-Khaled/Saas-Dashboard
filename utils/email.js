const nodemailer = require("nodemailer");
const path=require('path');

const sendEmailWithAttachment = async (to, subject, text, attachmentPath) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
    attachments: [
      {
        filename: path.basename(attachmentPath),  // e.g., "data3.pdf"
        path: attachmentPath
      }
    ]
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmailWithAttachment;
