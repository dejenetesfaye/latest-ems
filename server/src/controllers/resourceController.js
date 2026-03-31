const Resource = require('../models/Resource');
const Event = require('../models/Event');

// @desc    Get resources for an event
// @route   GET /api/events/:eventId/resources
// @access  Private
const getResources = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Authorization check
    if (req.user.role === 'manager' && event.managerId.toString() !== req.user.id ||
        req.user.role === 'bride' && event.brideId.toString() !== req.user.id) {
       return res.status(403).json({ message: 'Not authorized to view resources for this event' });
    }

    const resources = await Resource.find({ eventId: req.params.eventId });
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add a resource to an event
// @route   POST /api/events/:eventId/resources
// @access  Private/Manager
const addResource = async (req, res) => {
  const { name, type, quantity, unitCost, description } = req.body;

  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (event.managerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to add resources to this event' });
    }

    const resource = new Resource({
      eventId: req.params.eventId,
      name,
      type,
      quantity,
      unitCost,
      description
    });

    const savedResource = await resource.save();

    // Update event total cost
    event.totalCost += savedResource.totalCost;
    await event.save();

    res.status(201).json(savedResource);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getResources,
  addResource
};
