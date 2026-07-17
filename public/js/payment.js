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
  currentUpiUrl = `upi://pay?pa=${UPI_ID}&pn=${PAYEE_NAME}&am=${amount}&cu=INR`;
  
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

btnCancelUpi.addEventListener('click', closeUpiModal);

const handleBookingSubmit = (e) => {
  e.preventDefault();

  const name = document.getElementById('full-name').value.trim();
  const email = document.getElementById('email-address').value.trim();
  const phone = document.getElementById('phone-number').value.trim();
  const couplesCount = window.ticketCounts.couples;
  const adultCount = window.ticketCounts.adult;
  const childCount = window.ticketCounts.child;
  const category = window.ticketCategory || 'General';
  
  const totalTickets = couplesCount + adultCount + childCount;

  // Frontend Validations
  if (totalTickets === 0) {
    showToast('Please select at least one ticket.', 'error');
    return;
  }
  if (!name || !email || !phone) {
    showToast('Please enter all your details.', 'error');
    return;
  }

  // Calculate amount on frontend (Backend will recalculate to be safe)
  let PRICE_COUPLES = 549;
  let PRICE_ADULT = 349;
  if (category === 'Silver') { PRICE_COUPLES = 799; PRICE_ADULT = 499; }
  else if (category === 'Gold') { PRICE_COUPLES = 899; PRICE_ADULT = 599; }
  const PRICE_CHILD = 0;
  
  const totalAmount = (couplesCount * PRICE_COUPLES) + (adultCount * PRICE_ADULT) + (childCount * PRICE_CHILD);

  currentBookingData = { name, email, phone, category, couplesCount, adultCount, childCount };
  
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
