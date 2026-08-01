const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// @route   GET api/products
// @desc    Get products. Supports optional search/brand/category/sort filters.
//          Passing page/limit switches the response to a paginated shape
//          ({ products, page, totalPages, total }) instead of a plain array,
//          so existing callers that want the full catalog keep working unchanged.
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { search, brand, category, sort, page, limit } = req.query;
    const query = {};

    if (search) {
      const re = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ name: re }, { brand: re }, { type: re }, { keywords: re }];
    }

    if (brand) {
      const brands = String(brand).split(',').map(b => b.trim()).filter(Boolean);
      if (brands.length) query.brand = { $in: brands };
    }

    if (category) {
      const categories = String(category).split(',').map(c => c.trim()).filter(Boolean);
      if (categories.length) query.type = { $in: categories.map(c => new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')) };
    }

    let sortOption = {};
    if (sort === 'lowToHigh') sortOption = { price: 1 };
    else if (sort === 'highToLow') sortOption = { price: -1 };

    if (!page && !limit) {
      const products = await Product.find(query).sort(sortOption);
      return res.json(products);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(60, Math.max(1, parseInt(limit, 10) || 12));

    const [products, total] = await Promise.all([
      Product.find(query).sort(sortOption).skip((pageNum - 1) * limitNum).limit(limitNum),
      Product.countDocuments(query)
    ]);

    res.json({
      products,
      page: pageNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
      total
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/products/meta/brands
// @desc    Distinct brand list for filter sidebars (independent of pagination/filters)
// @access  Public
router.get('/meta/brands', async (req, res) => {
  try {
    const brands = await Product.distinct('brand');
    res.json(brands.filter(Boolean).sort());
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
      name: `${userObj.firstName} ${userObj.lastName}`,
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
