const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');
const admin = require('../middleware/admin');

// @route   POST api/orders
// @desc    Create new order and update stock
// @access  Private
router.post('/', auth, async (req, res) => {
  const { items, totalAmount, shippingAddress, transactionId } = req.body;

  try {
    // Check stock first
    for (let i = 0; i < items.length; i++) {
      const product = await Product.findById(items[i].product);
      if (!product) {
        return res.status(404).json({ msg: `Product ${items[i].product} not found` });
      }
      if (product.stockQuantity < items[i].quantity) {
        return res.status(400).json({ msg: `Not enough stock for ${product.name}` });
      }
    }

    // Deduct stock
    for (let i = 0; i < items.length; i++) {
      await Product.findByIdAndUpdate(items[i].product, {
        $inc: { stockQuantity: -items[i].quantity }
      });
    }

    const newOrder = new Order({
      user: req.user.id,
      items,
      totalAmount,
      shippingAddress,
      transactionId
    });

    const order = await newOrder.save();
    res.json(order);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/orders/myorders
// @desc    Get logged in user orders
// @access  Private
router.get('/myorders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).populate('items.product').sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/orders/all
// @desc    Get all orders (Admin only)
// @access  Private/Admin
router.get('/all', [auth, admin], async (req, res) => {
  try {
    const orders = await Order.find().populate('user', ['name', 'email']).populate('items.product').sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/orders/:id/status
// @desc    Update order status (Admin only)
// @access  Private/Admin
router.put('/:id/status', [auth, admin], async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    ).populate('user', ['name', 'email']).populate('items.product');
    
    if (!order) return res.status(404).json({ msg: 'Order not found' });
    res.json(order);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
