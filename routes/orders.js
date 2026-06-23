const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const admin = require('../middleware/admin');
const { sendEmail, sendSMS } = require('../utils/notifications');

const Coupon = require('../models/Coupon');

// @route   POST api/orders/validate-coupon
// @desc    Validate a promo code
// @access  Private
router.post('/validate-coupon', auth, async (req, res) => {
  const { code } = req.body;
  try {
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    
    if (!coupon) {
      return res.status(404).json({ msg: 'Invalid or expired coupon code' });
    }
    
    if (!coupon.isActive || new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({ msg: 'Coupon is expired or inactive' });
    }
    
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ msg: 'Coupon usage limit reached' });
    }
    
    res.json({ discountPercentage: coupon.discountPercentage });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/orders
// @desc    Create new order, update stock, handle loyalty points & notifications
// @access  Private
router.post('/', auth, async (req, res) => {
  const { items, totalAmount, shippingAddress, transactionId, pointsUsed, couponCode } = req.body;

  try {
    // If a coupon code was used, increment its usage count
    if (couponCode) {
      await Coupon.findOneAndUpdate(
        { code: couponCode.toUpperCase() },
        { $inc: { usedCount: 1 } }
      );
    }
    let calculatedTotal = 0;
    
    // Check stock and calculate price
    let user = await User.findById(req.user.id);
    for (let i = 0; i < items.length; i++) {
      const product = await Product.findById(items[i].product);
      if (!product) {
        return res.status(404).json({ msg: `Product ${items[i].product} not found` });
      }
      if (product.stockQuantity < items[i].quantity) {
        return res.status(400).json({ msg: `Not enough stock for ${product.name}` });
      }
      
      // Determine role-based price
      let itemPrice = product.price;
      if (user.role === 'mechanic' && product.mechanicPrice != null && product.mechanicPrice > 0) {
        itemPrice = product.mechanicPrice;
      } else if (user.studentStatus === 'verified' && product.studentPrice != null && product.studentPrice > 0) {
        itemPrice = product.studentPrice;
      }
      calculatedTotal += itemPrice * items[i].quantity;
    }
    
    // Apply Admin Discount
    const adminDiscountPercentage = user.discountPercentage || 0;
    let discountAmount = Math.round((calculatedTotal * adminDiscountPercentage) / 100);
    let subTotalAfterDiscount = calculatedTotal - discountAmount;
    
    // Apply Promo Code
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
      if (coupon && coupon.isActive && new Date(coupon.expiryDate) >= new Date()) {
        const promoDiscountAmount = Math.round((subTotalAfterDiscount * coupon.discountPercentage) / 100);
        subTotalAfterDiscount -= promoDiscountAmount;
      }
    }
    
    // Apply points
    const finalTotal = subTotalAfterDiscount - (pointsUsed || 0);

    // Verify amount (allow small rounding differences)
    if (Math.abs(finalTotal - totalAmount) > 5) {
      return res.status(400).json({ msg: 'Price mismatch detected. Please refresh and try again.' });
    }

    // Deduct stock
    for (let i = 0; i < items.length; i++) {
      await Product.findByIdAndUpdate(items[i].product, {
        $inc: { stockQuantity: -items[i].quantity }
      });
    }

    // Create Order
    const newOrder = new Order({
      user: req.user.id,
      items,
      totalAmount,
      shippingAddress,
      transactionId
    });

    const order = await newOrder.save();

    // Handle Loyalty Points
    if (user) {
      // Calculate points to add (1 point per 100 spent on the final amount)
      const pointsEarned = Math.floor(totalAmount / 100);
      
      // Update points (add earned, subtract used if any)
      user.loyaltyPoints = (user.loyaltyPoints || 0) + pointsEarned - (pointsUsed || 0);
      await user.save();

      // Trigger Notifications asynchronously
      const emailBody = `Hi ${user.firstName},\n\nYour order has been confirmed! Order ID: ${order._id}\nTotal Amount: ₹${totalAmount}\nPoints Earned: ${pointsEarned}\n\nThank you for shopping with Tyre & Tube Store.`;
      const smsBody = `Hi ${user.firstName}, your order ${order._id} is confirmed. Total: ₹${totalAmount}. You earned ${pointsEarned} points.`;
      
      sendEmail(user.email, 'Order Confirmation - Tyre & Tube Store', emailBody);
      if (user.phone) {
        sendSMS(user.phone, smsBody);
      }
    }

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
