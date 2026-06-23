const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const product = await Product.findOne();
  console.log('Sample Product:', product);
  process.exit(0);
}).catch(console.error);
