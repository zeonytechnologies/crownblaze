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
      }
    });

    const maxSilver = 250;
    const maxGold = 250;

    res.json({
      success: true,
      availability: {
        silver: Math.max(0, maxSilver - silverUsed),
        gold: Math.max(0, maxGold - goldUsed)
      }
    });

  } catch (error) {
    console.error('Exception in availability endpoint:', error);
    res.status(500).json({ success: false, error: 'Server error calculating availability.' });
  }
});

module.exports = router;
