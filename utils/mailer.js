const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: 2525, // Port 2525 often bypasses strict cloud firewalls
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendTicketEmail = async (ticketData) => {
  const { name, email, ticketId, amount, qrData, combinedCategoryStr, ticketCounts } = ticketData;

  const base64Data = qrData.replace(/^data:image\/png;base64,/, "");

  let breakdownHtml = '';
  if (ticketCounts) {
    const cats = ['general', 'silver', 'gold'];
    const types = ['couples', 'adult', 'child'];
    cats.forEach(cat => {
      types.forEach(type => {
        const qty = parseInt(ticketCounts[cat][type], 10) || 0;
        if (qty > 0) {
          const catName = cat.charAt(0).toUpperCase() + cat.slice(1);
          const typeName = type.charAt(0).toUpperCase() + type.slice(1);
          breakdownHtml += `<p style="margin: 5px 0; color: #ccc;">🎫 ${catName} ${typeName} Pass: ${qty}</p>`;
        }
      });
    });
  }

  const mailOptions = {
    from: `"CrownBeatz" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`, // Fallback to SMTP_USER if FROM isn't verified
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
            <p style="margin: 5px 0; color: #ccc;">📅 <strong>Date:</strong> August 1st Week</p>
            <p style="margin: 5px 0; color: #ccc;">⏰ <strong>Time:</strong> 06:30 PM onwards</p>
            <p style="margin: 5px 0; color: #ccc;">📍 <strong>Venue:</strong> Bangalore to Chennai Highway Near Murugan idli kadai, Krishnagiri</p>
          </div>

          <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #333;">
            <h3 style="margin-top: 0; color: #aa00ff;">Ticket Breakdown</h3>
            <p style="margin: 5px 0; color: #fff; font-weight: bold;">Ticket ID: ${ticketId}</p>
            ${breakdownHtml}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <h3 style="color: #00f3ff; margin-bottom: 15px;">Your Entry QR Code</h3>
            <div style="background: #fff; padding: 15px; display: inline-block; border-radius: 10px;">
              <img src="cid:ticket_qr" alt="QR Code" style="width: 200px; height: 200px; display: block;" />
            </div>
            <p style="color: #888; font-size: 12px; margin-top: 15px;">Please present this QR code at the entrance.<br/>Do not share this QR code with anyone else.</p>
          </div>
        </div>

        <div style="background: #050508; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #222;">
          <p style="margin: 0;">&copy; 2026 CrownBeatz. All rights reserved.</p>
          <p style="margin: 5px 0 0 0;">Strictly 18+ Event (Unless accompanied) • Club Rules Apply</p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: 'ticket_qr.png',
        content: base64Data,
        encoding: 'base64',
        cid: 'ticket_qr'
      }
    ]
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Ticket email sent via Port 2525: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending ticket email via Port 2525:', error);
    throw error;
  }
};

module.exports = { sendTicketEmail };
