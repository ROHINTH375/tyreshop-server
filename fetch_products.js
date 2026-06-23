const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const products = await Product.find({}, 'name type category');
  console.log(JSON.stringify(products, null, 2));
  process.exit(0);
}).catch(console.error);
