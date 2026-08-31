const ADMIN_PASSWORD = 'admin123';
let isAuthenticated = false;
let selectedImage = null;

if (sessionStorage.getItem('adminAuth') === 'true') {
  isAuthenticated = true;
  init();
} else {
  new bootstrap.Modal(document.getElementById('loginModal')).show();
}

document.getElementById('loginBtn').addEventListener('click', async () => {
  const pass = document.getElementById('adminPassword').value;
  const res = await fetch(`${API_URL}/api/admin/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pass })
  });
  const data = await res.json();
  if (data.valid) {
    sessionStorage.setItem('adminAuth', 'true');
    bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
    isAuthenticated = true;
    init();
  } else {
    document.getElementById('loginStatus').innerHTML = '<div class="alert alert-danger">Invalid password</div>';
  }
});

function init() {
  loadProducts();
  loadOrders();
  document.getElementById('addProductForm').addEventListener('submit', addProduct);
  document.getElementById('productImageFile').addEventListener('change', (e) => {
    selectedImage = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = document.getElementById('previewImg');
      img.src = ev.target.result;
      img.style.display = 'block';
    };
    reader.readAsDataURL(selectedImage);
  });
}

async function addProduct(e) {
  e.preventDefault();
  const name = document.getElementById('productName').value;
  const description = document.getElementById('productDescription').value;
  const price = parseFloat(document.getElementById('productPrice').value);

  // Upload image
  let imageUrl = '';
  if (selectedImage) {
    const fd = new FormData();
    fd.append('image', selectedImage);
    const uploadRes = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      headers: { 'x-admin-pass': ADMIN_PASSWORD },
      body: fd
    });
    const uploadData = await uploadRes.json();
    imageUrl = uploadData.url;
  }

  await fetch(`${API_URL}/api/admin/eggs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-pass': ADMIN_PASSWORD },
    body: JSON.stringify({ name, description, price, imageUrl })
  });

  alert('Product added!');
  e.target.reset();
  document.getElementById('previewImg').style.display = 'none';
  loadProducts();
}

async function loadProducts() {
  const res = await fetch(`${API_URL}/api/eggs`);
  const eggs = await res.json();
  document.getElementById('productsTableBody').innerHTML = eggs.map(egg => `
    <tr>
      <td><img src="${egg.imageUrl}" width="50" height="50" style="object-fit:cover;border-radius:8px;"></td>
      <td>${egg.name}</td>
      <td>₹${egg.price.toFixed(2)}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteProduct('${egg._id}')"><i class="fas fa-trash"></i></button></td>
    </tr>
  `).join('');
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  await fetch(`${API_URL}/api/admin/eggs/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-pass': ADMIN_PASSWORD }
  });
  loadProducts();
}

async function loadOrders() {
  const res = await fetch(`${API_URL}/api/orders`, {
    headers: { 'x-admin-pass': ADMIN_PASSWORD }
  });
  const orders = await res.json();

  const pending = orders.filter(o => o.status === 'pending');
  const confirmed = orders.filter(o => o.status === 'confirmed');
  const delivered = orders.filter(o => o.status === 'delivered');

  document.getElementById('pendingOrdersBody').innerHTML = pending.map(o => `
    <tr>
      <td>${o.orderNumber}</td><td>${o.customerName}</td><td>${o.customerPhone}</td>
      <td>${o.productName}</td><td>${o.quantity} dozen</td><td>₹${o.totalAmount.toFixed(2)}</td>
      <td><button class="btn btn-success btn-sm" onclick="updateOrder('${o._id}','confirmed')">Confirm</button></td>
    </tr>
  `).join('') || '<tr><td colspan="7" class="text-center">No pending orders</td></tr>';

  document.getElementById('confirmedOrdersBody').innerHTML = confirmed.map(o => `
    <tr>
      <td>${o.orderNumber}</td><td>${o.customerName}</td><td>${o.customerPhone}</td>
      <td>${o.productName}</td><td>${o.quantity} dozen</td><td>₹${o.totalAmount.toFixed(2)}</td>
      <td><button class="btn btn-success btn-sm" onclick="updateOrder('${o._id}','delivered')">Deliver</button></td>
    </tr>
  `).join('') || '<tr><td colspan="7" class="text-center">No confirmed orders</td></tr>';

  document.getElementById('deliveredOrdersBody').innerHTML = delivered.map(o => `
    <tr>
      <td>${o.orderNumber}</td><td>${o.customerName}</td><td>${o.customerPhone}</td>
      <td>${o.productName}</td><td>${o.quantity} dozen</td><td>₹${o.totalAmount.toFixed(2)}</td>
      <td><span class="badge bg-success">Delivered</span></td>
    </tr>
  `).join('') || '<tr><td colspan="7" class="text-center">No delivered orders</td></tr>';
}

async function updateOrder(id, status) {
  await fetch(`${API_URL}/api/admin/orders/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-admin-pass': ADMIN_PASSWORD },
    body: JSON.stringify({ status })
  });
  loadOrders();
}

function logout() {
  sessionStorage.removeItem('adminAuth');
  window.location.reload();
}