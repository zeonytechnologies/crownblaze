// Payment flow coordination using Manual UPI
const bookingForm = document.getElementById('booking-form');
const btnSubmitBooking = document.getElementById('btn-submit-booking');

const upiModal = document.getElementById('upi-modal');
const btnCancelUpi = document.getElementById('btn-cancel-upi');
const btnVerifyUpi = document.getElementById('btn-verify-upi');
const upiUtrInput = document.getElementById('upi-utr');
const upiAmountDisplay = document.getElementById('upi-amount-display');
const upiDeeplinkBtn = document.getElementById('upi-deeplink-btn');
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
  
  // Update the Mobile Deeplink Button
  upiDeeplinkBtn.href = currentUpiUrl;

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

btnCancelUpi.addEventListener('click', closeUpiModal);

const handleBookingSubmit = (e) => {
  e.preventDefault();

  const name = document.getElementById('full-name').value.trim();
  const email = document.getElementById('email-address').value.trim();
  const phone = document.getElementById('phone-number').value.trim();
  
  let totalTickets = 0;
  let totalAmount = 0;
  
  const cats = ['general', 'silver', 'gold'];
  const types = ['couples', 'adult', 'child'];
  
  cats.forEach(cat => {
    types.forEach(type => {
      const qty = window.ticketCounts[cat][type];
      totalTickets += qty;
      totalAmount += (window.ticketPrices[cat][type] * qty);
    });
  });

  // Frontend Validations
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
  
  if (!transactionId || transactionId.length < 10) {
    showToast('Please enter a valid Transaction ID / UTR.', 'error');
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
