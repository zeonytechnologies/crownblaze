// Payment flow coordination using Razorpay Checkout
const bookingForm = document.getElementById('booking-form');
const btnSubmitBooking = document.getElementById('btn-submit-booking');

const handleBookingSubmit = async (e) => {
  e.preventDefault();

  const name = document.getElementById('full-name').value.trim();
  const email = document.getElementById('email-address').value.trim();
  const phone = document.getElementById('phone-number').value.trim();
  const couplesCount = window.ticketCounts.couples;
  const adultCount = window.ticketCounts.adult;
  const childCount = window.ticketCounts.child;
  
  const totalTickets = couplesCount + adultCount + childCount;

  // Frontend Validations
  if (totalTickets === 0) {
    showToast('Please select at least one ticket.', 'error');
    return;
  }
  if (!name) {
    showToast('Please enter your full name.', 'error');
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Please enter a valid email address.', 'error');
    return;
  }
  if (!phone || !/^[0-9\s+-]{10,15}$/.test(phone)) {
    showToast('Please enter a valid phone number (10-15 digits).', 'error');
    return;
  }

  try {
    // Disable submit button and show loader
    btnSubmitBooking.disabled = true;
    showLoader(true);

    // 1. Create Razorpay order
    const orderResponse = await fetch('/api/payment/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, couplesCount, adultCount, childCount })
    });

    const orderData = await orderResponse.json();
    if (!orderData.success) {
      showLoader(false);
      btnSubmitBooking.disabled = false;
      showToast(orderData.error || 'Failed to create order. Try again.', 'error');
      return;
    }

    // 2. Configure & Open Razorpay checkout modal
    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: 'INR',
      name: 'CrownBeatz DJ Night',
      description: `Booking for ${totalTickets} Ticket(s)`,
      image: '/images/logo-badge.png', // Optional branding placeholder
      order_id: orderData.orderId,
      prefill: {
        name: name,
        email: email,
        contact: phone
      },
      theme: {
        color: '#7b2cbf' // Purple brand theme
      },
      handler: async function (response) {
        // Payment success callback from Razorpay
        try {
          showLoader(true);
          // 3. Verify Razorpay signature on our backend
          const verifyResponse = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              name,
              email,
              phone,
              couplesCount,
              adultCount,
              childCount
            })
          });

          const verifyData = await verifyResponse.json();
          if (verifyData.success) {
            // Redirect to success route
            window.location.href = `/success.html?ticketId=${verifyData.ticketId}`;
          } else {
            showLoader(false);
            btnSubmitBooking.disabled = false;
            showToast(verifyData.error || 'Signature verification failed.', 'error');
          }
        } catch (err) {
          console.error('Verification error:', err);
          showLoader(false);
          btnSubmitBooking.disabled = false;
          showToast('Payment verify failed. Please contact support.', 'error');
        }
      },
      modal: {
        ondismiss: function () {
          showLoader(false);
          btnSubmitBooking.disabled = false;
          showToast('Payment window closed by user.', 'info');
        }
      }
    };

    const rzp = new Razorpay(options);
    showLoader(false); // Hide the loader before displaying the modal
    rzp.open();

  } catch (error) {
    console.error('Booking submission error:', error);
    showLoader(false);
    btnSubmitBooking.disabled = false;
    showToast('Server connection failed. Try again.', 'error');
  }
};

bookingForm.addEventListener('submit', handleBookingSubmit);
