const mongoose = require('mongoose');

const ServiceRequestSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mechanic: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceType: { type: String, required: true },
  fee: { type: Number, required: true },
  status: { type: String, default: 'Pending' }, // 'Pending', 'Accepted', 'Completed', 'Cancelled'
  customerLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  }
}, { timestamps: true });

module.exports = mongoose.model('ServiceRequest', ServiceRequestSchema);
