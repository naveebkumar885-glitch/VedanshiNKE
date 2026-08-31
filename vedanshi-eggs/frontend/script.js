// ===== LOAD EGGS =====
async function loadEggs() {
  const container = document.getElementById('eggsContainer');
  try {
    const response = await fetch(`${API_URL}/api/eggs`);
    const eggs = await response.json();
    container.innerHTML = '';

    if (eggs.length === 0) {
      container.innerHTML = '<div class="col-12 text-center"><h4>No products yet</h4></div>';
      return;
    }

    eggs.forEach(egg => {
      const col = document.createElement('div');
      col.className = 'col-md-4 col-lg-3';
      col.innerHTML = `
        <div class="card product-card mb-4">
          <img src="${egg.imageUrl}" class="card-img-top" style="height:200px;object-fit:cover;">
          <div class="card-body text-center">
            <h5>${egg.name}</h5>
            <p class="text-muted">${egg.description}</p>
            <h4 class="text-warning">₹${egg.price.toFixed(2)}/dozen</h4>
            <button class="btn btn-warning" onclick="orderProduct('${egg._id}')"><i class="fas fa-cart-plus"></i> Order</button>
          </div>
        </div>
      `;
      container.appendChild(col);
    });
  } catch (error) {
    container.innerHTML = '<div class="col-12 text-center text-danger"><h4>Cannot load products. Check backend.</h4></div>';
  }
}

function orderProduct(id) {
  sessionStorage.setItem('selectedProductId', id);
  window.location.href = 'order.html';
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof AOS !== 'undefined') AOS.init();
  loadEggs();
});