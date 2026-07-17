const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { Cashfree } = require("cashfree-pg");
const { supabase } = require('../supabase/client');
const { generateQRCode } = require('../utils/qr');
const { sendTicketEmail } = require('../utils/mailer');

const PRICE_COUPLES = 499;
const PRICE_ADULT = 299;
const PRICE_CHILD = 199;

// Initialize Cashfree SDK v6
const cfEnvironment = Cashfree.SANDBOX; // Change to Cashfree.PRODUCTION when live
const cf = new Cashfree(cfEnvironment, process.env.CASHFREE_APP_ID || 'dummy', process.env.CASHFREE_SECRET_KEY || 'dummy');

// POST: /api/payment/create-order
router.post('/create-order', async (req, res) => {
  try {
    const { name, email, phone, couplesCount, adultCount, childCount } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ success: false, error: 'All fields are required.' });
    }

    const countCouples = parseInt(couplesCount, 10) || 0;
    const countAdult = parseInt(adultCount, 10) || 0;
    const countChild = parseInt(childCount, 10) || 0;
    const totalTickets = countCouples + countAdult + countChild;

    if (totalTickets < 1 || totalTickets > 10) {
      return res.status(400).json({ success: false, error: 'Total tickets count must be between 1 and 10.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format.' });
    }

    const phoneRegex = /^[0-9\s+-]{10,15}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ success: false, error: 'Invalid phone number format.' });
    }

    const totalAmount = (countCouples * PRICE_COUPLES) + (countAdult * PRICE_ADULT) + (countChild * PRICE_CHILD);
    const orderId = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    let request = {
      order_amount: totalAmount,
      order_currency: "INR",
      order_id: orderId,
      customer_details: {
        customer_id: `cust_${Date.now()}`,
        customer_phone: phone,
        customer_name: name,
        customer_email: email
      }
    };

    const response = await cf.PGCreateOrder(request);
    
    res.json({
      success: true,
      payment_session_id: response.data.payment_session_id,
      order_id: response.data.order_id
    });

  } catch (error) {
    console.error('Error creating Cashfree order:', error.response?.data || error);
    res.status(500).json({ success: false, error: 'Failed to create payment order.' });
  }
});

// POST: /api/payment/verify
router.post('/verify', async (req, res) => {
  try {
    const {
      order_id,
      name,
      email,
      phone,
      couplesCount,
      adultCount,
      childCount
    } = req.body;

    if (!order_id) {
      return res.status(400).json({ success: false, error: 'Payment details missing.' });
    }

    // Verify payment directly with Cashfree servers
    const response = await cf.PGOrderFetchPayments(order_id);
    const payments = response.data || [];
    
    // Find the successful payment attempt
    const successfulPayment = payments.find(p => p.payment_status === 'SUCCESS');

    if (!successfulPayment) {
      return res.status(400).json({ success: false, error: 'Payment verification failed or pending.' });
    }
    
    const payment_id = successfulPayment.cf_payment_id.toString();

    // Prevent duplicate entries
    const { data: existingTicket } = await supabase
      .from('tickets')
      .select('ticket_id')
      .eq('order_id', order_id)
      .maybeSingle();

    if (existingTicket) {
      return res.json({ success: true, ticketId: existingTicket.ticket_id });
    }

    // Generate unique Ticket ID
    const countRes = await supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true });
    const count = countRes.count || 0;
    const ticketId = `CB-2026-${String(count + 1).padStart(6, '0')}`;

    // Calculate final stored amount
    const countCouples = parseInt(couplesCount, 10) || 0;
    const countAdult = parseInt(adultCount, 10) || 0;
    const countChild = parseInt(childCount, 10) || 0;
    
    const ticketsNum = (countCouples * 2) + countAdult + countChild;
    const totalAmount = (countCouples * PRICE_COUPLES) + (countAdult * PRICE_ADULT) + (countChild * PRICE_CHILD);

    const qrData = await generateQRCode(ticketId);

    const { error: dbError } = await supabase.from('tickets').insert([{
      ticket_id: ticketId,
      name,
      email,
      phone,
      ticket_count: ticketsNum,
      couples_count: countCouples,
      adult_count: countAdult,
      child_count: countChild,
      amount: totalAmount,
      payment_id: payment_id,
      order_id: order_id,
      qr_data: qrData,
      attendance: false
    }]);

    if (dbError) {
      console.error('Database Error storing ticket:', dbError);
      return res.status(500).json({ success: false, error: 'Payment verified, but booking save failed. Please contact support.' });
    }

    await sendTicketEmail({
      name,
      email,
      ticketId,
      amount: totalAmount,
      qrData,
      couples: countCouples,
      adults: countAdult,
      children: countChild
    });

    res.json({
      success: true,
      ticketId
    });

  } catch (error) {
    console.error('Error verifying Cashfree payment:', error.response?.data || error);
    res.status(500).json({ success: false, error: 'Internal payment verification error.' });
  }
});

module.exports = router;
