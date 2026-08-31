// ===== PRELOADER =====
window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    setTimeout(() => {
      preloader.classList.add('hide');
      setTimeout(() => preloader.remove(), 500);
    }, 500);
  }
});

// ===== NAVIGATION =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const targetId = this.getAttribute('href');
    const target = document.querySelector(targetId);
    if (target) {
      window.scrollTo({
        top: target.offsetTop - 70,
        behavior: 'smooth'
      });
    }
  });
});

// ===== NAVBAR SCROLL =====
window.addEventListener('scroll', () => {
  const nav = document.getElementById('mainNav');
  if (nav) {
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }
});

// ===== LOAD EGGS FROM API =====
async function loadEggs() {
  const container = document.getElementById('eggsContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="col-12 text-center">
      <div class="spinner-border text-warning" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  `;

  try {
    const response = await fetch('/api/eggs');
    const eggs = await response.json();
    container.innerHTML = '';

    if (eggs.length === 0) {
      container.innerHTML = `
        <div class="col-12">
          <div class="empty-state text-center">
            <i class="fas fa-egg fa-3x"></i>
            <h4 class="mt-3">No Eggs Available</h4>
            <p class="text-muted">Please check back soon! Our farm is restocking.</p>
          </div>
        </div>
      `;
      return;
    }

    eggs.forEach((egg, index) => {
      const col = document.createElement('div');
      col.className = 'col-md-3 col-sm-6';
      col.setAttribute('data-aos', 'fade-up');
      col.setAttribute('data-aos-delay', (index * 100));
      col.innerHTML = `
        <div class="product-card">
          <img src="${egg.imageUrl}" alt="${egg.name}" class="product-image" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
          <h3>${egg.name}</h3>
          <p>${egg.description}</p>
          <p class="product-price">₹${egg.price.toFixed(2)} / dozen</p>
          <button class="btn btn-order" onclick="orderProduct('${egg._id}')">
            <i class="fas fa-cart-plus"></i> Order Now
          </button>
        </div>
      `;
      container.appendChild(col);
    });
    
    // Initialize AOS for newly added elements
    if (typeof AOS !== 'undefined') {
      AOS.refresh();
    }
  } catch (error) {
    console.error('Error loading eggs:', error);
    container.innerHTML = `
      <div class="col-12">
        <div class="empty-state text-center">
          <i class="fas fa-exclamation-triangle fa-3x"></i>
          <h4 class="mt-3">Unable to Load Products</h4>
          <p class="text-muted">Please check server connection.</p>
        </div>
      </div>
    `;
  }
}

// ===== ORDER PRODUCT =====
function orderProduct(productId) {
  sessionStorage.setItem('selectedProductId', productId);
  window.location.href = '/order';
}

// ===== STATS ANIMATION =====
function animateStats() {
  const stats = document.querySelectorAll('.stat-number');
  
  stats.forEach(stat => {
    const target = parseInt(stat.getAttribute('data-target'));
    if (isNaN(target)) return;
    
    let current = 0;
    const duration = 2000;
    const steps = 50;
    const increment = target / steps;
    const interval = duration / steps;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        stat.textContent = target + (target === 4 ? '.9' : '+');
        clearInterval(timer);
      } else {
        if (target === 4) {
          stat.textContent = Math.floor(current) + '.' + Math.floor((current % 1) * 10);
        } else {
          stat.textContent = Math.floor(current) + '+';
        }
      }
    }, interval);
  });
}

const statsSection = document.querySelector('.stats-section');
if (statsSection) {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      animateStats();
      observer.disconnect();
    }
  }, { threshold: 0.5 });
  
  observer.observe(statsSection);
}

// ===== INITIAL LOAD =====
document.addEventListener('DOMContentLoaded', () => {
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 800,
      offset: 100,
      once: true
    });
  }
  
  loadEggs();
});