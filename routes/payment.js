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
      category,
      couplesCount,
      adultCount,
      childCount,
      transaction_id
    } = req.body;

    if (!transaction_id || !name || !email || !phone) {
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

    // Calculate final stored amount
    const ticketCategory = category || 'General';
    let PRICE_COUPLES = 549;
    let PRICE_ADULT = 349;
    if (ticketCategory === 'Silver') { PRICE_COUPLES = 799; PRICE_ADULT = 499; }
    else if (ticketCategory === 'Gold') { PRICE_COUPLES = 899; PRICE_ADULT = 599; }
    const PRICE_CHILD = 0;

    const countCouples = parseInt(couplesCount, 10) || 0;
    const countAdult = parseInt(adultCount, 10) || 0;
    const countChild = parseInt(childCount, 10) || 0;
    
    const ticketsNum = (countCouples * 2) + countAdult + countChild;
    const totalAmount = (countCouples * PRICE_COUPLES) + (countAdult * PRICE_ADULT) + (countChild * PRICE_CHILD);

    const qrData = await generateQRCode(ticketId);

    // Save ticket with transaction_id mapped to payment_id, and order_id generated internally
    const { error: dbError } = await supabase.from('tickets').insert([{
      ticket_id: ticketId,
      name,
      email,
      phone,
      category: ticketCategory,
      ticket_count: ticketsNum,
      couples_count: countCouples,
      adult_count: countAdult,
      child_count: countChild,
      amount: totalAmount,
      payment_id: transaction_id,
      order_id: `upi_order_${Date.now()}`,
      qr_data: qrData,
      attendance: false
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
        category: ticketCategory,
        couples: countCouples,
        adults: countAdult,
        children: countChild
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
