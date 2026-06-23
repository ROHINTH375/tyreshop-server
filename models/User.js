const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  permanentAddress: { type: String, required: true },
  deliveryAddress: { type: String, required: true },
  role: { type: String, default: 'user' }, // 'user', 'admin', 'mechanic'
  discountPercentage: { type: Number, default: 0 },
  loyaltyPoints: { type: Number, default: 0 },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  
  // Referral System
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referralCount: { type: Number, default: 0 },
  referralEarnings: { type: Number, default: 0 },
  
  // Student Verification
  studentStatus: { type: String, enum: ['unverified', 'pending', 'verified', 'rejected'], default: 'unverified' },
  studentIdUrl: { type: String, default: '' },
  aadharNumber: { type: String, default: '' },
  
  // For Mechanics only
  serviceType: { type: String, enum: ['Mechanic', 'Tyre Alignment', 'Puncture Shop', ''], default: '' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  resetPasswordOtp: String,
  resetPasswordExpires: Date
}, { timestamps: true });

UserSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', UserSchema);
