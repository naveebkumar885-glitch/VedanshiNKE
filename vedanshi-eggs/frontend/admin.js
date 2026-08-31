// ===== ADMIN AUTH =====
const ADMIN_PASSWORD = 'admin123';
let isAuthenticated = false;
let selectedImageFile = null;

// Check if already logged in
if (sessionStorage.getItem('adminAuth') === 'true') {
  isAuthenticated = true;
  initAdminPanel();
} else {
  const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
  loginModal.show();
}

// Login
document.getElementById('loginBtn').addEventListener('click', async () => {
  const passwordInput = document.getElementById('adminPassword');
  
  try {
    const response = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: passwordInput.value })
    });
    
    const data = await response.json();
    
    if (data.valid) {
      isAuthenticated = true;
      sessionStorage.setItem('adminAuth', 'true');
      bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
      initAdminPanel();
    } else {
      showAlert('loginStatus', 'danger', 'Invalid password!');
    }
  } catch (error) {
    showAlert('loginStatus', 'danger', 'Server error');
  }
});

// Enter key
document.getElementById('adminPassword').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('loginBtn').click();
});

// ===== INIT =====
function initAdminPanel() {
  loadAllOrders();
  loadProducts();
  
  const form = document.getElementById('addProductForm');
  if (form) form.addEventListener('submit', handleAddProduct);
  
  // Image file input
  const fileInput = document.getElementById('productImageFile');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        selectedImageFile = file;
        // Preview
        const reader = new FileReader();
        reader.onload = (event) => {
          const preview = document.getElementById('previewImg');
          preview.src = event.target.result;
          preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

// ===== ADD PRODUCT =====
async function handleAddProduct(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const addStatus = document.getElementById('addStatus');
  
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
  addStatus.innerHTML = '';
  
  try {
    let imageUrl = '';
    
    // Upload image first
    if (selectedImageFile) {
      const formData = new FormData();
      formData.append('image', selectedImageFile);
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-admin-pass': ADMIN_PASSWORD },
        body: formData
      });
      
      const uploadData = await uploadResponse.json();
      
      if (!uploadResponse.ok) throw new Error(uploadData.error || 'Upload failed');
      imageUrl = uploadData.url;
    } else {
      imageUrl = 'https://via.placeholder.com/300x200?text=No+Image';
    }
    
    // Add product
    const productData = {
      name: document.getElementById('productName').value,
      description: document.getElementById('productDescription').value,
      price: parseFloat(document.getElementById('productPrice').value),
      imageUrl: imageUrl
    };
    
    const response = await fetch('/api/admin/eggs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pass': ADMIN_PASSWORD
      },
      body: JSON.stringify(productData)
    });
    
    const data = await response.json();
    
    if (response.status === 201) {
      showAlert('addStatus', 'success', 'Product added successfully!');
      e.target.reset();
      selectedImageFile = null;
      document.getElementById('previewImg').style.display = 'none';
      loadProducts();
    } else {
      showAlert('addStatus', 'danger', data.error || 'Failed');
    }
  } catch (error) {
    showAlert('addStatus', 'danger', 'Error: ' + error.message);
  }
  
  submitBtn.disabled = false;
  submitBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Add Product';
}

// ===== LOAD ORDERS =====
async function loadAllOrders() {
  try {
    const response = await fetch('/api/orders', {
      headers: { 'x-admin-pass': ADMIN_PASSWORD }
    });
    const orders = await response.json();
    
    const pending = orders.filter(o => o.status === 'pending');
    const confirmed = orders.filter(o => o.status === 'confirmed');
    const delivered = orders.filter(o => o.status === 'delivered');
    
    document.getElementById('pendingCount').textContent = pending.length;
    document.getElementById('confirmedCount').textContent = confirmed.length;
    document.getElementById('deliveredCount').textContent = delivered.length;
    
    renderPendingOrders(pending);
    renderConfirmedOrders(confirmed);
    renderDeliveredOrders(delivered);
  } catch (error) {
    console.error('Error:', error);
  }
}

// ===== RENDER =====
function renderPendingOrders(orders) {
  const tbody = document.getElementById('pendingOrdersBody');
  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No pending orders</td></tr>';
    return;
  }
  
  tbody.innerHTML = orders.map(order => `
    <tr>
      <td><strong>${order.orderNumber}</strong></td>
      <td>${order.customerName}</td>
      <td>${order.customerPhone}</td>
      <td>${order.productName}</td>
      <td>${order.quantity} dozen</td>
      <td><strong>₹${order.totalAmount.toFixed(2)}</strong></td>
      <td>${new Date(order.createdAt).toLocaleDateString()}</td>
      <td>
        <button class="btn btn-success btn-sm me-1" onclick="confirmOrder('${order._id}')"><i class="fas fa-check"></i></button>
        <button class="btn btn-danger btn-sm" onclick="deleteOrder('${order._id}')"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function renderConfirmedOrders(orders) {
  const tbody = document.getElementById('confirmedOrdersBody');
  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No confirmed orders</td></tr>';
    return;
  }
  
  tbody.innerHTML = orders.map(order => `
    <tr>
      <td><strong>${order.orderNumber}</strong></td>
      <td>${order.customerName}</td>
      <td>${order.customerPhone}</td>
      <td>${order.productName}</td>
      <td>${order.quantity} dozen</td>
      <td><strong>₹${order.totalAmount.toFixed(2)}</strong></td>
      <td>${new Date(order.createdAt).toLocaleDateString()}</td>
      <td>
        <button class="btn btn-success btn-sm me-1" onclick="markDelivered('${order._id}')"><i class="fas fa-check-double"></i></button>
        <button class="btn btn-danger btn-sm" onclick="deleteOrder('${order._id}')"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function renderDeliveredOrders(orders) {
  const tbody = document.getElementById('deliveredOrdersBody');
  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No delivered orders</td></tr>';
    return;
  }
  
  tbody.innerHTML = orders.map(order => `
    <tr>
      <td><strong>${order.orderNumber}</strong></td>
      <td>${order.customerName}</td>
      <td>${order.customerPhone}</td>
      <td>${order.productName}</td>
      <td>${order.quantity} dozen</td>
      <td><strong>₹${order.totalAmount.toFixed(2)}</strong></td>
      <td>${new Date(order.createdAt).toLocaleDateString()}</td>
      <td><span class="badge bg-success"><i class="fas fa-check"></i> Delivered</span></td>
    </tr>
  `).join('');
}

// ===== ORDER ACTIONS =====
async function confirmOrder(orderId) {
  if (!confirm('Confirm this order?')) return;
  await fetch(`/api/admin/orders/${orderId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-admin-pass': ADMIN_PASSWORD },
    body: JSON.stringify({ status: 'confirmed' })
  });
  loadAllOrders();
}

async function markDelivered(orderId) {
  if (!confirm('Mark as delivered?')) return;
  await fetch(`/api/admin/orders/${orderId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-admin-pass': ADMIN_PASSWORD },
    body: JSON.stringify({ status: 'delivered' })
  });
  loadAllOrders();
}

async function deleteOrder(orderId) {
  if (!confirm('Delete this order?')) return;
  await fetch(`/api/admin/orders/${orderId}`, {
    method: 'DELETE',
    headers: { 'x-admin-pass': ADMIN_PASSWORD }
  });
  loadAllOrders();
}

// ===== PRODUCTS =====
async function loadProducts() {
  const tbody = document.getElementById('productsTableBody');
  try {
    const response = await fetch('/api/eggs');
    const eggs = await response.json();
    
    if (eggs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No products</td></tr>';
      return;
    }
    
    tbody.innerHTML = eggs.map(egg => `
      <tr>
        <td><img src="${egg.imageUrl}" alt="${egg.name}" style="width:50px;height:50px;object-fit:cover;border-radius:8px;"></td>
        <td>${egg.name}</td>
        <td>₹${egg.price.toFixed(2)}</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="deleteProduct('${egg._id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Failed to load</td></tr>';
  }
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  await fetch(`/api/admin/eggs/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-pass': ADMIN_PASSWORD }
  });
  loadProducts();
}

// ===== HELPERS =====
function showAlert(elementId, type, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show">${message}</div>`;
    setTimeout(() => el.innerHTML = '', 5000);
  }
}

function logout() {
  sessionStorage.removeItem('adminAuth');
  window.location.reload();
}