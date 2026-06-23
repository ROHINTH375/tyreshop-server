const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, required: true }, // 'Tyre' or 'Tube'
  compatibility: { type: [String], required: true }, // e.g., ['Honda Activa', 'TVS Jupiter']
  brand: { type: String, required: true },
  price: { type: Number, required: true },
  studentPrice: { type: Number },
  mechanicPrice: { type: Number },
  stockQuantity: { type: Number, required: true, default: 0 },
  imageUrl: { type: String, required: true },
  gallery: { type: [String], default: [] },
  keywords: { type: [String], default: [] },
  reviews: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
