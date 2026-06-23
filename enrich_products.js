const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');

const images = {
  tyre: '/images/tyre.png',
  tube: '/images/tube.png',
  oil:  '/images/oil.png'
};

const getImage = (type) => {
  if (type.toLowerCase().includes('tyre')) return images.tyre;
  if (type.toLowerCase().includes('tube')) return images.tube;
  if (type.toLowerCase().includes('oil')) return images.oil;
  return images.tyre; // fallback
};

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('MongoDB Connected. Setting Local Image URLs...');
  
  const products = await Product.find({});
  let updatedCount = 0;

  for (let product of products) {
    product.imageUrl = getImage(product.type);
    await product.save();
    updatedCount++;
  }

  console.log(`✅ Successfully set local imageUrl for ${updatedCount} products!`);
  process.exit(0);
}).catch(console.error);
