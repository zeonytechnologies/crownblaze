const express = require('express');
const router = express.Router();
const { supabase } = require('../supabase/client');

// GET: /api/ticket/availability
router.get('/availability', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('booking_details, payment, email');

    if (error) {
      console.error('Error fetching tickets for availability:', error);
      return res.status(500).json({ success: false, error: 'Internal server error fetching availability.' });
    }

    let silverUsed = 0;
    let goldUsed = 0;

    // Filter out tickets that are explicitly 'Rejected' by admin
    const validTickets = data.filter(t => t.payment !== 'Rejected');

    validTickets.forEach(t => {
      const isOffline = t.email && t.email.toLowerCase().startsWith('offline');
      if (isOffline) return; // Exclude offline tickets from online capacity display

      if (t.booking_details) {
        // Silver seats
        if (t.booking_details.silver) {
          silverUsed += parseInt(t.booking_details.silver.adult, 10) || 0;
        }
        
        // Gold seats
        if (t.booking_details.gold) {
          goldUsed += (parseInt(t.booking_details.gold.couples, 10) || 0) * 2;
        }
      }
    });

    const maxSilver = 250;
    const maxGold = 250;

    res.json({
      success: true,
      availability: {
        silver: 30,
        gold: 0
      }
    });

  } catch (error) {
    console.error('Exception in availability endpoint:', error);
    res.status(500).json({ success: false, error: 'Server error calculating availability.' });
  }
});

// GET: /api/ticket/:id
router.get('/:id', async (req, res) => {
  try {
    const ticketId = req.params.id;
    
    // Prevent routing conflicts with /availability
    if (ticketId === 'availability') return; 
    
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('ticket_id', ticketId)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Ticket not found or does not exist.' });
    }

    res.json({ success: true, ticket: data });
  } catch (error) {
    console.error('Error fetching ticket data:', error);
    res.status(500).json({ success: false, error: 'Internal server error fetching ticket details.' });
  }
});

module.exports = router;
