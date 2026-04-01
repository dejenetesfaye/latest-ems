import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { SocketContext } from '../context/SocketContext';
import {
  Container, Typography, Box, Card, CardContent, Grid, Button,
  CircularProgress, Alert, TextField, MenuItem, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#D4AF37', '#FFDF00', '#C5A017', '#EEDC82', '#FFF176'];
const STATUS_COLOR = { Pending: 'warning', Approved: 'info', Rejected: 'error', Fulfilled: 'primary', Confirmed: 'success' };

const ClientDashboard = () => {
  const socket = useContext(SocketContext);
  const [event, setEvent] = useState(null);
  const [resources, setResources] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'success' });
  const [form, setForm] = useState({ resourceId: '', quantity: 1, note: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [evtRes, reqRes] = await Promise.all([api.get('/events'), api.get('/requests')]);
      if (evtRes.data.length > 0) {
        setEvent(evtRes.data[0]);
        const resRes = await api.get('/resources');
        setResources(resRes.data);
      }
      setRequests(reqRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('request_updated', () => fetchData());
    socket.on('new_assignment', () => fetchData());
    socket.on('activity_update', () => fetchData());
    return () => {
      socket.off('request_updated');
      socket.off('new_assignment');
      socket.off('activity_update');
    };
  }, [socket]);

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!event) return;
    setSubmitLoading(true);
    try {
      await api.post('/requests', { eventId: event._id, ...form });
      setAlert({ show: true, message: 'Request immediately transmitted to logistics!', severity: 'success' });
      setForm({ resourceId: '', quantity: 1, note: '' });
      // Socket handles UI update via request_created natively on manager side, we'll refetch manually to be safe.
      fetchData();
    } catch (err) {
      setAlert({ show: true, message: err.response?.data?.message || 'Error sending request', severity: 'error' });
    } finally { setSubmitLoading(false); }
  };

  const handleConfirm = async (id) => {
    try {
      await api.put(`/requests/${id}/status`, { status: 'Confirmed' });
      setAlert({ show: true, message: 'Thank you for confirming receipt!', severity: 'success' });
    } catch (err) {
      setAlert({ show: true, message: err.response?.data?.message || 'Error', severity: 'error' });
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress size={60} color="primary" /></Box>;

  if (!event) return (
    <Container sx={{ py: 6 }}>
      <Alert severity="info" variant="filled">You currently have no event assigned. Please await assignment from your Event Organizer.</Alert>
    </Container>
  );

  const statusCounts = requests.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" fontWeight="bold" color="primary">{event.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          {event.type} | {new Date(event.date).toLocaleDateString()}{event.endDate ? ` – ${new Date(event.endDate).toLocaleDateString()}` : ''} | Event Manager: {event.managerId?.name}
        </Typography>
        {event.initialRequirements && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(212,175,55,0.05)', borderRadius: 1, border: '1px dashed #D4AF37', display: 'inline-block' }}>
            <Typography variant="caption" fontWeight="bold" color="primary" display="block">📋 Initial Requirements:</Typography>
            <Typography variant="body2">{event.initialRequirements}</Typography>
          </Box>
        )}
      </Box>

      {alert.show && <Alert severity={alert.severity} sx={{ mb: 3 }} onClose={() => setAlert({ ...alert, show: false })}>{alert.message}</Alert>}

      <Grid container spacing={4}>
        {/* Request Form */}
        <Grid item xs={12} md={5}>
          <Card elevation={3} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2} color="primary">Resource Request Portal</Typography>
              <form onSubmit={handleSendRequest}>
                <TextField select fullWidth label="Select Premium Resource" margin="normal" size="small" required
                  value={form.resourceId} onChange={e => setForm({ ...form, resourceId: e.target.value })}>
                  {resources.length === 0
                    ? <MenuItem disabled>No resources currently available</MenuItem>
                    : resources.map(r => (
                      <MenuItem key={r._id} value={r._id}>
                        {r.name} ({r.category.replace('_', ' ').toUpperCase()}) — ${r.unitCost}/unit
                      </MenuItem>
                    ))
                  }
                </TextField>
                <TextField fullWidth label="Required Quantity" type="number" margin="normal" size="small" inputProps={{ min: 1 }} required
                  value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                <TextField fullWidth label="Additional Instructions (optional)" margin="normal" size="small" multiline rows={2}
                  value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
                <Button fullWidth variant="contained" color="primary" type="submit" endIcon={<SendIcon />} sx={{ mt: 3, fontWeight: 'bold' }} disabled={submitLoading || resources.length === 0}>
                  {submitLoading ? <CircularProgress size={24} color="inherit" /> : 'Transmit Request'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Chart */}
        <Grid item xs={12} md={7}>
          <Card elevation={3} sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent display="flex" flexDirection="column" height="100%">
              <Typography variant="h6" fontWeight="bold" mb={2} color="primary">Resource Status Overview</Typography>
              {pieData.length === 0 ? (
                <Box flex={1} display="flex" alignItems="center" justifyContent="center" height={260}>
                  <Typography color="text.secondary">No requests made yet. Begin by selecting resources from the catalog.</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#141414', borderColor: '#D4AF37' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Request History */}
        <Grid item xs={12}>
          <Typography variant="h6" fontWeight="bold" mb={2}>Logistics Log</Typography>
          <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Resource</TableCell>
                  <TableCell>Qty</TableCell>
                  <TableCell>Client Note</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date Requested</TableCell>
                  <TableCell align="right">Confirmation Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>No request history.</TableCell></TableRow>
                ) : requests.map(req => (
                  <TableRow key={req._id} hover>
                    <TableCell fontWeight="bold" color="primary.main">{req.resourceName}</TableCell>
                    <TableCell><Typography fontWeight="bold">{req.quantity}</Typography></TableCell>
                    <TableCell>{req.note || '—'}</TableCell>
                    <TableCell><Chip label={req.status} size="small" color={STATUS_COLOR[req.status] || 'default'} sx={{fontWeight:'bold'}} /></TableCell>
                    <TableCell>{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      {req.status === 'Fulfilled' ? (
                        <Button size="small" variant="contained" color="success" startIcon={<TaskAltIcon />} onClick={() => handleConfirm(req._id)}>
                          Confirm Received
                        </Button>
                      ) : req.status === 'Confirmed' ? (
                        <Typography variant="caption" color="success.main" fontWeight="bold">✅ CONFIRMED</Typography>
                      ) : (
                        <Typography variant="caption" color="text.disabled">— awaited —</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ClientDashboard;
