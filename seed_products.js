const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');

dotenv.config();

const newProducts = [
  { name: "2.75-18 EC ride R", type: "Tyre (Tube)", price: 1550, brand: "Generic", description: "High performance tube tyre for 18 inch wheels. EC ride R pattern." },
  { name: "2.75-18 NGP - R", type: "Tyre (Tube)", price: 1500, brand: "Generic", description: "Durable tube tyre. NGP-R tread." },
  { name: "2.75-18 Rib", type: "Tyre (Tube)", price: 1400, brand: "Generic", description: "Rib pattern tube tyre for classic ride." },
  { name: "2.75-18 Zapper - F", type: "Tyre (Tube)", price: 1400, brand: "Generic", description: "Zapper front tube tyre." },
  { name: "3.00-18 R", type: "Tyre (Tube)", price: 1550, brand: "Generic", description: "Rear tube tyre, 3.00-18." },
  { name: "3.00-18 R", type: "Tyre (Tubeless)", price: 1500, brand: "Generic", description: "Rear tubeless tyre, 3.00-18." },
  { name: "2.75-17 F", type: "Tyre (Tube)", price: 1380, brand: "Generic", description: "Front tube tyre, 2.75-17." },
  { name: "2.75-17 F", type: "Tyre (Tubeless)", price: 1380, brand: "Generic", description: "Front tubeless tyre, 2.75-17." },
  { name: "3.00-17 R", type: "Tyre (Tube)", price: 1550, brand: "Generic", description: "Rear tube tyre, 3.00-17." },
  { name: "3.00-17 R", type: "Tyre (Tubeless)", price: 1500, brand: "Generic", description: "Rear tubeless tyre, 3.00-17." },
  { name: "80/100-18", type: "Tyre (Tubeless)", price: 1450, brand: "Generic", description: "Tubeless tyre, 80/100-18." },
  { name: "3.00-10", type: "Tyre (Tube)", price: 950, brand: "Generic", description: "Scooter tube tyre, 3.00-10." },
  { name: "90/100-10 Zapper", type: "Tyre", price: 1250, brand: "Generic", description: "Zapper scooter tyre." },
  { name: "90/100-10 Zapper C1", type: "Tyre", price: 1200, brand: "Generic", description: "Zapper C1 scooter tyre." },
  { name: "90/100-10 Rear", type: "Tyre", price: 1250, brand: "Generic", description: "Rear scooter tyre." },
  { name: "90/90-12 Rear", type: "Tyre", price: 1250, brand: "Generic", description: "Rear tyre, 90/90-12." },
  { name: "90/90-12 Zapper", type: "Tyre", price: 1180, brand: "Generic", description: "Zapper pattern, 90/90-12." },
  { name: "90/90-12 EV", type: "Tyre", price: 1200, brand: "Generic", description: "EV optimized tyre, 90/90-12." },
  { name: "90/90-10", type: "Tyre", price: 1050, brand: "Generic", description: "Standard scooter tyre, 90/90-10." },
  { name: "100/90-17 Zapper", type: "Tyre (Tubeless)", price: 1750, brand: "Generic", description: "Zapper tubeless tyre, 100/90-17." },
  { name: "100/90-17 Rear", type: "Tyre (Tubeless)", price: 1800, brand: "Generic", description: "Rear tubeless tyre, 100/90-17." },
  { name: "140/60-R-17 Rear", type: "Tyre (Tubeless)", price: 2900, brand: "Generic", description: "Wide rear tubeless tyre, 140/60-R-17." },
  { name: "80/100-17 Zapper", type: "Tyre (Tubeless)", price: 1450, brand: "Generic", description: "Zapper tubeless tyre, 80/100-17." },
  { name: "120/80-17", type: "Tyre", price: 2500, brand: "Generic", description: "Premium tyre, 120/80-17." }, 
  { name: "90/100-10 Moto D", type: "Tyre", price: 1200, brand: "Generic", description: "Moto D tyre, 90/100-10." },
  { name: "90/90-12", type: "Tyre", price: 1150, brand: "Generic", description: "Standard tyre, 90/90-12." },
  { name: "Amaron Oil", type: "Engine Oil", price: 350, brand: "Amaron", description: "Premium Amaron engine oil for two wheelers." },
  { name: "Castrol Oil", type: "Engine Oil", price: 350, brand: "Castrol", description: "Castrol Activ engine oil for superior protection." },
  { name: "Bosch Oil", type: "Engine Oil", price: 350, brand: "Bosch", description: "Bosch premium engine oil." },
  { name: "Motul Oil", type: "Engine Oil", price: 430, brand: "Motul", description: "Motul fully synthetic engine oil." },
  { name: "Gulf Oil", type: "Engine Oil", price: 450, brand: "Gulf", description: "Gulf Pride engine oil." },
  { name: "Valvoline Oil", type: "Engine Oil", price: 400, brand: "Valvoline", description: "Valvoline premium grade engine oil." },
  { name: "Varroc Oil", type: "Engine Oil", price: 330, brand: "Varroc", description: "Varroc standard engine oil." }
];

const tyreImage = 'https://images.unsplash.com/photo-1610647752706-3bb12232b3ab?auto=format&fit=crop&q=80&w=600';
const oilImage = 'https://images.unsplash.com/photo-1620050854407-1606cb74dae5?auto=format&fit=crop&q=80&w=600'; 

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('MongoDB Connected for Seeding');
  
  for (let item of newProducts) {
    const isOil = item.type === 'Engine Oil';
    
    // Use upsert to avoid duplicates if run multiple times
    await Product.findOneAndUpdate(
      { name: item.name },
      {
        $set: {
          ...item,
          imageUrl: isOil ? oilImage : tyreImage,
          stockQuantity: 50,
          compatibility: ['Universal Two Wheeler Fit'],
          keywords: isOil ? ['oil', 'engine', 'lubricant'] : ['tyre', 'tube', 'wheel']
        }
      },
      { upsert: true, new: true }
    );
  }
  
  console.log(`Successfully added/updated ${newProducts.length} products!`);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
