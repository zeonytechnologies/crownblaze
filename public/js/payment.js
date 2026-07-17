// Payment flow coordination using Cashfree Checkout
const bookingForm = document.getElementById('booking-form');
const btnSubmitBooking = document.getElementById('btn-submit-booking');

// Initialize Cashfree
const cashfree = Cashfree({
    mode: "sandbox",
});

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
  if (!name || !email || !phone) {
    showToast('Please enter all your details.', 'error');
    return;
  }

  try {
    btnSubmitBooking.disabled = true;
    showLoader(true);

    // 1. Create Cashfree order session
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

    // Hide loader before triggering Cashfree modal
    showLoader(false);

    // 2. Open Cashfree Drop-in Checkout
    let checkoutOptions = {
      paymentSessionId: orderData.payment_session_id,
      redirectTarget: "_modal",
    };

    cashfree.checkout(checkoutOptions).then(async (result) => {
      if (result.error) {
        btnSubmitBooking.disabled = false;
        showToast('Payment window closed or encountered an error.', 'error');
        console.error("Cashfree Checkout Error:", result.error);
        return;
      }
      
      if (result.redirect) {
        console.log("Payment will be redirected");
        return;
      }
      
      if (result.paymentDetails) {
        // Payment was successful in UI! Now verify with our backend.
        showLoader(true);
        try {
          const verifyResponse = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_id: orderData.order_id,
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
            showToast(verifyData.error || 'Backend verification failed.', 'error');
          }
        } catch (err) {
          console.error('Verification error:', err);
          showLoader(false);
          btnSubmitBooking.disabled = false;
          showToast('Payment verify failed. Please contact support.', 'error');
        }
      }
    });

  } catch (error) {
    console.error('Booking submission error:', error);
    showLoader(false);
    btnSubmitBooking.disabled = false;
    showToast('Server connection failed. Try again.', 'error');
  }
};

bookingForm.addEventListener('submit', handleBookingSubmit);
