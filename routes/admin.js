const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// @route   POST api/admin/mechanic
// @desc    Create a mechanic user
// @access  Private/Admin
router.post('/mechanic', [auth, admin], async (req, res) => {
  const { name, email, password, serviceType, longitude, latitude } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({ 
      name, 
      email, 
      password,
      role: 'mechanic',
      serviceType: serviceType || '',
      location: (longitude && latitude) ? {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      } : {
        type: 'Point',
        coordinates: [0, 0]
      }
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    res.json({ msg: 'Mechanic account created successfully', user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/admin/users
// @desc    Get all users
// @access  Private/Admin
router.get('/users', [auth, admin], async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/admin/users/:id/discount
// @desc    Update user discount
// @access  Private/Admin
router.put('/users/:id/discount', [auth, admin], async (req, res) => {
  const { discountPercentage } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { discountPercentage } },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/admin/export/users
// @desc    Export users to CSV
// @access  Private/Admin
router.get('/export/users', [auth, admin], async (req, res) => {
  try {
    const users = await User.find().select('-password');
    
    let csv = 'ID,Name,Email,Role,Address,Phone,DiscountPercentage,CreatedAt\n';
    
    users.forEach(u => {
      const name = `"${u.name || ''}"`;
      const email = `"${u.email || ''}"`;
      const address = `"${u.address || ''}"`;
      const phone = `"${u.phone || ''}"`;
      const date = `"${u.createdAt}"`;
      
      csv += `${u._id},${name},${email},${u.role},${address},${phone},${u.discountPercentage || 0},${date}\n`;
    });
    
    res.header('Content-Type', 'text/csv');
    res.attachment('customers.csv');
    return res.send(csv);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/admin/export/orders
// @desc    Export orders to CSV
// @access  Private/Admin
router.get('/export/orders', [auth, admin], async (req, res) => {
  try {
    const Order = require('../models/Order'); // Local require to avoid circular deps if any
    const orders = await Order.find().populate('user', ['name', 'email']).populate('items.product');
    
    let csv = 'OrderID,CustomerName,CustomerEmail,TotalAmount,Status,TransactionID,CreatedAt,Items\n';
    
    orders.forEach(o => {
      const cName = `"${o.user?.name || 'Unknown'}"`;
      const cEmail = `"${o.user?.email || 'Unknown'}"`;
      const status = `"${o.status}"`;
      const tId = `"${o.transactionId || ''}"`;
      const date = `"${o.createdAt}"`;
      
      // Formatting items nicely
      const itemsStr = o.items.map(i => {
        const pName = i.product ? i.product.name : 'Unknown Product';
        return `${pName} (Qty: ${i.quantity})`;
      }).join(' | ');
      
      const itemsCSV = `"${itemsStr}"`;
      
      csv += `${o._id},${cName},${cEmail},${o.totalAmount},${status},${tId},${date},${itemsCSV}\n`;
    });
    
    res.header('Content-Type', 'text/csv');
    res.attachment('orders.csv');
    return res.send(csv);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/admin/products/bulk
// @desc    Bulk upload products via JSON array (from CSV)
// @access  Private/Admin
router.post('/products/bulk', [auth, admin], async (req, res) => {
  const { products } = req.body;
  if (!products || !Array.isArray(products)) {
    return res.status(400).json({ msg: 'Invalid payload. Expected an array of products.' });
  }

  try {
    let count = 0;
    for (let p of products) {
      if (!p.name) continue; // Skip invalid rows
      
      const payload = {
        name: p.name,
        description: p.description || 'No description provided',
        type: p.type || 'Uncategorized',
        compatibility: p.compatibility ? p.compatibility.split(',').map(s => s.trim()).filter(Boolean) : [],
        brand: p.brand || 'Unknown',
        price: parseFloat(p.price) || 0,
        stockQuantity: parseInt(p.stockQuantity) || 0,
        imageUrl: p.imageUrl || 'https://via.placeholder.com/300',
        gallery: p.gallery ? p.gallery.split(',').map(s => s.trim()).filter(Boolean) : [],
        keywords: p.keywords ? p.keywords.split(',').map(s => s.trim()).filter(Boolean) : []
      };

      // Upsert: Find by name. If exists, update. If not, insert.
      await Product.findOneAndUpdate(
        { name: p.name },
        { $set: payload },
        { new: true, upsert: true }
      );
      count++;
    }

    res.json({ msg: `Successfully processed ${count} products.` });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error during bulk upload');
  }
});

// @route   GET api/admin/student-verifications
// @desc    Get all pending student verifications
// @access  Private/Admin
router.get('/student-verifications', [auth, admin], async (req, res) => {
  try {
    const users = await User.find({ studentStatus: 'pending' }).select('-password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/admin/student-verify/:id
// @desc    Approve or reject student verification
// @access  Private/Admin
router.put('/student-verify/:id', [auth, admin], async (req, res) => {
  const { status } = req.body; // 'verified' or 'rejected'
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { studentStatus: status } },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/admin/coupons
// @desc    Get all coupons
// @access  Private/Admin
router.get('/coupons', [auth, admin], async (req, res) => {
  try {
    const coupons = await require('../models/Coupon').find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/admin/coupons
// @desc    Create a new coupon
// @access  Private/Admin
router.post('/coupons', [auth, admin], async (req, res) => {
  try {
    const newCoupon = new (require('../models/Coupon'))(req.body);
    const coupon = await newCoupon.save();
    res.json(coupon);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/admin/coupons/:id
// @desc    Delete a coupon
// @access  Private/Admin
router.delete('/coupons/:id', [auth, admin], async (req, res) => {
  try {
    await require('../models/Coupon').findByIdAndDelete(req.params.id);
    res.json({ msg: 'Coupon removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/admin/orders/:id/tracking
// @desc    Update order tracking information
// @access  Private/Admin
router.put('/orders/:id/tracking', [auth, admin], async (req, res) => {
  const { courierName, trackingNumber, estimatedDeliveryDate } = req.body;
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: { courierName, trackingNumber, estimatedDeliveryDate, status: 'Shipped' } },
      { new: true }
    );
    res.json(order);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
