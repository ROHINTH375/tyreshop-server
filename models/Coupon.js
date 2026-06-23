const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  discountPercentage: { type: Number, required: true, min: 1, max: 100 },
  expiryDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  usageLimit: { type: Number, default: 0 }, // 0 means unlimited
  usedCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', CouponSchema);
