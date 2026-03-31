const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  // Resources belong to a superadmin's catalog
  superAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: { type: String, required: true },
  category: {
    type: String,
    enum: ['plate', 'hall', 'drink_soft', 'drink_alcohol', 'staff', 'other'],
    required: true,
  },
  unitCost: { type: Number, required: true, default: 0 },
  availableQuantity: { type: Number, required: true, default: 0 },
  description: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Resource', resourceSchema);
