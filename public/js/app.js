let PRICE_COUPLES = 549;
let PRICE_ADULT = 349;
let PRICE_CHILD = 0;

// Countdown Timer logic removed
// Quantity & Pricing Calculator
window.ticketCategory = 'General';
window.ticketCounts = { couples: 0, adult: 1, child: 0 };

const initPricingCalculator = () => {
  const updatePricing = () => {
    document.getElementById('qty-couples-val').innerText = window.ticketCounts.couples;
    document.getElementById('qty-adult-val').innerText = window.ticketCounts.adult;
    document.getElementById('qty-child-val').innerText = window.ticketCounts.child;
    
    document.getElementById('summary-couples').innerText = window.ticketCounts.couples;
    document.getElementById('summary-adult').innerText = window.ticketCounts.adult;
    document.getElementById('summary-child').innerText = window.ticketCounts.child;

    const total = 
      (window.ticketCounts.couples * PRICE_COUPLES) + 
      (window.ticketCounts.adult * PRICE_ADULT) + 
      (window.ticketCounts.child * PRICE_CHILD);

    document.getElementById('total-display').innerText = total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const updateCategoryPrices = (category) => {
    window.ticketCategory = category;
    
    if (category === 'General') {
      PRICE_COUPLES = 549;
      PRICE_ADULT = 349;
      document.getElementById('summary-category-features').innerText = 'Standing & dancing area provided.';
    } else if (category === 'Silver') {
      PRICE_COUPLES = 799;
      PRICE_ADULT = 499;
      document.getElementById('summary-category-features').innerText = 'Chair sitting with dancing area provided.';
    } else if (category === 'Gold') {
      PRICE_COUPLES = 899;
      PRICE_ADULT = 599;
      document.getElementById('summary-category-features').innerText = 'Premium seating with dancing area provided.';
    }

    document.getElementById('summary-category-name').innerText = category;
    
    // Update Labels
    document.getElementById('lbl-price-couples').innerText = `₹${PRICE_COUPLES}`;
    document.getElementById('lbl-price-adult').innerText = `₹${PRICE_ADULT}`;
    document.getElementById('summary-price-couples').innerText = `₹${PRICE_COUPLES}`;
    document.getElementById('summary-price-adult').innerText = `₹${PRICE_ADULT}`;
    
    updatePricing();
  };

  // Category buttons click handler
  const categoryBtns = document.querySelectorAll('.category-btn');
  categoryBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Remove active class from all
      categoryBtns.forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
      });
      // Add active to clicked
      e.target.classList.add('active');
      e.target.style.background = ''; // reset to default glow style
      
      const category = e.target.getAttribute('data-val');
      updateCategoryPrices(category);
    });
  });

  const setupBtn = (type) => {
    document.getElementById(`qty-${type}-minus`).addEventListener('click', () => {
      if (window.ticketCounts[type] > 0) {
        window.ticketCounts[type]--;
        updatePricing();
      }
    });
    document.getElementById(`qty-${type}-plus`).addEventListener('click', () => {
      const totalTickets = window.ticketCounts.couples + window.ticketCounts.adult + window.ticketCounts.child;
      if (totalTickets < 10) {
        window.ticketCounts[type]++;
        updatePricing();
      } else {
        showToast('Maximum 10 tickets can be booked at a time.', 'error');
      }
    });
  };

  setupBtn('couples');
  setupBtn('adult');
  setupBtn('child');

  updatePricing();
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

document.addEventListener('DOMContentLoaded', () => {
  initPricingCalculator();
});
