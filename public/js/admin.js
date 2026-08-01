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
const offlineTableBody = document.getElementById('offline-tickets-table-body');

// Tabs
let activeTab = 'online';
const tabOnline = document.getElementById('tab-online');
const tabOffline = document.getElementById('tab-offline');
const onlineTableWrapper = document.getElementById('online-table-wrapper');
const offlineTableWrapper = document.getElementById('offline-table-wrapper');

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

if (tabOnline) {
  tabOnline.addEventListener('click', () => {
    activeTab = 'online';
    tabOnline.className = 'btn btn-primary';
    tabOnline.style.background = '';
    tabOnline.style.color = '';
    tabOffline.className = 'btn btn-secondary';
    tabOffline.style.background = 'transparent';
    tabOffline.style.color = '#fff';
    onlineTableWrapper.style.display = 'block';
    offlineTableWrapper.style.display = 'none';
    currentPage = 1;
    loadTickets();
  });
}

if (tabOffline) {
  tabOffline.addEventListener('click', () => {
    activeTab = 'offline';
    tabOffline.className = 'btn btn-primary';
    tabOffline.style.background = '';
    tabOffline.style.color = '';
    tabOnline.className = 'btn btn-secondary';
    tabOnline.style.background = 'transparent';
    tabOnline.style.color = '#fff';
    offlineTableWrapper.style.display = 'block';
    onlineTableWrapper.style.display = 'none';
    currentPage = 1;
    loadTickets();
  });
}

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
      
      const statVerifiedCount = document.getElementById('stat-verified-count');
      const statVerifiedRev = document.getElementById('stat-verified-revenue');
      const statPendingCount = document.getElementById('stat-pending-count');
      const statPendingRev = document.getElementById('stat-pending-revenue');
      const statOnlineCount = document.getElementById('stat-online-count');
      const statOfflineCount = document.getElementById('stat-offline-count');
      const statOnlineRev = document.getElementById('stat-online-revenue');
      const statOfflineRev = document.getElementById('stat-offline-revenue');
      
      if (statOnlineCount) statOnlineCount.innerText = data.stats.onlineCount || 0;
      if (statOfflineCount) statOfflineCount.innerText = data.stats.offlineCount || 0;
      if (statOnlineRev) statOnlineRev.innerText = parseFloat(data.stats.onlineRevenue || 0).toFixed(2);
      if (statOfflineRev) statOfflineRev.innerText = parseFloat(data.stats.offlineRevenue || 0).toFixed(2);
      
      if (statVerifiedCount) statVerifiedCount.innerText = data.stats.paymentVerifiedCount || 0;
      if (statVerifiedRev) statVerifiedRev.innerText = parseFloat(data.stats.paymentVerifiedRevenue || 0).toFixed(2);
      if (statPendingCount) statPendingCount.innerText = data.stats.paymentPendingCount || 0;
      if (statPendingRev) statPendingRev.innerText = parseFloat(data.stats.paymentPendingRevenue || 0).toFixed(2);
      
      const cats = data.stats.categoryStats;
      if (cats) {
        document.getElementById('cat-gen-adult').innerText = cats.General.adults;
        document.getElementById('cat-gen-couple').innerText = cats.General.couples;
        document.getElementById('cat-sil-adult').innerText = cats.Silver.adults;
        document.getElementById('cat-sil-couple').innerText = cats.Silver.couples;
        document.getElementById('cat-gol-adult').innerText = cats.Gold.adults;
        document.getElementById('cat-gol-couple').innerText = cats.Gold.couples;
        if (cats.Family && document.getElementById('cat-fam-pass')) {
          document.getElementById('cat-fam-pass').innerText = cats.Family.pass;
        }
      }
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
    let url = `/api/admin/tickets?page=${currentPage}&limit=${limit}&type=${activeTab}`;

    if (searchVal) url += `&search=${encodeURIComponent(searchVal)}`;
    if (attendanceVal !== 'all') url += `&attendance=${attendanceVal}`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    const data = await response.json();
    if (data.success) {
      currentTicketData = data.tickets;
      if (activeTab === 'online') {
        renderTicketsTable(data.tickets);
      } else {
        renderOfflineTicketsTable(data.tickets);
      }
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
    tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; color: var(--color-text-secondary);">No records match the current filters.</td></tr>`;
    return;
  }

  tableBody.innerHTML = tickets.map(ticket => {
    const statusClass = ticket.attendance ? 'badge success' : 'badge pending';
    const statusText = ticket.attendance ? 'Checked In' : 'Pending';
    const checkInBtnText = ticket.attendance ? 'Undo Checkin' : 'Check In';
    const checkInBtnClass = ticket.attendance ? 'btn-secondary' : 'btn-glow';
    
    let paymentClass = 'badge pending';
    if (ticket.payment === 'Verified') paymentClass = 'badge success';

    return `
      <tr>
        <td style="font-family: var(--font-title); font-weight: bold; color: var(--color-neon-blue);">${ticket.ticket_id}</td>
        <td style="font-size: 0.75rem; color: var(--color-text-secondary); word-break: break-all; max-width: 100px;">${ticket.payment_id || '-'}</td>
        <td><span class="badge" style="background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2);">${ticket.category || 'General'}</span></td>
        <td>
          <div style="font-weight: 600;">${ticket.name}</div>
          <div style="font-size:0.8rem; color: var(--color-text-secondary);">${ticket.email}</div>
        </td>
        <td>${ticket.phone}</td>
        <td style="font-weight: 600;">${ticket.ticket_count}</td>
        <td>₹${parseFloat(ticket.amount).toFixed(2)}</td>
        <td><span class="${paymentClass}" style="${ticket.payment === 'Rejected' ? 'color:#ff3366; border-color:#ff3366;' : ''}">${ticket.payment || 'Not Verified'}</span></td>
        <td><span class="${statusClass}">${statusText}</span></td>
        <td>
          <div style="display:flex; gap:10px;">
            ${ticket.payment !== 'Verified' ? `<button onclick="quickVerifyPayment('${ticket.ticket_id}', 'Verified')" class="btn-glow" style="padding: 6px 12px; font-size:0.8rem; border-color: #00ff88; color: #00ff88; background: transparent;"><i class="fa-solid fa-check"></i> Verify</button>` : ''}
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

const renderOfflineTicketsTable = (tickets) => {
  window.currentOfflineTickets = tickets; // Save for download reference
  if (tickets.length === 0) {
    offlineTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: var(--color-text-secondary);">No offline tickets found.</td></tr>`;
    return;
  }
  
  offlineTableBody.innerHTML = tickets.map(t => {
    const isSold = parseFloat(t.amount || 0) > 0;
    const statusClass = isSold ? 'badge success' : 'badge pending';
    const statusText = isSold ? 'Sold' : 'Unsold';
    const typeLabel = t.booking_details ? (t.booking_details.type || '-') : '-';
    
    return `
      <tr>
        <td>
          <input type="checkbox" class="offline-ticket-check" value="${t.ticket_id}" ${isSold ? 'disabled' : ''} style="cursor: ${isSold ? 'not-allowed' : 'pointer'}; width:16px; height:16px;">
        </td>
        <td style="font-family: var(--font-title); font-weight: bold; color: var(--color-neon-blue);">${t.ticket_id}</td>
        <td style="font-size: 0.75rem; color: var(--color-text-secondary);">${t.order_id || '-'}</td>
        <td><span class="badge" style="background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2);">${t.category}</span></td>
        <td>${typeLabel}</td>
        <td style="font-weight: 600;">${t.ticket_count}</td>
        <td><span class="${statusClass}">${statusText}</span></td>
        <td>
          <div style="display:flex; gap:10px;">
            <button onclick="downloadOfflineTicket('${t.ticket_id}')" class="btn-glow" style="padding: 6px 12px; font-size:0.8rem; border-color: #00ff88; color: #00ff88; background: transparent;"><i class="fa-solid fa-download"></i> Download</button>
            <button onclick="viewTicketDetails('${t.ticket_id}')" class="btn-secondary" style="padding: 6px 12px; font-size:0.8rem; border-color: var(--glass-border); color: #fff;">
              Details
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
  
  if (typeof attachOfflineCheckboxListeners === 'function') {
    attachOfflineCheckboxListeners();
  }
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
  document.getElementById('modal-category').innerText = ticket.category || 'General';
  document.getElementById('modal-payment-id').innerText = ticket.payment_id || '-';
  const typesArray = [];
  if (ticket.couples_count > 0) typesArray.push(`${ticket.couples_count} Couples`);
  if (ticket.adult_count > 0) typesArray.push(`${ticket.adult_count} Adult`);
  if (ticket.child_count > 0) typesArray.push(`${ticket.child_count} Child`);
  
  document.getElementById('modal-count').innerHTML = typesArray.length > 0 ? typesArray.join('<br>') : `${ticket.ticket_count} Person(s)`;
  document.getElementById('modal-amount').innerText = `₹${parseFloat(ticket.amount).toFixed(2)}`;
  
  const paymentStatusEl = document.getElementById('modal-payment-status');
  paymentStatusEl.innerText = ticket.payment || 'Not Verified';
  if (ticket.payment === 'Verified') paymentStatusEl.style.color = '#00ff66';
  else if (ticket.payment === 'Rejected') paymentStatusEl.style.color = '#ff3366';
  else paymentStatusEl.style.color = '#ffaa00';

  const paymentActions = document.getElementById('payment-actions-container');
  if (!ticket.payment || ticket.payment === 'Not Verified') {
    paymentActions.style.display = 'flex';
  } else {
    paymentActions.style.display = 'none';
  }

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
document.addEventListener('DOMContentLoaded', () => {
  loadDashboardStats();
  loadTickets();
  setInterval(loadDashboardStats, 60000); // refresh stats every minute
  
  // Setup Bulk Generate Listener
  const btnGenerateBulk = document.getElementById('btn-generate-bulk');
  const bulkCategory = document.getElementById('bulk-category');
  const bulkType = document.getElementById('bulk-type');
  
  if (bulkCategory && bulkType) {
    bulkCategory.addEventListener('change', () => {
      if (bulkCategory.value === 'Family') {
        bulkType.disabled = true;
        bulkType.style.opacity = '0.5';
      } else {
        bulkType.disabled = false;
        bulkType.style.opacity = '1';
      }
    });
  }

  if (btnGenerateBulk) {
    btnGenerateBulk.addEventListener('click', async () => {
      const category = bulkCategory.value;
      const quantity = document.getElementById('bulk-qty').value;
      const type = bulkType ? bulkType.value : 'Adult';
      
      if (!quantity || quantity < 1 || quantity > 50) {
        showToast('Please enter a valid quantity between 1 and 50.', 'error');
        return;
      }
      
      try {
        btnGenerateBulk.disabled = true;
        btnGenerateBulk.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
        
        const response = await fetch('/api/admin/bulk-generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify({ category, quantity, type })
        });
        
        const data = await response.json();
        if (data.success) {
          showToast(`Successfully generated ${data.tickets.length} tickets. Preparing for print...`, 'success');
          // Save tickets to sessionStorage to pass to the print page
          sessionStorage.setItem('bulkTickets', JSON.stringify(data.tickets));
          // Refresh dashboard
          loadDashboardStats();
          loadTickets();
          // Open print window
          window.open('/admin/print-bulk', '_blank');
        } else {
          showToast(data.error || 'Failed to generate bulk tickets.', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Network error during generation.', 'error');
      } finally {
        btnGenerateBulk.disabled = false;
        btnGenerateBulk.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate & Print';
      }
    });
  }
});

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

// Payment Verification Handlers
const handlePaymentVerification = async (status) => {
  if (!selectedTicketId) return;
  try {
    const response = await fetch('/api/admin/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ ticketId: selectedTicketId, status })
    });
    
    const data = await response.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadTickets(); // Reload list
      closeModal(); // Close modal on success
    } else {
      showToast(data.error || 'Verification failed.', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to backend service.', 'error');
  }
};

window.quickVerifyPayment = async (ticketId, status) => {
  try {
    const response = await fetch('/api/admin/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ ticketId, status })
    });
    
    const data = await response.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadTickets(); // Reload list
    } else {
      showToast(data.error || 'Verification failed.', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to backend service.', 'error');
  }
};

document.getElementById('btn-modal-verify-payment').addEventListener('click', () => handlePaymentVerification('Verified'));
document.getElementById('btn-modal-reject-payment').addEventListener('click', () => handlePaymentVerification('Rejected'));

// Export to CSV
document.getElementById('btn-export-excel').addEventListener('click', async () => {
  try {
    const searchVal = searchInput.value.trim();
    const attendanceVal = filterSelect.value;
    let url = `/api/admin/tickets?page=1&limit=all`;

    if (searchVal) url += `&search=${encodeURIComponent(searchVal)}`;
    if (attendanceVal !== 'all') url += `&attendance=${attendanceVal}`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const data = await response.json();
    if (data.success && data.tickets.length > 0) {
      let csvContent = "Ticket ID,UTR,Category,Name,Email,Phone,Total Tickets,Adults,Couples,Kids,Amount,Payment Status,Attendance,Booked At\n";
      
      data.tickets.forEach(t => {
        const row = [
          t.ticket_id,
          t.payment_id || '',
          t.category || 'General',
          `"${t.name}"`,
          t.email,
          t.phone,
          t.ticket_count,
          t.adult_count,
          t.couples_count,
          t.child_count,
          t.amount,
          t.payment || 'Not Verified',
          t.attendance ? 'Checked In' : 'Pending',
          new Date(t.booked_at).toLocaleString()
        ];
        csvContent += row.join(",") + "\n";
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const urlBlob = URL.createObjectURL(blob);
      link.setAttribute("href", urlBlob);
      link.setAttribute("download", `CrownBeatz_Tickets_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast('Export successful!', 'success');
    } else {
      showToast('No tickets to export.', 'info');
    }
  } catch (err) {
    console.error('Export error:', err);
    showToast('Failed to export tickets.', 'error');
  }
});

// Offline Ticket Handlers
window.downloadOfflineTicket = (ticketId) => {
  if (!window.currentOfflineTickets) return;
  const ticket = window.currentOfflineTickets.find(t => t.ticket_id === ticketId);
  if (ticket) {
    sessionStorage.setItem('bulkTickets', JSON.stringify([ticket]));
    window.open('/print-bulk.html', '_blank');
  }
};

window.attachOfflineCheckboxListeners = () => {
  const checkAll = document.getElementById('check-all-offline');
  const checkBoxes = document.querySelectorAll('.offline-ticket-check:not(:disabled)');
  const btnMarkSold = document.getElementById('btn-mark-sold');
  
  if (!checkAll || !btnMarkSold) return;
  
  const updateBtnVisibility = () => {
    const checkedCount = document.querySelectorAll('.offline-ticket-check:checked:not(:disabled)').length;
    btnMarkSold.style.display = checkedCount > 0 ? 'block' : 'none';
  };

  checkAll.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    checkBoxes.forEach(cb => {
      cb.checked = isChecked;
    });
    updateBtnVisibility();
  });
  
  checkBoxes.forEach(cb => {
    cb.addEventListener('change', updateBtnVisibility);
  });
  
  const btnAutoSelect = document.getElementById('btn-auto-select');
  if (btnAutoSelect) {
    btnAutoSelect.onclick = () => {
      const cat = document.getElementById('auto-select-category').value;
      const type = document.getElementById('auto-select-type').value;
      const count = parseInt(document.getElementById('auto-select-count').value, 10);
      
      if (!count || count <= 0) {
        showToast('Please enter a valid quantity.', 'error');
        return;
      }
      
      // Clear existing
      checkBoxes.forEach(cb => cb.checked = false);
      if (checkAll) checkAll.checked = false;
      
      let selectedCount = 0;
      for (const cb of checkBoxes) {
        if (cb.disabled) continue;
        
        const ticketId = cb.value;
        const ticketData = window.currentOfflineTickets?.find(t => t.ticket_id === ticketId);
        
        if (ticketData) {
          const tCat = ticketData.category || 'General';
          const tType = ticketData.booking_details ? (ticketData.booking_details.type || 'Adult') : 'Adult';
          
          if (tCat.toLowerCase() === cat.toLowerCase() && tType.toLowerCase() === type.toLowerCase()) {
            cb.checked = true;
            selectedCount++;
            if (selectedCount === count) break;
          }
        }
      }
      
      updateBtnVisibility();
      
      if (selectedCount === 0) {
        showToast(`No unsold tickets found for ${cat} - ${type}.`, 'error');
      } else if (selectedCount < count) {
        showToast(`Only ${selectedCount} unsold tickets available for ${cat} - ${type}.`, 'info');
      } else {
        showToast(`Selected ${selectedCount} tickets.`, 'success');
      }
    };
  }
};

document.getElementById('btn-mark-sold')?.addEventListener('click', async () => {
  const checkedBoxes = document.querySelectorAll('.offline-ticket-check:checked:not(:disabled)');
  const ticketIds = Array.from(checkedBoxes).map(cb => cb.value);
  
  if (ticketIds.length === 0) return;
  
  if (!confirm(`Are you sure you want to mark ${ticketIds.length} offline tickets as sold? This will reflect in the total revenue.`)) return;
  
  try {
    const response = await fetch('/api/admin/offline-sold', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ ticketIds })
    });
    
    const data = await response.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadTickets();
      updateDashboardStats();
    } else {
      showToast(data.error || 'Failed to mark tickets as sold.', 'error');
    }
  } catch (err) {
    console.error('Error marking as sold:', err);
    showToast('Server error.', 'error');
  }
});

// Initialize view
document.addEventListener('DOMContentLoaded', updateView);
