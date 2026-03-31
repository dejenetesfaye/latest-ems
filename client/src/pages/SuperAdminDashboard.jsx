import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { SocketContext } from '../context/SocketContext';
import {
  Container, Typography, Box, Card, CardContent, Grid, Button, CircularProgress,
  Alert, Tabs, Tab, TextField, MenuItem, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, Snackbar, AlertTitle
} from '@mui/material';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid
} from 'recharts';
import PeopleIcon from '@mui/icons-material/People';
import EventIcon from '@mui/icons-material/Event';
import InventoryIcon from '@mui/icons-material/Inventory';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';

const COLORS = ['#D4AF37', '#FFDF00', '#C5A017', '#EEDC82', '#FFF176'];
const STATUS_COLORS = { Pending: 'warning', Approved: 'info', Rejected: 'error', Fulfilled: 'primary', Confirmed: 'success' };

const StatCard = ({ icon, label, value }) => (
  <Card elevation={2} sx={{ borderRadius: 2 }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ color: 'primary.main', fontSize: 36 }}>{icon}</Box>
      <Box>
        <Typography variant="h4" fontWeight="bold" color="text.primary">{value}</Typography>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
      </Box>
    </CardContent>
  </Card>
);

const SuperAdminDashboard = () => {
  const socket = useContext(SocketContext);

  const [tab, setTab] = useState(0);
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [managers, setManagers] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Real-time Alerts
  const [socketAlert, setSocketAlert] = useState({ show: false, message: '' });
  const [globalAlert, setGlobalAlert] = useState({ show: false, message: '', severity: 'success' });

  // Modal States
  const [userModal, setUserModal] = useState({ open: false, editing: null });
  const [eventModal, setEventModal] = useState({ open: false, editing: null });
  const [resourceModal, setResourceModal] = useState({ open: false, editing: null });

  // Forms
  const [userForm, setUserForm] = useState({ name: '', username: '', password: '', role: 'manager' });
  const [eventForm, setEventForm] = useState({ name: '', type: 'Wedding', date: '', managerId: '', supervisorId: '', clientId: '' });
  const [resourceForm, setResourceForm] = useState({ name: '', category: 'plate', unitCost: '', availableQuantity: '', description: '' });
  const [submitLoading, setSubmitLoading] = useState(false);

  const showAlert = (message, severity = 'success') => {
    setGlobalAlert({ show: true, message, severity });
    setTimeout(() => setGlobalAlert({ show: false, message: '', severity: '' }), 4000);
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [analyticsRes, usersRes, eventsRes, resourcesRes] = await Promise.all([
        api.get('/analytics'),
        api.get('/users'),
        api.get('/events'),
        api.get('/resources'),
      ]);
      setAnalytics(analyticsRes.data);
      setUsers(usersRes.data);
      setManagers(usersRes.data.filter(u => u.role === 'manager'));
      setSupervisors(usersRes.data.filter(u => u.role === 'supervisor'));
      setClients(usersRes.data.filter(u => u.role === 'client'));
      setEvents(eventsRes.data);
      setResources(resourcesRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  // Socket Listener
  useEffect(() => {
    if (!socket) return;

    socket.on('inventory_alert', (data) => {
      setSocketAlert({ show: true, message: data.message });
      fetchAll(); // Auto-refresh data on alerts
    });

    socket.on('request_created', () => fetchAll());
    socket.on('request_updated', () => fetchAll());

    return () => {
      socket.off('inventory_alert');
      socket.off('request_created');
      socket.off('request_updated');
    };
  }, [socket]);

  // --- USER HANDLERS ---
  const handleOpenUserModal = (user = null) => {
    if (user) {
      setUserForm({ name: user.name, username: user.username, password: '', role: user.role });
      setUserModal({ open: true, editing: user._id });
    } else {
      setUserForm({ name: '', username: '', password: '', role: 'manager' });
      setUserModal({ open: true, editing: null });
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault(); setSubmitLoading(true);
    try {
      if (userModal.editing) {
        // Exclude password if empty during edit
        const payload = { ...userForm };
        if (!payload.password) delete payload.password;
        await api.put(`/users/${userModal.editing}`, payload);
        showAlert('User updated successfully!');
      } else {
        await api.post('/auth/register', userForm);
        showAlert('User created successfully!');
      }
      setUserModal({ open: false, editing: null });
      fetchAll();
    } catch (err) { showAlert(err.response?.data?.message || 'Error', 'error'); }
    finally { setSubmitLoading(false); }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try { await api.delete(`/users/${id}`); fetchAll(); } catch { showAlert('Error deleting user', 'error'); }
  };

  // --- EVENT HANDLERS ---
  const handleOpenEventModal = (ev = null) => {
    if (ev) {
      setEventForm({
        name: ev.name, type: ev.type, date: ev.date.split('T')[0],
        managerId: ev.managerId?._id || '', supervisorId: ev.supervisorId?._id || '', clientId: ev.clientId?._id || ''
      });
      setEventModal({ open: true, editing: ev._id });
    } else {
      setEventForm({ name: '', type: 'Wedding', date: '', managerId: '', supervisorId: '', clientId: '' });
      setEventModal({ open: true, editing: null });
    }
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault(); setSubmitLoading(true);
    try {
      if (eventModal.editing) {
        await api.put(`/events/${eventModal.editing}`, eventForm);
        showAlert('Event updated successfully!');
      } else {
        await api.post('/events', eventForm);
        showAlert('Event created successfully!');
      }
      setEventModal({ open: false, editing: null });
      fetchAll();
    } catch (err) { showAlert('Error saving event', 'error'); }
    finally { setSubmitLoading(false); }
  };

  // --- RESOURCE HANDLERS ---
  const handleOpenResourceModal = (r = null) => {
    if (r) {
      setResourceForm({ name: r.name, category: r.category, unitCost: r.unitCost, availableQuantity: r.availableQuantity, description: r.description });
      setResourceModal({ open: true, editing: r._id });
    } else {
      setResourceForm({ name: '', category: 'plate', unitCost: '', availableQuantity: '', description: '' });
      setResourceModal({ open: true, editing: null });
    }
  };

  const handleSaveResource = async (e) => {
    e.preventDefault(); setSubmitLoading(true);
    try {
      if (resourceModal.editing) {
        await api.put(`/resources/${resourceModal.editing}`, resourceForm);
        showAlert('Resource updated!');
      } else {
        await api.post('/resources', resourceForm);
        showAlert('Resource created!');
      }
      setResourceModal({ open: false, editing: null });
      fetchAll();
    } catch (err) { showAlert('Error saving resource', 'error'); }
    finally { setSubmitLoading(false); }
  };

  const handleDeleteResource = async (id) => {
    if (!window.confirm('Delete this resource?')) return;
    try { await api.delete(`/resources/${id}`); fetchAll(); } catch { showAlert('Error deleting resource', 'error'); }
  };

  if (loading && !analytics) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress size={60} color="primary" /></Box>;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Socket Push Notification Alert */}
      <Snackbar open={socketAlert.show} autoHideDuration={8000} onClose={() => setSocketAlert({ show: false, message: '' })} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert severity="warning" variant="filled" onClose={() => setSocketAlert({ show: false, message: '' })} sx={{ width: '100%', borderLeft: '4px solid #000' }}>
          <AlertTitle sx={{ fontWeight: 'bold' }}>Inventory Alert (Real-time)</AlertTitle>
          {socketAlert.message}
        </Alert>
      </Snackbar>

      <Typography variant="h4" fontWeight="bold" color="primary" mb={1}>Super Admin Dashboard</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>Manage organization and monitor logistics</Typography>

      {globalAlert.show && <Alert severity={globalAlert.severity} sx={{ mb: 3 }} onClose={() => setGlobalAlert({ ...globalAlert, show: false })}>{globalAlert.message}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 4, borderBottom: '1px solid rgba(212,175,55,0.3)' }} textColor="primary" indicatorColor="primary">
        <Tab label={<Box display="flex" alignItems="center" gap={1}><BarChart fontSize="small" /> Analytics</Box>} />
        <Tab label={<Box display="flex" alignItems="center" gap={1}><PeopleIcon fontSize="small" /> Users</Box>} />
        <Tab label={<Box display="flex" alignItems="center" gap={1}><EventIcon fontSize="small" /> Events</Box>} />
        <Tab label={<Box display="flex" alignItems="center" gap={1}><InventoryIcon fontSize="small" /> Resources</Box>} />
      </Tabs>

      {/* ── TAB 0: ANALYTICS ── */}
      {tab === 0 && analytics && (
        <Box>
          <Grid container spacing={4} mb={6} justifyContent="center">
            <Grid item xs={12} sm={6} md={3} lg={2.5}><StatCard icon={<PeopleIcon fontSize="inherit" />} label="Total Users" value={analytics.totals.users} /></Grid>
            <Grid item xs={12} sm={6} md={3} lg={2.5}><StatCard icon={<EventIcon fontSize="inherit" />} label="Total Events" value={analytics.totals.events} /></Grid>
            <Grid item xs={12} sm={6} md={3} lg={2.5}><StatCard icon={<InventoryIcon fontSize="inherit" />} label="Resources" value={analytics.totals.resources} /></Grid>
            <Grid item xs={12} sm={6} md={3} lg={2.5}><StatCard icon={<AssignmentIcon fontSize="inherit" />} label="Requests" value={analytics.totals.requests} /></Grid>
          </Grid>

          {/* Fully Separated Wide Layout */}
          <Grid container spacing={10} justifyContent="center" direction="column" alignItems="center">
            {/* Requests by Status Pie */}
            <Grid item xs={12} sx={{ width: '50%' }}>
              <Card elevation={2} sx={{ borderRadius: 2, minHeight: 550, width: '100%' }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h5" fontWeight="bold" mb={4} color="primary" textAlign="center">Requests by Status</Typography>
                  {analytics.requestsByStatus.length === 0 ? (
                    <Typography color="text.secondary" textAlign="center">No request data available.</Typography>
                  ) : (
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie data={analytics.requestsByStatus} dataKey="value" nameKey="name"
                          cx="50%" cy="50%" outerRadius={150}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {analytics.requestsByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: '#D4AF37' }} />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Event Progress Monitor Bar */}
            <Grid item xs={12} sx={{ width: '50%' }}>
              <Card elevation={2} sx={{ borderRadius: 2, minHeight: 550, width: '100%' }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h5" fontWeight="bold" mb={4} color="primary" textAlign="center">Event Progress Monitor</Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={analytics.eventsByStatus} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="name" stroke="#A3A3A3" />
                      <YAxis allowDecimals={false} stroke="#A3A3A3" />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: '#D4AF37' }} cursor={{ fill: 'rgba(212,175,55,0.1)' }} />
                      <Bar dataKey="value" name="Events" fill="#D4AF37" radius={[10, 10, 0, 0]} barSize={100} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ── TAB 1: USERS ── */}
      {tab === 1 && (
        <Box>
          <Box display="flex" justifyContent="space-between" mb={2}>
            <Typography variant="h6" fontWeight="bold">Organizational Directory</Typography>
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => handleOpenUserModal()}>
              Add New User
            </Button>
          </Box>
          <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>No users found.</TableCell></TableRow>
                ) : users.map(u => (
                  <TableRow key={u._id} hover>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>{u.username}</TableCell>
                    <TableCell><Chip label={u.role.toUpperCase()} size="small" sx={{ bgcolor: 'rgba(212,175,55,0.2)', color: '#D4AF37' }} /></TableCell>
                    <TableCell align="right">
                      <IconButton color="info" onClick={() => handleOpenUserModal(u)}><EditIcon /></IconButton>
                      <IconButton color="error" onClick={() => handleDeleteUser(u._id)}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* User Form Modal */}
          <Dialog open={userModal.open} onClose={() => setUserModal({ open: false })} maxWidth="sm" fullWidth>
            <DialogTitle>{userModal.editing ? 'Edit User' : 'Create New User'}</DialogTitle>
            <DialogContent dividers>
              <form onSubmit={handleSaveUser} id="userForm">
                <TextField fullWidth label="Full Name" margin="normal" size="small" required value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} />
                <TextField fullWidth label="Username" margin="normal" size="small" required value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} />
                <TextField fullWidth label="Password (leave blank to keep current)" type="password" margin="normal" size="small" required={!userModal.editing} value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} />
                <TextField select fullWidth label="Role" margin="normal" size="small" required value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                  <MenuItem value="manager">Manager</MenuItem>
                  <MenuItem value="supervisor">Supervisor</MenuItem>
                  <MenuItem value="client">Client</MenuItem>
                </TextField>
              </form>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setUserModal({ open: false })} color="inherit">Cancel</Button>
              <Button type="submit" form="userForm" variant="contained" disabled={submitLoading}>{submitLoading ? <CircularProgress size={24} /> : 'Save'}</Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}

      {/* ── TAB 2: EVENTS ── */}
      {tab === 2 && (
        <Box>
          <Box display="flex" justifyContent="space-between" mb={2}>
            <Typography variant="h6" fontWeight="bold">Event Management</Typography>
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => handleOpenEventModal()}>
              Add New Event
            </Button>
          </Box>
          <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Event Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Personnel</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>No events found.</TableCell></TableRow>
                ) : events.map(ev => (
                  <TableRow key={ev._id} hover>
                    <TableCell fontWeight="bold">{ev.name}</TableCell>
                    <TableCell>{ev.type}</TableCell>
                    <TableCell>{new Date(ev.date).toLocaleDateString()}</TableCell>
                    <TableCell>{ev.clientId?.name || '—'}</TableCell>
                    <TableCell>
                      <Typography variant="caption" display="block">Mgr: {ev.managerId?.name}</Typography>
                      {ev.supervisorId && <Typography variant="caption" display="block">Sup: {ev.supervisorId.name}</Typography>}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton color="info" onClick={() => handleOpenEventModal(ev)}><EditIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Event Form Modal */}
          <Dialog open={eventModal.open} onClose={() => setEventModal({ open: false })} maxWidth="sm" fullWidth>
            <DialogTitle>{eventModal.editing ? 'Edit Event' : 'Create New Event'}</DialogTitle>
            <DialogContent dividers>
              <form onSubmit={handleSaveEvent} id="eventForm">
                <TextField fullWidth label="Event Name" margin="normal" size="small" required value={eventForm.name} onChange={e => setEventForm({ ...eventForm, name: e.target.value })} />
                <TextField select fullWidth label="Event Type" margin="normal" size="small" required value={eventForm.type} onChange={e => setEventForm({ ...eventForm, type: e.target.value })}>
                  {['Wedding', 'Birthday', 'Corporate', 'Party', 'Conference', 'Other'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
                <TextField fullWidth type="date" label="Date" margin="normal" size="small" InputLabelProps={{ shrink: true }} required value={eventForm.date} onChange={e => setEventForm({ ...eventForm, date: e.target.value })} />
                <TextField select fullWidth label="Assign Manager" margin="normal" size="small" required value={eventForm.managerId} onChange={e => setEventForm({ ...eventForm, managerId: e.target.value })}>
                  {managers.map(m => <MenuItem key={m._id} value={m._id}>{m.name}</MenuItem>)}
                </TextField>
                <TextField select fullWidth label="Assign Supervisor (optional)" margin="normal" size="small" value={eventForm.supervisorId} onChange={e => setEventForm({ ...eventForm, supervisorId: e.target.value })}>
                  <MenuItem value="">None</MenuItem>
                  {supervisors.map(s => <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>)}
                </TextField>
                <TextField select fullWidth label="Assign Client" margin="normal" size="small" required value={eventForm.clientId} onChange={e => setEventForm({ ...eventForm, clientId: e.target.value })}>
                  {clients.map(c => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
                </TextField>
              </form>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEventModal({ open: false })} color="inherit">Cancel</Button>
              <Button type="submit" form="eventForm" variant="contained" disabled={submitLoading}>{submitLoading ? <CircularProgress size={24} /> : 'Save'}</Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}

      {/* ── TAB 3: RESOURCES ── */}
      {tab === 3 && (
        <Box>
          <Box display="flex" justifyContent="space-between" mb={2}>
            <Typography variant="h6" fontWeight="bold">Resource Catalog</Typography>
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => handleOpenResourceModal()}>
              Add Resource
            </Button>
          </Box>
          <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Unit Cost</TableCell>
                  <TableCell>Available Qty</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resources.length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>No resources found.</TableCell></TableRow>
                ) : resources.map(r => (
                  <TableRow key={r._id} hover>
                    <TableCell fontWeight="bold">{r.name}</TableCell>
                    <TableCell><Chip label={r.category.replace('_', ' ').toUpperCase()} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} /></TableCell>
                    <TableCell>${r.unitCost}</TableCell>
                    <TableCell><Typography color={r.availableQuantity < 10 ? 'error' : 'inherit'}>{r.availableQuantity}</Typography></TableCell>
                    <TableCell align="right">
                      <IconButton color="info" onClick={() => handleOpenResourceModal(r)}><EditIcon /></IconButton>
                      <IconButton color="error" onClick={() => handleDeleteResource(r._id)}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Resource Form Modal */}
          <Dialog open={resourceModal.open} onClose={() => setResourceModal({ open: false })} maxWidth="sm" fullWidth>
            <DialogTitle>{resourceModal.editing ? 'Edit Resource' : 'Add New Resource'}</DialogTitle>
            <DialogContent dividers>
              <form onSubmit={handleSaveResource} id="resourceForm">
                <TextField fullWidth label="Resource Name" margin="normal" size="small" required value={resourceForm.name} onChange={e => setResourceForm({ ...resourceForm, name: e.target.value })} />
                <TextField select fullWidth label="Category" margin="normal" size="small" required value={resourceForm.category} onChange={e => setResourceForm({ ...resourceForm, category: e.target.value })}>
                  {[['plate', 'Plate'], ['hall', 'Hall'], ['drink_soft', 'Soft Drink'], ['drink_alcohol', 'Alcohol'], ['staff', 'Staff'], ['other', 'Other']].map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                </TextField>
                <TextField fullWidth label="Unit Cost ($)" type="number" margin="normal" size="small" required value={resourceForm.unitCost} onChange={e => setResourceForm({ ...resourceForm, unitCost: e.target.value })} />
                <TextField fullWidth label="Available Quantity" type="number" margin="normal" size="small" required value={resourceForm.availableQuantity} onChange={e => setResourceForm({ ...resourceForm, availableQuantity: e.target.value })} />
                <TextField fullWidth label="Description" margin="normal" size="small" multiline rows={2} value={resourceForm.description} onChange={e => setResourceForm({ ...resourceForm, description: e.target.value })} />
              </form>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setResourceModal({ open: false })} color="inherit">Cancel</Button>
              <Button type="submit" form="resourceForm" variant="contained" disabled={submitLoading}>{submitLoading ? <CircularProgress size={24} /> : 'Save'}</Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </Container>
  );
};

export default SuperAdminDashboard;
