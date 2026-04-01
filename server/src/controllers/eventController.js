const Event = require('../models/Event');
const User = require('../models/User');

// Helper for automated status
const updateEventStatus = async (event) => {
  const now = new Date();
  const start = new Date(event.date);
  const end = event.endDate ? new Date(event.endDate) : start; 
  let newStatus = event.status;

  if (now < start) newStatus = 'Upcoming';
  else if (now > end) newStatus = 'Terminated';
  else newStatus = 'Ongoing';

  if (newStatus !== event.status) {
    event.status = newStatus;
    await event.save();
  }
  return event;
};

// GET /api/events
const getEvents = async (req, res) => {
  try {
    const { role, id } = req.user;
    let events = [];

    const query = role === 'systemadmin' ? {} :
                 role === 'superadmin' ? { superAdminId: id } :
                 role === 'manager' ? { managerId: id } :
                 role === 'supervisor' ? { supervisorId: id } :
                 { clientId: id };

    events = await Event.find(query)
      .populate('superAdminId', 'name')
      .populate('managerId', 'name')
      .populate('supervisorId', 'name')
      .populate('clientId', 'name');

    // Auto-update status for found events
    const updatedEvents = await Promise.all(events.map(ev => updateEventStatus(ev)));
    res.json(updatedEvents);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/events — superadmin creates events
const createEvent = async (req, res) => {
  const { name, type, date, endDate, initialRequirements, managerId, supervisorId, clientId } = req.body;
  const io = req.app.get('io');
  try {
    if (!name || !type || !date || !endDate || !managerId || !clientId)
      return res.status(400).json({ message: 'Please fill all required fields' });

    const event = await Event.create({
      name, type, date, endDate, initialRequirements,
      superAdminId: req.user.id,
      managerId,
      supervisorId: supervisorId || null,
      clientId,
    });

    // Notify assigned users instantly
    const participants = [managerId, supervisorId, clientId].filter(id => id);
    participants.forEach(pId => io.to(pId).emit('new_assignment', { eventId: event._id, name: event.name }));

    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/events/:id
const getEventById = async (req, res) => {
  try {
    let event = await Event.findById(req.params.id)
      .populate('managerId', 'name username')
      .populate('supervisorId', 'name username')
      .populate('clientId', 'name username')
      .populate('superAdminId', 'name');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    
    event = await updateEventStatus(event);
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
    
    const io = req.app.get('io');
    const finalEvent = await updateEventStatus(updated);
    
    // Notify about updates
    const participants = [finalEvent.managerId._id, finalEvent.supervisorId?._id, finalEvent.clientId._id].filter(id => id);
    participants.forEach(pId => io.to(pId.toString()).emit('activity_update', { eventId: finalEvent._id }));

    res.json(finalEvent);
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
