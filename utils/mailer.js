const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASS,
  },
});

const sendTicketEmail = async (ticketData) => {
  const { name, email, ticketId, amount, qrData, category, couples, adults, children } = ticketData;

  // Extract base64 part from the data URI
  const base64Data = qrData.replace(/^data:image\/png;base64,/, "");

  const mailOptions = {
    from: `"CrownBeatz" <${process.env.SMTP_EMAIL}>`,
    to: email,
    subject: `Your CrownBeatz Ticket - ${ticketId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a14; color: #ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #333;">
        <div style="background: linear-gradient(90deg, #aa00ff, #00f3ff); padding: 20px; text-align: center;">
          <h1 style="margin: 0; color: #fff; font-size: 28px; letter-spacing: 2px;">CROWNBEATZ</h1>
          <p style="margin: 5px 0 0 0; color: #fff; font-size: 14px;">The Ultimate Music Experience</p>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: #00f3ff; margin-top: 0;">Welcome, ${name}!</h2>
          <p style="color: #cccccc; line-height: 1.6;">Thank you for securing your spot at the most anticipated event of the year. Your payment of ₹${amount} was successful.</p>
          
          <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #333;">
            <h3 style="margin-top: 0; color: #aa00ff;">Event Schedule</h3>
            <p style="margin: 5px 0; color: #ccc;">📅 <strong>Date:</strong> December 31, 2026</p>
            <p style="margin: 5px 0; color: #ccc;">⏰ <strong>Time:</strong> 08:00 PM onwards</p>
            <p style="margin: 5px 0; color: #ccc;">📍 <strong>Venue:</strong> Neon Arena, Phase 2, Bangalore</p>
          </div>

          <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #333;">
            <h3 style="margin-top: 0; color: #aa00ff;">Ticket Breakdown</h3>
            <p style="margin: 5px 0; color: #ccc;"><strong>Ticket ID:</strong> ${ticketId}</p>
            <p style="margin: 5px 0; color: #00ff66;"><strong>Category:</strong> ${category || 'General'} Pass</p>
            ${couples > 0 ? `<p style="margin: 5px 0; color: #ccc;">👫 Couples Pass: ${couples}</p>` : ''}
            ${adults > 0 ? `<p style="margin: 5px 0; color: #ccc;">🧑 Adult Pass: ${adults}</p>` : ''}
            ${children > 0 ? `<p style="margin: 5px 0; color: #ccc;">🧒 Child Pass: ${children}</p>` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <h3 style="color: #00f3ff; margin-bottom: 15px;">Your Entry QR Code</h3>
            <div style="background: #fff; display: inline-block; padding: 15px; border-radius: 10px;">
              <img src="cid:ticket_qrcode" alt="QR Code" style="width: 200px; height: 200px; display: block;" />
            </div>
            <p style="color: #888; font-size: 12px; margin-top: 15px;">Please present this QR code at the entrance.</p>
          </div>
        </div>
        
        <div style="background: #05050a; padding: 20px; text-align: center; border-top: 1px solid #333;">
          <p style="color: #888; font-size: 12px; margin: 0;">&copy; 2026 CrownBeatz. All rights reserved.</p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: 'qrcode.png',
        content: base64Data,
        encoding: 'base64',
        cid: 'ticket_qrcode'
      }
    ]
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Ticket email sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending ticket email:', error);
    return false;
  }
};

module.exports = { sendTicketEmail };
