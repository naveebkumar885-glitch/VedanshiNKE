// ===== GET PRODUCT ID FROM SESSION STORAGE =====
const productId = sessionStorage.getItem('selectedProductId');

let selectedProduct = null;
let productLoaded = false;

// ===== LOAD PRODUCT DETAILS =====
async function loadProductDetails() {
  const productNameEl = document.getElementById('productName');
  const productPriceEl = document.getElementById('productPrice');
  const productDescriptionEl = document.getElementById('productDescription');
  const productImageEl = document.getElementById('productImage');
  const totalPriceEl = document.getElementById('totalPrice');

  if (!productId) {
    productNameEl.textContent = 'No product selected';
    productPriceEl.textContent = '₹0.00';
    productDescriptionEl.textContent = 'Please go back and select a product';
    productImageEl.src = 'https://via.placeholder.com/300x150?text=No+Product';
    totalPriceEl.textContent = '₹0.00';
    return;
  }

  productNameEl.textContent = 'Loading...';
  productPriceEl.textContent = '₹0.00';
  productDescriptionEl.textContent = 'Loading product details...';
  productImageEl.src = 'https://via.placeholder.com/300x150?text=Loading...';
  totalPriceEl.textContent = '₹0.00';

  try {
    const response = await fetch(`/api/eggs/${productId}`);
    
    if (!response.ok) {
      throw new Error('Product not found');
    }

    const product = await response.json();
    selectedProduct = product;
    productLoaded = true;

    productNameEl.textContent = product.name;
    productDescriptionEl.textContent = product.description;
    productPriceEl.textContent = `₹${product.price.toFixed(2)}`;
    productImageEl.src = product.imageUrl || 'https://via.placeholder.com/300x150?text=No+Image';
    
    document.getElementById('quantity').value = 1;
    calculateTotal();

  } catch (error) {
    console.error('Error loading product:', error);
    productNameEl.textContent = 'Product not found';
    productPriceEl.textContent = '₹0.00';
    productDescriptionEl.textContent = 'Please go back and try again';
    productImageEl.src = 'https://via.placeholder.com/300x150?text=Not+Found';
    totalPriceEl.textContent = '₹0.00';
    productLoaded = false;
  }
}

// ===== CALCULATE TOTAL =====
function calculateTotal() {
  const totalPriceEl = document.getElementById('totalPrice');
  
  if (!selectedProduct || !productLoaded) {
    totalPriceEl.textContent = '₹0.00';
    return;
  }
  
  const quantity = parseInt(document.getElementById('quantity').value) || 0;
  
  if (quantity < 1) {
    totalPriceEl.textContent = '₹0.00';
    return;
  }
  
  const total = quantity * selectedProduct.price;
  totalPriceEl.textContent = `₹${total.toFixed(2)}`;
}

// ===== SUBMIT ORDER =====
document.getElementById('orderForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = document.getElementById('submitOrderBtn');
  const orderStatus = document.getElementById('orderStatus');
  
  if (!selectedProduct || !productLoaded) {
    orderStatus.innerHTML = '<div class="alert alert-danger">No product selected. Please go back and select a product.</div>';
    return;
  }
  
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Placing Order...';
  orderStatus.innerHTML = '';
  
  const quantity = parseInt(document.getElementById('quantity').value);
  const totalAmount = quantity * selectedProduct.price;
  
  const orderData = {
    productId: selectedProduct._id,
    productName: selectedProduct.name,
    productPrice: selectedProduct.price,
    quantity: quantity,
    totalAmount: totalAmount,
    customerName: document.getElementById('customerName').value.trim(),
    customerPhone: document.getElementById('customerPhone').value.trim(),
    customerEmail: document.getElementById('customerEmail').value.trim(),
    deliveryAddress: document.getElementById('deliveryAddress').value.trim(),
    deliveryCity: document.getElementById('deliveryCity').value.trim(),
    deliveryPincode: document.getElementById('deliveryPincode').value.trim(),
    specialInstructions: document.getElementById('specialInstructions').value.trim()
  };

  try {
    if (!/^[0-9]{10}$/.test(orderData.customerPhone)) {
      throw new Error('Please enter a valid 10-digit phone number');
    }
    
    if (!/^[0-9]{6}$/.test(orderData.deliveryPincode)) {
      throw new Error('Please enter a valid 6-digit pincode');
    }

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });
    
    const data = await response.json();
    
    if (response.status === 201) {
      orderStatus.innerHTML = `
        <div class="alert alert-success">
          <h5><i class="fas fa-check-circle"></i> Order Placed Successfully!</h5>
          <p><strong>Order Number:</strong> ${data.orderNumber}</p>
          <p><strong>Product:</strong> ${orderData.productName}</p>
          <p><strong>Quantity:</strong> ${orderData.quantity} dozen</p>
          <p><strong>Total Amount:</strong> ₹${orderData.totalAmount.toFixed(2)}</p>
          <p>Thank you ${orderData.customerName}! We will contact you at ${orderData.customerPhone} to confirm your order.</p>
          <button class="btn btn-warning mt-2" onclick="window.location.href='/'">
            <i class="fas fa-home"></i> Back to Home
          </button>
        </div>
      `;
      
      sessionStorage.removeItem('selectedProductId');
      document.getElementById('orderForm').style.display = 'none';
    } else {
      orderStatus.innerHTML = `<div class="alert alert-danger">${data.error || 'Failed to place order.'}</div>`;
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Place Order';
    }
  } catch (error) {
    orderStatus.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Place Order';
  }
});

// ===== INITIAL LOAD =====
document.addEventListener('DOMContentLoaded', () => {
  loadProductDetails();
  
  const quantityInput = document.getElementById('quantity');
  quantityInput.addEventListener('input', calculateTotal);
  quantityInput.addEventListener('change', calculateTotal);
  quantityInput.addEventListener('keyup', calculateTotal);
});