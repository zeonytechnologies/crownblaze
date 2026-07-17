// Global State for Multi-Category Pricing
window.ticketPrices = {
  general: { couples: 549, adult: 349, child: 0 },
  silver: { couples: 799, adult: 499, child: 0 },
  gold: { couples: 899, adult: 599, child: 0 }
};

window.ticketCounts = {
  general: { couples: 0, adult: 0, child: 0 },
  silver: { couples: 0, adult: 0, child: 0 },
  gold: { couples: 0, adult: 0, child: 0 }
};

window.updateQty = (category, type, delta) => {
  const currentTotal = 
    window.ticketCounts.general.couples + window.ticketCounts.general.adult + window.ticketCounts.general.child +
    window.ticketCounts.silver.couples + window.ticketCounts.silver.adult + window.ticketCounts.silver.child +
    window.ticketCounts.gold.couples + window.ticketCounts.gold.adult + window.ticketCounts.gold.child;
    
  if (delta > 0 && currentTotal >= 10) {
    showToast('Maximum 10 tickets can be booked at a time.', 'error');
    return;
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

    const cats = ['general', 'silver', 'gold'];
    const types = ['couples', 'adult', 'child'];
    
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
      <p style="margin-bottom:10px;">By purchasing a ticket for CrownBeatz, you agree to abide by all event rules and regulations.</p>
      <ul style="margin-left: 20px; margin-bottom: 15px;">
        <li style="margin-bottom: 5px;">Valid government ID is required for entry.</li>
        <li style="margin-bottom: 5px;">Management reserves the right to refuse admission.</li>
        <li style="margin-bottom: 5px;">No outside food, beverages, or illegal substances allowed.</li>
        <li>Event organizers are not responsible for lost or stolen items.</li>
      </ul>
      <p>For any further details, contact: <strong>+91 81248 72367</strong></p>
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

document.addEventListener('DOMContentLoaded', () => {
  initPricingCalculator();
});
