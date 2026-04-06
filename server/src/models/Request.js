const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource',
    required: true,
  },
  resourceName: { type: String, required: true }, // denormalized for display
  quantity: { type: Number, required: true, default: 1 },
  note: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Fulfilled', 'Confirmed', 'Returning', 'Returned', 'Stocked'],
    default: 'Pending',
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  supervisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  respondedAt: { type: Date }, // When manager approves/rejects
  fulfilledAt: { type: Date }, // When supervisor marks as fulfilled
}, { timestamps: true });

module.exports = mongoose.model('Request', requestSchema);
