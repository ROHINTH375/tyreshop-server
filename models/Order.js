const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true }
    }
  ],
  totalAmount: { type: Number, required: true },
  shippingAddress: { type: String, required: true },
  transactionId: { type: String, required: true },
  status: { type: String, default: 'Pending' }, // 'Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
