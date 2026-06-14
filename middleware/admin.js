module.exports = function(req, res, next) {
  // Check if user has admin role
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ msg: 'Access denied, admin only' });
  }
};
