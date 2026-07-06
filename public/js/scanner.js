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

  } else if (data.success && data.status === 'VALID') {
    // VALID TICKET
    resultCard.classList.add('status-valid');
    resultIcon.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #00ff66;"></i>';
    resultTitle.innerText = 'VALID TICKET';
    resultMessage.innerText = data.message || 'Successfully checked in.';
    
    // Set details
    const ticket = data.ticket;
    resName.innerText = ticket.name;
    resTicketId.innerText = ticket.ticket_id;
    resCount.innerText = `${ticket.ticket_count} Person(s)`;
    resTime.innerText = new Date(ticket.booked_at).toLocaleString();
    resScanTime.innerText = new Date().toLocaleString(); // Current time

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

// Setup QR Code scanner
const onScanSuccess = (decodedText) => {
  // Ensure the scanned text is a valid CrownBeatz verification URL
  if (decodedText.includes('/api/admin/verify/')) {
    verifyTicket(decodedText);
  } else {
    // Scanned something else, show invalid ticket schema
    displayScanResult({
      success: false,
      status: 'INVALID',
      message: '❌ Invalid QR Code format. Not a CrownBeatz ticket.'
    });
  }
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
