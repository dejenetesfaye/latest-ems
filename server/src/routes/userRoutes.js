const User = require('../models/User');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { protect, authorize } = require('../middleware/authMiddleware');

// GET /api/users — scoped by role
router.get('/', protect, authorize('systemadmin', 'superadmin', 'manager'), async (req, res) => {
  try {
    let users;
    if (req.user.role === 'systemadmin') {
      users = await User.find({ role: { $ne: 'systemadmin' } }).select('-password');
    } else if (req.user.role === 'superadmin') {
      users = await User.find({ organizationId: req.user.id }).select('-password');
    } else {
      // manager can see clients and supervisors in their org
      const mgr = await User.findById(req.user.id);
      users = await User.find({
        organizationId: mgr.organizationId,
        role: { $in: ['client', 'supervisor'] },
      }).select('-password');
    }
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/brides — clients belonging to the caller's org
router.get('/brides', protect, authorize('superadmin', 'manager'), async (req, res) => {
  try {
    const orgId = req.user.role === 'superadmin' ? req.user.id : (await User.findById(req.user.id)).organizationId;
    const clients = await User.find({ organizationId: orgId, role: 'client' }).select('-password');
    res.json(clients);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/managers — managers in superadmin's org
router.get('/managers', protect, authorize('superadmin', 'systemadmin'), async (req, res) => {
  try {
    const orgId = req.user.role === 'superadmin' ? req.user.id : null;
    const query = orgId
      ? { organizationId: orgId, role: 'manager' }
      : { role: 'manager' };
    const managers = await User.find(query).select('-password');
    res.json(managers);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/supervisors — supervisors in superadmin's org
router.get('/supervisors', protect, authorize('superadmin', 'systemadmin'), async (req, res) => {
  try {
    const orgId = req.user.role === 'superadmin' ? req.user.id : null;
    const query = orgId ? { organizationId: orgId, role: 'supervisor' } : { role: 'supervisor' };
    const supervisors = await User.find(query).select('-password');
    res.json(supervisors);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/superadmins — systemadmin only
router.get('/superadmins', protect, authorize('systemadmin'), async (req, res) => {
  try {
    const admins = await User.find({ role: 'superadmin' }).select('-password');
    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/users/:id
router.put('/:id', protect, authorize('systemadmin', 'superadmin'), async (req, res) => {
  try {
    const { name, username, role } = req.body;
    let updateData = { name, username, role };
    if (req.body.password) {
      const bcrypt = require('bcryptjs');
      updateData.password = await bcrypt.hash(req.body.password, await bcrypt.genSalt(10));
    }
    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', protect, authorize('systemadmin', 'superadmin'), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
