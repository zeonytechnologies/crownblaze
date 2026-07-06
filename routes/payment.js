const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { supabase } = require('../supabase/client');
const { generateQRCode } = require('../utils/qr');

const PRICE_COUPLES = 499;
const PRICE_ADULT = 299;
const PRICE_CHILD = 199;

// Initialize Razorpay
// In local development or Vercel, these must be loaded from process.env
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
});

// POST: /api/payment/create-order
router.post('/create-order', async (req, res) => {
  try {
    const { name, email, phone, couplesCount, adultCount, childCount } = req.body;

    // Validate fields
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

    // Calculate prices
    const totalAmount = (countCouples * PRICE_COUPLES) + (countAdult * PRICE_ADULT) + (countChild * PRICE_CHILD);

    // Create Razorpay Order
    const options = {
      amount: Math.round(totalAmount * 100), // Razorpay accepts in paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      keyId: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, error: 'Failed to create payment order.' });
  }
});

// POST: /api/payment/verify
router.post('/verify', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      name,
      email,
      phone,
      couplesCount,
      adultCount,
      childCount
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Payment details missing.' });
    }

    // Verify signature
    const secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Payment verification failed.' });
    }

    // Prevent duplicate entries by checking if the order_id or payment_id is already stored
    const { data: existingTicket } = await supabase
      .from('tickets')
      .select('ticket_id')
      .eq('order_id', razorpay_order_id)
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
    
    const ticketsNum = (countCouples * 2) + countAdult + countChild; // Couples = 2 persons
    const totalAmount = (countCouples * PRICE_COUPLES) + (countAdult * PRICE_ADULT) + (countChild * PRICE_CHILD);

    // Build the verify URL that scanner.js will ping
    const host = req.get('host');
    const protocol = req.protocol;
    const verifyUrl = `${protocol}://${host}/api/admin/verify/${ticketId}`;
    
    // Generate QR Code containing verification URL
    const qrData = await generateQRCode(verifyUrl);

    // Store Ticket in Supabase
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
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      qr_data: qrData,
      attendance: false
    }]);

    if (dbError) {
      console.error('Database Error storing ticket:', dbError);
      return res.status(500).json({ success: false, error: 'Payment verified, but booking save failed. Please contact support.' });
    }

    res.json({
      success: true,
      ticketId
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, error: 'Internal payment verification error.' });
  }
});

module.exports = router;
