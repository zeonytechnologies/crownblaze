const express = require('express');
const router = express.Router();
const { supabase } = require('../supabase/client');
const { generateQRCode } = require('../utils/qr');
const { sendTicketEmail } = require('../utils/mailer');

// POST: /api/payment/submit-booking
router.post('/submit-booking', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      ticketCounts,
      transaction_id
    } = req.body;

    if (!transaction_id || !name || !email || !phone || !ticketCounts) {
      return res.status(400).json({ success: false, error: 'Missing booking details or Transaction ID.' });
    }

    // Prevent duplicate entries using transaction_id (UTR) or phone
    const { data: existingTicket } = await supabase
      .from('tickets')
      .select('ticket_id, phone, payment_id')
      .or(`payment_id.eq.${transaction_id},phone.eq.${phone}`)
      .maybeSingle();

    if (existingTicket) {
      let conflictMsg = 'A booking with this UTR number already exists.';
      if (existingTicket.phone === phone) conflictMsg = 'A booking with this Phone Number already exists.';
      return res.status(400).json({ success: false, error: conflictMsg });
    }

    // Generate unique Ticket ID
    const countRes = await supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true });
    const count = countRes.count || 0;
    const ticketId = `CB-2026-${String(count + 1).padStart(6, '0')}`;

    // Calculate final stored amount server-side to prevent tampering
    const ticketPrices = {
      general: { couples: 549, adult: 349, child: 0 },
      silver: { couples: 799, adult: 499, child: 0 },
      gold: { couples: 899, adult: 599, child: 0 }
    };

    let totalAmount = 0;
    let totalTicketsNum = 0;
    let globalCouples = 0;
    let globalAdult = 0;
    let globalChild = 0;
    
    let categoryParts = [];

    const cats = ['general', 'silver', 'gold'];
    const types = ['couples', 'adult', 'child'];
    
    cats.forEach(cat => {
      let catDesc = [];
      types.forEach(type => {
        const qty = parseInt(ticketCounts[cat][type], 10) || 0;
        if (qty > 0) {
          totalAmount += ticketPrices[cat][type] * qty;
          totalTicketsNum += (type === 'couples' ? qty * 2 : qty);
          
          if (type === 'couples') globalCouples += qty;
          if (type === 'adult') globalAdult += qty;
          if (type === 'child') globalChild += qty;
          
          catDesc.push(`${qty} ${type.charAt(0).toUpperCase() + type.slice(1)}`);
        }
      });
      if (catDesc.length > 0) {
        categoryParts.push(`${cat.charAt(0).toUpperCase() + cat.slice(1)} (${catDesc.join(', ')})`);
      }
    });

    const combinedCategoryStr = categoryParts.join(' | ') || 'General';

    const qrData = await generateQRCode(ticketId);

    // Save ticket with transaction_id mapped to payment_id, and order_id generated internally
    const { error: dbError } = await supabase.from('tickets').insert([{
      ticket_id: ticketId,
      name,
      email,
      phone,
      category: combinedCategoryStr,
      ticket_count: totalTicketsNum,
      couples_count: globalCouples,
      adult_count: globalAdult,
      child_count: globalChild,
      amount: totalAmount,
      payment_id: transaction_id,
      order_id: `upi_order_${Date.now()}`,
      qr_data: qrData,
      attendance: false,
      booking_details: ticketCounts
    }]);

    if (dbError) {
      console.error('Database Error storing ticket:', dbError);
      return res.status(500).json({ success: false, error: 'Failed to save booking. Please contact support with your UTR.' });
    }

    // Send the email immediately after booking!
    try {
      await sendTicketEmail({
        name,
        email,
        ticketId,
        amount: totalAmount,
        qrData,
        combinedCategoryStr,
        ticketCounts
      });
    } catch (emailErr) {
      console.error('Failed to send booking email:', emailErr);
      return res.json({ 
        success: true, 
        ticketId, 
        message: `Booking successful, BUT email failed to send. Error: ${emailErr.message || 'Unknown Mail Error'}`
      });
    }

    res.json({
      success: true,
      ticketId,
      message: 'Booking successful and ticket email sent!'
    });

  } catch (error) {
    console.error('Error processing UPI booking:', error);
    res.status(500).json({ success: false, error: 'Internal booking verification error.' });
  }
});

module.exports = router;
