const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  role: { type: String, default: 'user' }, // 'user', 'admin', 'mechanic'
  discountPercentage: { type: Number, default: 0 },
  
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
