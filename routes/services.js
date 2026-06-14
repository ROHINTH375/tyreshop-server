const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ServiceRequest = require('../models/ServiceRequest');
const auth = require('../middleware/auth');

// @route   PUT api/services/mechanic/profile
// @desc    Update mechanic service profile (location and type)
// @access  Private (Mechanic only)
router.put('/mechanic/profile', auth, async (req, res) => {
  const { serviceType, longitude, latitude } = req.body;
  
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'mechanic') {
      return res.status(403).json({ msg: 'Access denied. Mechanics only.' });
    }

    user.serviceType = serviceType;
    user.location = {
      type: 'Point',
      coordinates: [longitude, latitude]
    };
    
    await user.save();
    res.json({ msg: 'Profile updated successfully', user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/services/nearby
// @desc    Find nearby mechanics
// @access  Private
router.get('/nearby', auth, async (req, res) => {
  const { lng, lat } = req.query;

  if (!lng || !lat) {
    return res.status(400).json({ msg: 'Please provide longitude and latitude' });
  }

  try {
    const mechanics = await User.find({
      role: 'mechanic',
      serviceType: { $ne: '' },
      location: {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: 30000 // 30 kilometers
        }
      }
    }).select('-password -discountPercentage -address -role');

    res.json(mechanics);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/services/request
// @desc    Create a new service request (charging the flat fee)
// @access  Private
router.post('/request', auth, async (req, res) => {
  const { mechanicId, serviceType, longitude, latitude } = req.body;
  
  try {
    const mechanic = await User.findById(mechanicId);
    if (!mechanic || mechanic.role !== 'mechanic') {
      return res.status(404).json({ msg: 'Mechanic not found' });
    }

    const newRequest = new ServiceRequest({
      customer: req.user.id,
      mechanic: mechanicId,
      serviceType,
      fee: 50, // Minimal fixed flat fee of ₹50
      customerLocation: {
        type: 'Point',
        coordinates: [longitude, latitude]
      }
    });

    const savedRequest = await newRequest.save();
    res.json(savedRequest);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/services/mechanic/requests
// @desc    Get requests for a specific mechanic
// @access  Private (Mechanic only)
router.get('/mechanic/requests', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'mechanic') {
      return res.status(403).json({ msg: 'Access denied. Mechanics only.' });
    }

    const requests = await ServiceRequest.find({ mechanic: req.user.id })
      .populate('customer', ['name', 'phone'])
      .sort({ createdAt: -1 });
      
    res.json(requests);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/services/request/:id/status
// @desc    Update service request status
// @access  Private (Mechanic only)
router.put('/request/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const request = await ServiceRequest.findById(req.params.id);
    
    if (!request) return res.status(404).json({ msg: 'Request not found' });
    if (request.mechanic.toString() !== req.user.id) return res.status(403).json({ msg: 'Not authorized' });

    request.status = status;
    await request.save();
    
    res.json(request);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
