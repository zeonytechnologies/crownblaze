// Admin portal frontend orchestrator
let adminToken = localStorage.getItem('adminToken') || '';
let currentPage = 1;
const limit = 10;
let totalPages = 1;
let currentTicketData = []; // Cache list for modals

// Dom elements
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const btnLogout = document.getElementById('btn-logout');

// Search & filter inputs
const searchInput = document.getElementById('ticket-search');
const filterSelect = document.getElementById('filter-attendance');
const tableBody = document.getElementById('tickets-table-body');

// Stats elements
const statTotal = document.getElementById('stat-total');
const statToday = document.getElementById('stat-today');
const statRevenue = document.getElementById('stat-revenue');
const statChecked = document.getElementById('stat-checked');
const statPending = document.getElementById('stat-pending');

// Pagination elements
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const currentPageNum = document.getElementById('current-page-num');
const totalPageNum = document.getElementById('total-page-num');

// Modal Elements
const detailsModal = document.getElementById('details-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnToggleModalAttendance = document.getElementById('btn-modal-toggle-attendance');
let selectedTicketId = '';

// Toast notification helper
const showToast = (message, type = 'info') => {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid fa-circle-info"></i> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3500);
};

// Check Auth state and switch views
const updateView = () => {
  if (adminToken) {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    loadDashboardStats();
    loadTickets();
  } else {
    loginSection.style.display = 'flex';
    dashboardSection.style.display = 'none';
  }
};

// Handle Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (data.success) {
      adminToken = data.token;
      localStorage.setItem('adminToken', adminToken);
      showToast('Logged in successfully!', 'success');
      updateView();
    } else {
      showToast(data.error || 'Invalid credentials.', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to authentication server.', 'error');
  }
});

// Handle Logout
btnLogout.addEventListener('click', () => {
  adminToken = '';
  localStorage.removeItem('adminToken');
  showToast('Logged out.', 'info');
  updateView();
});

// Load Dashboard statistics
const loadDashboardStats = async () => {
  try {
    const response = await fetch('/api/admin/dashboard', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    const data = await response.json();
    if (data.success) {
      statTotal.innerText = data.stats.totalTickets;
      statToday.innerText = data.stats.todayBookings;
      statRevenue.innerText = parseFloat(data.stats.revenue).toFixed(2);
      statChecked.innerText = data.stats.checkedIn;
      statPending.innerText = data.stats.pending;
    } else {
      if (response.status === 401) handleSessionExpired();
    }
  } catch (err) {
    console.error('Stats loading error:', err);
  }
};

// Load Tickets with pagination and filters
const loadTickets = async () => {
  try {
    const searchVal = searchInput.value.trim();
    const attendanceVal = filterSelect.value;
    let url = `/api/admin/tickets?page=${currentPage}&limit=${limit}`;

    if (searchVal) url += `&search=${encodeURIComponent(searchVal)}`;
    if (attendanceVal !== 'all') url += `&attendance=${attendanceVal}`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    const data = await response.json();
    if (data.success) {
      currentTicketData = data.tickets;
      renderTicketsTable(data.tickets);
      totalPages = data.totalPages || 1;
      
      // Update pagination UI
      currentPageNum.innerText = currentPage;
      totalPageNum.innerText = totalPages;
      btnPrev.disabled = currentPage <= 1;
      btnNext.disabled = currentPage >= totalPages;
    } else {
      if (response.status === 401) handleSessionExpired();
    }
  } catch (err) {
    console.error('Tickets list loading error:', err);
  }
};

// Render tickets rows
const renderTicketsTable = (tickets) => {
  if (tickets.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--color-text-secondary);">No records match the current filters.</td></tr>`;
    return;
  }

  tableBody.innerHTML = tickets.map(ticket => {
    const statusClass = ticket.attendance ? 'badge success' : 'badge pending';
    const statusText = ticket.attendance ? 'Checked In' : 'Pending';
    const checkInBtnText = ticket.attendance ? 'Undo Checkin' : 'Check In';
    const checkInBtnClass = ticket.attendance ? 'btn-secondary' : 'btn-glow';

    return `
      <tr>
        <td style="font-family: var(--font-title); font-weight: bold; color: var(--color-neon-blue);">${ticket.ticket_id}</td>
        <td>
          <div style="font-weight: 600;">${ticket.name}</div>
          <div style="font-size:0.8rem; color: var(--color-text-secondary);">${ticket.email}</div>
        </td>
        <td>${ticket.phone}</td>
        <td style="font-weight: 600;">${ticket.ticket_count}</td>
        <td>₹${parseFloat(ticket.amount).toFixed(2)}</td>
        <td><span class="${statusClass}">${statusText}</span></td>
        <td>
          <div style="display:flex; gap:10px;">
            <button onclick="toggleAttendance('${ticket.ticket_id}', ${!ticket.attendance})" class="${checkInBtnClass}" style="padding: 6px 12px; font-size:0.8rem;">
              ${checkInBtnText}
            </button>
            <button onclick="viewTicketDetails('${ticket.ticket_id}')" class="btn-secondary" style="padding: 6px 12px; font-size:0.8rem; border-color: var(--glass-border); color: #fff;">
              Details
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
};

// Toggle Attendance (manual from list)
window.toggleAttendance = async (ticketId, newState) => {
  try {
    const response = await fetch('/api/admin/attendance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ ticketId, attendance: newState })
    });

    const data = await response.json();
    if (data.success) {
      showToast(`Updated attendance for ${ticketId}`, 'success');
      loadDashboardStats();
      loadTickets();
      // If modal is active, reload modal content too
      if (detailsModal.classList.contains('active') && selectedTicketId === ticketId) {
        viewTicketDetails(ticketId);
      }
    } else {
      showToast(data.error || 'Failed to update attendance.', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to backend service.', 'error');
  }
};

// View ticket details modal
window.viewTicketDetails = (ticketId) => {
  const ticket = currentTicketData.find(t => t.ticket_id === ticketId);
  if (!ticket) return;

  selectedTicketId = ticket.ticket_id;
  document.getElementById('modal-name').innerText = ticket.name;
  document.getElementById('modal-email').innerText = ticket.email;
  document.getElementById('modal-phone').innerText = ticket.phone;
  document.getElementById('modal-ticket-id').innerText = ticket.ticket_id;
  document.getElementById('modal-payment-id').innerText = ticket.payment_id;
  const typesArray = [];
  if (ticket.couples_count > 0) typesArray.push(`${ticket.couples_count} Couples`);
  if (ticket.adult_count > 0) typesArray.push(`${ticket.adult_count} Adult`);
  if (ticket.child_count > 0) typesArray.push(`${ticket.child_count} Child`);
  
  document.getElementById('modal-count').innerHTML = typesArray.length > 0 ? typesArray.join('<br>') : `${ticket.ticket_count} Person(s)`;
  document.getElementById('modal-amount').innerText = `₹${parseFloat(ticket.amount).toFixed(2)}`;
  document.getElementById('modal-date').innerText = new Date(ticket.booked_at).toLocaleString();
  
  const statusEl = document.getElementById('modal-attendance');
  statusEl.innerText = ticket.attendance ? 'Checked In' : 'Pending';
  statusEl.style.color = ticket.attendance ? '#00ff66' : '#ffaa00';

  document.getElementById('modal-qr-img').src = ticket.qr_data;
  btnToggleModalAttendance.className = ticket.attendance ? 'btn-secondary' : 'btn-glow';
  btnToggleModalAttendance.innerText = ticket.attendance ? 'Undo Check-in' : 'Mark Checked-in';

  detailsModal.classList.add('active');
};

// Modal action
btnToggleModalAttendance.addEventListener('click', () => {
  const ticket = currentTicketData.find(t => t.ticket_id === selectedTicketId);
  if (ticket) {
    toggleAttendance(selectedTicketId, !ticket.attendance);
  }
});

// Close modal
const closeModal = () => {
  detailsModal.classList.remove('active');
};
btnCloseModal.addEventListener('click', closeModal);
detailsModal.addEventListener('click', (e) => {
  if (e.target === detailsModal) closeModal();
});

// Pagination events
btnPrev.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    loadTickets();
  }
});

btnNext.addEventListener('click', () => {
  if (currentPage < totalPages) {
    currentPage++;
    loadTickets();
  }
});

// Search & filter triggers
let searchDebounce;
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    currentPage = 1;
    loadTickets();
  }, 400);
});

filterSelect.addEventListener('change', () => {
  currentPage = 1;
  loadTickets();
});

// Token expire handler
const handleSessionExpired = () => {
  adminToken = '';
  localStorage.removeItem('adminToken');
  showToast('Session expired. Please log in again.', 'error');
  updateView();
};

// Initialize view
document.addEventListener('DOMContentLoaded', updateView);
