require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ===== CREATE UPLOADS DIRECTORY =====
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ===== SERVE STATIC FILES =====
app.use('/uploads', express.static(uploadsDir));

// ===== MONGODB CONNECTION =====
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB Atlas connected'))
  .catch(err => console.error('❌ MongoDB error:', err.message));

// ===== SCHEMAS =====

// Egg Schema
const eggSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  imageUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Egg = mongoose.model('Egg', eggSchema);

// Order Schema
const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  productPrice: { type: Number, required: true },
  quantity: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerEmail: { type: String, default: '' },
  deliveryAddress: { type: String, required: true },
  deliveryCity: { type: String, required: true },
  deliveryPincode: { type: String, required: true },
  specialInstructions: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'confirmed', 'delivered', 'cancelled'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// ===== ADMIN AUTH =====
function adminAuth(req, res, next) {
  const adminPass = req.headers['x-admin-pass'];
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

  if (adminPass !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Invalid admin credentials' });
  }
  next();
}

// ===== IMAGE UPLOAD (MULTER) =====
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'), false);
  }
});

// ===== ADMIN VERIFY =====
app.post('/api/admin/verify', (req, res) => {
  const { password } = req.body;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
  if (password === ADMIN_PASSWORD) res.json({ valid: true });
  else res.status(401).json({ valid: false, error: 'Invalid password' });
});

// ===== IMAGE UPLOAD ROUTE =====
app.post('/api/upload', adminAuth, upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ===== PRODUCT ROUTES =====

// Get all eggs
app.get('/api/eggs', async (req, res) => {
  try {
    const eggs = await Egg.find().sort({ createdAt: -1 });
    res.json(eggs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch eggs', eggs: [] });
  }
});

// Get single egg
app.get('/api/eggs/:id', async (req, res) => {
  try {
    const egg = await Egg.findById(req.params.id);
    if (!egg) return res.status(404).json({ error: 'Egg not found' });
    res.json(egg);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch egg' });
  }
});

// Create new egg (Admin)
app.post('/api/admin/eggs', adminAuth, async (req, res) => {
  try {
    const { name, description, price, imageUrl } = req.body;
    if (!name || !description || !price || !imageUrl) {
      return res.status(400).json({ error: 'All fields required' });
    }
    const egg = new Egg({ name, description, price: parseFloat(price), imageUrl });
    await egg.save();
    res.status(201).json(egg);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create egg' });
  }
});

// Delete egg (Admin)
app.delete('/api/admin/eggs/:id', adminAuth, async (req, res) => {
  try {
    const egg = await Egg.findByIdAndDelete(req.params.id);
    if (!egg) return res.status(404).json({ error: 'Egg not found' });
    if (egg.imageUrl && egg.imageUrl.startsWith('/uploads/')) {
      const filePath = path.join(uploadsDir, path.basename(egg.imageUrl));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete egg' });
  }
});

// ===== ORDER ROUTES =====

// Create new order
app.post('/api/orders', async (req, res) => {
  try {
    const {
      productId, productName, productPrice, quantity, totalAmount,
      customerName, customerPhone, customerEmail,
      deliveryAddress, deliveryCity, deliveryPincode, specialInstructions
    } = req.body;

    if (!productId || !productName || !productPrice || !quantity || !totalAmount ||
        !customerName || !customerPhone || !deliveryAddress || !deliveryCity || !deliveryPincode) {
      return res.status(400).json({ error: 'All required fields' });
    }

    if (!/^[0-9]{10}$/.test(customerPhone)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    if (!/^[0-9]{6}$/.test(deliveryPincode)) {
      return res.status(400).json({ error: 'Invalid pincode' });
    }

    const orderNumber = 'ORD-' + Date.now().toString().slice(-8);
    const order = new Order({
      orderNumber, productId, productName, productPrice, quantity, totalAmount,
      customerName, customerPhone, customerEmail: customerEmail || '',
      deliveryAddress, deliveryCity, deliveryPincode,
      specialInstructions: specialInstructions || ''
    });

    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// Get all orders (Admin)
app.get('/api/orders', adminAuth, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders', orders: [] });
  }
});

// Update order status (Admin)
app.put('/api/admin/orders/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'confirmed', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

// Delete order (Admin)
app.delete('/api/admin/orders/:id', adminAuth, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// ===== HEALTH CHECK =====
app.get('/', (req, res) => res.json({ status: 'ok' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});