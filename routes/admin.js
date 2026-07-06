const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../supabase/client');
const { adminAuth } = require('../middleware/auth');

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
      .select('ticket_count, amount, attendance, booked_at');

    if (sumError) throw sumError;

    let totalTickets = 0;
    let revenue = 0.0;
    let checkedIn = 0;
    let pending = 0;
    let todayBookings = 0;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    (sumData || []).forEach(t => {
      const ticketsCount = t.ticket_count || 0;
      totalTickets += ticketsCount;
      revenue += parseFloat(t.amount || 0);
      
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
        pending
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
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    query = query
      .order('booked_at', { ascending: false })
      .range(from, to);

    const { data, count, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      tickets: data || [],
      total: count || 0,
      page: pageNum,
      totalPages: Math.ceil((count || 0) / limitNum)
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

    if (ticket.attendance) {
      return res.json({
        success: true,
        status: 'ALREADY_CHECKED_IN',
        message: '⚠️ Already Checked In',
        ticket
      });
    }

    // If attendance is false, check them in
    const checkInTime = new Date().toISOString();
    const { data: updatedTicket, error: updateError } = await supabase
      .from('tickets')
      .update({ attendance: true, checked_in_at: checkInTime })
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
      status: 'VALID',
      message: '✅ VALID TICKET: Successfully Checked In.',
      ticket: updatedTicket
    });

  } catch (error) {
    console.error('Error verifying scanned ticket:', error);
    res.status(500).json({ success: false, error: 'Internal server error verifying ticket.' });
  }
});

module.exports = router;
