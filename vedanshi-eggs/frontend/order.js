const productId = sessionStorage.getItem('selectedProductId');
let product = null;

async function loadProduct() {
  if (!productId) return;
  try {
    const res = await fetch(`${API_URL}/api/eggs/${productId}`);
    product = await res.json();
    document.getElementById('productName').textContent = product.name;
    document.getElementById('productDescription').textContent = product.description;
    document.getElementById('productPrice').textContent = product.price;
    document.getElementById('productImage').src = product.imageUrl;
    calculateTotal();
  } catch (e) {
    document.getElementById('productName').textContent = 'Product not found';
  }
}

function calculateTotal() {
  const qty = parseInt(document.getElementById('quantity').value) || 1;
  if (product) document.getElementById('totalPrice').textContent = (qty * product.price).toFixed(2);
}

document.getElementById('orderForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!product) return;

  const orderData = {
    productId: product._id,
    productName: product.name,
    productPrice: product.price,
    quantity: parseInt(document.getElementById('quantity').value),
    totalAmount: parseInt(document.getElementById('quantity').value) * product.price,
    customerName: document.getElementById('customerName').value,
    customerPhone: document.getElementById('customerPhone').value,
    customerEmail: document.getElementById('customerEmail').value,
    deliveryAddress: document.getElementById('deliveryAddress').value,
    deliveryCity: document.getElementById('deliveryCity').value,
    deliveryPincode: document.getElementById('deliveryPincode').value
  };

  const res = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });

  if (res.status === 201) {
    alert('Order placed successfully!');
    window.location.href = 'index.html';
  } else {
    const data = await res.json();
    alert(data.error || 'Failed to place order');
  }
});

document.addEventListener('DOMContentLoaded', loadProduct);