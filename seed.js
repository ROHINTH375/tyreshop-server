const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const Product = require('./models/Product');
const User = require('./models/User');

dotenv.config();

const products = [
  {
    name: 'MRF Zapper C',
    description: 'High performance rear tyre for everyday commute.',
    type: 'Tyre',
    compatibility: ['Honda Activa', 'TVS Jupiter', 'Suzuki Access'],
    brand: 'MRF',
    price: 1200,
    stockQuantity: 50,
    imageUrl: 'https://images.unsplash.com/photo-1596700547144-88db0b769ea8?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    name: 'CEAT Secura Zoom F',
    description: 'Front tyre with excellent grip on wet roads.',
    type: 'Tyre',
    compatibility: ['Hero Splendor', 'Bajaj Pulsar 150'],
    brand: 'CEAT',
    price: 1350,
    stockQuantity: 30,
    imageUrl: 'https://images.unsplash.com/photo-1620064506282-e8c1ab41ebdb?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    name: 'Michelin City Pro',
    description: 'Durable tyre with high puncture resistance.',
    type: 'Tyre',
    compatibility: ['Royal Enfield Classic 350', 'Yamaha FZ'],
    brand: 'Michelin',
    price: 2500,
    stockQuantity: 20,
    imageUrl: 'https://plus.unsplash.com/premium_photo-1661502422792-564998af5fb1?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    name: 'Apollo ActiZip R3',
    description: 'Premium quality rear tyre.',
    type: 'Tyre',
    compatibility: ['Honda Shine', 'TVS Apache RTR'],
    brand: 'Apollo',
    price: 1800,
    stockQuantity: 40,
    imageUrl: 'https://images.unsplash.com/photo-1601614050212-3298a0d4c9d5?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    name: 'TVS Eurogrip Tube 3.00-17',
    description: 'Standard butyl inner tube.',
    type: 'Tube',
    compatibility: ['Hero Splendor', 'Honda Shine'],
    brand: 'TVS Eurogrip',
    price: 250,
    stockQuantity: 100,
    imageUrl: 'https://images.unsplash.com/photo-1632731835773-8994a32cb2ab?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    name: 'MRF Tube 90/90-12',
    description: 'Durable inner tube for scooters.',
    type: 'Tube',
    compatibility: ['Honda Activa', 'TVS Jupiter'],
    brand: 'MRF',
    price: 280,
    stockQuantity: 80,
    imageUrl: 'https://images.unsplash.com/photo-1596700547144-88db0b769ea8?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  }
];

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tyres_and_tubes')
  .then(async () => {
    console.log('MongoDB Connected for Seeding');
    
    // Seed Products
    await Product.deleteMany({});
    console.log('Existing products removed');
    await Product.insertMany(products);
    console.log('Dummy products seeded successfully!');

    // Seed Admin User
    const adminEmail = 'admin@tyres.com';
    let adminUser = await User.findOne({ email: adminEmail });
    
    if (!adminUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Paramount1904@', salt);
      
      adminUser = new User({
        name: 'Super Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin'
      });
      await adminUser.save();
      console.log('Admin user created successfully!');
    } else {
      console.log('Admin user already exists.');
    }

    process.exit();
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });
