const PRICE_COUPLES = 499;
const PRICE_ADULT = 299;
const PRICE_CHILD = 199;

// Countdown Timer logic
const initCountdown = () => {
  // Set date to December 31, 2026 20:00:00
  const eventDate = new Date('Dec 31, 2026 20:00:00').getTime();

  const updateTimer = () => {
    const now = new Date().getTime();
    const diff = eventDate - now;

    if (diff <= 0) {
      document.getElementById('days').innerText = '00';
      document.getElementById('hours').innerText = '00';
      document.getElementById('minutes').innerText = '00';
      document.getElementById('seconds').innerText = '00';
      clearInterval(timerInterval);
      return;
    }

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById('days').innerText = String(d).padStart(2, '0');
    document.getElementById('hours').innerText = String(h).padStart(2, '0');
    document.getElementById('minutes').innerText = String(m).padStart(2, '0');
    document.getElementById('seconds').innerText = String(s).padStart(2, '0');
  };

  updateTimer();
  const timerInterval = setInterval(updateTimer, 1000);
};

// Quantity & Pricing Calculator
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
  initCountdown();
  initPricingCalculator();
});
