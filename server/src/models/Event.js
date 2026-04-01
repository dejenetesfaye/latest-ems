const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  date: { type: Date, required: true },
  endDate: { type: Date, required: true },
  initialRequirements: { type: String, default: '' },
  superAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  supervisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  totalCost: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['Upcoming', 'Ongoing', 'Terminated'],
    default: 'Upcoming',
  },
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
