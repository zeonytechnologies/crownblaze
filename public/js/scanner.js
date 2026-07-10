// QR Scanner logic
const adminToken = localStorage.getItem('adminToken');

// Redirect to admin login if not logged in
if (!adminToken) {
  window.location.href = '/admin';
}

let html5QrcodeScanner;
let isProcessingScan = false;

// Dom elements
const resultModal = document.getElementById('result-modal');
const resultCard = document.getElementById('result-card');
const resultIcon = document.getElementById('result-icon');
const resultTitle = document.getElementById('result-title');
const resultMessage = document.getElementById('result-message');
const btnCloseResult = document.getElementById('btn-close-result');

// Partial Check-in elements
const selectionContainer = document.getElementById('checkin-selection-container');
const checkboxesContainer = document.getElementById('checkin-checkboxes');
const btnConfirmCheckin = document.getElementById('btn-confirm-checkin');

// Modal Details elements
const resName = document.getElementById('res-name');
const resTicketId = document.getElementById('res-ticket-id');
const resCount = document.getElementById('res-count');
const resTime = document.getElementById('res-time');
const resScanTime = document.getElementById('res-scan-time');

// Manual Input
const manualInput = document.getElementById('manual-scan-input');
const btnManualVerify = document.getElementById('btn-manual-verify');

// Toast notifications
const showToast = (message, type = 'info') => {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid fa-circle-info"></i> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3500);
};

// Send request to backend to verify ticket
const verifyTicket = async (verificationUrl) => {
  if (isProcessingScan) return;
  isProcessingScan = true;

  try {
    const response = await fetch(verificationUrl, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    const data = await response.json();
    displayScanResult(data);

  } catch (error) {
    console.error('Scan verify error:', error);
    showToast('Failed to connect to backend for validation.', 'error');
    isProcessingScan = false;
  }
};

// Display custom modal depending on verification outcome
const displayScanResult = (data) => {
  // Clear modal card classes first
  resultCard.className = 'glass-card scanner-modal-card';
  selectionContainer.style.display = 'none';
  
  if (!data.success && data.status === 'INVALID') {
    // INVALID TICKET
    resultCard.classList.add('status-invalid');
    resultIcon.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color: #ff3366;"></i>';
    resultTitle.innerText = 'INVALID TICKET';
    resultMessage.innerText = data.message || 'Ticket ID does not exist in records.';
    
    // Clear details
    resName.innerText = '-';
    resTicketId.innerText = '-';
    resCount.innerText = '-';
    resTime.innerText = '-';
    resScanTime.innerText = '-';

  } else if (data.success && data.status === 'ALREADY_CHECKED_IN') {
    // ALREADY CHECKED IN
    resultCard.classList.add('status-warning');
    resultIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color: #ffaa00;"></i>';
    resultTitle.innerText = 'ALREADY CHECKED IN';
    resultMessage.innerText = data.message || 'Ticket already scanned.';
    
    // Set details
    const ticket = data.ticket;
    resName.innerText = ticket.name;
    resTicketId.innerText = ticket.ticket_id;
    resCount.innerText = `${ticket.ticket_count} Person(s)`;
    resTime.innerText = new Date(ticket.booked_at).toLocaleString();
    resScanTime.innerText = ticket.checked_in_at ? new Date(ticket.checked_in_at).toLocaleString() : 'N/A';

  } else if (data.success && data.status === 'PARTIAL_CHECKIN_REQUIRED') {
    // PARTIAL CHECKIN REQUIRED
    resultCard.classList.add('status-valid');
    resultIcon.innerHTML = '<i class="fa-solid fa-list-check" style="color: #00ff66;"></i>';
    resultTitle.innerText = 'SELECT GUESTS';
    resultMessage.innerText = data.message || 'Check-in pending. Select arriving guests.';
    
    // Set details
    const ticket = data.ticket;
    resName.innerText = ticket.name;
    resTicketId.innerText = ticket.ticket_id;
    resCount.innerText = `${ticket.ticket_count} Person(s)`;
    resTime.innerText = new Date(ticket.booked_at).toLocaleString();
    resScanTime.innerText = '-';
    
    // Generate Checkboxes
    checkboxesContainer.innerHTML = '';
    const { couples, adults, children } = data.remaining;
    
    const addCheckboxes = (count, type, label) => {
      for(let i=0; i<count; i++) {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.gap = '10px';
        div.innerHTML = `
          <input type="checkbox" id="chk-${type}-${i}" class="guest-chk" data-type="${type}" checked style="width: 20px; height: 20px; cursor: pointer;">
          <label for="chk-${type}-${i}" style="color: #fff; cursor: pointer;">${label} ${i+1}</label>
        `;
        checkboxesContainer.appendChild(div);
      }
    };
    
    addCheckboxes(couples, 'couples', 'Couples Pass (Person)');
    addCheckboxes(adults, 'adults', 'Adult Pass');
    addCheckboxes(children, 'children', 'Child Pass');
    
    selectionContainer.style.display = 'block';
    btnConfirmCheckin.dataset.ticketId = ticket.ticket_id;

  } else {
    // General connection or parse error
    showToast(data.error || 'Unknown scanner response.', 'error');
    isProcessingScan = false;
    return;
  }

  // Open modal
  resultModal.classList.add('active');
};

// Close modal and resume scanning
btnCloseResult.addEventListener('click', () => {
  resultModal.classList.remove('active');
  isProcessingScan = false;
  manualInput.value = '';
});

// Process Partial/Full Checkin
btnConfirmCheckin.addEventListener('click', async () => {
  const ticketId = btnConfirmCheckin.dataset.ticketId;
  if (!ticketId) return;
  
  const checkboxes = document.querySelectorAll('.guest-chk');
  let couples = 0, adults = 0, children = 0;
  
  checkboxes.forEach(chk => {
    if (chk.checked) {
      if (chk.dataset.type === 'couples') couples++;
      else if (chk.dataset.type === 'adults') adults++;
      else if (chk.dataset.type === 'children') children++;
    }
  });
  
  if (couples === 0 && adults === 0 && children === 0) {
    showToast('Please select at least one guest to check in.', 'info');
    return;
  }
  
  try {
    btnConfirmCheckin.disabled = true;
    btnConfirmCheckin.innerText = 'Checking in...';
    
    const response = await fetch('/api/admin/checkin', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ticketId, couples, adults, children })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast(data.message, 'success');
      selectionContainer.style.display = 'none';
      resultCard.className = 'glass-card scanner-modal-card status-valid';
      resultIcon.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #00ff66;"></i>';
      resultTitle.innerText = 'CHECKED IN';
      resultMessage.innerText = data.message;
      resScanTime.innerText = new Date().toLocaleString();
    } else {
      showToast(data.error || 'Failed to check in.', 'error');
    }
    
  } catch (error) {
    console.error(error);
    showToast('Network error during checkin.', 'error');
  } finally {
    btnConfirmCheckin.disabled = false;
    btnConfirmCheckin.innerText = 'Confirm Check-In';
  }
});

// Setup QR Code scanner
const onScanSuccess = (decodedText) => {
  let verifyUrl = decodedText.trim();
  
  // Backward compatibility: If it's an old ticket with a full URL, extract just the ticket ID
  if (verifyUrl.includes('/api/admin/verify/')) {
    const parts = verifyUrl.split('/api/admin/verify/');
    const ticketId = parts[1];
    verifyUrl = `/api/admin/verify/${ticketId}`;
  } 
  // If it's a new ticket with just the ID
  else if (verifyUrl.startsWith('CB-')) {
    verifyUrl = `/api/admin/verify/${verifyUrl}`;
  } else {
    // Scanned something else, show invalid ticket schema
    displayScanResult({
      success: false,
      status: 'INVALID',
      message: '❌ Invalid QR Code format. Not a CrownBeatz ticket.'
    });
    return;
  }
  
  verifyTicket(verifyUrl);
};

const initScanner = () => {
  html5QrcodeScanner = new Html5QrcodeScanner("reader", { 
    fps: 10, 
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.0
  });
  html5QrcodeScanner.render(onScanSuccess);
};

// Manual verification trigger
btnManualVerify.addEventListener('click', () => {
  const code = manualInput.value.trim();
  if (!code) {
    showToast('Please enter a ticket ID.', 'info');
    return;
  }
  
  // Format manual verify URL
  const verifyUrl = `/api/admin/verify/${code}`;
  verifyTicket(verifyUrl);
});

// Enter key trigger for manual entry
manualInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    btnManualVerify.click();
  }
});

document.addEventListener('DOMContentLoaded', initScanner);
