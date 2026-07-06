const express = require('express');
const router = express.Router();
const { supabase } = require('../supabase/client');

// GET: /api/ticket/:ticketId
// Retrieve public ticket details to display on success/download page
router.get('/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;

    if (!ticketId) {
      return res.status(400).json({ success: false, error: 'Ticket ID is required.' });
    }

    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('name, ticket_id, payment_id, ticket_count, couples_count, adult_count, child_count, amount, qr_data, booked_at, attendance')
      .eq('ticket_id', ticketId)
      .maybeSingle();

    if (error) {
      console.error('Database error fetching ticket:', error);
      return res.status(500).json({ success: false, error: 'Database query failed.' });
    }

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }

    res.json({
      success: true,
      ticket
    });

  } catch (error) {
    console.error('Error in ticket router:', error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

module.exports = router;
