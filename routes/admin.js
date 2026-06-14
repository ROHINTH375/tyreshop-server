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

module.exports = router;
