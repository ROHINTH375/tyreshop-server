fetch('https://tyreshop-server.onrender.com/api/products')
  .then(res => res.json())
  .then(data => {
    console.log('SUCCESS!');
    console.log('Length:', data.length);
    console.log('First Item Image:', data[0].imageUrl);
    console.log('First Item Images array:', data[0].images);
  })
  .catch(err => {
    console.log('ERROR:', err.message);
  });
