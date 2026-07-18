const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../supabase/client');
const { adminAuth } = require('../middleware/auth');
const { sendTicketEmail } = require('../utils/mailer');

// Self-seed helper: inserts default admin if none exists
const seedDefaultAdmin = async () => {
  try {
    const { count } = await supabase.from('admins').select('id', { count: 'exact', head: true });
    if (count === 0) {
      const username = 'admin';
      const password = 'admin123_crownbeatz';
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const { error } = await supabase.from('admins').insert([{
        username,
        password_hash: passwordHash
      }]);

      if (error) {
        console.error('Failed to seed default admin:', error);
      } else {
        console.log('Seeded default admin user. Username: "admin", Password: "admin123_crownbeatz"');
      }
    }
  } catch (err) {
    console.error('Admin seeding exception:', err);
  }
};
// Run the seed check
seedDefaultAdmin();

// POST: /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required.' });
    }

    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      console.error('Login database error:', error);
      return res.status(500).json({ success: false, error: 'Login query failed.' });
    }

    if (!admin) {
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET || 'fallback_secret_for_dev_only',
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      token,
      admin: { username: admin.username }
    });

  } catch (error) {
    console.error('Error on admin login:', error);
    res.status(500).json({ success: false, error: 'Internal server error during login.' });
  }
});

// ALL SUBSEQUENT ROUTES ARE PROTECTED
router.use(adminAuth);

// GET: /api/admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    // 1. Fetch total tickets sold (sum of ticket_count)
    const { data: sumData, error: sumError } = await supabase
      .from('tickets')
      .select('ticket_count, amount, attendance, booked_at, category, adult_count, couples_count, booking_details');

    if (sumError) throw sumError;

    let totalTickets = 0;
    let revenue = 0.0;
    let checkedIn = 0;
    let pending = 0;
    let todayBookings = 0;
    
    const categoryStats = {
      General: { adults: 0, couples: 0 },
      Silver: { adults: 0, couples: 0 },
      Gold: { adults: 0, couples: 0 },
      Family: { pass: 0 }
    };

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    (sumData || []).forEach(t => {
      const ticketsCount = t.ticket_count || 0;
      totalTickets += ticketsCount;
      revenue += parseFloat(t.amount || 0);
      
      // Parse multi-category breakdown from JSON column
      if (t.booking_details) {
        if (t.booking_details.general) {
          categoryStats.General.adults += parseInt(t.booking_details.general.adult) || 0;
          categoryStats.General.couples += parseInt(t.booking_details.general.couples) || 0;
        }
        if (t.booking_details.silver) {
          categoryStats.Silver.adults += parseInt(t.booking_details.silver.adult) || 0;
          categoryStats.Silver.couples += parseInt(t.booking_details.silver.couples) || 0;
        }
        if (t.booking_details.gold) {
          categoryStats.Gold.adults += parseInt(t.booking_details.gold.adult) || 0;
          categoryStats.Gold.couples += parseInt(t.booking_details.gold.couples) || 0;
        }
        if (t.booking_details.family) {
          categoryStats.Family.pass += parseInt(t.booking_details.family.pass) || 0;
        }
      } else {
        // Fallback for legacy records before booking_details existed
        const cat = t.category || 'General';
        // Check if cat is purely 'General', 'Silver', or 'Gold'
        if (categoryStats[cat]) {
          categoryStats[cat].adults += (t.adult_count || 0);
          categoryStats[cat].couples += (t.couples_count || 0);
        }
      }
      
      if (t.attendance) {
        checkedIn += ticketsCount;
      } else {
        pending += ticketsCount;
      }

      if (new Date(t.booked_at) >= startOfToday) {
        todayBookings += ticketsCount;
      }
    });

    // Get recent 6 bookings
    const { data: recent, error: recentError } = await supabase
      .from('tickets')
      .select('*')
      .order('booked_at', { ascending: false })
      .limit(6);

    if (recentError) throw recentError;

    res.json({
      success: true,
      stats: {
        totalTickets,
        todayBookings,
        revenue: Math.round(revenue * 100) / 100,
        checkedIn,
        pending,
        categoryStats
      },
      recentBookings: recent || []
    });

  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve dashboard stats.' });
  }
});

// GET: /api/admin/tickets
router.get('/tickets', async (req, res) => {
  try {
    const { search, attendance, page = 1, limit = 10 } = req.query;

    let query = supabase
      .from('tickets')
      .select('*', { count: 'exact' });

    // Handle Search Filter (matches name, phone, ticket_id, payment_id)
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,ticket_id.ilike.%${search}%,payment_id.ilike.%${search}%`);
    }

    // Handle Attendance Filter
    if (attendance === 'true') {
      query = query.eq('attendance', true);
    } else if (attendance === 'false') {
      query = query.eq('attendance', false);
    }

    // Pagination
    let pageNum = parseInt(page, 10);
    let limitNum = 10;
    
    if (limit === 'all') {
      // Get total exact count for 'all'
      const { count: c } = await supabase.from('tickets').select('*', { count: 'exact', head: true });
      limitNum = c || 999999;
      query = query.order('booked_at', { ascending: false });
    } else {
      limitNum = parseInt(limit, 10);
      const from = (pageNum - 1) * limitNum;
      const to = from + limitNum - 1;
      query = query
        .order('booked_at', { ascending: false })
        .range(from, to);
    }

    const { data, count: finalCount, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      tickets: data || [],
      total: finalCount || 0,
      page: pageNum,
      totalPages: limit === 'all' ? 1 : Math.ceil((finalCount || 0) / limitNum)
    });

  } catch (error) {
    console.error('Error querying tickets list:', error);
    res.status(500).json({ success: false, error: 'Failed to query tickets list.' });
  }
});

// POST: /api/admin/attendance (Manual Toggle)
router.post('/attendance', async (req, res) => {
  try {
    const { ticketId, attendance } = req.body;

    if (!ticketId) {
      return res.status(400).json({ success: false, error: 'Ticket ID is required.' });
    }

    const isAttending = attendance === true;
    const checkedInAt = isAttending ? new Date().toISOString() : null;

    const { data, error } = await supabase
      .from('tickets')
      .update({ attendance: isAttending, checked_in_at: checkedInAt })
      .eq('ticket_id', ticketId)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }

    // Insert to logs if marked checked in
    if (isAttending) {
      await supabase.from('attendance_logs').insert([{
        ticket_id: ticketId,
        scanned_at: checkedInAt,
        admin_name: req.admin.username
      }]);
    } else {
      // Delete log if unchecked
      await supabase.from('attendance_logs').delete().eq('ticket_id', ticketId);
    }

    res.json({
      success: true,
      message: `Attendance status updated successfully.`,
      ticket: data
    });

  } catch (error) {
    console.error('Error changing ticket attendance status:', error);
    res.status(500).json({ success: false, error: 'Failed to update attendance status.' });
  }
});

// GET: /api/admin/verify/:ticketId (Scanner check-in endpoint)
router.get('/verify/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;

    if (!ticketId) {
      return res.status(400).json({ success: false, error: 'Ticket ID is required.' });
    }

    // Fetch the ticket
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('ticket_id', ticketId)
      .maybeSingle();

    if (error) throw error;

    if (!ticket) {
      return res.json({
        success: false,
        status: 'INVALID',
        message: '❌ Invalid Ticket: Ticket ID does not exist in records.'
      });
    }

    // NEW: Check Payment Status
    if (ticket.payment !== 'Verified') {
      return res.json({
        success: false,
        status: 'INVALID',
        message: `❌ Payment Verification Failed: Ticket status is "${ticket.payment || 'Not Verified'}".`
      });
    }

    if (ticket.attendance) {
      return res.json({
        success: true,
        status: 'ALREADY_CHECKED_IN',
        message: '⚠️ Already Checked In (Fully)',
        ticket
      });
    }

    // Calculate remaining people
    const couplesTotal = (ticket.couples_count || 0) * 2;
    const adultTotal = ticket.adult_count || 0;
    const childTotal = ticket.child_count || 0;

    const remainingCouples = couplesTotal - (ticket.checked_in_couples || 0);
    const remainingAdults = adultTotal - (ticket.checked_in_adult || 0);
    const remainingChildren = childTotal - (ticket.checked_in_child || 0);

    const isPartial = (ticket.checked_in_couples > 0 || ticket.checked_in_adult > 0 || ticket.checked_in_child > 0);

    return res.json({
      success: true,
      status: 'PARTIAL_CHECKIN_REQUIRED',
      message: isPartial ? '✅ Valid Ticket: Partial Check-in Pending' : '✅ VALID TICKET: Full Check-in Pending',
      ticket,
      remaining: {
        couples: remainingCouples,
        adults: remainingAdults,
        children: remainingChildren
      }
    });

  } catch (error) {
    console.error('Error verifying scanned ticket:', error);
    res.status(500).json({ success: false, error: 'Internal server error verifying ticket.' });
  }
});

// POST: /api/admin/checkin (Perform Partial/Full Check-in)
router.post('/checkin', async (req, res) => {
  try {
    const { ticketId, couples, adults, children } = req.body;

    if (!ticketId) {
      return res.status(400).json({ success: false, error: 'Ticket ID is required.' });
    }

    // Fetch the ticket
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('ticket_id', ticketId)
      .maybeSingle();

    if (error) throw error;
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }

    const newCheckedInCouples = (ticket.checked_in_couples || 0) + (couples || 0);
    const newCheckedInAdults = (ticket.checked_in_adult || 0) + (adults || 0);
    const newCheckedInChildren = (ticket.checked_in_child || 0) + (children || 0);

    const couplesTotal = (ticket.couples_count || 0) * 2;
    const adultTotal = ticket.adult_count || 0;
    const childTotal = ticket.child_count || 0;

    const isFullyCheckedIn = (newCheckedInCouples >= couplesTotal) && 
                             (newCheckedInAdults >= adultTotal) && 
                             (newCheckedInChildren >= childTotal);

    const checkInTime = new Date().toISOString();

    const updatePayload = {
      checked_in_couples: newCheckedInCouples,
      checked_in_adult: newCheckedInAdults,
      checked_in_child: newCheckedInChildren,
    };

    if (isFullyCheckedIn) {
      updatePayload.attendance = true;
      if (!ticket.checked_in_at) {
        updatePayload.checked_in_at = checkInTime;
      }
    }

    const { data: updatedTicket, error: updateError } = await supabase
      .from('tickets')
      .update(updatePayload)
      .eq('ticket_id', ticketId)
      .select()
      .maybeSingle();

    if (updateError) throw updateError;

    // Log the scan activity
    await supabase.from('attendance_logs').insert([{
      ticket_id: ticketId,
      scanned_at: checkInTime,
      admin_name: req.admin.username
    }]);

    res.json({
      success: true,
      message: isFullyCheckedIn ? 'Fully Checked In!' : 'Partial Check-in Successful!',
      ticket: updatedTicket
    });

  } catch (error) {
    console.error('Error verifying scanned ticket:', error);
    res.status(500).json({ success: false, error: 'Internal server error verifying ticket.' });
  }
});

// POST: /api/admin/verify-payment
router.post('/verify-payment', async (req, res) => {
  try {
    const { ticketId, status } = req.body; // status should be 'Verified' or 'Rejected'
    
    console.log(`[Verify Payment API] Received ticketId: ${ticketId}, status: ${status}`);

    if (!ticketId || !status) {
      return res.status(400).json({ success: false, error: 'Ticket ID and status are required.' });
    }

    const { data: ticket, error: fetchError } = await supabase
      .from('tickets')
      .select('*')
      .eq('ticket_id', ticketId)
      .maybeSingle();

    if (fetchError || !ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }

    // Update payment status
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ payment: status })
      .eq('ticket_id', ticketId);

    if (updateError) {
      console.error('Error updating payment status:', updateError);
      return res.status(500).json({ success: false, error: 'Failed to update payment status.' });
    }

    res.json({ success: true, message: `Payment successfully marked as ${status}.` });

  } catch (error) {
    console.error('Error in /verify-payment:', error);
    res.status(500).json({ success: false, error: 'Internal server error verifying payment.' });
  }
});

// POST: /api/admin/verify-manual
router.post('/verify-manual', async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ success: false, error: 'Ticket ID or Phone Number is required.' });
    }

    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('*')
      .or(`ticket_id.eq.${identifier},phone.eq.${identifier}`)
      .maybeSingle();

    if (error) throw error;

    if (!ticket) {
      return res.json({
        success: false,
        status: 'INVALID',
        message: '❌ Invalid Ticket: No record found for that ID or Phone Number.'
      });
    }

    if (ticket.payment !== 'Verified') {
      return res.json({
        success: false,
        status: 'INVALID',
        message: `❌ Payment Verification Failed: Ticket status is "${ticket.payment || 'Not Verified'}".`
      });
    }

    if (ticket.attendance) {
      return res.json({
        success: true,
        status: 'ALREADY_CHECKED_IN',
        message: '⚠️ Already Checked In (Fully)',
        ticket
      });
    }

    // Calculate remaining people
    const couples = parseInt(ticket.couples_count, 10) || 0;
    const adults = parseInt(ticket.adult_count, 10) || 0;
    const kids = parseInt(ticket.child_count, 10) || 0;
    const totalAllowed = (couples * 2) + adults + kids;
    
    // We fetch current checked in logs for this ticket
    const { data: logs, error: logsError } = await supabase
      .from('attendance_logs')
      .select('headcount')
      .eq('ticket_id', ticket.ticket_id);
      
    if (logsError) throw logsError;
    
    const currentCheckedIn = logs.reduce((sum, log) => sum + (log.headcount || 1), 0);
    const remaining = totalAllowed - currentCheckedIn;
    
    if (remaining <= 0) {
      return res.json({
        success: true,
        status: 'ALREADY_CHECKED_IN',
        message: '⚠️ Already Checked In (Fully)',
        ticket,
        currentCheckedIn,
        totalAllowed
      });
    }

    res.json({
      success: true,
      status: 'VALID',
      message: '✅ Valid Ticket: Available for check-in.',
      ticket,
      remaining,
      totalAllowed,
      currentCheckedIn
    });

  } catch (error) {
    console.error('Error in manual verification:', error);
    res.status(500).json({ success: false, error: 'Failed to verify ticket.' });
  }
});

module.exports = router;
