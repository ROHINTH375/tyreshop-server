const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// @route   GET api/settings
// @desc    Get all public store settings
// @access  Public
router.get('/', async (req, res) => {
  try {
    const settings = await Setting.find({});
    // Convert array of documents to a simple key-value object
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });
    
    // Provide defaults if not set in DB
    if (!settingsMap.hasOwnProperty('studentDiscountPercentage')) {
      settingsMap['studentDiscountPercentage'] = 5;
    }
    if (!settingsMap.hasOwnProperty('referralBonusPoints')) {
      settingsMap['referralBonusPoints'] = 50;
    }

    res.json(settingsMap);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/settings
// @desc    Update a store setting
// @access  Private/Admin
router.post('/', [auth, admin], async (req, res) => {
  const { key, value } = req.body;
  if (!key) {
    return res.status(400).json({ msg: 'Key is required' });
  }

  try {
    let setting = await Setting.findOneAndUpdate(
      { key },
      { $set: { value } },
      { new: true, upsert: true }
    );
    res.json(setting);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
