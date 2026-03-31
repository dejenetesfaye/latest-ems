const Event = require('../models/Event');
const User = require('../models/User');

// GET /api/events
const getEvents = async (req, res) => {
  try {
    const { role, id } = req.user;
    let events = [];

    if (role === 'systemadmin') {
      events = await Event.find({})
        .populate('superAdminId', 'name')
        .populate('managerId', 'name')
        .populate('supervisorId', 'name')
        .populate('clientId', 'name');
    } else if (role === 'superadmin') {
      events = await Event.find({ superAdminId: id })
        .populate('managerId', 'name')
        .populate('supervisorId', 'name')
        .populate('clientId', 'name');
    } else if (role === 'manager') {
      events = await Event.find({ managerId: id })
        .populate('clientId', 'name')
        .populate('supervisorId', 'name');
    } else if (role === 'supervisor') {
      events = await Event.find({ supervisorId: id })
        .populate('clientId', 'name')
        .populate('managerId', 'name');
    } else if (role === 'client') {
      events = await Event.find({ clientId: id })
        .populate('managerId', 'name')
        .populate('supervisorId', 'name');
    }
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/events — superadmin creates events
const createEvent = async (req, res) => {
  const { name, type, date, managerId, supervisorId, clientId } = req.body;
  try {
    if (!name || !type || !date || !managerId || !clientId)
      return res.status(400).json({ message: 'Please fill all required fields' });

    const event = await Event.create({
      name,
      type,
      date,
      superAdminId: req.user.id,
      managerId,
      supervisorId: supervisorId || null,
      clientId,
    });
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/events/:id
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('managerId', 'name username')
      .populate('supervisorId', 'name username')
      .populate('clientId', 'name username')
      .populate('superAdminId', 'name');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/events/:id
const updateEvent = async (req, res) => {
  try {
    const updated = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('managerId', 'name username')
      .populate('supervisorId', 'name username')
      .populate('clientId', 'name username')
      .populate('superAdminId', 'name');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/events/:id
const deleteEvent = async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getEvents, createEvent, getEventById, updateEvent, deleteEvent };
