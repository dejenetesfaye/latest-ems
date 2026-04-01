const Request = require('../models/Request');
const Event = require('../models/Event');
const User = require('../models/User');
const Resource = require('../models/Resource');

// GET /api/requests
const getRequests = async (req, res) => {
  try {
    const { role, id } = req.user;
    let requests = [];

    if (role === 'systemadmin') {
      requests = await Request.find({})
        .populate('eventId', 'name')
        .populate('clientId', 'name')
        .populate('managerId', 'name')
        .populate('supervisorId', 'name')
        .populate('resourceId', 'name category');
    } else if (role === 'superadmin') {
      const events = await Event.find({ superAdminId: id }).select('_id');
      const eventIds = events.map(e => e._id);
      requests = await Request.find({ eventId: { $in: eventIds } })
        .populate('eventId', 'name')
        .populate('clientId', 'name')
        .populate('managerId', 'name')
        .populate('supervisorId', 'name')
        .populate('resourceId', 'name category');
    } else if (role === 'manager') {
      requests = await Request.find({ managerId: id })
        .populate('eventId', 'name')
        .populate('clientId', 'name')
        .populate('resourceId', 'name category');
    } else if (role === 'supervisor') {
      requests = await Request.find({
        supervisorId: id,
        status: { $in: ['Approved', 'Fulfilled', 'Confirmed'] },
      })
        .populate('eventId', 'name')
        .populate('clientId', 'name')
        .populate('resourceId', 'name category');
    } else if (role === 'client') {
      requests = await Request.find({ clientId: id })
        .populate('eventId', 'name')
        .populate('resourceId', 'name category');
    }

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/requests — client creates request from resource catalog
const createRequest = async (req, res) => {
  const { eventId, resourceId, quantity, note } = req.body;
  try {
    if (!eventId || !resourceId || !quantity)
      return res.status(400).json({ message: 'eventId, resourceId and quantity are required' });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.clientId.toString() !== req.user.id)
      return res.status(403).json({ message: 'You are not the client of this event' });

    const resource = await Resource.findById(resourceId);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    const request = await Request.create({
      eventId,
      resourceId,
      resourceName: resource.name,
      quantity,
      note,
      clientId: req.user.id,
      managerId: event.managerId,
      supervisorId: event.supervisorId || null,
      status: 'Pending',
    });

    const populatedRequest = await Request.findById(request._id)
      .populate('eventId', 'name')
      .populate('clientId', 'name')
      .populate('resourceId', 'name category');

    const io = req.app.get('io');
    io.emit('request_created', populatedRequest);

    // Over-request Logic: If requested amount > available amount
    if (quantity > resource.availableQuantity) {
      io.emit('inventory_alert', {
        message: `High Demand Alert: Client requested ${quantity}x ${resource.name}, but only ${resource.availableQuantity} are available.`,
        managerId: event.managerId,
        superAdminId: event.superAdminId,
      });
    }

    res.status(201).json(populatedRequest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/requests/:id/status
const updateRequestStatus = async (req, res) => {
  const { status } = req.body;
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const { role, id } = req.user;
    let allowed = false;

    if (role === 'systemadmin' || role === 'superadmin') {
      allowed = true;
    } else if (role === 'manager' && request.managerId?.toString() === id) {
      allowed = ['Approved', 'Rejected'].includes(status) && request.status === 'Pending';
    } else if (role === 'supervisor' && request.supervisorId?.toString() === id) {
      allowed = status === 'Fulfilled' && request.status === 'Approved';
    } else if (role === 'client' && request.clientId.toString() === id) {
      allowed = status === 'Confirmed' && request.status === 'Fulfilled';
    }

    if (!allowed)
      return res.status(403).json({ message: `Cannot transition from ${request.status} to ${status}` });

    request.status = status;
    if (['Approved', 'Rejected'].includes(status)) request.respondedAt = new Date();
    if (status === 'Fulfilled') request.fulfilledAt = new Date();
    
    await request.save();

    const updated = await Request.findById(request._id)
      .populate('eventId', 'name')
      .populate('clientId', 'name')
      .populate('resourceId', 'name category');

    const io = req.app.get('io');
    io.emit('request_updated', updated);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getRequests, createRequest, updateRequestStatus };
