const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// @route   GET api/products
// @desc    Get all products
// @access  Public
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/products/:id
// @desc    Get product by id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Product not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   POST api/products
// @desc    Create a product
// @access  Private/Admin
router.post('/', [auth, admin], async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    const product = await newProduct.save();
    res.json(product);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/products/:id
// @desc    Update a product
// @access  Private/Admin
router.put('/:id', [auth, admin], async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: 'Product not found' });

    product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    res.json(product);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/products/:id
// @desc    Delete a product
// @access  Private/Admin
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: 'Product not found' });

    await Product.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Product removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/products/:id/reviews
// @desc    Add a review to a product
// @access  Private (Purchasers only)
router.post('/:id/reviews', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ msg: 'Product not found' });
    }

    const alreadyReviewed = product.reviews.find(r => r.user.toString() === req.user.id);
    if (alreadyReviewed) {
      return res.status(400).json({ msg: 'You have already reviewed this product' });
    }

    // Verify user has purchased this product
    const orders = await Order.find({ user: req.user.id });
    const hasPurchased = orders.some(order => 
      order.items.some(item => item.product.toString() === req.params.id)
    );

    if (!hasPurchased) {
      return res.status(400).json({ msg: 'You must purchase this product before leaving a review' });
    }

    const userObj = await User.findById(req.user.id);

    const review = {
      user: req.user.id,
      name: userObj.name,
      rating: Number(rating),
      comment
    };

    product.reviews.push(review);
    await product.save();

    res.json(product.reviews);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/products/:id/reviews/:reviewId
// @desc    Delete a review
// @access  Private/Admin
router.delete('/:id/reviews/:reviewId', [auth, admin], async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ msg: 'Product not found' });
    }

    product.reviews = product.reviews.filter(r => r._id.toString() !== req.params.reviewId);
    await product.save();

    res.json(product.reviews);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
