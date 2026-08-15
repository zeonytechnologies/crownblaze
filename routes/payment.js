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
      console.log('400 Error: Missing details:', { transaction_id, name, email, phone, ticketCounts });
      return res.status(400).json({ success: false, error: 'Missing booking details or Transaction ID.' });
    }

    // Prevent duplicate entries using transaction_id (UTR) or phone
    const { data: existingTicket, error: checkError } = await supabase
      .from('tickets')
      .select('ticket_id, phone, payment_id')
      .or(`payment_id.eq."${transaction_id}",phone.eq."${phone}"`)
      .maybeSingle();

    if (existingTicket) {
      let conflictMsg = 'A booking with this UTR number already exists.';
      if (existingTicket.phone === phone) conflictMsg = 'A booking with this Phone Number already exists.';
      console.log('400 Error: Duplicate ticket:', conflictMsg, existingTicket);
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
      general: { adult: 350, couples: 700 },
      silver: { adult: 400, couples: 800 },
      gold: { adult: 600, couples: 1200 }
    };

    let totalAmount = 0;
    let totalTicketsNum = 0;
    let globalCouples = 0;
    let globalAdult = 0;
    let globalChild = 0;
    
    let categoryParts = [];

    const cats = ['general', 'silver', 'gold'];
    const types = ['adult', 'couples'];
    
    cats.forEach(cat => {
      let catDesc = [];
      types.forEach(type => {
        if (!ticketCounts[cat]) return;
        const qty = parseInt(ticketCounts[cat][type], 10) || 0;
        if (qty > 0) {
          totalAmount += ticketPrices[cat][type] * qty;
          
          if (type === 'couples') {
            totalTicketsNum += qty * 2;
            globalCouples += qty;
          } else {
            totalTicketsNum += qty;
            globalAdult += qty;
          }
          
          catDesc.push(`${qty} ${type.charAt(0).toUpperCase() + type.slice(1)}`);
        }
      });
      if (catDesc.length > 0) {
        categoryParts.push(`${cat.charAt(0).toUpperCase() + cat.slice(1)} (${catDesc.join(', ')})`);
      }
    });

    const combinedCategoryStr = categoryParts.join(' | ') || 'General';

    // Enforcement of Capacity Limits
    let requestedGeneral = 0;
    let requestedSilver = 0;
    let requestedGold = 0;
    
    ['general', 'silver', 'gold'].forEach(cat => {
      if (ticketCounts[cat]) {
        let req = (parseInt(ticketCounts[cat].adult) || 0) + ((parseInt(ticketCounts[cat].couples) || 0) * 2);
        if (cat === 'general') requestedGeneral = req;
        if (cat === 'silver') requestedSilver = req;
        if (cat === 'gold') requestedGold = req;
      }
    });

    if (requestedGeneral > 0 || requestedSilver > 0 || requestedGold > 0) {
      const { data: currentTickets } = await supabase.from('tickets').select('booking_details, payment, email');
      const validTickets = (currentTickets || []).filter(t => t.payment !== 'Rejected');
      
      let generalUsed = 0;
      let silverUsed = 0;
      let goldUsed = 0;
      
      validTickets.forEach(t => {
        const isOffline = t.email && t.email.toLowerCase().startsWith('offline');
        if (isOffline) return;
        
        if (t.booking_details) {
          if (t.booking_details.general) {
             generalUsed += (parseInt(t.booking_details.general.adult) || 0) + ((parseInt(t.booking_details.general.couples) || 0) * 2);
          }
          if (t.booking_details.silver) {
             silverUsed += (parseInt(t.booking_details.silver.adult) || 0) + ((parseInt(t.booking_details.silver.couples) || 0) * 2);
          }
          if (t.booking_details.gold) {
             goldUsed += (parseInt(t.booking_details.gold.adult) || 0) + ((parseInt(t.booking_details.gold.couples) || 0) * 2);
          }
        }
      });
      
      if (requestedGeneral > 0 && requestedGeneral > (2500 - generalUsed)) {
         return res.status(400).json({ success: false, error: `Not enough General seats available. Only ${Math.max(0, 2500 - generalUsed)} left.` });
      }
      if (requestedSilver > 0 && requestedSilver > (36 - silverUsed)) {
         return res.status(400).json({ success: false, error: `Not enough Silver seats available. Only ${Math.max(0, 36 - silverUsed)} left.` });
      }
      if (requestedGold > 0 && requestedGold > (0 - goldUsed)) {
         return res.status(400).json({ success: false, error: `Not enough Gold seats available. Only 0 left.` });
      }
    }

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

    // Send the email asynchronously in the background so it doesn't block the API response
    sendTicketEmail({
      name,
      email,
      ticketId,
      amount: totalAmount,
      qrData,
      combinedCategoryStr,
      ticketCounts
    }).catch(emailErr => {
      console.error('Background Email Error:', emailErr);
    });

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
