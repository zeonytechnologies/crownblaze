// Payment flow coordination using Manual UPI
const bookingForm = document.getElementById('booking-form');
const btnSubmitBooking = document.getElementById('btn-submit-booking');

const upiModal = document.getElementById('upi-modal');
const btnCancelUpi = document.getElementById('btn-cancel-upi');
const btnVerifyUpi = document.getElementById('btn-verify-upi');
const upiUtrInput = document.getElementById('upi-utr');
const upiAmountDisplay = document.getElementById('upi-amount-display');
const upiDownloadBtn = document.getElementById('upi-download-qr-btn');
const upiQrcodeDiv = document.getElementById('upi-qrcode');

let currentBookingData = null;
let currentUpiUrl = '';
let qrcodeInstance = null;

// The Target UPI ID
const UPI_ID = '8124872367@yes'; 
const PAYEE_NAME = 'CrownBeatz';

const openUpiModal = (amount) => {
  upiAmountDisplay.textContent = amount;
  
  // Construct the standard UPI Deep link intent URL
  const formattedAmount = Number(amount).toFixed(2);
  currentUpiUrl = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${formattedAmount}&cu=INR`;

  // Clear previous QR code if any
  upiQrcodeDiv.innerHTML = '';
  
  // Generate New QR Code
  qrcodeInstance = new QRCode(upiQrcodeDiv, {
    text: currentUpiUrl,
    width: 200,
    height: 200,
    colorDark : "#000000",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.H
  });

  upiUtrInput.value = '';
  upiModal.classList.add('active');
};

upiDownloadBtn?.addEventListener('click', () => {
  const canvas = upiQrcodeDiv.querySelector('canvas');
  if (canvas) {
    const padding = 20;
    const newCanvas = document.createElement('canvas');
    newCanvas.width = canvas.width + (padding * 2);
    newCanvas.height = canvas.height + (padding * 2);
    const ctx = newCanvas.getContext('2d');
    
    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    
    // Draw original QR code in the center
    ctx.drawImage(canvas, padding, padding);

    const dataUrl = newCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'CrownBeatz-Payment-QR.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
});

const closeUpiModal = () => {
  upiModal.classList.remove('active');
  currentBookingData = null;
};

// UTR Guide Modal Toggle Logic
document.getElementById('btn-show-utr-guide')?.addEventListener('click', () => {
  const modal = document.getElementById('utr-guide-modal');
  if (modal) modal.classList.add('active');
});
document.addEventListener('click', (e) => {
  if (e.target.id === 'btn-close-utr-icon' || e.target.id === 'btn-close-utr-guide') {
    const modal = document.getElementById('utr-guide-modal');
    if (modal) modal.classList.remove('active');
  }
});

// Mobile Pay Guide Modal Toggle Logic
document.getElementById('btn-show-mobile-pay-guide')?.addEventListener('click', () => {
  const modal = document.getElementById('mobile-pay-guide-modal');
  if (modal) modal.classList.add('active');
});

// Cancel Booking Confirmation Logic
btnCancelUpi.addEventListener('click', () => {
  const confirmModal = document.getElementById('cancel-confirm-modal');
  if (confirmModal) confirmModal.classList.add('active');
});

document.addEventListener('click', (e) => {
  if (e.target.id === 'btn-stay-payment') {
    const confirmModal = document.getElementById('cancel-confirm-modal');
    if (confirmModal) confirmModal.classList.remove('active');
  } else if (e.target.id === 'btn-confirm-cancel-payment') {
    const confirmModal = document.getElementById('cancel-confirm-modal');
    if (confirmModal) confirmModal.classList.remove('active');
    closeUpiModal();
  }
});

const handleBookingSubmit = (e) => {
  e.preventDefault();

  const name = document.getElementById('full-name').value.trim();
  const email = document.getElementById('email-address').value.trim();
  const phone = document.getElementById('phone-number').value.trim();
  
  let totalTickets = 0;
  let totalAmount = 0;
  
  const cats = ['general', 'silver', 'gold'];
  const types = ['adult', 'couples'];
  
  cats.forEach(cat => {
    types.forEach(type => {
      if (window.ticketCounts[cat][type] !== undefined) {
        const qty = window.ticketCounts[cat][type] || 0;
        if (qty > 0) {
          if (type === 'couples') {
            totalTickets += qty * 2; // Couples count as 2 scans
          } else {
            totalTickets += qty;
          }
          totalAmount += (window.ticketPrices[cat][type] * qty);
        }
      }
    });
  });

  // Frontend Validations
  const termsCheckbox = document.getElementById('terms-checkbox');
  if (termsCheckbox && !termsCheckbox.checked) {
    showToast('You must accept the Terms & Conditions to book tickets.', 'error');
    return;
  }

  if (totalTickets === 0) {
    showToast('Please select at least one ticket.', 'error');
    return;
  }
  if (!name || !email || !phone) {
    showToast('Please enter all your details.', 'error');
    return;
  }

  currentBookingData = { 
    name, 
    email, 
    phone, 
    ticketCounts: window.ticketCounts,
    totalTickets,
    totalAmount
  };
  
  openUpiModal(totalAmount);
};

btnVerifyUpi.addEventListener('click', async () => {
  const transactionId = upiUtrInput.value.trim();
  
  if (!transactionId || !/^\d{12}$/.test(transactionId)) {
    showToast('Please enter a valid 12-digit Transaction ID (UTR).', 'error');
    return;
  }

  if (!currentBookingData) return;

  try {
    btnVerifyUpi.disabled = true;
    showLoader(true);

    const payload = {
      ...currentBookingData,
      transaction_id: transactionId
    };

    const verifyResponse = await fetch('/api/payment/submit-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const verifyData = await verifyResponse.json();
    
    if (verifyData.success) {
      window.location.href = `/success.html?ticketId=${verifyData.ticketId}`;
    } else {
      showLoader(false);
      btnVerifyUpi.disabled = false;
      showToast(verifyData.error || 'Booking submission failed.', 'error');
    }
  } catch (error) {
    console.error('Booking submission error:', error);
    showLoader(false);
    btnVerifyUpi.disabled = false;
    showToast('Server connection failed. Try again.', 'error');
  }
});

bookingForm.addEventListener('submit', handleBookingSubmit);
