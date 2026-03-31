const express = require('express');
const router = express.Router();
const { getRequests, createRequest, updateRequestStatus } = require('../controllers/requestController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/').get(protect, getRequests).post(protect, authorize('client'), createRequest);
router.put('/:id/status', protect, updateRequestStatus);

module.exports = router;
