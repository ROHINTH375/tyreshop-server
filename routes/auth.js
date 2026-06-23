const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Setting = require('../models/Setting');
const auth = require('../middleware/auth');

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', async (req, res) => {
  const { firstName, lastName, username, email, phone, permanentAddress, deliveryAddress, password, recaptchaToken, refCode } = req.body;

  try {
    // 1. Verify reCAPTCHA
    if (!recaptchaToken) {
      return res.status(400).json({ msg: 'Please complete the captcha' });
    }
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (secretKey) {
      const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaToken}`;
      const captchaRes = await fetch(verifyUrl, { method: 'POST' });
      const captchaData = await captchaRes.json();
      if (!captchaData.success) {
        return res.status(400).json({ msg: 'Captcha verification failed' });
      }
    } else {
      console.log('RECAPTCHA_SECRET_KEY not set. Skipping captcha validation in dev mode.');
    }

    // 2. Check if user exists by email or username
    let userByEmail = await User.findOne({ email });
    if (userByEmail) {
      return res.status(400).json({ msg: 'Email is already registered' });
    }
    let userByUsername = await User.findOne({ username });
    if (userByUsername) {
      return res.status(400).json({ msg: 'Username is already taken' });
    }

    // 3. Generate a unique referral code
    const generateReferralCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };
    
    let referralCode = generateReferralCode();
    // Ensure uniqueness (simple check, collision unlikely with 6 chars, but good practice)
    while (await User.findOne({ referralCode })) {
      referralCode = generateReferralCode();
    }

    // 4. Create User
    let user = new User({ 
      firstName, lastName, username, email, phone, permanentAddress, deliveryAddress, password, referralCode
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    
    // 5. Handle Referral Logic
    if (refCode) {
      const referrer = await User.findOne({ referralCode: refCode.toUpperCase() });
      if (referrer) {
        // Fetch dynamic bonus amount
        let bonusAmount = 50;
        const bonusSetting = await Setting.findOne({ key: 'referralBonusPoints' });
        if (bonusSetting && !isNaN(bonusSetting.value)) {
          bonusAmount = Number(bonusSetting.value);
        }

        user.referredBy = referrer._id;
        user.loyaltyPoints += bonusAmount; // Welcome bonus
        
        referrer.referralCount += 1;
        referrer.referralEarnings += bonusAmount;
        referrer.loyaltyPoints += bonusAmount;
        await referrer.save();
      }
    }

    await user.save();

    const payload = { user: { id: user.id, role: user.role } };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '4d' }, (err, token) => {
      if (err) throw err;
      res.cookie('token', token, {
        httpOnly: true,
        secure: true, // required for cross-origin cookies
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 4 * 24 * 60 * 60 * 1000
      });
      res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role, loyaltyPoints: user.loyaltyPoints } });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const payload = { user: { id: user.id, role: user.role } };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '4d' }, (err, token) => {
      if (err) throw err;
      res.cookie('token', token, {
        httpOnly: true,
        secure: true, // required for cross-origin cookies
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 4 * 24 * 60 * 60 * 1000
      });
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/auth/user
// @desc    Get user data
// @access  Private
router.get('/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/auth/user
// @desc    Update user profile
// @access  Private
router.put('/user', auth, async (req, res) => {
  const { name, address, phone } = req.body;
  try {
    let user = await User.findById(req.user.id);
    if (name) user.name = name;
    if (address !== undefined) user.address = address;
    if (phone !== undefined) user.phone = phone;

    await user.save();
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/forgot-password
// @desc    Generate OTP and log to console
// @access  Public
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash OTP
    const salt = await bcrypt.genSalt(10);
    user.resetPasswordOtp = await bcrypt.hash(otp, salt);
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 mins
    await user.save();

    // SIMULATION: Print to console
    console.log(`\n================================`);
    console.log(`🔒 PASSWORD RESET OTP REQUESTED`);
    console.log(`Email: ${email}`);
    console.log(`OTP: ${otp}`);
    console.log(`================================\n`);

    res.json({ msg: 'OTP sent! (Check your backend console)' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/verify-otp
// @desc    Verify OTP
// @access  Public
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  try {
    let user = await User.findOne({ 
      email,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ msg: 'OTP has expired or user not found' });
    }

    const isMatch = await bcrypt.compare(otp, user.resetPasswordOtp);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid OTP' });
    }

    res.json({ msg: 'OTP Verified. Proceed to reset password.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/reset-password
// @desc    Reset password using OTP
// @access  Public
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    let user = await User.findOne({ 
      email,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ msg: 'OTP has expired or user not found' });
    }

    const isMatch = await bcrypt.compare(otp, user.resetPasswordOtp);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid OTP' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    // Clear OTP
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();

    res.json({ msg: 'Password has been successfully reset' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/logout
// @desc    Logout user & clear cookie
// @access  Public
router.post('/logout', (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    secure: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    expires: new Date(0)
  });
  res.json({ msg: 'Logged out successfully' });
});

// @route   PUT api/auth/password
// @desc    Update user password
// @access  Private
router.put('/password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    let user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Incorrect current password' });
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.json({ msg: 'Password updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/student-verify
// @desc    Submit student ID and Aadhar for verification
// @access  Private
router.post('/student-verify', auth, async (req, res) => {
  const { studentIdUrl, aadharNumber } = req.body;
  try {
    let user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user.studentIdUrl = studentIdUrl;
    user.aadharNumber = aadharNumber;
    user.studentStatus = 'pending';

    await user.save();
    res.json({ msg: 'Verification details submitted successfully. Waiting for admin approval.', user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/auth/wishlist
// @desc    Get user wishlist
// @access  Private
router.get('/wishlist', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('wishlist');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user.wishlist || []);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/wishlist/:productId
// @desc    Add product to wishlist
// @access  Private
router.post('/wishlist/:productId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (user.wishlist.includes(req.params.productId)) {
      return res.status(400).json({ msg: 'Product already in wishlist' });
    }

    user.wishlist.push(req.params.productId);
    await user.save();
    
    // return populated wishlist
    const updatedUser = await User.findById(req.user.id).populate('wishlist');
    res.json(updatedUser.wishlist);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/auth/wishlist/:productId
// @desc    Remove product from wishlist
// @access  Private
router.delete('/wishlist/:productId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.wishlist = user.wishlist.filter(id => id.toString() !== req.params.productId);
    await user.save();
    
    const updatedUser = await User.findById(req.user.id).populate('wishlist');
    res.json(updatedUser.wishlist);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
