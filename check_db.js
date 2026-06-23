const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const count = await mongoose.connection.collection('products').countDocuments();
  console.log('=============================');
  console.log('PRODUCTS COUNT IN DB:', count);
  console.log('=============================');
  process.exit(0);
}).catch(console.error);
