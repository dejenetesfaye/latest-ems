const express = require('express');
const router = express.Router();
const Resource = require('../models/Resource');
const { protect, authorize } = require('../middleware/authMiddleware');

// GET /api/resources — org-scoped
router.get('/', protect, async (req, res) => {
  try {
    const { role, id } = req.user;
    let orgId;
    const User = require('../models/User');

    if (role === 'superadmin') orgId = id;
    else if (role === 'systemadmin') {
      const all = await Resource.find({}).populate('superAdminId', 'name');
      return res.json(all);
    } else {
      const user = await User.findById(id);
      orgId = user.organizationId;
    }
    const resources = await Resource.find({ superAdminId: orgId });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/resources — superadmin creates resource catalog
router.post('/', protect, authorize('superadmin'), async (req, res) => {
  const { name, category, unitCost, availableQuantity, description } = req.body;
  try {
    const resource = await Resource.create({
      superAdminId: req.user.id,
      name,
      category,
      unitCost,
      availableQuantity,
      description,
    });
    res.status(201).json(resource);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/resources/:id
router.put('/:id', protect, authorize('superadmin', 'systemadmin'), async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(resource);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/resources/:id
router.delete('/:id', protect, authorize('superadmin', 'systemadmin'), async (req, res) => {
  try {
    await Resource.findByIdAndDelete(req.params.id);
    res.json({ message: 'Resource deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
