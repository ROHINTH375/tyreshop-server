const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('MongoDB Connected for Script');
  
  // Premium Tyre Image
  const tyreImage = 'https://images.unsplash.com/photo-1610647752706-3bb12232b3ab?auto=format&fit=crop&q=80&w=600';
  // Premium general moto parts/tube image
  const tubeImage = 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=600'; 

  const products = await Product.find();
  for (let p of products) {
    if (p.type.toLowerCase() === 'tube') {
      p.imageUrl = tubeImage;
    } else {
      p.imageUrl = tyreImage;
    }
    await p.save();
  }
  
  console.log('Successfully updated all product images!');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
