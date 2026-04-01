const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Event = require('../models/Event');
const Request = require('../models/Request');
const Resource = require('../models/Resource');

// GET /api/analytics — superadmin gets their org stats, systemadmin gets global
router.get('/', protect, authorize('superadmin', 'systemadmin'), async (req, res) => {
  try {
    const { role, id } = req.user;
    const isSuperAdmin = role === 'superadmin';

    const eventFilter = isSuperAdmin ? { superAdminId: id } : {};
    const userFilter = isSuperAdmin ? { organizationId: id } : { role: { $ne: 'systemadmin' } };
    const resourceFilter = isSuperAdmin ? { superAdminId: id } : {};

    const events = await Event.find(eventFilter);
    const eventIds = events.map(e => e._id);
    const requestFilter = isSuperAdmin ? { eventId: { $in: eventIds } } : {};

    const [
      totalUsers,
      totalEvents,
      totalResources,
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      fulfilledRequests,
      confirmedRequests,
      superAdminCount,
    ] = await Promise.all([
      User.countDocuments(userFilter),
      Event.countDocuments(eventFilter),
      Resource.countDocuments(resourceFilter),
      Request.countDocuments(requestFilter),
      Request.countDocuments({ ...requestFilter, status: 'Pending' }),
      Request.countDocuments({ ...requestFilter, status: 'Approved' }),
      Request.countDocuments({ ...requestFilter, status: 'Rejected' }),
      Request.countDocuments({ ...requestFilter, status: 'Fulfilled' }),
      Request.countDocuments({ ...requestFilter, status: 'Confirmed' }),
      isSuperAdmin ? 0 : User.countDocuments({ role: 'superadmin' }),
    ]);

    // Events by status
    const eventsByStatus = [
      { name: 'Upcoming', value: events.filter(e => e.status === 'Upcoming').length },
      { name: 'Ongoing', value: events.filter(e => e.status === 'Ongoing').length },
      { name: 'Terminated', value: events.filter(e => e.status === 'Terminated').length },
    ];

    // User Engagement (Top 5 users by event assignment)
    const allAssignedUserIds = events.reduce((acc, ev) => {
      acc.push(ev.managerId.toString());
      if (ev.supervisorId) acc.push(ev.supervisorId.toString());
      acc.push(ev.clientId.toString());
      return acc;
    }, []);

    const userCounts = allAssignedUserIds.reduce((acc, id) => {
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {});

    const topUserIds = Object.keys(userCounts)
      .sort((a, b) => userCounts[b] - userCounts[a])
      .slice(0, 5);

    const engagedUsersData = await Promise.all(topUserIds.map(async (uid) => {
      const u = await User.findById(uid).select('name');
      return { name: u ? u.name : 'Unknown', value: userCounts[uid] };
    }));

    // Event Health (Req fulfillment ratio)
    const requests = await Request.find(requestFilter);
    const eventHealth = events.slice(0, 5).map(ev => {
      const evReqs = requests.filter(r => r.eventId.toString() === ev._id.toString());
      const fulfilled = evReqs.filter(r => r.status === 'Fulfilled' || r.status === 'Confirmed').length;
      const ratio = evReqs.length > 0 ? (fulfilled / evReqs.length) * 100 : 100;
      return { name: ev.name, health: Math.round(ratio) };
    });

    // Requests by status for pie chart
    const requestsByStatus = [
      { name: 'Pending', value: pendingRequests },
      { name: 'Approved', value: approvedRequests },
      { name: 'Rejected', value: rejectedRequests },
      { name: 'Fulfilled', value: fulfilledRequests },
      { name: 'Confirmed', value: confirmedRequests },
    ].filter(r => r.value > 0);

    // Recent events bar chart (last 6)
    const recentEvents = events
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 6)
      .map(e => ({ name: e.name, cost: e.totalCost }));

    res.json({
      totals: {
        users: totalUsers,
        events: totalEvents,
        resources: totalResources,
        requests: totalRequests,
        superAdmins: superAdminCount,
      },
      requestsByStatus,
      eventsByStatus,
      engagedUsers: engagedUsersData,
      eventHealth,
      recentEvents,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
