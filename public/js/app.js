// Global State for Multi-Category Pricing
window.ticketPrices = {
  general: { couples: 599, adult: 349, child: 0, pass: 0 },
  silver: { couples: 799, adult: 449, child: 0, pass: 0 },
  gold: { couples: 1099, adult: 599, child: 0, pass: 0 },
  family: { couples: 0, adult: 0, child: 0, pass: 2999 }
};

window.ticketCounts = {
  general: { couples: 0, adult: 0, child: 0, pass: 0 },
  silver: { couples: 0, adult: 0, child: 0, pass: 0 },
  gold: { couples: 0, adult: 0, child: 0, pass: 0 },
  family: { couples: 0, adult: 0, child: 0, pass: 0 }
};

window.seatAvailability = {
  silver: 250,
  gold: 250,
  family: 15
};

window.updateQty = (category, type, delta) => {
  const currentTotal = 
    window.ticketCounts.general.couples*2 + window.ticketCounts.general.adult + window.ticketCounts.general.child +
    window.ticketCounts.silver.couples*2 + window.ticketCounts.silver.adult + window.ticketCounts.silver.child +
    window.ticketCounts.gold.couples*2 + window.ticketCounts.gold.adult + window.ticketCounts.gold.child +
    window.ticketCounts.family.pass*6;
    
  if (delta > 0 && currentTotal >= 20) {
    // Increased total limit to accommodate family passes (e.g., 2 family passes = 12 people)
    showToast('Maximum 20 people can be booked at a time.', 'error');
    return;
  }
  
  if (type === 'child' && delta > 0) {
    const totalChildren = window.ticketCounts.general.child + window.ticketCounts.silver.child + window.ticketCounts.gold.child;
    if (totalChildren >= 2) {
      showToast('Maximum 2 children allowed per booking.', 'error');
      return;
    }
  }

  if (delta > 0 && (category === 'silver' || category === 'gold' || category === 'family')) {
    let reqSeats = 1;
    let currentCatSeats = 0;

    if (category === 'silver' || category === 'gold') {
      reqSeats = (type === 'couples' ? 2 : 1);
      currentCatSeats = (window.ticketCounts[category].couples * 2) + window.ticketCounts[category].adult + window.ticketCounts[category].child;
    } else if (category === 'family') {
      reqSeats = 1;
      currentCatSeats = window.ticketCounts.family.pass;
    }
    
    if (currentCatSeats + reqSeats > window.seatAvailability[category]) {
      showToast(`Not enough ${category.charAt(0).toUpperCase() + category.slice(1)} Passes available! Only ${window.seatAvailability[category]} left.`, 'error');
      return;
    }
  }
  
  if (window.ticketCounts[category][type] + delta >= 0) {
    window.ticketCounts[category][type] += delta;
    if (window.updatePricing) window.updatePricing();
  }
};

const initPricingCalculator = () => {
  window.updatePricing = () => {
    let total = 0;
    const breakdownList = document.getElementById('dynamic-breakdown-list');
    if (breakdownList) breakdownList.innerHTML = '';
    let hasItems = false;

    const cats = ['general', 'silver', 'gold', 'family'];
    const types = ['couples', 'adult', 'child', 'pass'];
    
    cats.forEach(cat => {
      types.forEach(type => {
        const qty = window.ticketCounts[cat][type];
        // Update DOM labels
        const el = document.getElementById(`qty-${cat}-${type}-val`);
        if(el) el.innerText = qty;

        if (qty > 0) {
          hasItems = true;
          const price = window.ticketPrices[cat][type];
          total += (price * qty);
          
          const catName = cat.charAt(0).toUpperCase() + cat.slice(1);
          const typeName = type.charAt(0).toUpperCase() + type.slice(1);
          
          if (breakdownList) {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.marginBottom = '6px';
            row.innerHTML = `<span>${catName} ${typeName} (${price > 0 ? '₹'+price : 'Free'})</span> <span style="color:#fff;">x ${qty}</span>`;
            breakdownList.appendChild(row);
          }
        }
      });
    });

    if (!hasItems && breakdownList) {
      breakdownList.innerHTML = '<p>Please select tickets to view breakdown.</p>';
    }

    const totalDisplay = document.getElementById('total-display');
    if (totalDisplay) {
      totalDisplay.innerText = total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  };

  window.updatePricing();
};

// FAB Scroll Logic
document.addEventListener('DOMContentLoaded', () => {
  const fab = document.getElementById('fab-book');
  if (fab) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 600) {
        fab.classList.add('show');
      } else {
        fab.classList.remove('show');
      }
    });

    fab.addEventListener('click', () => {
      const bookingSection = document.getElementById('booking');
      if (bookingSection) {
        bookingSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
});

// Toast Notifications Helper
const showToast = (message, type = 'info') => {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = '<i class="fa-solid fa-circle-info"></i>';
  if (type === 'success') {
    icon = '<i class="fa-solid fa-circle-check"></i>';
  } else if (type === 'error') {
    icon = '<i class="fa-solid fa-circle-xmark"></i>';
  }

  toast.innerHTML = `${icon} <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse forwards';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
};

// Loading Spinner Helpers
const showLoader = (show = true) => {
  const overlay = document.getElementById('loader-overlay');
  if (show) {
    overlay.classList.add('active');
  } else {
    overlay.classList.remove('active');
  }
};

// Policy Modal Content Switcher
window.openPolicy = (type) => {
  const title = document.getElementById('policy-title');
  const content = document.getElementById('policy-content');
  if(type === 'terms') {
    title.innerHTML = 'Terms & Conditions <i class="fa-solid fa-xmark" style="cursor: pointer; color: #fff;" onclick="document.getElementById(\'policy-modal\').classList.remove(\'active\')"></i>';
    content.innerHTML = `
      <ul style="margin-left: 20px; margin-bottom: 15px; font-size: 0.9rem; color: var(--color-text-secondary);">
        <li style="margin-bottom: 5px;">Entry is allowed only with a valid ticket or registration pass.</li>
        <li style="margin-bottom: 5px;">The organizer reserves the right to refuse entry to anyone for safety or security reasons.</li>
        <li style="margin-bottom: 5px;">No refunds will be provided unless the event is officially canceled by the organizer.</li>
        <li style="margin-bottom: 5px;">Tickets are non-transferable unless approved by the organizer.</li>
        <li style="margin-bottom: 5px;">Entry gates will close at the announced time. Late entry may not be permitted.</li>
        <li style="margin-bottom: 5px;">Weapons, sharp objects, fireworks, illegal drugs, and other prohibited items are strictly forbidden.</li>
        <li style="margin-bottom: 5px;">Alcohol is prohibited unless specifically permitted under applicable laws and licenses.</li>
        <li style="margin-bottom: 5px;">Smoking or vaping is allowed only in designated areas, if provided.</li>
        <li style="margin-bottom: 5px;">Any damage to event property will be recovered from the person responsible.</li>
        <li style="margin-bottom: 5px;">Misbehavior, fighting, harassment, or creating disturbances will result in immediate removal without a refund.</li>
        <li style="margin-bottom: 5px;">Follow all instructions given by security staff and event organizers.</li>
        <li style="margin-bottom: 5px;">The organizer is not responsible for loss, theft, or damage to personal belongings.</li>
        <li style="margin-bottom: 5px;">The event may be photographed or recorded. By entering, attendees consent to the use of their image for promotional purposes.</li>
        <li style="margin-bottom: 5px;">The schedule, performers, or venue may change due to unavoidable circumstances.</li>
        <li style="margin-bottom: 5px;">In case of extreme weather, technical issues, or government orders, the event may be postponed or canceled.</li>
        <li style="margin-bottom: 5px;">Parking is at the owner’s risk. The organizer is not responsible for vehicle damage or theft.</li>
        <li style="margin-bottom: 5px;">Minors should attend only if allowed by the event policy and, where appropriate, with a parent or guardian.</li>
        <li style="margin-bottom: 5px;">Medical emergencies should be reported immediately to the event staff or first-aid team.</li>
        <li style="margin-bottom: 5px;">Any violation of these terms may result in removal from the venue and possible legal action.</li>
        <li style="margin-bottom: 5px;">By attending the event, all guests agree to comply with these Terms & Conditions.</li>
        <li style="margin-bottom: 5px; font-weight: bold; color: var(--color-neon-blue);">Travel at Own Risk: All attendees travel to and from the event at their own risk. The organizer shall not be held responsible for any travel-related accidents, injuries, delays, or losses.</li>
      </ul>
    `;
  } else if(type === 'privacy') {
    title.innerHTML = 'Privacy Policy <i class="fa-solid fa-xmark" style="cursor: pointer; color: #fff;" onclick="document.getElementById(\'policy-modal\').classList.remove(\'active\')"></i>';
    content.innerHTML = `
      <p style="margin-bottom:10px;">We respect your privacy. Any personal information (name, phone, email) collected during booking is used strictly for event verification and ticketing purposes.</p>
      <p style="margin-bottom:15px;">We do not sell, rent, or share your data with unauthorized third parties.</p>
      <p>For any privacy concerns, contact: <strong>crownbeatzorg@gmail.com</strong></p>
    `;
  } else if(type === 'return') {
    title.innerHTML = 'Return Policy <i class="fa-solid fa-xmark" style="cursor: pointer; color: #fff;" onclick="document.getElementById(\'policy-modal\').classList.remove(\'active\')"></i>';
    content.innerHTML = `
      <h4 style="color: #ff3366; margin-bottom: 10px; font-size: 1.1rem;">No Returns After Payment</h4>
      <p style="margin-bottom:10px;">All ticket sales are strictly final and non-refundable.</p>
      <p style="margin-bottom:15px;">Once a payment has been successfully verified and a ticket is issued, we cannot process cancellations or issue refunds under any circumstances.</p>
      <p>For any further details about our return policy, please contact us directly at:<br>
      <strong style="color: #fff; display: inline-block; margin-top: 5px;"><i class="fa-solid fa-phone"></i> +91 81248 72367</strong></p>
    `;
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  initPricingCalculator();

  try {
    const response = await fetch('/api/ticket/availability');
    const data = await response.json();
    if (data.success && data.availability) {
      window.seatAvailability = data.availability;
      
      // Update UI badges
      const silverBadge = document.getElementById('silver-remaining-badge');
      if (silverBadge) silverBadge.innerText = `${data.availability.silver} Seats Left`;
      
      const goldBadge = document.getElementById('gold-remaining-badge');
      if (goldBadge) goldBadge.innerText = `${data.availability.gold} Seats Left`;

      const familyBadge = document.getElementById('family-remaining-badge');
      if (familyBadge) familyBadge.innerText = `${data.availability.family} Passes Left`;
    }
  } catch (err) {
    console.error('Failed to fetch availability:', err);
  }
});
