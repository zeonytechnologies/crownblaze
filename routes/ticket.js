const express = require('express');
const router = express.Router();
const { supabase } = require('../supabase/client');

// GET: /api/ticket/availability
router.get('/availability', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('booking_details, payment');

    if (error) {
      console.error('Error fetching tickets for availability:', error);
      return res.status(500).json({ success: false, error: 'Internal server error fetching availability.' });
    }

    let silverUsed = 0;
    let goldUsed = 0;
    let familyUsed = 0;

    // Filter out tickets that are explicitly 'Rejected' by admin
    const validTickets = data.filter(t => t.payment !== 'Rejected');

    validTickets.forEach(t => {
      if (t.booking_details) {
        // Silver seats
        if (t.booking_details.silver) {
          const couples = parseInt(t.booking_details.silver.couples, 10) || 0;
          const adult = parseInt(t.booking_details.silver.adult, 10) || 0;
          const child = parseInt(t.booking_details.silver.child, 10) || 0;
          silverUsed += (couples * 2) + adult + child;
        }
        
        // Gold seats
        if (t.booking_details.gold) {
          const couples = parseInt(t.booking_details.gold.couples, 10) || 0;
          const adult = parseInt(t.booking_details.gold.adult, 10) || 0;
          const child = parseInt(t.booking_details.gold.child, 10) || 0;
          goldUsed += (couples * 2) + adult + child;
        }

        // Family passes
        if (t.booking_details.family) {
          const pass = parseInt(t.booking_details.family.pass, 10) || 0;
          familyUsed += pass;
        }
      }
    });

    const maxSilver = 250;
    const maxGold = 250;
    const maxFamily = 15;

    res.json({
      success: true,
      availability: {
        silver: Math.max(0, maxSilver - silverUsed),
        gold: Math.max(0, maxGold - goldUsed),
        family: Math.max(0, maxFamily - familyUsed)
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
