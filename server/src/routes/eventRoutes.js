const express = require('express');
const router = express.Router();
const { getEvents, createEvent, getEventById, updateEvent, deleteEvent } = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getEvents)
  .post(protect, authorize('superadmin'), createEvent);

router.route('/:id')
  .get(protect, getEventById)
  .put(protect, authorize('superadmin', 'systemadmin'), updateEvent)
  .delete(protect, authorize('superadmin', 'systemadmin'), deleteEvent);

module.exports = router;
